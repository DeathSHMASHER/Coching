const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Doubt = require('../models/Doubt');
const { connectDB, getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

// Student: Get doubts for a specific student
router.get('/student/:studentId', async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    await connectDB();

    let doubts = [];

    if (process.env.MONGODB_URI) {
      const regex = new RegExp('^' + cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      doubts = await Doubt.find({
        $or: [{ studentId: regex }, { studentId: cleanId }]
      }).sort({ createdAt: -1 });
    } else {
      doubts = (mockData.doubts || []).filter(d => d.studentId.toLowerCase() === cleanId.toLowerCase());
    }

    return res.json({ success: true, count: doubts.length, doubts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching doubts' });
  }
});

// Alias: /api/doubts/:studentId
router.get('/:studentId', async (req, res, next) => {
  if (req.params.studentId === 'all') return next();
  req.url = '/student/' + encodeURIComponent(req.params.studentId);
  return router.handle(req, res, next);
});

// Admin: Get all doubts (pending & resolved)
router.get('/all', async (req, res) => {
  try {
    await connectDB();
    let doubts = [];

    if (process.env.MONGODB_URI) {
      doubts = await Doubt.find().sort({ createdAt: -1 });
    } else {
      doubts = mockData.doubts || [];
    }

    return res.json({ success: true, count: doubts.length, doubts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching all doubts' });
  }
});

// Student: Submit new doubt
router.post('/raise', async (req, res) => {
  try {
    const { studentId, studentName, subject, topic, question } = req.body;

    if (!studentId || !subject || !topic || !question) {
      return res.status(400).json({ success: false, message: 'Student ID, Subject, Topic, and Question are required.' });
    }

    const cleanId = studentId.trim();
    const doubtId = `DBT-${Math.floor(100 + Math.random() * 900)}`;
    const { useMock } = getDbState();

    const doubtData = {
      doubtId,
      studentId: cleanId,
      studentName: studentName || 'Registered Student',
      subject,
      topic,
      question,
      status: 'Pending',
      solution: '',
      createdAt: new Date()
    };

    if (useMock) {
      doubtData._id = 'dbt_' + Date.now();
      mockData.doubts.unshift(doubtData);
      return res.json({ success: true, message: 'Doubt raised successfully! Admin will respond shortly.', doubt: doubtData });
    } else {
      const newDbt = new Doubt(doubtData);
      await newDbt.save();
      return res.json({ success: true, message: 'Doubt raised successfully! Admin will respond shortly.', doubt: newDbt });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error submitting doubt' });
  }
});

// Admin: Solve & resolve student doubt
router.put('/:doubtId/resolve', async (req, res) => {
  try {
    const { doubtId } = req.params;
    const { solution } = req.body;

    if (!solution || !solution.trim()) {
      return res.status(400).json({ success: false, message: 'Solution text is required.' });
    }

    const { useMock } = getDbState();

    if (useMock) {
      const dbt = mockData.doubts.find(d => d.doubtId === doubtId || d._id === doubtId);
      if (!dbt) {
        return res.status(404).json({ success: false, message: 'Doubt ticket not found.' });
      }
      dbt.status = 'Resolved';
      dbt.solution = solution;
      dbt.answeredAt = new Date();

      return res.json({ success: true, message: 'Doubt solution published.', doubt: dbt });
    } else {
      let query = { doubtId: doubtId };
      if (mongoose.Types.ObjectId.isValid(doubtId)) {
        query = { $or: [{ doubtId }, { _id: doubtId }] };
      }
      const dbt = await Doubt.findOneAndUpdate(
        query,
        { status: 'Resolved', solution, answeredAt: new Date() },
        { new: true }
      );

      if (!dbt) {
        return res.status(404).json({ success: false, message: 'Doubt ticket not found.' });
      }

      return res.json({ success: true, message: 'Doubt solution published.', doubt: dbt });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating doubt solution' });
  }
});

// Admin: Delete doubt ticket permanently from database
router.delete('/:doubtId', async (req, res) => {
  try {
    const { doubtId } = req.params;
    const { useMock } = getDbState();

    if (useMock) {
      mockData.doubts = mockData.doubts.filter(d => d.doubtId !== doubtId && d._id !== doubtId);
    } else {
      let query = { doubtId: doubtId };
      if (mongoose.Types.ObjectId.isValid(doubtId)) {
        query = { $or: [{ doubtId }, { _id: doubtId }] };
      }
      await Doubt.findOneAndDelete(query);
    }

    return res.json({ success: true, message: 'Doubt ticket deleted permanently from database.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting doubt ticket: ' + err.message });
  }
});

module.exports = router;
