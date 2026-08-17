const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notice = require('../models/Notice');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');
const { requireAdmin } = require('../middleware/auth');

// GET /api/notices: Fetch broadcast notices (Public)
router.get('/', async (req, res) => {
  try {
    const { useMock } = getDbState();
    let list = [];

    if (useMock) {
      list = mockData.notices;
    } else {
      list = await Notice.find().sort({ createdAt: -1 });
    }

    return res.json({ success: true, count: list.length, notices: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching notices' });
  }
});

// POST /api/notices/post & /api/notices/create: Admin broadcast new notice (Protected: Admin Only)
const createNoticeHandler = async (req, res) => {
  try {
    const { title, content, category, isImportant, postedBy } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and Content are required.' });
    }

    const noticeId = `NTC-${Math.floor(100 + Math.random() * 900)}`;
    const { useMock } = getDbState();

    const payload = {
      noticeId,
      title: String(title).trim().slice(0, 200),
      content: String(content).trim().slice(0, 3000),
      category: category ? String(category).trim().slice(0, 50) : 'General',
      isImportant: !!isImportant,
      postedBy: req.user ? req.user.name || 'Director Office' : (postedBy || 'Director Office'),
      createdAt: new Date()
    };

    if (useMock) {
      payload._id = 'not_' + Date.now();
      mockData.notices.unshift(payload);
      return res.json({ success: true, message: 'Announcement broadcasted successfully!', notice: payload });
    } else {
      const newNotice = new Notice(payload);
      await newNotice.save();
      return res.json({ success: true, message: 'Announcement broadcasted successfully!', notice: newNotice });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error posting notice: ' + err.message });
  }
};

router.post('/post', requireAdmin, createNoticeHandler);
router.post('/create', requireAdmin, createNoticeHandler);

// DELETE /api/notices/:id: Delete notice permanently (Protected: Admin Only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const noticeId = req.params.id;
    const { useMock } = getDbState();

    if (useMock) {
      mockData.notices = mockData.notices.filter(n => n.noticeId !== noticeId && n._id !== noticeId);
    } else {
      let query = { noticeId: noticeId };
      if (/^[0-9a-fA-F]{24}$/.test(noticeId)) {
        query = { $or: [{ noticeId: noticeId }, { _id: noticeId }] };
      }
      await Notice.findOneAndDelete(query);
    }

    return res.json({ success: true, message: 'Notice deleted permanently from database.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting notice: ' + err.message });
  }
});

module.exports = router;
