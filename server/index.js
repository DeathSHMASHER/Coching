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

// Enterprise Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';");
  next();
});

// Middleware & Strict Body Size Limits (Prevents Large Payload DoS)
app.use(cors());
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// Deep NoSQL Operator Sanitizer (prevents Mongo query injection via $gt, $ne, etc.)
function sanitizeNoSql(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeNoSql);
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    clean[key] = sanitizeNoSql(obj[key]);
  }
  return clean;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = sanitizeNoSql(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitizeNoSql(req.query);
  if (req.params && typeof req.params === 'object') req.params = sanitizeNoSql(req.params);
  next();
});

// Lightweight In-Memory Rate Limiter (Serverless & Standalone Compatible)
function createRateLimiter(maxRequests = 50, windowMs = 15 * 60 * 1000, message = 'Too many requests. Please try again later.') {
  const ipBuckets = new Map();

  return (req, res, next) => {
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

const authLimiter = createRateLimiter(12, 15 * 60 * 1000, 'Too many login attempts. Please wait 15 minutes before trying again.');
const admissionApplyLimiter = createRateLimiter(8, 15 * 60 * 1000, 'Submission rate limit reached. Please wait 15 minutes before submitting again.');
const apiGlobalLimiter = createRateLimiter(150, 5 * 60 * 1000, 'High request volume detected from your IP. Please try again in a few moments.');

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

// Global Error Sanitization Middleware (Masks internal stack traces in production)
app.use((err, req, res, next) => {
  console.error('🛡️ [API Exception Handler]:', err.message);
  if (res.headersSent) return next(err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.message && err.status < 500 ? err.message : 'An internal security exception occurred. Please try again.'
  });
});

// Start Server locally if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Jigyasa Science Academy Server active on http://localhost:${PORT}`);
  });
}

module.exports = app;
