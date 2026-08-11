const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { getDbState } = require('../config/db');
const { mockData } = require('../config/mockStore');

// GET /api/performance/:studentId: Get student composite performance index out of 100
router.get('/:studentId', async (req, res) => {
  try {
    const cleanId = req.params.studentId.trim().toUpperCase();
    const { useMock } = getDbState();

    let records = [];
    let attRecords = [];
    let student = null;

    if (useMock) {
      records = (mockData.performance || []).filter(p => p.studentId.toUpperCase() === cleanId);
      attRecords = (mockData.attendance || []).filter(a => a.studentId.toUpperCase() === cleanId);
      student = (mockData.students || []).find(s => s.studentId.toUpperCase() === cleanId);
    } else {
      records = await Performance.find({ studentId: cleanId }).sort({ date: -1 });
      attRecords = await Attendance.find({ studentId: cleanId });
      student = await Student.findOne({ studentId: new RegExp('^' + cleanId + '$', 'i') });
    }

    // 1. Exam Marks Average (50% Weight)
    let totalMarksEarned = 0;
    let totalMaxPossible = 0;
    records.forEach(r => {
      totalMarksEarned += r.totalScore;
      totalMaxPossible += r.maxMarks;
    });

    const examPct = totalMaxPossible > 0 ? Math.round((totalMarksEarned / totalMaxPossible) * 100) : (records.length ? Math.round(records[0].totalScore) : 85);

    // 2. Attendance Percentage (30% Weight)
    const totalAtt = attRecords.length;
    const presentAtt = attRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const attPct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

    // 3. Class Participation Score (20% Weight - Set by Admin or default 85)
    const classParticipation = student && student.classParticipation !== undefined ? Number(student.classParticipation) : 85;

    // COMPOSITE PERFORMANCE INDEX OUT OF 100
    const compositeIndex = Math.min(100, Math.max(0, Math.round(
      (examPct * 0.50) + (attPct * 0.30) + (classParticipation * 0.20)
    )));

    // DYNAMIC TIERING & IMPROVEMENT GUIDANCE
    let tier = 'mastery';
    let statusText = 'Outstanding Mastery';
    let badgeColor = 'gold';
    let summaryMessage = '';
    let actionableSteps = [];

    if (compositeIndex >= 95) {
      tier = 'mastery';
      statusText = 'Top Academic Mastery (95-100)';
      badgeColor = 'gold';
      summaryMessage = '🎉 Exceptional Academic Performance! You are demonstrating top-tier concept clarity, consistent attendance, and strong problem-solving skills.';
      actionableSteps = [
        'Maintain 100% lecture attendance to preserve your top rank.',
        'Challenge yourself with advanced board sample papers & timed mock drills.'
      ];
    } else if (compositeIndex >= 75) {
      tier = 'proficient';
      statusText = 'High Performing / Good Pace (75-94)';
      badgeColor = 'cyan';
      summaryMessage = '💡 Strong Academic Foundation! You are performing well. To reach the top 95+ score tier, focus on minor refinement areas below:';
      actionableSteps = [
        `Exam Score Booster: Raise exam average from ${examPct}% to 95%+ by reducing calculation errors in physics & math numericals.`,
        `Attendance Focus: Your lecture attendance is currently ${attPct}%. Reaching 100% guarantees higher score retention.`,
        'Submit doubt tickets whenever encountering difficult board PYQs.'
      ];
    } else if (compositeIndex >= 50) {
      tier = 'developing';
      statusText = 'Needs Focused Practice (50-74)';
      badgeColor = 'amber';
      summaryMessage = '⚠️ Moderate Performance - Requires Focused Effort! Your score indicates gaps in fundamental concepts or lecture attendance.';
      actionableSteps = [
        `Urgent Concept Review: Exam average is currently ${examPct}%. Revisit NCERT / Board textbook formulas & definitions.`,
        `Attendance Warning: Attendance is at ${attPct}%. Regular lecture presence is critical for grade improvement.`,
        'Schedule weekend doubt clearance tickets with Director Shahriyar Taufik.',
        'Solve 10 chapter-wise practice problems daily.'
      ];
    } else {
      tier = 'critical';
      statusText = 'Urgent Academic Intervention Required (<50)';
      badgeColor = 'red';
      summaryMessage = '🔴 Critical Academic Weakness! Your current index score indicates severe gaps in attendance, test scores, or class engagement.';
      actionableSteps = [
        `CRITICAL WEAKNESS: Exam performance is low (${examPct}% average).`,
        `CRITICAL WEAKNESS: Lecture attendance is critically low (${attPct}%). Mandatory attendance required!`,
        'Contact Director Shahriyar Taufik immediately for 1-on-1 mentor guidance.',
        'Re-watch missed lecture recordings and complete foundational practice assignments.'
      ];
    }

    return res.json({
      success: true,
      studentId: cleanId,
      compositeIndex,
      weights: {
        examPct,
        examWeighted: Math.round(examPct * 0.50),
        attPct,
        attWeighted: Math.round(attPct * 0.30),
        classParticipation,
        participationWeighted: Math.round(classParticipation * 0.20)
      },
      tierInfo: {
        tier,
        statusText,
        badgeColor,
        summaryMessage,
        actionableSteps,
        showImprovementGuide: compositeIndex < 95
      },
      reports: records
    });
  } catch (err) {
    console.error('Fetch performance error:', err);
    res.status(500).json({ success: false, message: 'Error calculating performance index: ' + err.message });
  }
});

// Admin: Add or Update student test performance report
router.post('/add', async (req, res) => {
  try {
    const {
      studentId,
      examTitle,
      date,
      totalScore,
      maxMarks,
      subjectBreakdown,
      rank,
      percentile,
      remarks,
      classParticipation
    } = req.body;

    if (!studentId || !examTitle || totalScore === undefined) {
      return res.status(400).json({ success: false, message: 'Student ID, Exam Title, and Score are required.' });
    }

    const cleanId = studentId.trim().toUpperCase();
    const { useMock } = getDbState();

    const perfPayload = {
      studentId: cleanId,
      examTitle,
      batch: req.body.batch || 'General Batch',
      date: date || new Date().toISOString().split('T')[0],
      totalScore: Number(totalScore),
      maxMarks: Number(maxMarks) || 100,
      subjectBreakdown: subjectBreakdown || { Physics: Number(totalScore) },
      rank: Number(rank) || 1,
      percentile: Number(percentile) || 95.0,
      remarks: remarks || 'Good effort. Keep improving step by step.'
    };

    if (useMock) {
      perfPayload._id = 'perf_' + Date.now();
      mockData.performance.unshift(perfPayload);
      if (classParticipation !== undefined) {
        const s = (mockData.students || []).find(st => st.studentId.toUpperCase() === cleanId);
        if (s) s.classParticipation = Number(classParticipation);
      }
    } else {
      const created = await Performance.create(perfPayload);
      perfPayload._id = created._id;
      if (classParticipation !== undefined) {
        await Student.updateOne({ studentId: new RegExp('^' + cleanId + '$', 'i') }, { classParticipation: Number(classParticipation) });
      }
    }

    return res.json({ success: true, message: 'Exam score & performance index updated live for student!', report: perfPayload });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error adding performance report: ' + err.message });
  }
});

// Admin: Get all performance reports
router.get('/all/reports', async (req, res) => {
  try {
    const { useMock } = getDbState();
    let reports = [];
    if (useMock) {
      reports = mockData.performance || [];
    } else {
      reports = await Performance.find({}).sort({ date: -1 });
    }
    return res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching performance reports: ' + err.message });
  }
});

// Admin: Update performance report
router.put('/:reportId', async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const { useMock } = getDbState();
    const {
      studentId,
      examTitle,
      batch,
      date,
      totalScore,
      maxMarks,
      subjectBreakdown,
      rank,
      percentile,
      remarks,
      classParticipation
    } = req.body;

    const cleanId = studentId ? studentId.trim().toUpperCase() : '';

    if (useMock) {
      const index = mockData.performance.findIndex(p => p._id === reportId || p.reportId === reportId);
      if (index !== -1) {
        mockData.performance[index] = {
          ...mockData.performance[index],
          studentId: cleanId || mockData.performance[index].studentId,
          examTitle: examTitle || mockData.performance[index].examTitle,
          batch: batch || mockData.performance[index].batch,
          date: date || mockData.performance[index].date,
          totalScore: Number(totalScore),
          maxMarks: Number(maxMarks) || 100,
          subjectBreakdown: subjectBreakdown || mockData.performance[index].subjectBreakdown,
          rank: Number(rank) || 1,
          percentile: Number(percentile) || 95.0,
          remarks: remarks || ''
        };
      }
      if (cleanId && classParticipation !== undefined) {
        const s = (mockData.students || []).find(st => st.studentId.toUpperCase() === cleanId);
        if (s) s.classParticipation = Number(classParticipation);
      }
    } else {
      await Performance.findByIdAndUpdate(reportId, {
        studentId: cleanId,
        examTitle,
        batch,
        date,
        totalScore: Number(totalScore),
        maxMarks: Number(maxMarks) || 100,
        subjectBreakdown,
        rank: Number(rank) || 1,
        percentile: Number(percentile) || 95.0,
        remarks
      });
      if (cleanId && classParticipation !== undefined) {
        await Student.updateOne({ studentId: new RegExp('^' + cleanId + '$', 'i') }, { classParticipation: Number(classParticipation) });
      }
    }

    return res.json({ success: true, message: 'Performance report updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating performance report: ' + err.message });
  }
});

// Admin: Delete performance report
router.delete('/:reportId', async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const { useMock } = getDbState();

    if (useMock) {
      const idx = mockData.performance.findIndex(p => p._id === reportId || p.reportId === reportId);
      if (idx !== -1) {
        mockData.performance.splice(idx, 1);
      }
    } else {
      await Performance.findByIdAndDelete(reportId);
    }

    return res.json({ success: true, message: 'Performance report deleted successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting performance report: ' + err.message });
  }
});

module.exports = router;

