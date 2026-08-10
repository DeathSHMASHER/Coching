const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  examTitle: { type: String, required: true },
  date: { type: String, required: true },
  totalScore: { type: Number, required: true },
  maxMarks: { type: Number, required: true, default: 100 },
  subjectBreakdown: { type: Map, of: Number, default: {} },
  rank: { type: Number, default: 1 },
  percentile: { type: Number, default: 95.0 },
  remarks: { type: String, default: 'Great effort and consistent analytical problem solving.' }
}, { timestamps: true });

module.exports = mongoose.models.Performance || mongoose.model('Performance', performanceSchema);
