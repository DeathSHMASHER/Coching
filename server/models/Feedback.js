const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  feedbackId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  overallRating: { type: Number, required: true, min: 1, max: 5 },
  clarityRating: { type: Number, required: true, min: 1, max: 5 },
  materialRating: { type: Number, required: true, min: 1, max: 5 },
  supportRating: { type: Number, required: true, min: 1, max: 5 },
  batch: { type: String, default: 'General Batch' },
  comments: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
