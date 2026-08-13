const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const FeedbackRequest = require('../models/FeedbackRequest');
const Student = require('../models/Student');
const { connectDB, getDbState } = require('../config/db');
const { mockData, computeFeedbackIndex } = require('../config/mockStore');

// GET /api/feedback/index: Dynamically calculated feedback score index for Home Screen
router.get('/index', async (req, res) => {
  try {
    await connectDB();
    let list = [];

    if (process.env.MONGODB_URI) {
      list = await Feedback.find().sort({ createdAt: -1 });
    } else {
      list = mockData.feedback || [];
    }

    if (!list.length) {
      return res.json({
        success: true,
        feedbackIndex: {
          averageRating: 5.0,
          clarityAvg: 5.0,
          materialAvg: 5.0,
          supportAvg: 5.0,
          satisfactionPercentage: 100,
          totalResponses: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          recentFeedback: []
        }
      });
    }

    let totalOverall = 0;
    let totalClarity = 0;
    let totalMaterial = 0;
    let totalSupport = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    list.forEach(item => {
      totalOverall += item.overallRating;
      totalClarity += item.clarityRating || item.overallRating;
      totalMaterial += item.materialRating || item.overallRating;
      totalSupport += item.supportRating || item.overallRating;
      const rounded = Math.round(item.overallRating);
      if (distribution[rounded] !== undefined) {
        distribution[rounded]++;
      }
    });

    const count = list.length;
    const averageRating = (totalOverall / count).toFixed(1);
    const clarityAvg = (totalClarity / count).toFixed(1);
    const materialAvg = (totalMaterial / count).toFixed(1);
    const supportAvg = (totalSupport / count).toFixed(1);
    const satisfactionPercentage = Math.round((averageRating / 5) * 100);

    return res.json({
      success: true,
      feedbackIndex: {
        averageRating: parseFloat(averageRating),
        clarityAvg: parseFloat(clarityAvg),
        materialAvg: parseFloat(materialAvg),
        supportAvg: parseFloat(supportAvg),
        satisfactionPercentage,
        totalResponses: count,
        distribution,
        recentFeedback: list.slice(0, 6)
      }
    });
  } catch (err) {
    console.error('Fetch feedback index error:', err);
    res.status(500).json({ success: false, message: 'Error computing dynamic feedback index' });
  }
});

// Admin: Post Feedback Request for specific batch
router.post('/request', async (req, res) => {
  try {
    const { title, targetBatch } = req.body;
    if (!title || !targetBatch) {
      return res.status(400).json({ success: false, message: 'Title and Target Batch are required.' });
    }

    await connectDB();
    const requestId = `FBR-${Math.floor(100 + Math.random() * 900)}`;
    const payload = {
      requestId,
      title: title.trim(),
      targetBatch: targetBatch.trim(),
      status: 'Active',
      createdBy: 'Director'
    };

    if (process.env.MONGODB_URI) {
      const newReq = new FeedbackRequest(payload);
      await newReq.save();
    } else {
      if (!mockData.feedbackRequests) mockData.feedbackRequests = [];
      mockData.feedbackRequests.unshift(payload);
    }

    return res.json({
      success: true,
      message: `Feedback request broadcasted to batch "${targetBatch}"!`,
      request: payload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating feedback request: ' + err.message });
  }
});

// GET /api/feedback/requests: Get all feedback requests (Admin)
router.get('/requests', async (req, res) => {
  try {
    await connectDB();
    let requests = [];
    if (process.env.MONGODB_URI) {
      requests = await FeedbackRequest.find().sort({ createdAt: -1 });
    } else {
      requests = mockData.feedbackRequests || [];
    }
    return res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching requests' });
  }
});

// GET /api/feedback/student-active/:studentId: Get active feedback requests targeted at student's batch
router.get('/student-active/:studentId', async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim();
    await connectDB();

    let student = null;
    let requests = [];

    if (process.env.MONGODB_URI) {
      student = await Student.findOne({ studentId: new RegExp('^' + cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
      requests = await FeedbackRequest.find({ status: 'Active' }).sort({ createdAt: -1 });
    } else {
      student = (mockData.students || []).find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
      requests = (mockData.feedbackRequests || []).filter(r => r.status === 'Active');
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const studentBatch = (student.batch || '').toLowerCase();
    const studentCourse = (student.course || '').toLowerCase();

    // Filter requests matching student's batch or course or 'All Batches'
    const matchingRequests = requests.filter(r => {
      const target = (r.targetBatch || '').toLowerCase();
      if (target === 'all batches' || target === 'all students' || target === '') return true;
      return studentBatch.includes(target) || target.includes(studentBatch) || studentCourse.includes(target) || target.includes(studentCourse);
    });

    return res.json({
      success: true,
      studentId: student.studentId,
      studentBatch: student.batch,
      activeRequests: matchingRequests
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching student active feedback requests' });
  }
});

// POST /api/feedback/submit: Registered student submits feedback
router.post('/submit', async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      batch,
      overallRating,
      clarityRating,
      materialRating,
      supportRating,
      comments
    } = req.body;

    if (!studentId || !overallRating) {
      return res.status(400).json({ success: false, message: 'Student ID and overall rating are required.' });
    }

    await connectDB();
    const cleanId = studentId.trim().toUpperCase();
    const feedbackId = `FB-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      feedbackId,
      studentId: cleanId,
      studentName: studentName || 'Registered Student',
      batch: batch || 'General Batch',
      overallRating: Number(overallRating),
      clarityRating: Number(clarityRating || overallRating),
      materialRating: Number(materialRating || overallRating),
      supportRating: Number(supportRating || overallRating),
      comments: comments || '',
      createdAt: new Date()
    };

    if (process.env.MONGODB_URI) {
      const newFB = new Feedback(payload);
      await newFB.save();
    } else {
      payload._id = 'fb_' + Date.now();
      mockData.feedback.unshift(payload);
    }

    return res.json({
      success: true,
      message: 'Thank you! Your feedback has been recorded and the Home Feedback Index has updated live.',
      feedback: payload
    });
  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ success: false, message: 'Error recording student feedback' });
  }
});

// Admin: Get all feedback history
router.get('/all', async (req, res) => {
  try {
    await connectDB();
    let list = [];

    if (process.env.MONGODB_URI) {
      list = await Feedback.find().sort({ createdAt: -1 });
    } else {
      list = mockData.feedback || [];
    }

    return res.json({ success: true, count: list.length, feedback: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching feedback list' });
  }
});

module.exports = router;
