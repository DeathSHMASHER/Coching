const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
  doubtId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  question: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' },
  solution: { type: String, default: '' },
  answeredAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.Doubt || mongoose.model('Doubt', doubtSchema);
