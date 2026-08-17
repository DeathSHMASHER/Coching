const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const { connectDB, getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');
const { hashPassword } = require('../config/authUtils');
const { requireAdmin, requireStudentOrAdmin } = require('../middleware/auth');

// Helper to sanitize student object (removes password)
function sanitizeStudent(s) {
  const doc = s.toObject ? s.toObject() : { ...s };
  delete doc.password;
  return doc;
}

// Admin Directory: Get all registered students (Protected: Admin Only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { useMock } = getDbState();
    let students = [];

    if (useMock) {
      students = mockData.students;
    } else {
      students = await Student.find().select('-password').sort({ createdAt: -1 });
    }

    return res.json({
      success: true,
      count: students.length,
      students: students.map(s => sanitizeStudent(s))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching students list' });
  }
});

// Get single student profile by Student ID (Protected: Admin or the Student)
router.get('/:studentId', requireStudentOrAdmin, async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { useMock } = getDbState();

    let student = null;

    if (useMock) {
      student = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
    } else {
      const escapedId = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      student = await Student.findOne({ studentId: new RegExp('^' + escapedId + '$', 'i') }).select('-password');
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    return res.json({ success: true, student: sanitizeStudent(student) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching student details' });
  }
});

// Admin: Create / Register student manually with unique Student ID & Hashed Password
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, course, batch, password, feeStatus, feeDueAmount, feeDueDate } = req.body;
    if (!name || !email || !course) {
      return res.status(400).json({ success: false, message: 'Name, Email and Course are required.' });
    }

    const { useMock } = getDbState();
    let nextStudentId = '';
    const rawPass = password || '1234';
    const hashedPassword = hashPassword(rawPass);

    if (useMock) {
      const count = mockData.students.length;
      nextStudentId = `STU-2026-${101 + count}`;
      const newStudent = {
        _id: 'stu_' + Date.now(),
        studentId: nextStudentId,
        name: name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : '+91 90000 00000',
        course: course.trim(),
        batch: batch ? batch.trim() : 'Evening Batch Alpha',
        password: hashedPassword,
        admissionDate: new Date(),
        status: 'Active',
        feeStatus: feeStatus || 'Paid',
        feeDueAmount: Number(feeDueAmount) || 0,
        feeDueDate: feeDueDate || 'N/A'
      };
      mockData.students.unshift(newStudent);
      return res.json({
        success: true,
        message: `Student registered! ID: ${nextStudentId}`,
        student: sanitizeStudent(newStudent)
      });
    } else {
      const count = await Student.countDocuments();
      nextStudentId = `STU-2026-${101 + count}`;
      const newStudent = new Student({
        studentId: nextStudentId,
        name: name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : '+91 90000 00000',
        course: course.trim(),
        batch: batch ? batch.trim() : 'Evening Batch Alpha',
        password: hashedPassword,
        admissionDate: new Date(),
        status: 'Active',
        feeStatus: feeStatus || 'Paid',
        feeDueAmount: Number(feeDueAmount) || 0,
        feeDueDate: feeDueDate || 'N/A'
      });
      await newStudent.save();
      return res.json({
        success: true,
        message: `Student registered! ID: ${nextStudentId}`,
        student: sanitizeStudent(newStudent)
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error registering student: ' + err.message });
  }
});

// Admin: Reset / Update student password
router.put('/:studentId/password', requireAdmin, async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { password } = req.body;

    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    const hashedPassword = hashPassword(password.trim());
    const { useMock } = getDbState();

    if (useMock) {
      const stu = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
      if (!stu) return res.status(404).json({ success: false, message: 'Student not found' });
      stu.password = hashedPassword;
      return res.json({ success: true, message: `Password for ${cleanId} updated successfully!` });
    } else {
      const escapedId = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const stu = await Student.findOneAndUpdate(
        { studentId: new RegExp('^' + escapedId + '$', 'i') },
        { password: hashedPassword },
        { new: true }
      );
      if (!stu) return res.status(404).json({ success: false, message: 'Student not found' });
      return res.json({ success: true, message: `Password for ${cleanId} updated successfully!` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error resetting student password: ' + err.message });
  }
});

// Admin: Update Student Fee Status & Due Amount
router.put('/:studentId/fee', requireAdmin, async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { feeStatus, feeDueAmount } = req.body;

    await connectDB();

    const updateFields = {};
    if (feeStatus) {
      let cleanStatus = feeStatus;
      if (feeStatus.includes('Paid')) cleanStatus = 'Paid';
      else if (feeStatus.includes('Partial')) cleanStatus = 'Partial';
      else if (feeStatus.includes('Unpaid') || feeStatus.includes('Due')) cleanStatus = 'Unpaid';
      updateFields.feeStatus = cleanStatus;
    }
    if (feeDueAmount !== undefined) updateFields.feeDueAmount = Number(feeDueAmount);

    if (process.env.MONGODB_URI) {
      const escapedId = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let query = { studentId: new RegExp('^' + escapedId + '$', 'i') };
      if (/^[0-9a-fA-F]{24}$/.test(cleanId)) {
        query = { $or: [{ studentId: new RegExp('^' + escapedId + '$', 'i') }, { _id: cleanId }] };
      }

      const stu = await Student.findOneAndUpdate(
        query,
        updateFields,
        { new: true }
      ).select('-password');

      if (!stu) return res.status(404).json({ success: false, message: 'Student record not found in database' });

      return res.json({ success: true, message: `Fee status for ${stu.name} updated to ${stu.feeStatus} (Due: ₹${stu.feeDueAmount})!`, student: sanitizeStudent(stu) });
    } else {
      const stu = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase() || s._id === cleanId);
      if (!stu) return res.status(404).json({ success: false, message: 'Student profile not found' });

      if (feeStatus) stu.feeStatus = feeStatus;
      if (feeDueAmount !== undefined) stu.feeDueAmount = Number(feeDueAmount);

      return res.json({ success: true, message: `Fee status for ${stu.name} updated to ${stu.feeStatus} (Due: ₹${stu.feeDueAmount})!`, student: sanitizeStudent(stu) });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating fee status: ' + err.message });
  }
});

// Admin: Update Full Student Profile Information
router.put('/:studentId', requireAdmin, async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { name, email, phone, course, batch, password, status, feeStatus, feeDueAmount } = req.body;
    const { useMock } = getDbState();

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (email) updateFields.email = email.trim();
    if (phone) updateFields.phone = phone.trim();
    if (course) updateFields.course = course.trim();
    if (batch) updateFields.batch = batch.trim();
    if (password && password.trim()) updateFields.password = hashPassword(password.trim());
    if (status) updateFields.status = status;
    if (feeStatus) updateFields.feeStatus = feeStatus;
    if (feeDueAmount !== undefined) updateFields.feeDueAmount = Number(feeDueAmount);

    if (useMock) {
      const stu = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
      if (!stu) return res.status(404).json({ success: false, message: 'Student profile not found' });
      Object.assign(stu, updateFields);
      return res.json({ success: true, message: `Student profile ${cleanId} updated live!`, student: sanitizeStudent(stu) });
    } else {
      const escapedId = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const stu = await Student.findOneAndUpdate(
        { studentId: new RegExp('^' + escapedId + '$', 'i') },
        updateFields,
        { new: true }
      ).select('-password');
      if (!stu) return res.status(404).json({ success: false, message: 'Student profile not found' });
      return res.json({ success: true, message: `Student profile ${cleanId} updated live!`, student: sanitizeStudent(stu) });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating student profile: ' + err.message });
  }
});

// Admin: Delete student account permanently from database
router.delete('/:studentId', requireAdmin, async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { useMock } = getDbState();

    if (useMock) {
      mockData.students = mockData.students.filter(s => s.studentId.toLowerCase() !== cleanId.toLowerCase() && s._id !== cleanId);
    } else {
      const escapedId = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let query = { studentId: new RegExp('^' + escapedId + '$', 'i') };
      if (/^[0-9a-fA-F]{24}$/.test(cleanId)) {
        query = { $or: [{ studentId: new RegExp('^' + escapedId + '$', 'i') }, { _id: cleanId }] };
      }
      await Student.findOneAndDelete(query);
    }

    return res.json({ success: true, message: `Student ${cleanId} deleted permanently from database.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting student record: ' + err.message });
  }
});

module.exports = router;
