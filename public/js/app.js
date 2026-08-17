// ---- THEME SYSTEM MANAGER (2.4s PURE CIRCULAR SUN SPREAD & MOON RETRACT) ----
function applyThemeDOM(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('jigyasa_theme', theme);
  } catch (e) {}

  document.querySelectorAll('.theme-toggle-switch').forEach(sw => {
    if (theme === 'light') {
      sw.classList.add('is-light');
      sw.setAttribute('aria-checked', 'true');
      sw.setAttribute('title', 'Switch to Dark Mode');
    } else {
      sw.classList.remove('is-light');
      sw.setAttribute('aria-checked', 'false');
      sw.setAttribute('title', 'Switch to Light Mode');
    }
  });
}

let _activeViewTransition = null;

function getThemeIconCoordinates(targetTheme) {
  const isLight = (targetTheme === 'light');
  
  // Find the exact Moon icon or Sun icon element in the DOM
  const iconId = isLight ? 'navSunIcon' : 'navMoonIcon';
  const iconEl = document.getElementById(iconId) || document.querySelector(isLight ? '.track-icon-sun' : '.track-icon-moon');
  
  let pixelX, pixelY;
  if (iconEl) {
    const rect = iconEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      pixelX = rect.left + rect.width / 2;
      pixelY = rect.top + rect.height / 2;
    }
  }

  if (pixelX === undefined) {
    const sw = document.getElementById('navThemeToggle') || document.querySelector('.theme-toggle-switch');
    if (sw) {
      const rect = sw.getBoundingClientRect();
      pixelX = isLight ? (rect.right - 14) : (rect.left + 14);
      pixelY = rect.top + rect.height / 2;
    } else {
      pixelX = window.innerWidth * 0.85;
      pixelY = 35;
    }
  }

  const vpW = Math.max(document.documentElement.clientWidth, window.innerWidth || 1);
  const vpH = Math.max(document.documentElement.clientHeight, window.innerHeight || 1);

  // Convert to exact percentage coordinates so that high-DPI scaling or browser zoom NEVER offsets the center
  const pctX = ((pixelX / vpW) * 100).toFixed(3) + '%';
  const pctY = ((pixelY / vpH) * 100).toFixed(3) + '%';

  return { pctX, pctY };
}

function setTheme(theme) {
  const targetTheme = (theme === 'light') ? 'light' : 'dark';
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

  if (targetTheme === currentTheme) return;

  // If previous transition is still running, skip it immediately for zero-lag continuous switching
  if (_activeViewTransition && typeof _activeViewTransition.skipTransition === 'function') {
    try {
      _activeViewTransition.skipTransition();
    } catch(e) {}
    _activeViewTransition = null;
  }

  const isLight = (targetTheme === 'light');

  // 1. Get EXACT physical percentage center of Moon icon (for dark mode) or Sun icon (for light mode)
  const coords = getThemeIconCoordinates(targetTheme);

  // Set CSS variables on root BEFORE starting the View Transition
  document.documentElement.style.setProperty('--theme-x', coords.pctX);
  document.documentElement.style.setProperty('--theme-y', coords.pctY);

  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => {
      applyThemeDOM(targetTheme);
    });
    _activeViewTransition = transition;

    transition.finished.finally(() => {
      if (_activeViewTransition === transition) {
        _activeViewTransition = null;
      }
    });
  } else {
    applyThemeDOM(targetTheme);
  }
}
window.setTheme = setTheme;

function toggleTheme(event) {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = (current === 'dark') ? 'light' : 'dark';
  setTheme(next);
}
window.toggleTheme = toggleTheme;

// ---- SCROLL REVEAL OBSERVER ----
function setupReveal() {
  const reveals = document.querySelectorAll('.reveal');
  reveals.forEach(el => el.classList.add('anim-ready'));
  if (!('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 100px 0px' });

  reveals.forEach(el => observer.observe(el));

  // Safety fallback: ensure all content becomes visible within 350ms
  setTimeout(() => {
    reveals.forEach(el => el.classList.add('visible'));
  }, 350);
}
window.setupReveal = setupReveal;

// ---- HERO PROGRESS BARS ANIMATION ----
function animateHeroBars() {
  const fills = document.querySelectorAll('.prog-fill[data-width]');
  fills.forEach(f => {
    const w = f.getAttribute('data-width');
    if (w) f.style.width = w + '%';
  });
}
window.animateHeroBars = animateHeroBars;

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('jigyasa_theme') || document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(savedTheme);
});

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

// ---- DYNAMIC NAVBAR AUTH STATE & HERO STUDENT CARD ----
function updateNavAuthState() {
  const savedStu = sessionStorage.getItem('stuData');
  const savedAdmin = sessionStorage.getItem('jigyasa_admin_token');
  const navActions = document.querySelectorAll('.nav-actions');

  navActions.forEach(action => {
    if (savedAdmin) {
      action.innerHTML = `
        <a href="/admin-portal.html" class="btn btn-grad btn-sm">
          <i class="fa-solid fa-user-shield"></i> Director Desk
        </a>
      `;
    } else if (savedStu) {
      action.innerHTML = `
        <a href="/student-portal.html" class="btn btn-grad btn-sm">
          <i class="fa-solid fa-user-graduate"></i> My Portal
        </a>
      `;
    } else {
      action.innerHTML = `
        <a href="/student-portal.html" class="btn btn-grad btn-sm">
          <i class="fa-solid fa-user-graduate"></i> Portal Login
        </a>
      `;
    }
  });

  _renderHeroStudentCard();
}

async function _renderHeroStudentCard() {
  const container = document.getElementById('heroStudentCard');
  if (!container) return;

  const savedStu = sessionStorage.getItem('stuData');
  
  if (!savedStu) {
    // 1. NOT LOGGED IN: "Book Free Live Demo Lecture & Why Choose Jigyasa"
    container.innerHTML = `
      <div class="card card-p2" style="width:100%;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div class="pc-header" style="margin-bottom:1rem;padding-bottom:0.8rem;">
            <div class="pc-user">
              <div class="pc-avatar" style="background:var(--grad-gold);color:#040711;"><i class="fa-solid fa-graduation-cap"></i></div>
              <div>
                <div class="pc-name" style="font-size:1.1rem;font-weight:800;">Free Live Demo Class</div>
                <div class="pc-meta">Interactive 1-on-1 Concept Lecture</div>
              </div>
            </div>
            <span class="chip chip-amber"><i class="fa-solid fa-gift"></i> 100% Free</span>
          </div>

          <div style="margin-bottom:1.2rem;">
            <h4 class="font-heading mb-1" style="font-size:1.1rem;font-weight:800;">Why Students &amp; Parents Choose Jigyasa:</h4>
            <div style="display:flex;flex-direction:column;gap:0.7rem;margin-top:0.75rem;">
              <div style="display:flex;align-items:flex-start;gap:0.6rem;font-size:0.85rem;color:var(--text-muted);">
                <i class="fa-solid fa-circle-check c-gold" style="margin-top:3px;font-size:0.95rem;flex-shrink:0;"></i>
                <span><strong>Absolute Fundamentals:</strong> Taught step-by-step with simple analogies. Zero prior coding experience needed.</span>
              </div>
              <div style="display:flex;align-items:flex-start;gap:0.6rem;font-size:0.85rem;color:var(--text-muted);">
                <i class="fa-solid fa-circle-check c-emerald" style="margin-top:3px;font-size:0.95rem;flex-shrink:0;"></i>
                <span><strong>Dedicated 1-on-1 Doubt Desk:</strong> Daily personalized doubt-clearing sessions for every student.</span>
              </div>
              <div style="display:flex;align-items:flex-start;gap:0.6rem;font-size:0.85rem;color:var(--text-muted);">
                <i class="fa-solid fa-circle-check c-sapphire" style="margin-top:3px;font-size:0.95rem;flex-shrink:0;"></i>
                <span><strong>Transparent Performance Tracking:</strong> Real-time attendance, test score analysis &amp; mentor remarks.</span>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.6rem;padding:0.75rem 1rem;background:var(--bg-subcard);border-radius:var(--r-sm);border:1px solid var(--border-subcard);">
          <button onclick="openQuickInquiryModal(event)" class="btn btn-grad btn-sm" style="flex:1;">
            <i class="fa-solid fa-calendar-check"></i> Book Free Demo Class
          </button>
          <a href="/student-portal.html" class="btn btn-ghost btn-sm">
            <i class="fa-solid fa-right-to-bracket"></i> Student Login
          </a>
        </div>
      </div>
    `;
    return;
  }

  // 2. LOGGED IN: EXACT LIVE STUDENT DASHBOARD
  let stu = {};
  try { stu = JSON.parse(savedStu); } catch(e){}

  // Fetch real student reports if token is present
  let reports = [];
  try {
    const res = await apiRequest('/students/me');
    if (res && res.success && res.student) {
      stu = res.student;
      reports = res.student.examReports || [];
    }
  } catch(e) {}

  const enrolledSubjects = (stu.subjects && stu.subjects.length) 
    ? stu.subjects 
    : ['Physics', 'Mathematics', 'Chemistry', 'Computer Science'];

  const subjChips = enrolledSubjects.map(s => `
    <span class="chip chip-cyan" style="font-size:0.72rem;padding:0.2rem 0.6rem;font-weight:700;">
      <i class="fa-solid fa-book-bookmark"></i> ${s}
    </span>
  `).join(' ');

  let testContentHtml = '';
  if (reports && reports.length > 0) {
    const r = reports[0];
    const subjRows = (r.subjectBreakdown && r.subjectBreakdown.length)
      ? r.subjectBreakdown.map(sb => `
          <div class="prog-row" style="margin-bottom:0.5rem;">
            <div class="prog-info" style="font-size:0.78rem;">
              <span>${sb.subject}</span>
              <strong>${sb.score}/${sb.totalMarks} (${Math.round((sb.score/sb.totalMarks)*100)}%)</strong>
            </div>
            <div class="prog-track" style="height:6px;"><div class="prog-fill" style="width:${Math.round((sb.score/sb.totalMarks)*100)}%"></div></div>
          </div>
        `).join('')
      : `
          <div class="prog-row" style="margin-bottom:0.5rem;">
            <div class="prog-info" style="font-size:0.78rem;"><span>Overall Assessment Score</span><strong>${r.percentage || 90}%</strong></div>
            <div class="prog-track" style="height:6px;"><div class="prog-fill" style="width:${r.percentage || 90}%"></div></div>
          </div>
        `;

    testContentHtml = `
      <div style="margin-bottom:0.8rem;">
        <div class="pc-graph-title" style="font-size:0.82rem;margin-bottom:0.6rem;"><i class="fa-solid fa-chart-area c-gold"></i> Latest Exam: ${r.examTitle || 'Assessment'}</div>
        ${subjRows}
      </div>
    `;
  } else {
    testContentHtml = `
      <div style="padding:1.1rem 1rem;background:var(--bg-subcard);border-radius:var(--r-sm);border:1px solid var(--border-subcard);text-align:center;margin-bottom:1rem;">
        <i class="fa-solid fa-clipboard-check c-gold" style="font-size:1.6rem;margin-bottom:0.35rem;"></i>
        <div class="font-heading" style="font-weight:800;font-size:0.95rem;color:var(--text);">No Tests Conducted Yet</div>
        <p class="text-xs text-muted" style="margin-top:0.25rem;line-height:1.5;">Your upcoming assessment schedule, subject-wise marks, and rank analysis will appear here automatically.</p>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card card-p2" style="width:100%;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div class="pc-header" style="margin-bottom:0.9rem;padding-bottom:0.7rem;">
          <div class="pc-user">
            <div class="pc-avatar"><i class="fa-solid fa-user-graduate"></i></div>
            <div>
              <div class="pc-name" style="font-size:1.05rem;font-weight:800;">${stu.name || 'Student Portal'}</div>
              <div class="pc-meta">${stu.studentId || 'Active'} • Class ${stu.grade || '10'} ${stu.board || 'CBSE'}</div>
            </div>
          </div>
          <span class="chip-active">Active</span>
        </div>

        <div style="margin-bottom:0.85rem;">
          <div class="text-xs text-muted" style="font-weight:700;margin-bottom:0.35rem;"><i class="fa-solid fa-shapes c-gold"></i> Opted Subjects:</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.35rem;">
            ${subjChips}
          </div>
        </div>

        ${testContentHtml}
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0.75rem 1rem;background:var(--bg-subcard);border-radius:var(--r-sm);border:1px solid var(--border-subcard);margin-top:0.5rem;">
        <div class="text-xs text-muted">
          <i class="fa-solid fa-shield-halved c-emerald"></i> Enrolled Student Account
        </div>
        <a href="/student-portal.html" class="btn btn-grad btn-sm">
          <i class="fa-solid fa-arrow-right"></i> Open Portal
        </a>
      </div>
    </div>
  `;
}
window._renderHeroStudentCard = _renderHeroStudentCard;

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

  const _hp_trap = (document.getElementById('inqHpTrap') ? document.getElementById('inqHpTrap').value : '').trim();

  const res = await apiRequest('/admissions/apply', 'POST', {
    name,
    email,
    phone,
    targetCourse: 'Direct Website Email Inquiry',
    message: message || 'Inquiry sent via Lead Teacher Profile Button',
    _hp_trap
  });

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Direct Email Request';

  if (res.success) {
    showToast('Email inquiry sent successfully to jigyasascienceakademy@gmail.com!', 'success');
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

        <div style="padding:0.85rem 1rem;background:var(--bg-subcard);border-radius:var(--r-sm);border:1px solid var(--border-subcard);" class="mb-2">
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
// ---- SIMPLIFIED 2-INPUT CALCULATOR (BOARD & CLASS) WITH LIVE DB SYNC ----
async function calculateScienceRoadmap(isUserClick = false) {
  const boardEl = document.getElementById('calcBoard');
  const gradeEl = document.getElementById('calcGrade');
  const resultBox = document.getElementById('calcResultBox');

  if (!resultBox) return;

  const board = boardEl ? boardEl.value : '';
  const grade = gradeEl ? gradeEl.value : '';

  // Clear previous error styles
  if (boardEl) boardEl.classList.remove('input-error');
  if (gradeEl) gradeEl.classList.remove('input-error');

  if (!board || !grade) {
    resultBox.classList.add('hidden');
    resultBox.innerHTML = '';

    // If user clicked Calculate My Course Fee, vibrate and highlight missing dropdowns in red!
    if (isUserClick || (typeof event !== 'undefined' && event && event.type === 'click')) {
      const missingFields = [];
      if (!board && boardEl) {
        boardEl.classList.remove('input-error');
        void boardEl.offsetWidth; // Force CSS reflow to trigger animation
        boardEl.classList.add('input-error');
        missingFields.push('Education Board');
      }
      if (!grade && gradeEl) {
        gradeEl.classList.remove('input-error');
        void gradeEl.offsetWidth; // Force CSS reflow to trigger animation
        gradeEl.classList.add('input-error');
        missingFields.push('Class');
      }

      resultBox.classList.remove('hidden');
      resultBox.innerHTML = `
        <div class="mt-2" style="background:rgba(239,68,68,0.1);border:1.5px solid rgba(239,68,68,0.45);border-radius:var(--r-sm);padding:0.95rem 1.2rem;display:flex;align-items:center;gap:0.85rem;animation:shake-input 0.45s ease-in-out;">
          <i class="fa-solid fa-triangle-exclamation c-red" style="font-size:1.4rem;flex-shrink:0;"></i>
          <div>
            <div class="text-sm font-bold c-red mb-1">
              Please ${missingFields.length === 2 ? 'select both your Education Board and Class' : `select your ${missingFields[0]}`} to calculate fee!
            </div>
            <div class="text-xs text-muted">
              Choose from the highlighted red dropdown${missingFields.length === 2 ? 's' : ''} above to see your customized course fee &amp; syllabus.
            </div>
          </div>
        </div>
      `;
    }
    return;
  }

  // Clear error styles once valid
  if (boardEl) boardEl.classList.remove('input-error');
  if (gradeEl) gradeEl.classList.remove('input-error');

  const gradeNum = parseInt(grade.replace(/\D/g, ''), 10) || 5;

  // Fetch live course catalog directly from MongoDB Atlas Cloud Database
  const res = await apiRequest('/courses?t=' + Date.now());
  const courses = (res && res.success && res.courses) ? res.courses : [];

  const matchedCourse = courses.find(c => {
    if (c.courseId === `CRS-${gradeNum}`) return true;
    if (c.classes && c.classes.includes(String(gradeNum)) && !c.title.toLowerCase().includes('computer')) return true;
    return false;
  });

  let regTitle = `Class ${gradeNum} Board Course`;
  let regFee = '₹3,500 / month';
  let regSubjects = 'Core Science & Mathematics';

  if (matchedCourse) {
    regTitle = matchedCourse.title;
    regFee = `₹${matchedCourse.currentFee.toLocaleString()} / month`;
    regSubjects = (matchedCourse.subjects || []).join(', ');
  } else {
    // Fallback if network is delayed
    if (gradeNum === 5 || gradeNum === 6) {
      regTitle = `Class ${gradeNum} Foundation (All Core Subjects)`;
      regFee = '₹1,500 / month';
      regSubjects = 'English, Hindi, Mathematics, Science, Social Science, History, Geography, Computer';
    } else if (gradeNum === 7 || gradeNum === 8) {
      regTitle = `Class ${gradeNum} Advanced Foundation (All Core Subjects)`;
      regFee = '₹2,500 / month';
      regSubjects = 'English, Hindi, Mathematics, Science, Social Science, History, Geography, Computer';
    } else if (gradeNum === 9) {
      regTitle = 'Class 9 Board Science & Mathematics';
      regFee = '₹3,000 / month';
      regSubjects = 'Physics, Chemistry, Biology, Mathematics';
    } else if (gradeNum === 10) {
      regTitle = 'Class 10 Board Science & Mathematics Mastery';
      regFee = '₹3,500 / month';
      regSubjects = 'Physics, Chemistry, Biology, Mathematics';
    } else if (gradeNum === 11 || gradeNum === 12) {
      regTitle = `Class ${gradeNum} Board Physics + Mathematics Package`;
      regFee = '₹3,500 / month';
      regSubjects = 'Physics, Mathematics';
    }
  }

  // Computer Science live database lookup
  const matchedCs = courses.find(c => c.title.toLowerCase().includes('computer') && (c.classes ? c.classes.includes(String(gradeNum)) : true));
  let csTitle = `Computer Science Class ${gradeNum} (Python & Coding)`;
  let csFee = (gradeNum >= 11) ? '₹2,000 / month (Standalone) • ₹1,500 / month (Add-on)' : '₹1,200 / month (Standalone) • ₹1,000 / month (Add-on)';
  let csSubjects = (gradeNum >= 11) ? 'Python, Data Structures, Algorithms & Practical Exams' : 'Python Programming, Algorithms & Logic Building';

  if (matchedCs) {
    csTitle = matchedCs.title;
    csFee = `₹${matchedCs.currentFee.toLocaleString()} / month`;
    csSubjects = (matchedCs.subjects || []).join(', ');
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
        <a href="#applyFormCard" class="btn btn-grad btn-sm" onclick="applyFromCalculator(event, '${regTitle.replace(/'/g, "\\'")}', '${board.replace(/'/g, "\\'")}', ${gradeNum})">
          <i class="fa-solid fa-paper-plane"></i> Apply For ${regTitle}
        </a>
      </div>

      <!-- BOTTOM BOX: COMPUTER SCIENCE & CODING -->
      <div class="card card-p2" style="border-color:var(--cyan);background:rgba(0,240,255,0.05);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;" class="mb-1">
          <span class="chip chip-cyan"><i class="fa-solid fa-laptop-code"></i> School Computer Science &amp; Coding</span>
          <span class="chip chip-green" style="font-weight:800;font-size:0.95rem;">${csFee}</span>
        </div>
        <h4 style="font-size:1.15rem;font-weight:800;" class="mb-1">${csTitle}</h4>
        <p class="text-xs c-cyan mb-1" style="font-weight:800;"><i class="fa-solid fa-check-circle"></i> NO CODING BACKGROUND NEEDED! Taught 100% From Basics.</p>
        <p class="text-xs text-muted mb-2" style="line-height:1.6;"><i class="fa-solid fa-graduation-cap c-cyan"></i> <strong>School Academic Curriculum Alignment:</strong> 100% synchronized with your school board curriculum (${board}), lab practical exams, internal assessments, and board project work.</p>
        <a href="#applyFormCard" class="btn btn-primary btn-sm" onclick="applyFromCalculator(event, '${csTitle.replace(/'/g, "\\'")}', '${board.replace(/'/g, "\\'")}', ${gradeNum})">
          <i class="fa-solid fa-paper-plane"></i> Apply For Computer Science / Coding
        </a>
      </div>
    </div>
  `;
}
window.calculateScienceRoadmap = calculateScienceRoadmap;

function applyFromCalculator(e, regTitle, board, gradeNum) {
  if (e) e.preventDefault();
  
  if (board) sessionStorage.setItem('jigyasa_preselect_board', board);
  if (gradeNum) sessionStorage.setItem('jigyasa_preselect_grade', gradeNum);
  if (regTitle) sessionStorage.setItem('jigyasa_preselect_course', regTitle);

  if (window.selectCourseAndScrollToForm) {
    window.selectCourseAndScrollToForm(regTitle, board, gradeNum);
  } else {
    const card = document.getElementById('applyFormCard');
    if (card) card.scrollIntoView({ behavior: 'smooth' });
  }
}
window.applyFromCalculator = applyFromCalculator;

// ---- DYNAMIC ROLLING SWIPE CAROUSEL & LIVE FEE SYNC ----
let _carouselAutoScrollTimer = null;

function scrollCourseCarousel(direction) {
  const track = document.getElementById('offeringsCarouselTrack');
  if (!track) return;
  const scrollAmount = 320;
  track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}
window.scrollCourseCarousel = scrollCourseCarousel;

async function _loadDynamicCourses() {
  const track = document.getElementById('offeringsCarouselTrack');
  if (!track) return;

  const res = await apiRequest('/courses?t=' + Date.now());
  if (!res.success || !res.courses || !res.courses.length) {
    track.innerHTML = '<p class="text-muted text-sm" style="padding:1rem;">Course catalog offline.</p>';
    return;
  }

  const courses = res.courses;

  // Update Featured Python Banner Fee Dynamically from DB
  const pytCourse = courses.find(c => c.courseId === 'CRS-PYT' || c.title.toLowerCase().includes('python'));
  const pyBannerEl = document.getElementById('pythonBannerFee');
  if (pyBannerEl && pytCourse) {
    pyBannerEl.textContent = `₹${pytCourse.currentFee.toLocaleString()} / month`;
  }

  // Smart Dynamic Grouping Logic based on LIVE Admin Prices:
  const crs5 = courses.find(c => c.courseId === 'CRS-5') || { currentFee: 1500, subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'History', 'Geography', 'Computer'] };
  const crs6 = courses.find(c => c.courseId === 'CRS-6') || { currentFee: 1500, subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'History', 'Geography', 'Computer'] };

  const crs7 = courses.find(c => c.courseId === 'CRS-7') || { currentFee: 2500, subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'History', 'Geography', 'Computer'] };
  const crs8 = courses.find(c => c.courseId === 'CRS-8') || { currentFee: 2500, subjects: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'History', 'Geography', 'Computer'] };

  const crs9 = courses.find(c => c.courseId === 'CRS-9') || { currentFee: 4000, subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics'] };
  const crs10 = courses.find(c => c.courseId === 'CRS-10') || { currentFee: 4000, subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics'] };

  const crs11Combo = courses.find(c => c.courseId === 'CRS-11-COMBO') || { currentFee: 3500 };
  const crs12Combo = courses.find(c => c.courseId === 'CRS-12-COMBO') || { currentFee: 3500 };

  const cardsHtml = [];

  // Group 5 & 6
  if (crs5.currentFee === crs6.currentFee) {
    cardsHtml.push(`
      <div class="card card-p2 carousel-card">
        <div class="chip chip-purple mb-1">Class 5 &amp; 6</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Middle School Core</h3>
        <p class="text-xs text-muted mb-2">${(crs5.subjects || []).join(', ')}. Step-by-step basic guidance.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs5.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-outline btn-block btn-sm">Explore Courses</a>
      </div>
    `);
  } else {
    cardsHtml.push(`
      <div class="card card-p2 carousel-card">
        <div class="chip chip-purple mb-1">Class 5</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Class 5 Foundation</h3>
        <p class="text-xs text-muted mb-2">${(crs5.subjects || []).join(', ')}.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs5.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-outline btn-block btn-sm">Explore Courses</a>
      </div>
      <div class="card card-p2 carousel-card">
        <div class="chip chip-purple mb-1">Class 6</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Class 6 Foundation</h3>
        <p class="text-xs text-muted mb-2">${(crs6.subjects || []).join(', ')}.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs6.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-outline btn-block btn-sm">Explore Courses</a>
      </div>
    `);
  }

  // Group 7 & 8
  if (crs7.currentFee === crs8.currentFee) {
    cardsHtml.push(`
      <div class="card card-p2 carousel-card">
        <div class="chip chip-cyan mb-1">Class 7 &amp; 8</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Advanced Foundation</h3>
        <p class="text-xs text-muted mb-2">${(crs7.subjects || []).join(', ')}. Pre-high school prep &amp; small batch care.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs7.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-outline btn-block btn-sm">Explore Courses</a>
      </div>
    `);
  } else {
    cardsHtml.push(`
      <div class="card card-p2 carousel-card">
        <div class="chip chip-cyan mb-1">Class 7</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Class 7 Advanced Foundation</h3>
        <p class="text-xs text-muted mb-2">${(crs7.subjects || []).join(', ')}.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs7.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-outline btn-block btn-sm">Explore Courses</a>
      </div>
      <div class="card card-p2 carousel-card">
        <div class="chip chip-cyan mb-1">Class 8</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Class 8 Advanced Foundation</h3>
        <p class="text-xs text-muted mb-2">${(crs8.subjects || []).join(', ')}.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs8.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-outline btn-block btn-sm">Explore Courses</a>
      </div>
    `);
  }

  // Group 9 & 10
  if (crs9.currentFee === crs10.currentFee) {
    cardsHtml.push(`
      <div class="card card-p2 carousel-card">
        <div class="chip chip-green mb-1">Class 9 &amp; 10</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Board Science &amp; Maths</h3>
        <p class="text-xs text-muted mb-2">Physics, Chemistry, Biology &amp; Maths for CBSE, ICSE &amp; Madhyamik.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs9.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-grad btn-block btn-sm">Explore Courses</a>
      </div>
    `);
  } else {
    cardsHtml.push(`
      <div class="card card-p2 carousel-card">
        <div class="chip chip-green mb-1">Class 9</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Class 9 Board Science &amp; Maths</h3>
        <p class="text-xs text-muted mb-2">Physics, Chemistry, Biology &amp; Maths for CBSE, ICSE &amp; Madhyamik.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs9.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-grad btn-block btn-sm">Explore Courses</a>
      </div>
      <div class="card card-p2 carousel-card">
        <div class="chip chip-green mb-1">Class 10</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Class 10 Board Science &amp; Maths</h3>
        <p class="text-xs text-muted mb-2">Physics, Chemistry, Biology &amp; Maths for CBSE, ICSE &amp; Madhyamik.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee:</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs10.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-grad btn-block btn-sm">Explore Courses</a>
      </div>
    `);
  }

  // Group 11 & 12
  if (crs11Combo.currentFee === crs12Combo.currentFee) {
    cardsHtml.push(`
      <div class="card card-p2 carousel-card">
        <div class="chip chip-amber mb-1">Class 11 &amp; 12</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Board Physics &amp; Maths</h3>
        <p class="text-xs text-muted mb-2">Calculus, Mechanics, Electrodynamics &amp; WBCHSE / CBSE / ISC Board booster.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee (Combo):</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs11Combo.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-primary btn-block btn-sm">Explore Courses</a>
      </div>
    `);
  } else {
    cardsHtml.push(`
      <div class="card card-p2 carousel-card">
        <div class="chip chip-amber mb-1">Class 11</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Class 11 Physics &amp; Maths</h3>
        <p class="text-xs text-muted mb-2">Physics &amp; Mathematics for Class 11 Board exams.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee (Combo):</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs11Combo.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-primary btn-block btn-sm">Explore Courses</a>
      </div>
      <div class="card card-p2 carousel-card">
        <div class="chip chip-amber mb-1">Class 12</div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;">Class 12 Physics &amp; Maths</h3>
        <p class="text-xs text-muted mb-2">Physics &amp; Mathematics for Class 12 Board exams.</p>
        <div style="padding:0.75rem;background:var(--bg-subcard);border:1px solid var(--border-subcard);border-radius:var(--r-sm);" class="mb-2">
          <div class="text-xs text-muted">Tuition Fee (Combo):</div>
          <div class="c-gold font-heading" style="font-size:1.4rem;font-weight:800;">₹${crs12Combo.currentFee.toLocaleString()} <span class="text-xs text-dim">/ mo</span></div>
        </div>
        <a href="/admission.html" class="btn btn-primary btn-block btn-sm">Explore Courses</a>
      </div>
    `);
  }

  track.innerHTML = cardsHtml.join('');

  // Auto rightward rolling swipe animation
  if (_carouselAutoScrollTimer) clearInterval(_carouselAutoScrollTimer);
  _carouselAutoScrollTimer = setInterval(() => {
    if (!track) return;
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }, 4000);
}
window._loadDynamicCourses = _loadDynamicCourses;

// ---- LOAD BROADCAST NOTICES ----
async function _loadNotices() {
  const container = document.getElementById('noticesContainer');
  if (!container) return;

  const res = await apiRequest('/notices');

  const noticesList = (res && res.success && res.notices && res.notices.length) ? res.notices : [
    {
      category: 'Schedule',
      isImportant: true,
      createdAt: new Date(),
      title: 'Class 9 & 10 Science & Mathematics Batch Timings',
      content: 'Regular evening lecture slots are active from 7:30 PM to 10:00 PM. Access meeting links directly from your Student Portal.',
      postedBy: 'Shahriyar Taufik'
    },
    {
      category: 'Announcement',
      isImportant: false,
      createdAt: new Date(),
      title: 'Weekend Python Coding & Doubt Clearing Sessions',
      content: 'Special interactive coding labs for beginner programmers (Class 5 to 12). Problem-solving worksheets are uploaded to the portal.',
      postedBy: 'Director Desk'
    }
  ];

  container.innerHTML = noticesList.map(n => {
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
}
window._loadNotices = _loadNotices;

// ---- DYNAMIC FEEDBACK INDEX & ANIMATED RADIO DIAL ----
function _animateRadioDial(targetRating) {
  const arc = document.getElementById('radioDialArc');
  const needle = document.getElementById('radioDialNeedle');
  const scoreNum = document.getElementById('rdScoreNum');

  const safeRating = Math.min(5.0, Math.max(1.0, targetRating || 4.8));
  // Maps 1.0 -> 5.0 to 0deg -> 180deg
  const fraction = (safeRating - 1.0) / 4.0;
  const offset = 314 - (fraction * 314);
  const degrees = fraction * 180;

  if (arc) {
    arc.style.strokeDashoffset = offset;
  }
  if (needle) {
    needle.style.transform = `rotate(${degrees}deg)`;
  }

  // Staggered Bouncy Pop Animations on metric pills and chips
  const pills = document.querySelectorAll('.radio-metric-pill, #rdSatChip');
  pills.forEach((p, idx) => {
    p.classList.remove('bouncing-pill');
    setTimeout(() => {
      p.classList.add('bouncing-pill');
    }, 600 + idx * 180);
  });

  // Count-up animation from 0.0 to target over 2.0 seconds
  if (scoreNum) {
    let current = 0.0;
    const duration = 2000;
    const stepTime = 25;
    const steps = duration / stepTime;
    const increment = safeRating / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= safeRating) {
        current = safeRating;
        clearInterval(timer);
      }
      scoreNum.textContent = current.toFixed(1);
    }, stepTime);
  }
}
window._animateRadioDial = _animateRadioDial;

async function _loadFeedbackIndex() {
  const res = await apiRequest('/feedback/index');
  const fb = (res && res.success && res.feedbackIndex) ? res.feedbackIndex : {
    averageRating: 4.8,
    totalResponses: 28,
    clarityAvg: '5.0',
    materialAvg: '5.0',
    supportAvg: '4.8',
    satisfactionPercentage: 96,
    recentFeedback: []
  };

  // Radio Dial Section (Below Hero)
  _setText('rdResponseCount', `Based on ${fb.totalResponses} student ${fb.totalResponses === 1 ? 'response' : 'responses'}`);
  _setText('rdClarity', fb.clarityAvg + '/5');
  _setText('rdMaterial', fb.materialAvg + '/5');
  _setText('rdSupport', fb.supportAvg + '/5');
  _setText('rdSatChip', '♥ ' + fb.satisfactionPercentage + '% Satisfaction');

  const rdStars = document.getElementById('rdStars');
  if (rdStars) rdStars.textContent = _starStr(fb.averageRating);

  // Trigger smooth dial & needle animation
  _animateRadioDial(fb.averageRating);

  // Legacy hero widget if exists
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
    _setWidth('bClarity',  (parseFloat(fb.clarityAvg)  / 5) * 100);
    _setWidth('bMaterial', (parseFloat(fb.materialAvg) / 5) * 100);
    _setWidth('bSupport',  (parseFloat(fb.supportAvg)  / 5) * 100);
  }, 200);

  // Recent reviews
  const feed = document.getElementById('reviewsFeed');
  if (feed) {
    if (!fb.recentFeedback || !fb.recentFeedback.length) {
      feed.innerHTML = `
        <div class="review-card">
          <div class="rv-head">
            <span class="rv-name">Priyanka Das <span class="text-xs text-muted">(Class 10 CBSE)</span></span>
            <span class="rv-stars">★★★★★</span>
          </div>
          <p class="rv-comment">"Shahriyar sir explains complex science concepts from absolute basics. My physics marks improved drastically!"</p>
        </div>
        <div class="review-card">
          <div class="rv-head">
            <span class="rv-name">Rohan Mukherjee <span class="text-xs text-muted">(Class 12 WBCHSE)</span></span>
            <span class="rv-stars">★★★★★</span>
          </div>
          <p class="rv-comment">"The personal doubt clearing and practice problem sheets are the best. Python coding sessions are very intuitive."</p>
        </div>
      `;
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
  updateNavAuthState();
  setupReveal();
  animateHeroBars();
  _loadDynamicCourses();
  _loadNotices();
  _loadFeedbackIndex();
  _loadRoster();
});

// Expose globally
window.updateNavAuthState   = updateNavAuthState;
window.openQuickInquiryModal   = openQuickInquiryModal;
window.closeQuickInquiryModal  = closeQuickInquiryModal;
window.handleQuickInquirySubmit= handleQuickInquirySubmit;
window.switchTabEl             = switchTabEl;
window.filterRoster            = filterRoster;
window.closeDrawer             = closeDrawer;
window.closeModal              = typeof closeModal !== 'undefined' ? closeModal : function(){};
