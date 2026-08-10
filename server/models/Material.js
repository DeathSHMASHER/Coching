const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  materialId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  course: { type: String, required: true },
  subject: { type: String, required: true },
  type: { type: String, enum: ['Live Class', 'DPP', 'Notes', 'Video'], default: 'Notes' },
  link: { type: String, required: true },
  scheduledTime: { type: String, default: 'Self-Paced' },
  postedBy: { type: String, default: 'Faculty Mentor' }
}, { timestamps: true });

module.exports = mongoose.models.Material || mongoose.model('Material', materialSchema);
