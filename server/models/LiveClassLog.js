const mongoose = require('mongoose');

const liveClassLogSchema = new mongoose.Schema({
  classId: { type: String, required: true },
  classTitle: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  targetBatch: { type: String, default: 'General Batch' },
  joinedAtFormatted: { type: String, required: true }, // e.g. "13 Aug 2026, 07:15:34 PM"
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.LiveClassLog || mongoose.model('LiveClassLog', liveClassLogSchema);
