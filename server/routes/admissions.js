const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const { connectDB, getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');
const { hashPassword } = require('../config/authUtils');
const { sendAdmissionEmail, sendStudentCredentialsEmail } = require('../config/mailer');
const { requireAdmin } = require('../middleware/auth');

// POST /api/admissions/apply - Public Submit Admission Application
router.post('/apply', async (req, res) => {
  try {
    const { name, email, phone, targetCourse, previousPercentage, message, calculatedFee, selectedSubjects } = req.body;

    if (!name || !email || !phone || !targetCourse) {
      return res.status(400).json({ success: false, message: 'Name, Email, Phone, and Target Course are required.' });
    }

    const cleanName = String(name).trim().slice(0, 120);
    const cleanEmail = String(email).trim().slice(0, 120);
    const cleanPhone = String(phone).trim().slice(0, 30);
    const cleanCourse = String(targetCourse).trim().slice(0, 150);
    const cleanMessage = message ? String(message).trim().slice(0, 1000) : '';

    await connectDB();
    const appId = `ADM-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      applicationId: appId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      targetCourse: cleanCourse,
      calculatedFee: Number(calculatedFee) || 0,
      selectedSubjects: Array.isArray(selectedSubjects) ? selectedSubjects.slice(0, 20) : [],
      previousPercentage: Number(previousPercentage) || 0,
      message: cleanMessage,
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

    // Automatically send email notification to admin and academy
    try {
      const resMail = await sendAdmissionEmail(payload);
      console.log(`📧 [Email Dispatch] Dispatched application ${appId} email alert:`, resMail);
    } catch (errMail) {
      console.error('Email dispatch error:', errMail);
    }

    return res.json({
      success: true,
      message: 'Admission application submitted successfully!',
      applicationId: appId,
      emailNotified: 'jigyasascienceakademy@gmail.com'
    });
  } catch (err) {
    console.error('Error submitting application:', err);
    res.status(500).json({ success: false, message: 'Error submitting admission application: ' + err.message });
  }
});

// GET /api/admissions/status/:query - Track Application Status (Public)
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

// GET /api/admissions/all - Admin Fetch All Applications (Protected: Admin Only)
router.get('/all', requireAdmin, async (req, res) => {
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

// PUT /api/admissions/:id/status - Admin Approve / Reject Application (Protected: Admin Only)
router.put('/:id/status', requireAdmin, async (req, res) => {
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

        uniquePassword = 'JIG#' + Math.floor(1000 + Math.random() * 9000);
        const hashedPassword = hashPassword(uniquePassword);

        // Auto create or sync student account with hashed password
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
            password: hashedPassword,
            admissionDate: new Date(),
            status: 'Active',
            feeStatus: 'Paid',
            feeDueAmount: 0,
            feeDueDate: 'N/A'
          });
        } else {
          existingStu.password = hashedPassword;
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

        uniquePassword = 'JIG#' + Math.floor(1000 + Math.random() * 9000);
        const hashedPassword = hashPassword(uniquePassword);

        let existingStu = await Student.findOne({ studentId: assignedId });
        if (!existingStu) {
          const newStudent = new Student({
            studentId: assignedId,
            name: updatedApp.name,
            email: updatedApp.email,
            phone: updatedApp.phone,
            course: updatedApp.targetCourse,
            batch: 'Morning Batch Alpha',
            password: hashedPassword,
            admissionDate: new Date(),
            status: 'Active',
            feeStatus: 'Paid',
            feeDueAmount: 0,
            feeDueDate: 'N/A'
          });
          await newStudent.save();
        } else {
          existingStu.password = hashedPassword;
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
          password: uniquePassword,
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
      assignedStudentId: assignedId || updatedApp.studentIdAssigned
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error processing application status' });
  }
});

// DELETE /api/admissions/:id - Admin Delete Application (Protected: Admin Only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const appId = req.params.id.trim().toUpperCase();
    await connectDB();

    if (!process.env.MONGODB_URI) {
      mockData.admissions = mockData.admissions.filter(a => a.applicationId.toUpperCase() !== appId && a._id !== appId);
    } else {
      let query = { applicationId: appId };
      if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
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
