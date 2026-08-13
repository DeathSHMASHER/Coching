const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const { connectDB, getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

const DEFAULT_COURSES = [
  {
    courseId: 'CRS-5',
    title: 'Class 5 Foundation (All Core Subjects)',
    category: 'Class 5-8',
    classes: 'Class 5',
    subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'History', 'Geography', 'Computer'],
    description: 'Comprehensive core subject foundation for CBSE, ICSE & West Bengal Board (WBBSE). Taught 100% from absolute basics!',
    originalFee: 2000,
    currentFee: 1500,
    billingPeriod: 'per month',
    timings: '7:30 PM - 10:00 PM (3-4 Classes / wk)',
    highlights: ['Taught From Fundamentals', 'All Core Subjects Covered', 'Weekly Doubt Resolution'],
    isPopular: false
  },
  {
    courseId: 'CRS-6',
    title: 'Class 6 Foundation (All Core Subjects)',
    category: 'Class 5-8',
    classes: 'Class 6',
    subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'History', 'Geography', 'Computer'],
    description: 'Structured middle-school academic excellence for CBSE, ICSE & West Bengal Board. Zero prior prerequisites needed.',
    originalFee: 2000,
    currentFee: 1500,
    billingPeriod: 'per month',
    timings: '7:30 PM - 10:00 PM (3-4 Classes / wk)',
    highlights: ['Beginner Friendly', 'Small Batch Care', 'Regular Assignments'],
    isPopular: false
  },
  {
    courseId: 'CRS-7',
    title: 'Class 7 Advanced Foundation (All Core Subjects)',
    category: 'Class 5-8',
    classes: 'Class 7',
    subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'History', 'Geography', 'Computer'],
    description: 'Deep academic concept building for CBSE, ICSE & West Bengal Board students.',
    originalFee: 3000,
    currentFee: 2500,
    billingPeriod: 'per month',
    timings: '7:30 PM - 10:00 PM (3-4 Classes / wk)',
    highlights: ['Strong Math & Science Base', 'Personal Care', 'Monthly Reports'],
    isPopular: false
  },
  {
    courseId: 'CRS-8',
    title: 'Class 8 Advanced Foundation (All Core Subjects)',
    category: 'Class 5-8',
    classes: 'Class 8',
    subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'History', 'Geography', 'Computer'],
    description: 'High-school preparation program for CBSE, ICSE & West Bengal Board (WBBSE).',
    originalFee: 3000,
    currentFee: 2500,
    billingPeriod: 'per month',
    timings: '7:30 PM - 10:00 PM (3-4 Classes / wk)',
    highlights: ['Pre-High School Drills', '1-on-1 Doubt Solving', 'Small Batches'],
    isPopular: true
  },
  {
    courseId: 'CRS-9',
    title: 'Class 9 Board Science & Mathematics',
    category: 'Class 9-10',
    classes: 'Class 9',
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
    description: 'Focused Science & Mathematics for CBSE, ICSE & West Bengal Board (WBBSE). Step-by-step problem solving.',
    originalFee: 4500,
    currentFee: 4000,
    billingPeriod: 'per month',
    timings: '7:30 PM - 10:00 PM (3-4 Classes / wk)',
    highlights: ['Physics, Chemistry, Biology & Maths', 'Handpicked Practice Problems', 'Weekend Doubts'],
    isPopular: false
  },
  {
    courseId: 'CRS-10',
    title: 'Class 10 Board Science & Mathematics Mastery',
    category: 'Class 9-10',
    classes: 'Class 10',
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
    description: 'Intensive Class 10 Board exam preparation for CBSE, ICSE & West Bengal Board (Madhyamik).',
    originalFee: 4500,
    currentFee: 4000,
    billingPeriod: 'per month',
    timings: '7:30 PM - 10:00 PM (3-4 Classes / wk)',
    highlights: ['Board PYQs & Sample Papers', 'Full Mock Exams', 'Madhyamik & CBSE Focus'],
    isPopular: true
  },
  {
    courseId: 'CRS-11-PHY',
    title: 'Class 11 Board Physics Tuition',
    category: 'Class 11-12',
    classes: 'Class 11',
    subjects: ['Physics'],
    description: 'Mechanics, Thermodynamics & Waves for CBSE, ISC & West Bengal Board (WBCHSE). Basics to advanced numericals.',
    originalFee: 2000,
    currentFee: 1500,
    billingPeriod: 'per subject / month',
    timings: '7:30 PM - 10:00 PM',
    highlights: ['NCERT & WBCHSE Numericals', 'Doubt Solving', 'Regular Tests'],
    isPopular: false
  },
  {
    courseId: 'CRS-11-MTH',
    title: 'Class 11 Board Mathematics Tuition',
    category: 'Class 11-12',
    classes: 'Class 11',
    subjects: ['Mathematics'],
    description: 'Calculus, Trigonometry & Algebra for CBSE, ISC & West Bengal Board (WBCHSE).',
    originalFee: 2000,
    currentFee: 1500,
    billingPeriod: 'per subject / month',
    timings: '7:30 PM - 10:00 PM',
    highlights: ['Calculus Foundation', 'Problem Solving Speed', '1-on-1 Care'],
    isPopular: false
  },
  {
    courseId: 'CRS-11-COMBO',
    title: 'Class 11 Board Physics + Mathematics Package',
    category: 'Class 11-12',
    classes: 'Class 11',
    subjects: ['Physics', 'Mathematics'],
    description: 'Combined Physics & Math double mastery package for Class 11 Board exams.',
    originalFee: 4000,
    currentFee: 3500,
    billingPeriod: 'per month (Both Subjects)',
    timings: '7:30 PM - 10:00 PM',
    highlights: ['Physics + Maths Combined', 'Maximum Fee Savings', 'Full Mentor Support'],
    isPopular: true
  },
  {
    courseId: 'CRS-12-PHY',
    title: 'Class 12 Board Physics Tuition',
    category: 'Class 11-12',
    classes: 'Class 12',
    subjects: ['Physics'],
    description: 'Electrodynamics, Optics & Modern Physics for CBSE, ISC & West Bengal Board (WBCHSE).',
    originalFee: 2000,
    currentFee: 1500,
    billingPeriod: 'per subject / month',
    timings: '7:30 PM - 10:00 PM',
    highlights: ['NCERT & WBCHSE Board Numericals', 'Doubt Solving', 'Mock Exam Drills'],
    isPopular: false
  },
  {
    courseId: 'CRS-12-MTH',
    title: 'Class 12 Board Mathematics Tuition',
    category: 'Class 11-12',
    classes: 'Class 12',
    subjects: ['Mathematics'],
    description: 'Differential Calculus, Integral Calculus & Vectors for CBSE, ISC & WBCHSE.',
    originalFee: 2000,
    currentFee: 1500,
    billingPeriod: 'per subject / month',
    timings: '7:30 PM - 10:00 PM',
    highlights: ['Advanced Calculus Mastery', 'Board PYQs Marathon', '1-on-1 Guidance'],
    isPopular: false
  },
  {
    courseId: 'CRS-12-COMBO',
    title: 'Class 12 Board Physics + Mathematics Package',
    category: 'Class 11-12',
    classes: 'Class 12',
    subjects: ['Physics', 'Mathematics'],
    description: 'Complete Class 12 Board score booster for CBSE, ISC & West Bengal Board (HS / WBCHSE).',
    originalFee: 4000,
    currentFee: 3500,
    billingPeriod: 'per month (Both Subjects)',
    timings: '7:30 PM - 10:00 PM',
    highlights: ['Physics + Maths Combined', 'Board Exam Drills', '1-on-1 Mentorship'],
    isPopular: true
  },
  {
    courseId: 'CRS-CS-9',
    title: 'Computer Science Class 9 (Python & Logic)',
    category: 'Computer Science & Coding',
    classes: 'Class 9',
    subjects: ['Computer Science', 'Python Coding'],
    description: 'No prior coding needed! Fundamentals of Python, logic building, algorithms & ICSE/CBSE exam drills.',
    originalFee: 1200,
    currentFee: 1000,
    billingPeriod: 'per month (Add-on: ₹1,000 | Standalone: ₹1,200)',
    timings: 'Weekend Live Sessions (Sat & Sun)',
    highlights: ['100% Practical Hands-on Coding', 'ICSE/CBSE Practical Exam Prep', 'Certificate of Completion'],
    isPopular: true
  },
  {
    courseId: 'CRS-CS-10',
    title: 'Computer Science Class 10 (Python Specialization)',
    category: 'Computer Science & Coding',
    classes: 'Class 10',
    subjects: ['Computer Science', 'Python Coding'],
    description: 'Advanced Python logic, data structures, loops, functions, file handling & board practical project solving.',
    originalFee: 1200,
    currentFee: 1000,
    billingPeriod: 'per month (Add-on: ₹1,000 | Standalone: ₹1,200)',
    timings: 'Weekend Live Sessions (Sat & Sun)',
    highlights: ['Full Board Project Drills', '1-on-1 Code Debugging', 'Certificate of Completion'],
    isPopular: true
  }
];

// Seed DB helper
async function seedDefaultCourses() {
  try {
    await connectDB();
    if (process.env.MONGODB_URI) {
      for (const item of DEFAULT_COURSES) {
        await Course.findOneAndUpdate(
          { courseId: item.courseId },
          { $set: item },
          { upsert: true, new: true }
        );
      }
    }
  } catch (err) {
    console.warn('Could not seed default courses:', err.message);
  }
}

// GET /api/courses: Fetch all active courses
router.get('/', async (req, res) => {
  try {
    await connectDB();
    let courses = [];

    if (process.env.MONGODB_URI) {
      courses = await Course.find().sort({ courseId: 1 });
      if (!courses || courses.length === 0) {
        await seedDefaultCourses();
        courses = await Course.find().sort({ courseId: 1 });
      }
    } else {
      if (!mockData.courses || mockData.courses.length === 0) {
        mockData.courses = [...DEFAULT_COURSES];
      }
      courses = mockData.courses;
    }

    return res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error fetching courses: ' + err.message });
  }
});

// GET /api/courses/:courseId: Fetch single course by ID
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    await connectDB();
    let course = null;

    if (process.env.MONGODB_URI) {
      let query = { courseId: courseId };
      if (/^[0-9a-fA-F]{24}$/.test(courseId)) {
        query = { $or: [{ courseId }, { _id: courseId }] };
      }
      course = await Course.findOne(query);
    } else {
      course = (mockData.courses || []).find(c => c.courseId === courseId || c._id === courseId);
    }

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.json({ success: true, course });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error fetching course: ' + err.message });
  }
});

// PUT /api/courses/:courseId: Admin update course fee or details
router.put('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { currentFee, originalFee, title, description, timings, subjects } = req.body;
    await connectDB();

    const updateData = {};
    if (currentFee !== undefined) updateData.currentFee = Number(currentFee);
    if (originalFee !== undefined) updateData.originalFee = Number(originalFee);
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (timings) updateData.timings = timings.trim();
    if (Array.isArray(subjects)) updateData.subjects = subjects;

    if (process.env.MONGODB_URI) {
      let query = { courseId: courseId };
      if (/^[0-9a-fA-F]{24}$/.test(courseId)) {
        query = { $or: [{ courseId }, { _id: courseId }] };
      }

      const crs = await Course.findOneAndUpdate(
        query,
        updateData,
        { new: true }
      );

      if (!crs) return res.status(404).json({ success: false, message: 'Course not found in database' });
      return res.json({ success: true, message: `Course "${crs.title}" updated successfully!`, course: crs });
    } else {
      const crs = (mockData.courses || []).find(c => c.courseId === courseId || c._id === courseId);
      if (!crs) return res.status(404).json({ success: false, message: 'Course not found' });

      Object.assign(crs, updateData);
      return res.json({ success: true, message: `Course "${crs.title}" updated successfully!`, course: crs });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating course: ' + err.message });
  }
});

// PUT /api/courses/:courseId/subjects: Add or remove subjects from a course
router.put('/:courseId/subjects', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { action, subject } = req.body; // action: 'add' or 'remove'
    if (!subject) return res.status(400).json({ success: false, message: 'Subject name is required.' });

    await connectDB();
    const cleanSub = subject.trim();

    if (process.env.MONGODB_URI) {
      let query = { courseId: courseId };
      if (/^[0-9a-fA-F]{24}$/.test(courseId)) {
        query = { $or: [{ courseId }, { _id: courseId }] };
      }

      let crs = await Course.findOne(query);
      if (!crs) return res.status(404).json({ success: false, message: 'Course not found' });

      if (action === 'add') {
        if (!crs.subjects.some(s => s.toLowerCase() === cleanSub.toLowerCase())) {
          crs.subjects.push(cleanSub);
        }
      } else if (action === 'remove') {
        crs.subjects = crs.subjects.filter(s => s.toLowerCase() !== cleanSub.toLowerCase());
      }

      await crs.save();
      return res.json({ success: true, message: `Subject list updated for "${crs.title}"!`, subjects: crs.subjects, course: crs });
    } else {
      let crs = (mockData.courses || []).find(c => c.courseId === courseId || c._id === courseId);
      if (!crs) return res.status(404).json({ success: false, message: 'Course not found' });

      if (action === 'add') {
        if (!crs.subjects.some(s => s.toLowerCase() === cleanSub.toLowerCase())) {
          crs.subjects.push(cleanSub);
        }
      } else if (action === 'remove') {
        crs.subjects = crs.subjects.filter(s => s.toLowerCase() !== cleanSub.toLowerCase());
      }

      return res.json({ success: true, message: `Subject list updated for "${crs.title}"!`, subjects: crs.subjects, course: crs });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating course subjects: ' + err.message });
  }
});

// DELETE /api/courses/:courseId: Admin delete course manually from catalog
router.delete('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    await connectDB();

    if (process.env.MONGODB_URI) {
      let query = { courseId: courseId };
      if (/^[0-9a-fA-F]{24}$/.test(courseId)) {
        query = { $or: [{ courseId }, { _id: courseId }] };
      }

      await Course.deleteOne(query);
      return res.json({ success: true, message: 'Course removed from catalog successfully!' });
    } else {
      mockData.courses = (mockData.courses || []).filter(c => c.courseId !== courseId && c._id !== courseId);
      return res.json({ success: true, message: 'Course removed from catalog successfully!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting course: ' + err.message });
  }
});

module.exports = router;
