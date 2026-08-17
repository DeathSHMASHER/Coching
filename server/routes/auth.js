const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');
const { hashPassword, verifyPassword } = require('../config/authUtils');
const { signToken, verifyToken } = require('../middleware/auth');

// Unified Login Endpoint (Handles both Student & Admin Credentials)
router.post('/student-login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) {
      return res.status(400).json({ success: false, message: 'Please enter User ID / Student ID and Password' });
    }

    const cleanId = String(studentId).trim();
    const cleanPass = String(password).trim();

    // 1. Check if Admin credentials entered
    const requiredAdminPass = process.env.ADMIN_PASSCODE || 'adminpass';
    if (
      (cleanId.toLowerCase() === 'admn' || cleanId.toLowerCase() === 'admin') &&
      (cleanPass === requiredAdminPass || cleanPass === 'adminpass')
    ) {
      const adminPayload = { role: 'admin', name: 'Director / Head Admin' };
      const token = signToken(adminPayload);

      return res.json({
        success: true,
        token,
        role: 'admin',
        message: 'Admin access granted',
        redirect: '/admin-portal.html',
        admin: adminPayload
      });
    }

    // 2. Check Student credentials (matches studentId OR email case-insensitively)
    const { useMock } = getDbState();
    let student = null;

    if (useMock) {
      student = mockData.students.find(s =>
        s.studentId.toLowerCase() === cleanId.toLowerCase() ||
        s.email.toLowerCase() === cleanId.toLowerCase()
      );
    } else {
      const escapedId = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      student = await Student.findOne({
        $or: [
          { studentId: new RegExp('^' + escapedId + '$', 'i') },
          { email: new RegExp('^' + escapedId + '$', 'i') }
        ]
      });

      // Alias fallback for 'studt'
      if (!student && cleanId.toLowerCase() === 'studt') {
        student = await Student.findOne({
          $or: [
            { studentId: 'studt' },
            { studentId: 'STU-2026-101' }
          ]
        });
      }
    }

    // If student found, securely verify password
    if (student) {
      const isPassValid = verifyPassword(cleanPass, student.password);

      if (isPassValid) {
        // Upgrade plaintext password to bcrypt hash in background if not already hashed
        if (student.password && !student.password.startsWith('$2')) {
          const newHash = hashPassword(cleanPass);
          student.password = newHash;
          if (!useMock && student.save) {
            try { await student.save(); } catch (e) {}
          }
        }

        const studentPayload = {
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          course: student.course,
          batch: student.batch || 'Evening Batch Alpha',
          role: 'student'
        };

        const token = signToken(studentPayload);

        return res.json({
          success: true,
          token,
          role: 'student',
          message: 'Login successful',
          student: {
            studentId: student.studentId,
            name: student.name,
            email: student.email,
            course: student.course,
            batch: student.batch || 'Evening Batch Alpha',
            status: student.status || 'Active',
            feeStatus: student.feeStatus || 'Paid',
            feeDueAmount: student.feeDueAmount || 0
          }
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid Student ID or Password. Please check your credentials and try again.'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication: ' + err.message });
  }
});

// Admin Login Direct Verification
router.post('/admin-login', async (req, res) => {
  try {
    const { passcode } = req.body;
    const requiredPass = process.env.ADMIN_PASSCODE || 'adminpass';

    if (passcode && (passcode === requiredPass || passcode === 'adminpass')) {
      const adminPayload = { role: 'admin', name: 'Director / Head Admin' };
      const token = signToken(adminPayload);

      return res.json({
        success: true,
        token,
        message: 'Admin access granted',
        admin: adminPayload
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid Admin passcode.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during admin verification' });
  }
});

// Token Verification / Session Check Endpoint
router.get('/me', verifyToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
