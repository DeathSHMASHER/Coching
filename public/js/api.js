// ============================================================
// API CLIENT + TOAST NOTIFICATION SYSTEM + SECURITY UTILITIES
// ============================================================
const API = '/api';

/**
 * Universal HTML escape helper to prevent Stored & Reflected XSS
 * @param {string|any} str 
 * @returns {string} Sanitized string safe for innerHTML insertion
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.escapeHTML = escapeHTML;

/**
 * Universal Authenticated API Request Helper
 * @param {string} endpoint 
 * @param {string} method 
 * @param {object|null} data 
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  const headers = { 'Content-Type': 'application/json' };

  // Retrieve active session token (Admin token or Student token)
  const token = sessionStorage.getItem('jigyasa_admin_token') ||
                sessionStorage.getItem('jigyasa_student_token') ||
                sessionStorage.getItem('jigyasa_auth_token');

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers };
  if (data) opts.body = JSON.stringify(data);

  try {
    const res = await fetch(`${API}${endpoint}`, opts);
    const result = await res.json();

    // If session expired or unauthorized on protected action
    if (res.status === 401 && endpoint !== '/auth/student-login' && endpoint !== '/auth/admin-login') {
      console.warn(`[Auth Notice] 401 Unauthorized for ${endpoint}`);
    }

    return result;
  } catch (e) {
    console.error(`API Error [${endpoint}]:`, e);
    return { success: false, message: 'Network error — please check your connection.' };
  }
}

// Global Toast Notification Helper
function showToast(msg, type = 'ok') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const safeMsg = escapeHTML(msg);
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : ''}`;
  t.innerHTML = `
    <i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'} toast-icon ${type === 'error' ? 'err' : 'ok'}"></i>
    <span class="toast-msg">${safeMsg}</span>
  `;
  stack.appendChild(t);

  // Auto remove
  setTimeout(() => {
    t.style.transition = 'opacity 0.3s, transform 0.3s';
    t.style.opacity = '0';
    t.style.transform = 'translateX(100%) scale(0.9)';
    setTimeout(() => t.remove(), 300);
  }, 4000);
}
