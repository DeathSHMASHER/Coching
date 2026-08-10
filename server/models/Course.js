const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true }, // 'Class 5-8', 'Class 9-10', 'Class 11-12', 'Computer Science & Coding'
  classes: { type: String, required: true },  // e.g. 'Class 5 to 6', 'Class 11 & 12'
  subjects: [String],
  description: { type: String, default: '' },
  originalFee: { type: Number, required: true },
  currentFee: { type: Number, required: true }, // Reduced by ₹500 as requested
  billingPeriod: { type: String, default: 'per month' },
  timings: { type: String, default: '7:30 PM - 10:00 PM (3-4 Classes / wk)' },
  highlights: [String],
  isPopular: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
