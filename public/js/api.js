// ============================================================
// API CLIENT + TOAST NOTIFICATION SYSTEM
// ============================================================
const API = '/api';

async function apiRequest(endpoint, method = 'GET', data = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (data) opts.body = JSON.stringify(data);
  try {
    const res = await fetch(`${API}${endpoint}`, opts);
    return await res.json();
  } catch (e) {
    console.error(`API Error [${endpoint}]:`, e);
    return { success: false, message: 'Network error — please check your connection.' };
  }
}

// Toast
function showToast(msg, type = 'ok') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : ''}`;
  t.innerHTML = `
    <i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'} toast-icon ${type === 'error' ? 'err' : 'ok'}"></i>
    <span class="toast-msg">${msg}</span>
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
