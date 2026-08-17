const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jigyasa_science_academy_secure_jwt_secret_key_2026';
const TOKEN_EXPIRES_IN = '7d';

/**
 * Sign a JWT payload
 * @param {object} payload 
 * @returns {string} Signed JWT
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

/**
 * Middleware: Verify Bearer JWT Token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to proceed.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Session invalid or expired. Please log in again.'
    });
  }
}

/**
 * Middleware: Require Administrator Privileges
 */
function requireAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Administrator privileges required.'
    });
  });
}

/**
 * Middleware: Require Either Admin OR the matching Student (IDOR Prevention)
 */
function requireStudentOrAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    const requestedId = (req.params.studentId || req.body.studentId || req.query.studentId || '').trim().toUpperCase();
    const tokenStudentId = (req.user && req.user.studentId ? req.user.studentId : '').trim().toUpperCase();

    if (tokenStudentId && requestedId && tokenStudentId === requestedId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access Denied: You do not have permission to access this student record.'
    });
  });
}

/**
 * Middleware: Optional Authentication (attaches req.user if token present)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  }
  next();
}

module.exports = {
  JWT_SECRET,
  signToken,
  verifyToken,
  requireAdmin,
  requireStudentOrAdmin,
  optionalAuth
};
