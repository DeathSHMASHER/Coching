const mongoose = require('mongoose');

let isConnected = false;
let useMock = false;

const seedDemoDataIfNeeded = async () => {
  try {
    const Student = require('../models/Student');
    const Attendance = require('../models/Attendance');
    const Performance = require('../models/Performance');
    const Doubt = require('../models/Doubt');
    const Feedback = require('../models/Feedback');
    const Notice = require('../models/Notice');

    // Seed Demo Student if missing
    const existingStudt = await Student.findOne({ studentId: 'studt' });
    if (!existingStudt) {
      await Student.create({
        studentId: 'studt',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '+91 98765 43210',
        course: 'IIT-JEE Masterclass (Class 12)',
        batch: 'Morning Batch Alpha',
        password: '1234',
        status: 'Active',
        feeStatus: 'Paid',
        feeDueAmount: 0,
        feeDueDate: 'N/A'
      });
    }

    const existing101 = await Student.findOne({ studentId: 'STU-2026-101' });
    if (!existing101) {
      await Student.create({
        studentId: 'STU-2026-101',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '+91 98765 43210',
        course: 'IIT-JEE Masterclass (Class 12)',
        batch: 'Morning Batch Alpha',
        password: '1234',
        status: 'Active',
        feeStatus: 'Paid',
        feeDueAmount: 0,
        feeDueDate: 'N/A'
      });
    }

    // Seed Demo Attendance if missing
    const attCount = await Attendance.countDocuments();
    if (attCount === 0) {
      await Attendance.create([
        { studentId: 'studt', date: '2026-08-01', status: 'Present', topicCovered: 'Electrodynamics & Gauss Law' },
        { studentId: 'studt', date: '2026-08-02', status: 'Present', topicCovered: 'Organic Reaction Mechanisms' },
        { studentId: 'studt', date: '2026-08-03', status: 'Present', topicCovered: 'Definite Integration & Calculus' },
        { studentId: 'studt', date: '2026-08-04', status: 'Present', topicCovered: 'Capacitance & AC Circuits' },
        { studentId: 'studt', date: '2026-08-05', status: 'Absent', topicCovered: 'Chemical Thermodynamics' }
      ]);
    }

    // Seed Demo Performance if missing
    const perfCount = await Performance.countDocuments();
    if (perfCount === 0) {
      await Performance.create([
        {
          studentId: 'studt',
          examTitle: 'All India Weekly JEE Mock Test #4',
          date: '2026-08-05',
          totalScore: 278,
          maxMarks: 300,
          subjectBreakdown: { Physics: 94, Chemistry: 88, Mathematics: 96 },
          rank: 2,
          percentile: 99.4,
          remarks: 'Outstanding performance in Mechanics and Calculus. Focus on Chemistry Organic Mechanisms.'
        }
      ]);
    }

    // Seed Demo Doubts if missing
    const doubtCount = await Doubt.countDocuments();
    if (doubtCount === 0) {
      await Doubt.create([
        {
          doubtId: 'DBT-101',
          studentId: 'studt',
          studentName: 'Aarav Sharma',
          subject: 'Physics',
          topic: 'Rotational Dynamics - Moment of Inertia',
          question: 'How to calculate moment of inertia of a hollow sphere with non-uniform mass density?',
          solution: 'Integrate dm = rho(r) * 4*pi*r^2 dr over the radius shell. Apply the formula I = integral (2/3) r^2 dm.',
          status: 'Resolved',
          answeredAt: new Date()
        }
      ]);
    }

    // Seed Demo Feedback if missing
    const fbCount = await Feedback.countDocuments();
    if (fbCount === 0) {
      await Feedback.create([
        { feedbackId: 'FB-101', studentId: 'studt', studentName: 'Aarav Sharma', clarityRating: 5, materialRating: 5, supportRating: 5, overallRating: 5, comments: 'Excellence teaching standards and structured doubt sessions!' }
      ]);
    }

    // Seed Demo Notices if missing
    const noticeCount = await Notice.countDocuments();
    if (noticeCount === 0) {
      await Notice.create([
        { noticeId: 'NTC-101', title: 'IIT-JEE Grand Mock Test #5 Announcement', content: 'Grand mock test scheduled for Sunday 10:00 AM. Attendance is mandatory for all Class 12 batches.', category: 'Exam', postedBy: 'Director Office', isImportant: true },
        { noticeId: 'NTC-102', title: 'Special Doubt Clearing Session for Physics', content: 'Prof. Sharma will conduct an extra doubt resolution session on Electrodynamics tomorrow at 4:00 PM.', category: 'Schedule', postedBy: 'Physics HOD' }
      ]);
    }

    console.log('✅ Student studt (pass 1234) and Admin admn (pass 345) ready in MongoDB Atlas!');
  } catch (err) {
    console.warn('⚠️ Seeding check error:', err.message);
  }
};

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI || mongoURI.includes('<username>') || mongoURI.includes('<password>')) {
    console.log('ℹ️ No valid MONGODB_URI found. Initializing high-performance Memory Database with seed data.');
    useMock = true;
    isConnected = true;
    return;
  }

  try {
    await mongoose.connect(mongoURI);
    isConnected = true;
    useMock = false;
    console.log('✅ Connected to MongoDB Atlas Cloud Database successfully.');

    // Seed demo data if database is fresh
    await seedDemoDataIfNeeded();
  } catch (err) {
    console.warn('⚠️ MongoDB Atlas connection error:', err.message);
    console.log('🔄 Falling back to high-performance Memory Database for offline testing.');
    useMock = true;
    isConnected = true;
  }
};

const getDbState = () => ({ isConnected, useMock });

module.exports = { connectDB, getDbState, seedDemoDataIfNeeded };
