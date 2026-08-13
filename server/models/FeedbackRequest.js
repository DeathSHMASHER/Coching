const mongoose = require('mongoose');

const feedbackRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  targetBatch: { type: String, required: true }, // e.g. 'Morning Batch Alpha', 'Evening Batch Beta', 'All Batches'
  status: { type: String, default: 'Active' }, // 'Active' or 'Closed'
  createdBy: { type: String, default: 'Director' }
}, { timestamps: true });

module.exports = mongoose.models.FeedbackRequest || mongoose.model('FeedbackRequest', feedbackRequestSchema);
