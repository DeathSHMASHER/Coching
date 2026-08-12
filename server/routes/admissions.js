const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const { getDbState } = require('../config/db');
const { sendAdmissionEmail, sendStudentCredentialsEmail } = require('../config/mailer');

// POST /api/admissions/apply - Public Submit Admission Application
router.post('/apply', async (req, res) => {
  try {
    const { name, email, phone, targetCourse, previousPercentage, message } = req.body;

    if (!name || !email || !phone || !targetCourse) {
      return res.status(400).json({ success: false, message: 'Name, Email, Phone, and Target Course are required.' });
    }

    const { useMock } = getDbState();
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

    if (useMock) {
      payload._id = 'adm_' + Date.now();
      mockData.admissions.unshift(payload);
    } else {
      const newApp = new Admission(payload);
      await newApp.save();
    }

    // Automatically send email notification to shahriyartaufik@gmail.com
    sendAdmissionEmail(payload)
      .then(resMail => console.log(`📧 [Gmail Dispatch] Sent application ${appId} email alert to ${process.env.ADMIN_EMAIL || 'shahriyartaufik@gmail.com'}:`, resMail))
      .catch(errMail => console.error('Email dispatch error:', errMail));

    return res.json({
      success: true,
      message: 'Admission application submitted successfully!',
      applicationId: appId,
      emailNotified: process.env.ADMIN_EMAIL || 'shahriyartaufik@gmail.com'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error submitting admission application' });
  }
});

// GET /api/admissions/status/:query - Track Application Status
router.get('/status/:query', async (req, res) => {
  try {
    const queryStr = req.params.query.trim().toUpperCase();
    const { useMock } = getDbState();

    let app = null;

    if (useMock) {
      app = mockData.admissions.find(a =>
        a.applicationId.toUpperCase() === queryStr ||
        (a.studentIdAssigned && a.studentIdAssigned.toUpperCase() === queryStr) ||
        a.email.toUpperCase() === queryStr ||
        a.phone.replace(/\D/g, '').includes(queryStr.replace(/\D/g, ''))
      );
    } else {
      const regex = new RegExp('^' + queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      app = await Admission.findOne({
        $or: [
          { applicationId: regex },
          { studentIdAssigned: regex },
          { email: regex },
          { phone: new RegExp(queryStr.replace(/\D/g, ''), 'i') }
        ]
      });
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
    const { useMock } = getDbState();
    let list = [];

    if (useMock) {
      list = mockData.admissions;
    } else {
      list = await Admission.find().sort({ appliedAt: -1 });
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

    const { useMock } = getDbState();
    let updatedApp = null;
    let assignedId = '';
    let uniquePassword = '';

    if (useMock) {
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
      sendStudentCredentialsEmail({
        studentEmail: updatedApp.email,
        name: updatedApp.name,
        studentId: assignedId || updatedApp.studentIdAssigned,
        password: uniquePassword || updatedApp.assignedPassword,
        course: updatedApp.targetCourse
      }).then(resEmail => console.log(`📧 [Student Credential Dispatch] Sent to ${updatedApp.email}:`, resEmail))
        .catch(errEmail => console.error('Student credential dispatch error:', errEmail));
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
    const { useMock } = getDbState();

    if (useMock) {
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
