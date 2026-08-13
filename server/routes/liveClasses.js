const express = require('express');
const router = express.Router();
const LiveClass = require('../models/LiveClass');
const Student = require('../models/Student');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

// GET /api/live-classes: Fetch all scheduled live classes (Admin)
router.get('/', async (req, res) => {
  try {
    const { useMock } = getDbState();
    let classes = [];

    if (useMock) {
      if (!mockData.liveClasses) mockData.liveClasses = [];
      classes = mockData.liveClasses;
    } else {
      classes = await LiveClass.find().sort({ createdAt: -1 });
    }

    return res.json({ success: true, count: classes.length, liveClasses: classes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching live classes: ' + err.message });
  }
});

// GET /api/live-classes/student/:studentId: Fetch live class meeting links tailored for student's enrolled course
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { useMock } = getDbState();

    let student = null;
    let allClasses = [];

    if (useMock) {
      student = (mockData.students || []).find(s => s.studentId.toLowerCase() === studentId.toLowerCase());
      allClasses = mockData.liveClasses || [];
    } else {
      student = await Student.findOne({ studentId: new RegExp('^' + studentId + '$', 'i') });
      allClasses = await LiveClass.find().sort({ createdAt: -1 });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const studentCourse = (student.course || '').toLowerCase();

    // Filter live classes matching student's course or targetBatch === 'All Batches'
    const matchingClasses = allClasses.filter(c => {
      const target = (c.targetBatch || '').toLowerCase();
      if (target === 'all batches' || target === 'all students' || target === '') return true;
      return studentCourse.includes(target) || target.includes(studentCourse);
    });

    return res.json({
      success: true,
      studentId: student.studentId,
      studentCourse: student.course,
      count: matchingClasses.length,
      liveClasses: matchingClasses
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching student live classes: ' + err.message });
  }
});

// POST /api/live-classes/schedule: Admin schedule live class link
router.post('/schedule', async (req, res) => {
  try {
    const { title, targetBatch, meetingLink, date, time, notes } = req.body;

    if (!title || !meetingLink || !targetBatch) {
      return res.status(400).json({ success: false, message: 'Title, Target Batch, and Meeting Link are required.' });
    }

    const { useMock } = getDbState();

    let cleanLink = meetingLink.trim();
    if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      if (/^[a-z0-9]{3,4}-[a-z0-9]{3,4}-[a-z0-9]{3,4}$/i.test(cleanLink)) {
        cleanLink = 'https://meet.google.com/' + cleanLink;
      } else if (cleanLink.startsWith('meet.google.com/')) {
        cleanLink = 'https://' + cleanLink;
      } else {
        cleanLink = 'https://' + cleanLink;
      }
    }

    const newClass = {
      classId: 'LIV-' + Date.now().toString().slice(-5),
      title,
      targetBatch: targetBatch || 'All Batches',
      meetingLink: cleanLink,
      date: date || new Date().toISOString().split('T')[0],
      time: time || '7:30 PM - 9:00 PM',
      instructor: 'Shahriyar Taufik',
      notes: notes || '',
      status: 'Upcoming'
    };

    if (useMock) {
      if (!mockData.liveClasses) mockData.liveClasses = [];
      mockData.liveClasses.unshift(newClass);
    } else {
      await LiveClass.create(newClass);
    }

    return res.json({
      success: true,
      message: `Live class meeting link scheduled and broadcasted to batch "${targetBatch}"!`,
      liveClass: newClass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error scheduling live class: ' + err.message });
  }
});

// DELETE /api/live-classes/:classId: Admin delete scheduled live class
router.delete('/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { useMock } = getDbState();

    if (useMock) {
      mockData.liveClasses = (mockData.liveClasses || []).filter(c => c.classId !== classId);
    } else {
      await LiveClass.deleteOne({ classId });
    }

    return res.json({ success: true, message: 'Live class link removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting live class: ' + err.message });
  }
});

module.exports = router;
