const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Safely hashes a plaintext password using bcrypt
 * @param {string} password 
 * @returns {string} Hashed password
 */
function hashPassword(password) {
  if (!password) return '';
  // If already a bcrypt hash (starts with $2a$, $2b$, or $2y$ and 60 chars long), return as is
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(password)) {
    return password;
  }
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored password.
 * Supports both bcrypt hashes and legacy/demo plaintext with automatic fallback.
 * @param {string} inputPassword 
 * @param {string} storedPassword 
 * @returns {boolean} True if matched
 */
function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) return false;

  const cleanInput = String(inputPassword).trim();
  const cleanStored = String(storedPassword).trim();

  // If stored password is a valid bcrypt hash
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(cleanStored)) {
    try {
      return bcrypt.compareSync(cleanInput, cleanStored);
    } catch (e) {
      return false;
    }
  }

  // Graceful fallback for demo/legacy plaintext passwords (e.g. initial demo accounts)
  return cleanInput === cleanStored;
}

module.exports = {
  hashPassword,
  verifyPassword
};
