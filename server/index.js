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

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Lightweight In-Memory Rate Limiter (Serverless & Standalone Compatible)
function createRateLimiter(maxRequests = 50, windowMs = 15 * 60 * 1000, message = 'Too many requests. Please try again later.') {
  const ipBuckets = new Map();

  return (req, res, next) => {
    // Get client IP
    const clientIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.socket.remoteAddress || 'unknown-ip';

    const now = Date.now();
    const bucket = ipBuckets.get(clientIp);

    if (!bucket || (now - bucket.startTime > windowMs)) {
      ipBuckets.set(clientIp, { count: 1, startTime: now });
      return next();
    }

    bucket.count++;
    if (bucket.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: message,
        retryAfterMinutes: Math.ceil((windowMs - (now - bucket.startTime)) / 60000)
      });
    }

    next();
  };
}

const authLimiter = createRateLimiter(30, 15 * 60 * 1000, 'Too many login attempts. Please wait 15 minutes before trying again.');
const admissionApplyLimiter = createRateLimiter(15, 15 * 60 * 1000, 'Too many application submissions from your device. Please try again later.');

// Netlify Serverless Function Path Normalization Middleware
app.use((req, res, next) => {
  if (req.url && req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api');
  }
  next();
});

// Connect Database & Ensure DB connection on serverless functions
connectDB();
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (e) {
    console.warn('Serverless DB Middleware Notice:', e.message);
  }
  next();
});

// Rate-limited sensitive public endpoints
app.use('/api/auth/student-login', authLimiter);
app.use('/api/auth/admin-login', authLimiter);
app.use('/auth/student-login', authLimiter);
app.use('/auth/admin-login', authLimiter);

app.use('/api/admissions/apply', admissionApplyLimiter);
app.use('/admissions/apply', admissionApplyLimiter);

// API Routes (Mounted on both /api/route and /route for Netlify serverless compatibility)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/admissions', admissionsRoutes);
app.use('/admissions', admissionsRoutes);

app.use('/api/students', studentsRoutes);
app.use('/students', studentsRoutes);

app.use('/api/attendance', attendanceRoutes);
app.use('/attendance', attendanceRoutes);

app.use('/api/performance', performanceRoutes);
app.use('/performance', performanceRoutes);

app.use('/api/doubts', doubtsRoutes);
app.use('/doubts', doubtsRoutes);

app.use('/api/feedback', feedbackRoutes);
app.use('/feedback', feedbackRoutes);

app.use('/api/notices', noticesRoutes);
app.use('/notices', noticesRoutes);

app.use('/api/courses', coursesRoutes);
app.use('/courses', coursesRoutes);

app.use('/api/live-classes', liveClassesRoutes);
app.use('/live-classes', liveClassesRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    platform: 'Jigyasa Science Academy API',
    secured: true
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
