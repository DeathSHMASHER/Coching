const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

// Admin / Public Directory: Get all registered students with passwords for Admin
router.get('/', async (req, res) => {
  try {
    const { useMock } = getDbState();
    let students = [];

    if (useMock) {
      students = mockData.students;
    } else {
      students = await Student.find().sort({ createdAt: -1 });
    }

    return res.json({
      success: true,
      count: students.length,
      students: students.map(s => ({
        studentId: s.studentId,
        name: s.name,
        email: s.email,
        phone: s.phone,
        course: s.course,
        batch: s.batch,
        password: s.password || '1234',
        status: s.status,
        feeStatus: s.feeStatus || 'Paid',
        feeDueAmount: s.feeDueAmount || 0,
        feeDueDate: s.feeDueDate || 'N/A',
        admissionDate: s.admissionDate
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching students list' });
  }
});

// Get single student profile by Student ID
router.get('/:studentId', async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { useMock } = getDbState();

    let student = null;

    if (useMock) {
      student = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
    } else {
      student = await Student.findOne({ studentId: new RegExp('^' + cleanId + '$', 'i') });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    return res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching student details' });
  }
});

// Admin: Create / Register student manually with unique Student ID & Password
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, course, batch, password, feeStatus, feeDueAmount, feeDueDate } = req.body;
    if (!name || !email || !course) {
      return res.status(400).json({ success: false, message: 'Name, Email and Course are required.' });
    }

    const { useMock } = getDbState();
    let nextStudentId = '';

    if (useMock) {
      const count = mockData.students.length;
      nextStudentId = `STU-2026-${101 + count}`;
      const newStudent = {
        _id: 'stu_' + Date.now(),
        studentId: nextStudentId,
        name,
        email,
        phone: phone || '+91 90000 00000',
        course,
        batch: batch || 'Evening Batch Alpha',
        password: password || '1234',
        admissionDate: new Date(),
        status: 'Active',
        feeStatus: feeStatus || 'Paid',
        feeDueAmount: Number(feeDueAmount) || 0,
        feeDueDate: feeDueDate || 'N/A'
      };
      mockData.students.unshift(newStudent);
      return res.json({ success: true, message: `Student registered! ID: ${nextStudentId} | Password: ${newStudent.password}`, student: newStudent });
    } else {
      const count = await Student.countDocuments();
      nextStudentId = `STU-2026-${101 + count}`;
      const newStudent = new Student({
        studentId: nextStudentId,
        name,
        email,
        phone: phone || '+91 90000 00000',
        course,
        batch: batch || 'Evening Batch Alpha',
        password: password || '1234',
        admissionDate: new Date(),
        status: 'Active',
        feeStatus: feeStatus || 'Paid',
        feeDueAmount: Number(feeDueAmount) || 0,
        feeDueDate: feeDueDate || 'N/A'
      });
      await newStudent.save();
      return res.json({ success: true, message: `Student registered! ID: ${nextStudentId} | Password: ${newStudent.password}`, student: newStudent });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error registering student: ' + err.message });
  }
});

// Admin: Reset / Update student password
router.put('/:studentId/password', async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    const { useMock } = getDbState();

    if (useMock) {
      const stu = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
      if (!stu) return res.status(404).json({ success: false, message: 'Student not found' });
      stu.password = password.trim();
      return res.json({ success: true, message: `Password for ${cleanId} updated to "${stu.password}"!`, student: stu });
    } else {
      const stu = await Student.findOneAndUpdate(
        { studentId: new RegExp('^' + cleanId + '$', 'i') },
        { password: password.trim() },
        { new: true }
      );
      if (!stu) return res.status(404).json({ success: false, message: 'Student not found' });
      return res.json({ success: true, message: `Password for ${cleanId} updated to "${stu.password}"!`, student: stu });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error resetting student password: ' + err.message });
  }
});

// Admin: Update Student Fee Status & Due Amount
router.put('/:studentId/fee', async (req, res) => {
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
      let query = { studentId: new RegExp('^' + cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') };
      if (mongoose.Types.ObjectId.isValid(cleanId)) {
        query = { $or: [{ studentId: new RegExp('^' + cleanId + '$', 'i') }, { _id: cleanId }] };
      }

      const stu = await Student.findOneAndUpdate(
        query,
        updateFields,
        { new: true }
      );

      if (!stu) return res.status(404).json({ success: false, message: 'Student record not found in database' });

      return res.json({ success: true, message: `Fee status for ${stu.name} updated to ${stu.feeStatus} (Due: ₹${stu.feeDueAmount})!`, student: stu });
    } else {
      const stu = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase() || s._id === cleanId);
      if (!stu) return res.status(404).json({ success: false, message: 'Student profile not found' });

      if (feeStatus) stu.feeStatus = feeStatus;
      if (feeDueAmount !== undefined) stu.feeDueAmount = Number(feeDueAmount);

      return res.json({ success: true, message: `Fee status for ${stu.name} updated to ${stu.feeStatus} (Due: ₹${stu.feeDueAmount})!`, student: stu });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating fee status: ' + err.message });
  }
});

// Admin: Update Full Student Profile Information
router.put('/:studentId', async (req, res) => {
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
    if (password) updateFields.password = password.trim();
    if (status) updateFields.status = status;
    if (feeStatus) updateFields.feeStatus = feeStatus;
    if (feeDueAmount !== undefined) updateFields.feeDueAmount = Number(feeDueAmount);

    if (useMock) {
      const stu = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
      if (!stu) return res.status(404).json({ success: false, message: 'Student profile not found' });
      Object.assign(stu, updateFields);
      return res.json({ success: true, message: `Student profile ${cleanId} updated live!`, student: stu });
    } else {
      const stu = await Student.findOneAndUpdate(
        { studentId: new RegExp('^' + cleanId + '$', 'i') },
        updateFields,
        { new: true }
      );
      if (!stu) return res.status(404).json({ success: false, message: 'Student profile not found' });
      return res.json({ success: true, message: `Student profile ${cleanId} updated live!`, student: stu });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating student profile: ' + err.message });
  }
});

// Admin: Delete student account permanently from database
router.delete('/:studentId', async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { useMock } = getDbState();

    if (useMock) {
      mockData.students = mockData.students.filter(s => s.studentId.toLowerCase() !== cleanId.toLowerCase() && s._id !== cleanId);
    } else {
      let query = { studentId: new RegExp('^' + cleanId + '$', 'i') };
      if (mongoose.Types.ObjectId.isValid(req.params.studentId)) {
        query = { $or: [{ studentId: new RegExp('^' + cleanId + '$', 'i') }, { _id: req.params.studentId }] };
      }
      await Student.findOneAndDelete(query);
    }

    return res.json({ success: true, message: `Student ${cleanId} deleted permanently from database.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting student record: ' + err.message });
  }
});

module.exports = router;
