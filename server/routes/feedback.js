const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { getDbState } = require('../config/db');
const { mockData, computeFeedbackIndex } = require('../config/mockStore');

// GET /api/feedback/index: Dynamically calculated feedback score index for Home Screen
router.get('/index', async (req, res) => {
  try {
    const { useMock } = getDbState();

    if (useMock) {
      const indexMetrics = computeFeedbackIndex();
      return res.json({ success: true, feedbackIndex: indexMetrics });
    }

    const list = await Feedback.find().sort({ createdAt: -1 });

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
      totalClarity += item.clarityRating;
      totalMaterial += item.materialRating;
      totalSupport += item.supportRating;
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
        recentFeedback: list.slice(0, 5)
      }
    });
  } catch (err) {
    console.error('Fetch feedback index error:', err);
    res.status(500).json({ success: false, message: 'Error computing dynamic feedback index' });
  }
});

// POST /api/feedback/submit: Registered student submits feedback
router.post('/submit', async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      overallRating,
      clarityRating,
      materialRating,
      supportRating,
      comments
    } = req.body;

    if (!studentId || !overallRating) {
      return res.status(400).json({ success: false, message: 'Student ID and overall rating are required.' });
    }

    const cleanId = studentId.trim().toUpperCase();
    const feedbackId = `FB-${Math.floor(100 + Math.random() * 900)}`;
    const { useMock } = getDbState();

    const payload = {
      feedbackId,
      studentId: cleanId,
      studentName: studentName || 'Registered Student',
      overallRating: Number(overallRating),
      clarityRating: Number(clarityRating || overallRating),
      materialRating: Number(materialRating || overallRating),
      supportRating: Number(supportRating || overallRating),
      comments: comments || '',
      createdAt: new Date()
    };

    if (useMock) {
      payload._id = 'fb_' + Date.now();
      mockData.feedback.unshift(payload);
      const updatedIndex = computeFeedbackIndex();
      return res.json({
        success: true,
        message: 'Thank you! Your feedback has been recorded and the Home Feedback Index has updated.',
        feedback: payload,
        updatedFeedbackIndex: updatedIndex
      });
    } else {
      const newFB = new Feedback(payload);
      await newFB.save();

      return res.json({
        success: true,
        message: 'Thank you! Your feedback has been recorded and saved to MongoDB.',
        feedback: newFB
      });
    }
  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ success: false, message: 'Error recording student feedback' });
  }
});

// Admin: Get all feedback history
router.get('/all', async (req, res) => {
  try {
    const { useMock } = getDbState();
    let list = [];

    if (useMock) {
      list = mockData.feedback;
    } else {
      list = await Feedback.find().sort({ createdAt: -1 });
    }

    return res.json({ success: true, count: list.length, feedback: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching feedback list' });
  }
});

module.exports = router;
