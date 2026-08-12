const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');

// Route Imports
const authRoutes = require('./routes/auth');
const admissionsRoutes = require('./routes/admissions');
const studentsRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const performanceRoutes = require('./routes/performance');
const doubtsRoutes = require('./routes/doubts');
const feedbackRoutes = require('./routes/feedback');
const noticesRoutes = require('./routes/notices');
const coursesRoutes = require('./routes/courses');
const liveClassesRoutes = require('./routes/liveClasses');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect Database
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/doubts', doubtsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/live-classes', liveClassesRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    platform: 'Jigyasa Science Academy API'
  });
});

// Serve Static Files from public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Dedicated HTML Route Clean Rewrites
app.get('/admission', (req, res) => res.sendFile(path.join(publicPath, 'admission.html')));
app.get('/student-portal', (req, res) => res.sendFile(path.join(publicPath, 'student-portal.html')));
app.get('/admin-portal', (req, res) => res.sendFile(path.join(publicPath, 'admin-portal.html')));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res) => {
  if (req.path && typeof req.path === 'string' && req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start Server locally if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Jigyasa Science Academy Server active on http://localhost:${PORT}`);
  });
}

module.exports = app;
