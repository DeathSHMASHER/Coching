const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

const DEFAULT_COURSES = [
  {
    courseId: 'CRS-5',
    title: 'Class 5 Foundation (All Core Subjects)',
    category: 'Class 5-8',
    classes: 'Class 5',
    subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer'],
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
    subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer'],
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
    subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer'],
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
    subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer'],
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
    description: 'Combined Science & Math double mastery package for Class 11 Board exams.',
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
    highlights: ['Physics + Maths Combined', 'Board Exam Revision', 'Full Mentor Support'],
    isPopular: true
  },
  {
    courseId: 'CRS-PYT',
    title: 'Extra Optional: Python Coding Specialization',
    category: 'Computer Science & Coding',
    classes: 'Class 5 to 12',
    subjects: ['Python', 'Logic Building', 'Problem Solving', 'Projects'],
    description: 'No prior coding background needed! Taught 100% from absolute basics in easy-to-understand language. Hands-on coding projects.',
    originalFee: 1000,
    currentFee: 1000,
    billingPeriod: 'per month (2 Classes / wk)',
    timings: 'Weekend Flexible Slots',
    highlights: ['Zero Prior Coding Knowledge Needed', 'Taught 100% From Scratch', 'Easy & Project-Based'],
    isPopular: true
  },
  {
    courseId: 'CRS-CS-910',
    title: 'Computer Science Class 9 & 10',
    category: 'Computer Science & Coding',
    classes: 'Class 9 & 10',
    subjects: ['Computer Science', 'Programming Basics'],
    description: 'Build strong computer science basics from ground up for CBSE/ICSE/WBBSE exams. No prior experience required.',
    originalFee: 2000,
    currentFee: 1500,
    billingPeriod: 'per month',
    timings: 'Flexible Evening Slots',
    highlights: ['Basics To Advanced', 'Coding Fundamentals', 'School Exam Booster'],
    isPopular: false
  },
  {
    courseId: 'CRS-CS-1112',
    title: 'Computer Science Class 11 & 12',
    category: 'Computer Science & Coding',
    classes: 'Class 11 & 12',
    subjects: ['Python', 'Data Structures', 'Algorithms', 'OOPs'],
    description: 'Advanced Python programming, Data Structures & Board practical guidance (CBSE/ISC/WBCHSE). Step-by-step guidance.',
    originalFee: 2500,
    currentFee: 2000,
    billingPeriod: 'per month',
    timings: 'Flexible Evening Slots',
    highlights: ['Python & Data Structures', 'Algorithms & OOPs', 'Board Practical Guidance'],
    isPopular: true
  }
];

// GET /api/courses: Fetch all courses
router.get('/', async (req, res) => {
  try {
    const { useMock } = getDbState();
    let courses = [];

    if (useMock) {
      if (!mockData.courses || !mockData.courses.length) {
        mockData.courses = [...DEFAULT_COURSES];
      }
      courses = mockData.courses;
    } else {
      courses = await Course.find().sort({ createdAt: 1 });
      if (!courses.length) {
        courses = await Course.insertMany(DEFAULT_COURSES);
      }
    }

    return res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching course list: ' + err.message });
  }
});

// POST /api/courses/create: Admin create new course manually
router.post('/create', async (req, res) => {
  try {
    const { courseId, title, category, classes, subjects, description, originalFee, currentFee, billingPeriod, timings } = req.body;
    const { useMock } = getDbState();

    const newCourse = {
      courseId: courseId || 'CRS-' + Date.now(),
      title,
      category: category || 'General',
      classes: classes || 'Class 5 to 12',
      subjects: Array.isArray(subjects) ? subjects : (subjects ? subjects.split(',') : []),
      description: description || '',
      originalFee: Number(originalFee) || 2000,
      currentFee: Number(currentFee) || 1500,
      billingPeriod: billingPeriod || 'per month',
      timings: timings || '7:30 PM - 10:00 PM',
      isPopular: false
    };

    if (useMock) {
      mockData.courses.push(newCourse);
    } else {
      await Course.create(newCourse);
    }

    return res.json({ success: true, message: 'New course created successfully in catalog!', course: newCourse });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating course: ' + err.message });
  }
});

// PUT /api/courses/:courseId: Admin update course fee or details
router.put('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { currentFee, originalFee, title, description, timings } = req.body;

    const { useMock } = getDbState();

    if (useMock) {
      const crs = mockData.courses.find(c => c.courseId === courseId || c._id === courseId);
      if (!crs) return res.status(404).json({ success: false, message: 'Course not found' });

      if (currentFee !== undefined) crs.currentFee = Number(currentFee);
      if (originalFee !== undefined) crs.originalFee = Number(originalFee);
      if (title) crs.title = title;
      if (description) crs.description = description;
      if (timings) crs.timings = timings;

      return res.json({ success: true, message: 'Course updated successfully!', course: crs });
    } else {
      const updateData = {};
      if (currentFee !== undefined) updateData.currentFee = Number(currentFee);
      if (originalFee !== undefined) updateData.originalFee = Number(originalFee);
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (timings) updateData.timings = timings;

      let query = { courseId: courseId };
      if (mongoose.Types.ObjectId.isValid(courseId)) {
        query = { $or: [{ courseId }, { _id: courseId }] };
      }

      const crs = await Course.findOneAndUpdate(
        query,
        updateData,
        { new: true }
      );

      if (!crs) return res.status(404).json({ success: false, message: 'Course not found' });
      return res.json({ success: true, message: 'Course updated successfully!', course: crs });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating course: ' + err.message });
  }
});

// DELETE /api/courses/:courseId: Admin delete course manually from catalog
router.delete('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { useMock } = getDbState();

    if (useMock) {
      mockData.courses = mockData.courses.filter(c => c.courseId !== courseId && c._id !== courseId);
      return res.json({ success: true, message: 'Course removed from catalog successfully!' });
    } else {
      let query = { courseId: courseId };
      if (mongoose.Types.ObjectId.isValid(courseId)) {
        query = { $or: [{ courseId }, { _id: courseId }] };
      }

      await Course.deleteOne(query);
      return res.json({ success: true, message: 'Course removed from catalog successfully!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting course: ' + err.message });
  }
});

module.exports = router;
