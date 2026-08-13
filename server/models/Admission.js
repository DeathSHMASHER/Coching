const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  targetCourse: { type: String, required: true },
  calculatedFee: { type: Number, default: 0 },
  selectedSubjects: { type: Array, default: [] },
  previousPercentage: { type: Number, default: 0 },
  message: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  appliedAt: { type: Date, default: Date.now },
  studentIdAssigned: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Admission || mongoose.model('Admission', admissionSchema);
