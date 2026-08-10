// ============================================================
// APP.JS — Jigyasa Science Academy Interactive Controller
// ============================================================

// ---- NAVBAR SHADOW ON SCROLL ----
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

// ---- MOBILE DRAWER ----
const navToggle = document.getElementById('navToggle');
const mobileDrawer = document.getElementById('mobileDrawer');

if (navToggle && mobileDrawer) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    mobileDrawer.classList.toggle('open');
    document.body.style.overflow = mobileDrawer.classList.contains('open') ? 'hidden' : '';
  });
}

function closeDrawer() {
  if (navToggle && mobileDrawer) {
    navToggle.classList.remove('open');
    mobileDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }
}

document.addEventListener('click', (e) => {
  if (mobileDrawer && mobileDrawer.classList.contains('open') && !mobileDrawer.contains(e.target) && !navToggle.contains(e.target)) {
    closeDrawer();
  }
});

// ---- QUICK INQUIRY EMAIL MODAL ----
function openQuickInquiryModal() {
  const modal = document.getElementById('quickInquiryModal');
  if (modal) modal.classList.remove('hidden');
}

function closeQuickInquiryModal() {
  const modal = document.getElementById('quickInquiryModal');
  if (modal) modal.classList.add('hidden');
}

async function handleQuickInquirySubmit(e) {
  e.preventDefault();
  const name = document.getElementById('inqName').value.trim();
  const email = document.getElementById('inqEmail').value.trim();
  const phone = document.getElementById('inqPhone').value.trim();
  const message = document.getElementById('inqMsg').value.trim();

  if (!name || !email || !phone) {
    showToast('Name, Email, and Phone are required.', 'error');
    return;
  }

  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Email…';

  const res = await apiRequest('/admissions/apply', 'POST', {
    name,
    email,
    phone,
    targetCourse: 'Direct Website Email Inquiry',
    message: message || 'Inquiry sent via Lead Teacher Profile Button'
  });

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Direct Email Request';

  if (res.success) {
    showToast('Email inquiry sent live to shahriyartaufik@gmail.com!', 'success');
    closeQuickInquiryModal();
    e.target.reset();
  } else {
    showToast(res.message || 'Failed to send email. Please try again.', 'error');
  }
}

// ---- TAB SWITCHER ----
function switchTabEl(btn, wrapperId, targetId) {
  const nav = btn.closest('.tabs-nav');
  if (nav) nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;
  wrap.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(targetId);
  if (target) target.classList.add('active');
}

// ---- SCROLL REVEAL ANIMATION ----
function setupReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function animateHeroBars() {
  setTimeout(() => {
    document.querySelectorAll('.prog-fill[data-width]').forEach(el => {
      el.style.width = el.dataset.width + '%';
    });
  }, 600);
}

// ---- DYNAMIC COURSE CATALOG (CLASS 5 TO 12 + CODING) ----
async function _loadDynamicCourses() {
  const container = document.getElementById('coursesCatalogContainer');
  if (!container) return;

  const res = await apiRequest('/courses');
  if (!res.success || !res.courses || !res.courses.length) {
    return;
  }

  const list = res.courses;

  container.innerHTML = list.map((c, idx) => {
    const isCoding = c.courseId === 'CRS-PYT' || c.category.includes('Coding');
    const badgeHtml = isCoding ?
      `<div class="text-xs c-cyan" style="font-weight:800;"><i class="fa-solid fa-seedling"></i> Zero Prior Coding Knowledge Needed • Taught From Basics</div>` :
      `<div class="text-xs c-emerald" style="font-weight:700;"><i class="fa-solid fa-tag"></i> Includes ₹500 Tuition Discount</div>`;

    const btnLabel = isCoding ? 'Apply For Python Coding' : `Apply For ${c.classes}`;

    return `
      <div class="card card-p2 reveal reveal-delay-${(idx % 4) + 1}">
        <div style="display:flex;justify-content:space-between;align-items:center;" class="mb-1">
          <span class="chip ${c.isPopular ? 'chip-amber' : 'chip-purple'}">${c.classes}</span>
          <span class="chip chip-cyan text-xs">${c.category}</span>
        </div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;font-weight:800;">${c.title}</h3>
        <p class="text-sm text-muted mb-2">${c.description}</p>

        ${c.subjects && c.subjects.length ? `
          <div class="mb-2 text-xs text-muted">
            <i class="fa-solid fa-book-open c-gold"></i> Curriculum: <strong>${c.subjects.join(', ')}</strong>
          </div>
        ` : ''}

        <div style="padding:0.85rem 1rem;background:rgba(255,255,255,0.04);border-radius:var(--r-sm);border:1px solid rgba(255,255,255,0.08);" class="mb-2">
          <div style="display:flex;align-items:baseline;justify-content:space-between;">
            <div class="text-xs text-muted">Tuition Fee:</div>
            ${c.originalFee && c.originalFee > c.currentFee ? `<div class="text-xs text-dim" style="text-decoration:line-through;">₹${c.originalFee}</div>` : ''}
          </div>
          <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:800;" class="c-gold">
            ₹${c.currentFee} <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);">${c.billingPeriod}</span>
          </div>
          ${badgeHtml}
        </div>

        <a href="/admission.html?course=${encodeURIComponent(c.title)}#applyFormCard" class="btn ${c.isPopular ? 'btn-grad' : 'btn-primary'} btn-block btn-sm">
          <i class="fa-solid fa-paper-plane"></i> ${btnLabel}
        </a>
      </div>
    `;
  }).join('');

  setupReveal();
}
window._loadDynamicCourses = _loadDynamicCourses;

// ---- SIMPLIFIED 2-INPUT CALCULATOR (BOARD & CLASS) ----
function calculateScienceRoadmap() {
  const boardEl = document.getElementById('calcBoard');
  const gradeEl = document.getElementById('calcGrade');
  const resultBox = document.getElementById('calcResultBox');

  if (!resultBox) return;

  const board = boardEl ? boardEl.value : '';
  const grade = gradeEl ? gradeEl.value : '';

  if (!board || !grade) {
    showToast('Please select both Education Board and Class.', 'error');
    return;
  }

  const gradeNum = parseInt(grade.replace(/\D/g, ''), 10) || 5;

  let regTitle = '';
  let regFee = '';
  let regSubjects = '';
  let csTitle = '';
  let csFee = '';
  let csSubjects = '';

  if (gradeNum === 5 || gradeNum === 6) {
    regTitle = `Class ${gradeNum} Foundation (All Core Subjects)`;
    regFee = '₹1,500 / month';
    regSubjects = 'English, Hindi, Mathematics, Science, Social Science, Computer';
    csTitle = 'Python Coding Specialization';
    csFee = '₹1,000 / month';
    csSubjects = 'No Coding Experience Needed! Python Programming & Logic (2 Classes/wk)';
  } else if (gradeNum === 7 || gradeNum === 8) {
    regTitle = `Class ${gradeNum} Advanced Foundation (All Core Subjects)`;
    regFee = '₹2,500 / month';
    regSubjects = 'English, Hindi, Mathematics, Science, Social Science, Computer';
    csTitle = 'Python Coding Specialization';
    csFee = '₹1,000 / month';
    csSubjects = 'No Prior Knowledge Required! Step-by-Step Python & Projects (2 Classes/wk)';
  } else if (gradeNum === 9 || gradeNum === 10) {
    regTitle = `Class ${gradeNum} Board Science & Mathematics Mastery`;
    regFee = '₹4,000 / month';
    regSubjects = 'Physics, Chemistry, Biology & Mathematics';
    csTitle = `Computer Science Class ${gradeNum} (or Python Specialization)`;
    csFee = `₹1,500 / month (or ₹1,000 / month for Python)`;
    csSubjects = 'Taught From Fundamentals! CS Logic & Practical Exam Drills';
  } else {
    regTitle = `Class ${gradeNum} Board Physics + Mathematics Package`;
    regFee = '₹3,500 / month (or ₹1,500 / subject)';
    regSubjects = 'Physics & Mathematics (Calculus, Mechanics, Electrodynamics)';
    csTitle = `Computer Science Class ${gradeNum} (Python & Data Structures)`;
    csFee = '₹2,000 / month';
    csSubjects = 'Advanced Python, Data Structures & Algorithms Taught Step-by-Step';
  }

  resultBox.classList.remove('hidden');
  resultBox.innerHTML = `
    <div class="mt-2" style="display:flex;flex-direction:column;gap:1rem;">
      <!-- TOP BOX: REGULAR ACADEMIC SUBJECTS -->
      <div class="card card-p2" style="border-color:var(--gold);background:rgba(255,183,3,0.05);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;" class="mb-1">
          <span class="chip chip-amber"><i class="fa-solid fa-graduation-cap"></i> Regular Academic Course • ${board}</span>
          <span class="chip chip-purple" style="font-weight:800;font-size:0.95rem;">${regFee}</span>
        </div>
        <h4 style="font-size:1.15rem;font-weight:800;" class="mb-1">${regTitle}</h4>
        <p class="text-xs text-muted mb-1"><i class="fa-solid fa-seedling c-emerald"></i> <strong>Taught From Fundamentals:</strong> Beginners welcome with step-by-step guidance.</p>
        <p class="text-xs text-muted mb-2"><i class="fa-solid fa-book-open c-gold"></i> Included Subjects: <strong>${regSubjects}</strong></p>
        <a href="/admission.html?course=${encodeURIComponent(regTitle)}&board=${encodeURIComponent(board)}#applyFormCard" class="btn btn-grad btn-sm">
          <i class="fa-solid fa-paper-plane"></i> Apply For ${regTitle}
        </a>
      </div>

      <!-- BOTTOM BOX: COMPUTER SCIENCE & PYTHON CODING -->
      <div class="card card-p2" style="border-color:var(--cyan);background:rgba(0,240,255,0.05);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;" class="mb-1">
          <span class="chip chip-cyan"><i class="fa-solid fa-code"></i> Computer Science &amp; Coding Specialization</span>
          <span class="chip chip-green" style="font-weight:800;font-size:0.95rem;">${csFee}</span>
        </div>
        <h4 style="font-size:1.15rem;font-weight:800;" class="mb-1">${csTitle}</h4>
        <p class="text-xs c-cyan mb-1" style="font-weight:800;"><i class="fa-solid fa-check-circle"></i> NO CODING BACKGROUND NEEDED! Taught 100% From Basics.</p>
        <p class="text-xs text-muted mb-2"><i class="fa-solid fa-laptop-code c-cyan"></i> Curriculum: <strong>${csSubjects}</strong></p>
        <a href="/admission.html?course=${encodeURIComponent(csTitle)}&board=${encodeURIComponent(board)}#applyFormCard" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-paper-plane"></i> Apply For Computer Science / Coding
        </a>
      </div>
    </div>
  `;
}
window.calculateScienceRoadmap = calculateScienceRoadmap;

// ---- LOAD BROADCAST NOTICES ----
async function _loadNotices() {
  const container = document.getElementById('noticesContainer');
  if (!container) return;

  const res = await apiRequest('/notices');

  if (!res.success || !res.notices || !res.notices.length) {
    container.innerHTML = '<p class="text-muted text-sm">No announcements broadcasted yet.</p>';
    return;
  }

  container.innerHTML = res.notices.map(n => {
    const isUrgent = n.category === 'Urgent' || n.isImportant;
    const catChip = isUrgent ? 'chip-red' : n.category === 'Exam' ? 'chip-purple' : 'chip-cyan';
    const catIcon = isUrgent ? 'fa-triangle-exclamation' : n.category === 'Exam' ? 'fa-atom' : 'fa-bullhorn';

    return `
      <div class="card card-p2 reveal">
        <div style="display:flex;align-items:center;justify-content:space-between;" class="mb-1">
          <span class="chip ${catChip}"><i class="fa-solid ${catIcon}"></i> ${n.category}</span>
          <span class="text-xs text-muted">${new Date(n.createdAt).toLocaleDateString()}</span>
        </div>
        <h3 style="font-size:1.05rem;font-weight:700;" class="mb-1">${n.title}</h3>
        <p class="text-sm text-muted mb-2">${n.content}</p>
        <div class="text-xs text-dim"><i class="fa-solid fa-user-shield"></i> Posted by: ${n.postedBy || 'Director Office'}</div>
      </div>
    `;
  }).join('');

  setupReveal();
}
window._loadNotices = _loadNotices;

// ---- DYNAMIC FEEDBACK INDEX ----
async function _loadFeedbackIndex() {
  const res = await apiRequest('/feedback/index');
  if (!res.success || !res.feedbackIndex) return;
  const fb = res.feedbackIndex;

  // Hero widget
  _setText('hwScore',   fb.averageRating.toFixed(1));
  _setText('hwCount',   `Based on ${fb.totalResponses} student ${fb.totalResponses === 1 ? 'response' : 'responses'}`);
  _setText('hwClarity', fb.clarityAvg + '/5');
  _setText('hwMaterial',fb.materialAvg + '/5');
  _setText('hwSupport', fb.supportAvg + '/5');

  const hwStars = document.getElementById('hwStars');
  if (hwStars) hwStars.textContent = _starStr(fb.averageRating);

  // Main Feedback Section
  _setText('fbBigNum', fb.averageRating.toFixed(1));
  const fbStars = document.getElementById('fbStars');
  if (fbStars) fbStars.textContent = _starStr(fb.averageRating);
  _setText('fbSatChip', '♥ ' + fb.satisfactionPercentage + '% Student Satisfaction');

  // Category bars
  _setText('vClarity',  fb.clarityAvg + ' / 5');
  _setText('vMaterial', fb.materialAvg + ' / 5');
  _setText('vSupport',  fb.supportAvg + ' / 5');

  setTimeout(() => {
    _setWidth('bClarity',  (fb.clarityAvg  / 5) * 100);
    _setWidth('bMaterial', (fb.materialAvg / 5) * 100);
    _setWidth('bSupport',  (fb.supportAvg  / 5) * 100);
  }, 200);

  // Recent reviews
  const feed = document.getElementById('reviewsFeed');
  if (feed) {
    if (!fb.recentFeedback || !fb.recentFeedback.length) {
      feed.innerHTML = '<p class="text-muted text-sm">No feedback yet.</p>';
    } else {
      feed.innerHTML = fb.recentFeedback.map(f => `
        <div class="review-card">
          <div class="rv-head">
            <span class="rv-name">${f.studentName} <span class="text-xs text-muted">(${f.studentId})</span></span>
            <span class="rv-stars">${'★'.repeat(f.overallRating)}</span>
          </div>
          <p class="rv-comment">"${f.comments || 'Great science coaching and personalized support!'}"</p>
        </div>`).join('');
    }
  }
}
window._loadFeedbackIndex = _loadFeedbackIndex;

// ---- STUDENT ROSTER ----
let _allRoster = [];

async function _loadRoster() {
  const res = await apiRequest('/students');
  const body = document.getElementById('rosterBody');
  const countEl = document.getElementById('rosterCount');
  if (!body) return;

  if (!res.success || !res.students) return;
  _allRoster = res.students;

  if (countEl) countEl.innerHTML = `<i class="fa-solid fa-users"></i> ${_allRoster.length} Students`;
  _renderRoster(_allRoster);
}
window._loadRoster = _loadRoster;

function _renderRoster(list) {
  const body = document.getElementById('rosterBody');
  if (!body) return;

  if (!list.length) {
    body.innerHTML = '<tr><td colspan="5" class="text-center text-muted text-sm">No matching students.</td></tr>';
    return;
  }
  body.innerHTML = list.map(s => `
    <tr>
      <td><span class="chip chip-cyan">${s.studentId}</span></td>
      <td><div class="font-bold">${s.name}</div><div class="text-xs text-muted">${s.email}</div></td>
      <td class="text-sm">${s.course}</td>
      <td><span class="chip chip-purple">${s.batch || 'Evening Batch'}</span></td>
      <td><span class="chip ${s.status === 'Active' ? 'chip-green' : 'chip-amber'}">${s.status}</span></td>
    </tr>`).join('');
}

function filterRoster() {
  const input = document.getElementById('rosterSearch');
  if (!input) return;
  const q = input.value.trim().toLowerCase();
  const filtered = !q ? _allRoster : _allRoster.filter(s =>
    (s.name + s.studentId + s.course + (s.batch || '')).toLowerCase().includes(q)
  );
  _renderRoster(filtered);
}

// HELPERS
function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function _setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}
function _starStr(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
  setupReveal();
  animateHeroBars();
  _loadDynamicCourses();
  _loadNotices();
  _loadFeedbackIndex();
  _loadRoster();
});

// Expose globally
window.openQuickInquiryModal   = openQuickInquiryModal;
window.closeQuickInquiryModal  = closeQuickInquiryModal;
window.handleQuickInquirySubmit= handleQuickInquirySubmit;
window.switchTabEl             = switchTabEl;
window.filterRoster            = filterRoster;
window.closeDrawer             = closeDrawer;
window.closeModal              = typeof closeModal !== 'undefined' ? closeModal : function(){};
