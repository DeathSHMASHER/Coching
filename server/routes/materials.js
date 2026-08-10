const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

// GET /api/materials: Fetch study materials and live class links
router.get('/', async (req, res) => {
  try {
    const { course } = req.query;
    const { useMock } = getDbState();
    let list = [];

    if (useMock) {
      list = mockData.materials;
      if (course) {
        list = list.filter(m => m.course.toLowerCase().includes(course.toLowerCase()));
      }
    } else {
      const query = course ? { course: new RegExp(course, 'i') } : {};
      list = await Material.find(query).sort({ createdAt: -1 });
    }

    return res.json({ success: true, count: list.length, materials: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching materials' });
  }
});

// POST /api/materials/add: Admin publish study material or live class link
router.post('/add', async (req, res) => {
  try {
    const { title, course, subject, type, link, scheduledTime, postedBy } = req.body;

    if (!title || !course || !subject || !link) {
      return res.status(400).json({ success: false, message: 'Title, Course, Subject, and Link are required.' });
    }

    const materialId = `MAT-${Math.floor(100 + Math.random() * 900)}`;
    const { useMock } = getDbState();

    const payload = {
      materialId,
      title,
      course,
      subject,
      type: type || 'Notes',
      link,
      scheduledTime: scheduledTime || 'Self-Paced',
      postedBy: postedBy || 'Faculty Mentor',
      createdAt: new Date()
    };

    if (useMock) {
      payload._id = 'mat_' + Date.now();
      mockData.materials.unshift(payload);
      return res.json({ success: true, message: 'Material / Live Class published!', material: payload });
    } else {
      const newMat = new Material(payload);
      await newMat.save();
      return res.json({ success: true, message: 'Material / Live Class published!', material: newMat });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error publishing material' });
  }
});

module.exports = router;
