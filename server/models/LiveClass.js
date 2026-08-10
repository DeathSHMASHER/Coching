const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
  classId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  targetBatch: { type: String, required: true }, // 'All Batches', 'Class 5', 'Class 10 Board Science', 'Class 12 Physics', 'Python Coding'
  meetingLink: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  instructor: { type: String, default: 'Shahriyar Taufik' },
  notes: { type: String, default: '' },
  status: { type: String, default: 'Upcoming', enum: ['Upcoming', 'Live', 'Completed', 'Cancelled'] }
}, { timestamps: true });

module.exports = mongoose.models.LiveClass || mongoose.model('LiveClass', liveClassSchema);
