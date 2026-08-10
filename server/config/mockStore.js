// Smart Memory Store for offline testing and initial seeding
const mockData = {
  students: [
    {
      _id: 'stu_101',
      studentId: 'STU-2026-101',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phone: '+91 98765 43210',
      course: 'IIT-JEE Masterclass (Class 12)',
      batch: 'Morning Batch Alpha',
      password: 'password123',
      admissionDate: new Date('2026-01-10'),
      status: 'Active',
      feeStatus: 'Paid',
      feeDueAmount: 0,
      feeDueDate: 'N/A'
    },
    {
      _id: 'stu_102',
      studentId: 'STU-2026-102',
      name: 'Ananya Verma',
      email: 'ananya.v@example.com',
      phone: '+91 98123 45678',
      course: 'NEET Medical Excellence',
      batch: 'Evening Batch Beta',
      password: 'password123',
      admissionDate: new Date('2026-01-15'),
      status: 'Active',
      feeStatus: 'Partial',
      feeDueAmount: 15000,
      feeDueDate: '2026-08-25'
    },
    {
      _id: 'stu_103',
      studentId: 'STU-2026-103',
      name: 'Rohan Gupta',
      email: 'rohan.g@example.com',
      phone: '+91 99887 76655',
      course: 'Class 10 CBSE Board Prep',
      batch: 'Weekend Batch',
      password: 'password123',
      admissionDate: new Date('2026-02-01'),
      status: 'Active',
      feeStatus: 'Paid',
      feeDueAmount: 0,
      feeDueDate: 'N/A'
    }
  ],
  admissions: [
    {
      _id: 'adm_201',
      applicationId: 'ADM-901',
      name: 'Vikram Mehta',
      email: 'vikram.mehta@example.com',
      phone: '+91 97766 55443',
      targetCourse: 'IIT-JEE Masterclass (Class 11)',
      previousPercentage: 92.5,
      message: 'Looking for advanced problem solving in Physics and Math.',
      status: 'Pending',
      appliedAt: new Date('2026-08-05'),
      studentIdAssigned: ''
    },
    {
      _id: 'adm_202',
      applicationId: 'ADM-902',
      name: 'Priya Iyer',
      email: 'priya.iyer@example.com',
      phone: '+91 96655 44332',
      targetCourse: 'NEET Medical Excellence',
      previousPercentage: 94.0,
      message: 'Interested in Biology intensive modules.',
      status: 'Approved',
      appliedAt: new Date('2026-08-01'),
      studentIdAssigned: 'STU-2026-104'
    }
  ],
  attendance: [
    { _id: 'att_1', studentId: 'STU-2026-101', date: '2026-08-01', status: 'Present', topicCovered: 'Kinematics & Vectors' },
    { _id: 'att_2', studentId: 'STU-2026-101', date: '2026-08-02', status: 'Present', topicCovered: 'Laws of Motion' },
    { _id: 'att_3', studentId: 'STU-2026-101', date: '2026-08-03', status: 'Late', topicCovered: 'Work, Energy & Power' },
    { _id: 'att_4', studentId: 'STU-2026-101', date: '2026-08-04', status: 'Present', topicCovered: 'Rotational Dynamics' },
    { _id: 'att_5', studentId: 'STU-2026-101', date: '2026-08-05', status: 'Absent', topicCovered: 'Gravitation Fundamentals' },
    { _id: 'att_6', studentId: 'STU-2026-101', date: '2026-08-06', status: 'Present', topicCovered: 'Fluid Mechanics Part 1' },
    { _id: 'att_7', studentId: 'STU-2026-101', date: '2026-08-07', status: 'Present', topicCovered: 'Thermodynamics Laws' },
    { _id: 'att_8', studentId: 'STU-2026-102', date: '2026-08-05', status: 'Present', topicCovered: 'Organic Chemistry Basics' },
    { _id: 'att_9', studentId: 'STU-2026-102', date: '2026-08-06', status: 'Present', topicCovered: 'Human Anatomy Overview' }
  ],
  performance: [
    {
      _id: 'perf_1',
      studentId: 'STU-2026-101',
      examTitle: 'Weekly JEE Mock Assessment #4',
      date: '2026-08-02',
      totalScore: 278,
      maxMarks: 300,
      subjectBreakdown: { Physics: 94, Chemistry: 88, Mathematics: 96 },
      rank: 2,
      percentile: 99.4,
      remarks: 'Outstanding speed in Mathematics calculus problems. Keep practicing organic synthesis reactions.'
    },
    {
      _id: 'perf_2',
      studentId: 'STU-2026-101',
      examTitle: 'Monthly Physics & Math Sprint #1',
      date: '2026-07-20',
      totalScore: 184,
      maxMarks: 200,
      subjectBreakdown: { Physics: 90, Mathematics: 94 },
      rank: 1,
      percentile: 99.8,
      remarks: 'Excellent concept clarity across Rotational Dynamics and Calculus.'
    },
    {
      _id: 'perf_3',
      studentId: 'STU-2026-102',
      examTitle: 'NEET Full Length Biology Mock',
      date: '2026-08-04',
      totalScore: 680,
      maxMarks: 720,
      subjectBreakdown: { Biology: 350, Chemistry: 170, Physics: 160 },
      rank: 3,
      percentile: 98.9,
      remarks: 'Top score in Genetics & Botany. Focus extra time on Optics formulas.'
    }
  ],
  doubts: [
    {
      _id: 'dbt_1',
      doubtId: 'DBT-301',
      studentId: 'STU-2026-101',
      studentName: 'Aarav Sharma',
      subject: 'Physics',
      topic: 'Rotational Motion - Moment of Inertia',
      question: 'How do we calculate moment of inertia for a cone about its central perpendicular axis?',
      status: 'Resolved',
      solution: 'Use integration along elemental disks of radius r = (R/H)*z. Integrate dm * r^2 / 2 from z=0 to H. Result is I = 3/10 * M * R^2.',
      createdAt: new Date('2026-08-03T10:00:00Z'),
      answeredAt: new Date('2026-08-03T14:30:00Z')
    },
    {
      _id: 'dbt_2',
      doubtId: 'DBT-302',
      studentId: 'STU-2026-101',
      studentName: 'Aarav Sharma',
      subject: 'Mathematics',
      topic: 'Definite Integration',
      question: 'Can King\'s Property (Integral from a to b of f(x)dx = Integral of f(a+b-x)dx) be applied to trigonometric limits?',
      status: 'Pending',
      solution: '',
      createdAt: new Date('2026-08-09T18:20:00Z')
    }
  ],
  feedback: [
    {
      _id: 'fb_1',
      feedbackId: 'FB-501',
      studentId: 'STU-2026-101',
      studentName: 'Aarav Sharma',
      overallRating: 5,
      clarityRating: 5,
      materialRating: 5,
      supportRating: 5,
      comments: 'The problem-solving sessions and doubt clearance desk helped boost my confidence tremendously!',
      createdAt: new Date('2026-08-04')
    },
    {
      _id: 'fb_2',
      feedbackId: 'FB-502',
      studentId: 'STU-2026-102',
      studentName: 'Ananya Verma',
      overallRating: 5,
      clarityRating: 5,
      materialRating: 4,
      supportRating: 5,
      comments: 'Doubt clearance response time is extremely fast. Detailed notes are very structured.',
      createdAt: new Date('2026-08-06')
    },
    {
      _id: 'fb_3',
      feedbackId: 'FB-503',
      studentId: 'STU-2026-103',
      studentName: 'Rohan Gupta',
      overallRating: 4,
      clarityRating: 5,
      materialRating: 4,
      supportRating: 4,
      comments: 'Great coaching center. The weekly performance analytics motivate me to study harder every week!',
      createdAt: new Date('2026-08-08')
    }
  ],
  notices: [
    {
      _id: 'not_1',
      noticeId: 'NTC-101',
      title: 'Upcoming All-India JEE Advanced Grand Mock Test #5',
      content: 'The 6-hour full syllabus JEE Advanced Mock Test will be held online this Sunday at 09:00 AM IST. Attendance is mandatory for all Class 12 & Dropper batches.',
      category: 'Exam',
      isImportant: true,
      postedBy: 'Director of Academics',
      createdAt: new Date('2026-08-09T10:00:00Z')
    },
    {
      _id: 'not_2',
      noticeId: 'NTC-102',
      title: 'Special Physics Revision Marathon - Electrodynamics',
      content: 'Join Dr. V. K. Sharma for a 3-hour live problem solving session covering Electrostatics & Current Electricity formulas.',
      category: 'Schedule',
      isImportant: false,
      postedBy: 'HOD Physics',
      createdAt: new Date('2026-08-07T14:30:00Z')
    }
  ]
};

// Helper for dynamic feedback index calculation
function computeFeedbackIndex() {
  const list = mockData.feedback;
  if (!list.length) {
    return {
      averageRating: 5.0,
      clarityAvg: 5.0,
      materialAvg: 5.0,
      supportAvg: 5.0,
      satisfactionPercentage: 100,
      totalResponses: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  let totalOverall = 0;
  let totalClarity = 0;
  let totalMaterial = 0;
  let totalSupport = 0;
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  list.forEach(item => {
    totalOverall += item.overallRating;
    totalClarity += item.clarityRating;
    totalMaterial += item.materialRating;
    totalSupport += item.supportRating;
    const rounded = Math.round(item.overallRating);
    if (distribution[rounded] !== undefined) {
      distribution[rounded]++;
    }
  });

  const count = list.length;
  const averageRating = (totalOverall / count).toFixed(1);
  const clarityAvg = (totalClarity / count).toFixed(1);
  const materialAvg = (totalMaterial / count).toFixed(1);
  const supportAvg = (totalSupport / count).toFixed(1);
  const satisfactionPercentage = Math.round((averageRating / 5) * 100);

  return {
    averageRating: parseFloat(averageRating),
    clarityAvg: parseFloat(clarityAvg),
    materialAvg: parseFloat(materialAvg),
    supportAvg: parseFloat(supportAvg),
    satisfactionPercentage,
    totalResponses: count,
    distribution,
    recentFeedback: list.slice(-5).reverse()
  };
}

module.exports = { mockData, computeFeedbackIndex };
