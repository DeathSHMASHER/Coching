const express = require('express');
const router = express.Router();
const LiveClass = require('../models/LiveClass');
const LiveClassLog = require('../models/LiveClassLog');
const Student = require('../models/Student');
const { connectDB, getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

// Helper: Compile raw phone or clipboard text into a clean Google Meet URL
function compileMeetLink(input) {
  if (!input) return 'https://meet.google.com';
  let str = String(input).trim();

  // Extract URL substring if full text copied from phone (e.g. "Join Meet: https://meet.google.com/xyz")
  const urlMatch = str.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    str = urlMatch[0];
  }

  // Remove internal spaces
  str = str.replace(/\s+/g, '');

  if (/^https?:\/\//i.test(str)) {
    return str;
  }

  if (/^meet\.google\.com/i.test(str) || /^google\.com\/meet/i.test(str)) {
    return 'https://' + str;
  }

  const cleanCode = str.replace(/[^a-zA-Z0-9-]/g, '');
  if (/^[a-z0-9]{3,4}-[a-z0-9]{3,4}-[a-z0-9]{3,4}$/i.test(cleanCode)) {
    return 'https://meet.google.com/' + cleanCode;
  }

  if (/^[a-z0-9]{10}$/i.test(cleanCode)) {
    const formatted = `${cleanCode.slice(0,3)}-${cleanCode.slice(3,7)}-${cleanCode.slice(7)}`;
    return 'https://meet.google.com/' + formatted;
  }

  return 'https://' + str;
}

// GET /api/live-classes: Fetch all scheduled live classes (Admin)
router.get('/', async (req, res) => {
  try {
    await connectDB();
    let classes = [];

    if (process.env.MONGODB_URI) {
      classes = await LiveClass.find().sort({ createdAt: -1 });
    } else {
      classes = mockData.liveClasses || [];
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
    await connectDB();

    let student = null;
    let allClasses = [];

    if (process.env.MONGODB_URI) {
      student = await Student.findOne({ studentId: new RegExp('^' + studentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
      allClasses = await LiveClass.find().sort({ createdAt: -1 });
    } else {
      student = (mockData.students || []).find(s => s.studentId.toLowerCase() === studentId.toLowerCase());
      allClasses = mockData.liveClasses || [];
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

    await connectDB();
    const cleanLink = compileMeetLink(meetingLink);

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

    if (process.env.MONGODB_URI) {
      await LiveClass.create(newClass);
    } else {
      if (!mockData.liveClasses) mockData.liveClasses = [];
      mockData.liveClasses.unshift(newClass);
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

// POST /api/live-classes/join-log: Student joins live class, log exact timestamp down to the second
router.post('/join-log', async (req, res) => {
  try {
    const { classId, classTitle, studentId, studentName, targetBatch } = req.body;

    if (!studentId || !classId) {
      return res.status(400).json({ success: false, message: 'Student ID and Class ID are required.' });
    }

    await connectDB();

    const now = new Date();
    const joinedAtFormatted = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }); // e.g. "13 Aug 2026, 07:15:34 PM"

    const logData = {
      classId,
      classTitle: classTitle || 'Live Class Session',
      studentId: studentId.trim().toUpperCase(),
      studentName: studentName || 'Registered Student',
      targetBatch: targetBatch || 'General Batch',
      joinedAtFormatted,
      joinedAt: now
    };

    if (process.env.MONGODB_URI) {
      const newLog = new LiveClassLog(logData);
      await newLog.save();
    } else {
      if (!mockData.liveClassLogs) mockData.liveClassLogs = [];
      mockData.liveClassLogs.unshift(logData);
    }

    return res.json({
      success: true,
      message: `Student join timestamp recorded at ${joinedAtFormatted}`,
      log: logData
    });
  } catch (err) {
    console.error('Error logging student join timestamp:', err);
    res.status(500).json({ success: false, message: 'Error recording join timestamp' });
  }
});

// GET /api/live-classes/join-logs: Admin / Mentor fetch all student join logs
router.get('/join-logs', async (req, res) => {
  try {
    await connectDB();
    let logs = [];

    if (process.env.MONGODB_URI) {
      logs = await LiveClassLog.find().sort({ joinedAt: -1 });
    } else {
      logs = mockData.liveClassLogs || [];
    }

    return res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching live class join logs' });
  }
});

// DELETE /api/live-classes/:classId: Admin delete scheduled live class
router.delete('/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    await connectDB();

    if (process.env.MONGODB_URI) {
      await LiveClass.deleteOne({ classId });
    } else {
      mockData.liveClasses = (mockData.liveClasses || []).filter(c => c.classId !== classId);
    }

    return res.json({ success: true, message: 'Live class link removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting live class: ' + err.message });
  }
});

module.exports = router;
