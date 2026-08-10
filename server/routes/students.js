const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

// Admin / Public Directory: Get all registered students
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

// Admin: Create / Register student manually
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
        batch: batch || 'Morning Batch Alpha',
        password: password || 'password123',
        admissionDate: new Date(),
        status: 'Active',
        feeStatus: feeStatus || 'Paid',
        feeDueAmount: Number(feeDueAmount) || 0,
        feeDueDate: feeDueDate || 'N/A'
      };
      mockData.students.unshift(newStudent);
      return res.json({ success: true, message: 'Student registered successfully', student: newStudent });
    } else {
      const count = await Student.countDocuments();
      nextStudentId = `STU-2026-${101 + count}`;
      const newStudent = new Student({
        studentId: nextStudentId,
        name,
        email,
        phone: phone || '+91 90000 00000',
        course,
        batch: batch || 'Morning Batch Alpha',
        password: password || 'password123',
        admissionDate: new Date(),
        status: 'Active',
        feeStatus: feeStatus || 'Paid',
        feeDueAmount: Number(feeDueAmount) || 0,
        feeDueDate: feeDueDate || 'N/A'
      });
      await newStudent.save();
      return res.json({ success: true, message: 'Student registered successfully', student: newStudent });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error registering student' });
  }
});

// Admin: Update student fee status
router.put('/:studentId/fee', async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    const { feeStatus, feeDueAmount, feeDueDate } = req.body;

    const { useMock } = getDbState();

    if (useMock) {
      const stu = mockData.students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
      if (!stu) return res.status(404).json({ success: false, message: 'Student not found' });

      if (feeStatus) stu.feeStatus = feeStatus;
      if (feeDueAmount !== undefined) stu.feeDueAmount = Number(feeDueAmount);
      if (feeDueDate) stu.feeDueDate = feeDueDate;

      return res.json({ success: true, message: 'Fee record updated successfully', student: stu });
    } else {
      const stu = await Student.findOneAndUpdate(
        { studentId: new RegExp('^' + cleanId + '$', 'i') },
        { feeStatus, feeDueAmount: Number(feeDueAmount), feeDueDate },
        { new: true }
      );
      if (!stu) return res.status(404).json({ success: false, message: 'Student not found' });
      return res.json({ success: true, message: 'Fee record updated successfully', student: stu });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating fee status' });
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
