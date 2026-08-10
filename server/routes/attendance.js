const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

// Student: Get attendance logs & stats for studentId
router.get('/:studentId', async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim().toUpperCase();
    const { useMock } = getDbState();

    let logs = [];

    if (useMock) {
      logs = mockData.attendance.filter(a => a.studentId.toUpperCase() === cleanId);
    } else {
      logs = await Attendance.find({ studentId: cleanId }).sort({ date: -1 });
    }

    const totalDays = logs.length;
    const presentCount = logs.filter(l => l.status === 'Present').length;
    const absentCount = logs.filter(l => l.status === 'Absent').length;
    const lateCount = logs.filter(l => l.status === 'Late').length;
    const excusedCount = logs.filter(l => l.status === 'Excused').length;

    const percentage = totalDays > 0
      ? Math.round(((presentCount + (lateCount * 0.5)) / totalDays) * 100)
      : 100;

    return res.json({
      success: true,
      studentId: cleanId,
      summary: {
        totalDays,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        percentage
      },
      logs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching attendance details' });
  }
});

// Admin: Mark or Update attendance for a student
router.post('/mark', async (req, res) => {
  try {
    const { studentId, date, status, topicCovered } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({ success: false, message: 'Student ID, Date, and Status are required.' });
    }

    const cleanId = studentId.trim().toUpperCase();
    const { useMock } = getDbState();

    if (useMock) {
      const existingIndex = mockData.attendance.findIndex(
        a => a.studentId.toUpperCase() === cleanId && a.date === date
      );

      if (existingIndex > -1) {
        mockData.attendance[existingIndex].status = status;
        if (topicCovered) mockData.attendance[existingIndex].topicCovered = topicCovered;
      } else {
        mockData.attendance.unshift({
          _id: 'att_' + Date.now(),
          studentId: cleanId,
          date,
          status,
          topicCovered: topicCovered || 'Regular Scheduled Lecture',
          updatedBy: 'Admin'
        });
      }

      return res.json({ success: true, message: `Attendance recorded as ${status} for ${date}` });
    } else {
      await Attendance.findOneAndUpdate(
        { studentId: cleanId, date },
        { status, topicCovered: topicCovered || 'Regular Scheduled Lecture', updatedBy: 'Admin' },
        { upsert: true, new: true }
      );

      return res.json({ success: true, message: `Attendance recorded as ${status} for ${date}` });
    }
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ success: false, message: 'Error saving attendance record' });
  }
});

module.exports = router;
