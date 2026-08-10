const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  noticeId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['Exam', 'Schedule', 'General', 'Urgent'], default: 'General' },
  isImportant: { type: Boolean, default: false },
  postedBy: { type: String, default: 'Admin / Director' }
}, { timestamps: true });

module.exports = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);
