const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  course: { type: String, required: true },
  batch: { type: String, default: 'Batch A - Morning' },
  password: { type: String, required: true },
  admissionDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' },
  feeStatus: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Paid' },
  feeDueAmount: { type: Number, default: 0 },
  feeDueDate: { type: String, default: 'N/A' }
}, { timestamps: true });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
