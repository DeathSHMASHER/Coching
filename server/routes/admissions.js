const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const { connectDB, getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');
const { sendAdmissionEmail, sendStudentCredentialsEmail } = require('../config/mailer');

// POST /api/admissions/apply - Public Submit Admission Application
router.post('/apply', async (req, res) => {
  try {
    const { name, email, phone, targetCourse, previousPercentage, message } = req.body;

    if (!name || !email || !phone || !targetCourse) {
      return res.status(400).json({ success: false, message: 'Name, Email, Phone, and Target Course are required.' });
    }

    await connectDB();
    const appId = `ADM-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      applicationId: appId,
      name,
      email,
      phone,
      targetCourse,
      previousPercentage: previousPercentage || 0,
      message: message || '',
      status: 'Pending',
      appliedAt: new Date()
    };

    if (process.env.MONGODB_URI) {
      const newApp = new Admission(payload);
      await newApp.save();
      console.log(`✅ [MongoDB Saved] Admission application ${appId} saved directly to MongoDB Atlas!`);
    } else {
      payload._id = 'adm_' + Date.now();
      mockData.admissions.unshift(payload);
    }

    // Automatically send email notification to shahriyartaufik@gmail.com
    try {
      const resMail = await sendAdmissionEmail(payload);
      console.log(`📧 [Gmail Dispatch] Sent application ${appId} email alert to ${process.env.ADMIN_EMAIL || 'shahriyartaufik@gmail.com'}:`, resMail);
    } catch (errMail) {
      console.error('Email dispatch error:', errMail);
    }

    return res.json({
      success: true,
      message: 'Admission application submitted successfully!',
      applicationId: appId,
      emailNotified: process.env.ADMIN_EMAIL || 'shahriyartaufik@gmail.com'
    });
  } catch (err) {
    console.error('Error submitting application:', err);
    res.status(500).json({ success: false, message: 'Error submitting admission application: ' + err.message });
  }
});

// GET /api/admissions/status/:query - Track Application Status
router.get('/status/:query', async (req, res) => {
  try {
    await connectDB();
    const rawQuery = req.params.query.trim();
    const queryStr = rawQuery.toUpperCase();
    const digitsOnly = rawQuery.replace(/\D/g, '');
    const isPhoneSearch = digitsOnly.length >= 7;

    let app = null;

    if (process.env.MONGODB_URI) {
      // Priority 1: Exact uppercase / exact string match on applicationId, studentId, or email
      app = await Admission.findOne({
        $or: [
          { applicationId: queryStr },
          { studentIdAssigned: queryStr },
          { email: rawQuery.toLowerCase() }
        ]
      });

      // Priority 2: Case-insensitive regex and phone search fallback
      if (!app) {
        const regex = new RegExp('^' + rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
        const orConditions = [
          { applicationId: regex },
          { studentIdAssigned: regex },
          { email: regex }
        ];
        if (isPhoneSearch) {
          orConditions.push({ phone: new RegExp(digitsOnly, 'i') });
        }
        app = await Admission.findOne({ $or: orConditions });
      }
    } else {
      app = mockData.admissions.find(a =>
        a.applicationId.toUpperCase() === queryStr ||
        (a.studentIdAssigned && a.studentIdAssigned.toUpperCase() === queryStr) ||
        a.email.toUpperCase() === queryStr ||
        (isPhoneSearch && a.phone.replace(/\D/g, '').includes(digitsOnly))
      );
    }

    if (!app) {
      return res.status(404).json({ success: false, message: 'No application record found matching provided ID, Student ID, or Email.' });
    }

    return res.json({ success: true, application: app });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error tracking application' });
  }
});

// GET /api/admissions/all - Admin Fetch All Applications
router.get('/all', async (req, res) => {
  try {
    await connectDB();
    let list = [];

    if (process.env.MONGODB_URI) {
      list = await Admission.find().sort({ appliedAt: -1 });
    } else {
      list = mockData.admissions;
    }

    return res.json({ success: true, count: list.length, applications: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching applications list' });
  }
});

// PUT /api/admissions/:id/status - Admin Approve / Reject Application
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const appId = req.params.id.trim().toUpperCase();

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await connectDB();
    let updatedApp = null;
    let assignedId = '';
    let uniquePassword = '';

    if (!process.env.MONGODB_URI) {
      updatedApp = mockData.admissions.find(a => a.applicationId.toUpperCase() === appId);
      if (!updatedApp) return res.status(404).json({ success: false, message: 'Application not found' });

      updatedApp.status = status;

      if (status === 'Approved') {
        if (!updatedApp.studentIdAssigned) {
          const studentCount = mockData.students.length;
          assignedId = `STU-2026-${101 + studentCount}`;
          updatedApp.studentIdAssigned = assignedId;
        } else {
          assignedId = updatedApp.studentIdAssigned;
        }

        if (!updatedApp.assignedPassword) {
          uniquePassword = 'JIG#' + Math.floor(1000 + Math.random() * 9000);
          updatedApp.assignedPassword = uniquePassword;
        } else {
          uniquePassword = updatedApp.assignedPassword;
        }

        // Auto create or sync student account with unique password
        let existingStu = mockData.students.find(s => s.studentId === assignedId);
        if (!existingStu) {
          mockData.students.unshift({
            _id: 'stu_' + Date.now(),
            studentId: assignedId,
            name: updatedApp.name,
            email: updatedApp.email,
            phone: updatedApp.phone,
            course: updatedApp.targetCourse,
            batch: 'Morning Batch Alpha',
            password: uniquePassword,
            admissionDate: new Date(),
            status: 'Active',
            feeStatus: 'Paid',
            feeDueAmount: 0,
            feeDueDate: 'N/A'
          });
        } else {
          existingStu.password = uniquePassword;
        }
      }
    } else {
      updatedApp = await Admission.findOne({ applicationId: appId });
      if (!updatedApp) return res.status(404).json({ success: false, message: 'Application not found' });

      updatedApp.status = status;

      if (status === 'Approved') {
        if (!updatedApp.studentIdAssigned) {
          const studentCount = await Student.countDocuments();
          assignedId = `STU-2026-${101 + studentCount}`;
          updatedApp.studentIdAssigned = assignedId;
        } else {
          assignedId = updatedApp.studentIdAssigned;
        }

        if (!updatedApp.assignedPassword) {
          uniquePassword = 'JIG#' + Math.floor(1000 + Math.random() * 9000);
          updatedApp.assignedPassword = uniquePassword;
        } else {
          uniquePassword = updatedApp.assignedPassword;
        }

        let existingStu = await Student.findOne({ studentId: assignedId });
        if (!existingStu) {
          const newStudent = new Student({
            studentId: assignedId,
            name: updatedApp.name,
            email: updatedApp.email,
            phone: updatedApp.phone,
            course: updatedApp.targetCourse,
            batch: 'Morning Batch Alpha',
            password: uniquePassword,
            admissionDate: new Date(),
            status: 'Active',
            feeStatus: 'Paid',
            feeDueAmount: 0,
            feeDueDate: 'N/A'
          });
          await newStudent.save();
        } else {
          existingStu.password = uniquePassword;
          await existingStu.save();
        }
      }

      await updatedApp.save();
    }

    if (status === 'Approved') {
      try {
        const resEmail = await sendStudentCredentialsEmail({
          studentEmail: updatedApp.email,
          name: updatedApp.name,
          studentId: assignedId || updatedApp.studentIdAssigned,
          password: uniquePassword || updatedApp.assignedPassword,
          course: updatedApp.targetCourse
        });
        console.log(`📧 [Student Credential Dispatch] Sent to ${updatedApp.email}:`, resEmail);
      } catch (errEmail) {
        console.error('Student credential dispatch error:', errEmail);
      }
    }

    return res.json({
      success: true,
      message: `Application ${appId} marked as ${status}`,
      assignedStudentId: assignedId || updatedApp.studentIdAssigned,
      assignedPassword: uniquePassword || updatedApp.assignedPassword
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error processing application status' });
  }
});

// DELETE /api/admissions/:id - Admin Delete Application permanently from database
router.delete('/:id', async (req, res) => {
  try {
    const appId = req.params.id.trim().toUpperCase();
    await connectDB();

    if (!process.env.MONGODB_URI) {
      mockData.admissions = mockData.admissions.filter(a => a.applicationId.toUpperCase() !== appId && a._id !== appId);
    } else {
      let query = { applicationId: appId };
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        query = { $or: [{ applicationId: appId }, { _id: req.params.id }] };
      }
      await Admission.findOneAndDelete(query);
    }

    return res.json({ success: true, message: `Application ${appId} deleted permanently from database.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting application: ' + err.message });
  }
});

module.exports = router;
