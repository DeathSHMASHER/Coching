// ============================================================
// ADMISSION FORM & MULTI-COURSE STATUS TRACKER
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const courseParam = params.get('course') || sessionStorage.getItem('jigyasa_preselect_course');
  const boardParam = params.get('board') || sessionStorage.getItem('jigyasa_preselect_board');
  const gradeParam = params.get('grade') || sessionStorage.getItem('jigyasa_preselect_grade');

  if (courseParam || boardParam || gradeParam) {
    selectCourseAndScrollToForm(courseParam, boardParam, gradeParam ? parseInt(gradeParam, 10) : null);
  }

  // Auto-scroll to application form if URL hash contains #applyFormCard
  if (window.location.hash === '#applyFormCard') {
    setTimeout(() => {
      const card = document.getElementById('applyFormCard');
      if (card) card.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }

  _loadAdmissionCourseCatalog();
});

async function _loadAdmissionCourseCatalog() {
  const container = document.getElementById('coursesCatalogContainer');
  if (!container) return;

  const res = await apiRequest('/courses');
  if (!res.success || !res.courses || !res.courses.length) {
    return;
  }

  container.innerHTML = res.courses.map(c => `
    <div class="card card-p2 reveal active mb-2" style="opacity:1;transform:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;" class="mb-1">
        <span class="chip chip-cyan">${c.classes || 'All Classes'}</span>
        <span class="chip chip-gold" style="font-weight:800;">₹${c.currentFee.toLocaleString()} / mo</span>
      </div>
      <h3 style="font-size:1.15rem;font-weight:800;" class="mb-1">${c.title}</h3>
      <p class="text-xs text-muted mb-2">${c.description}</p>
      <div class="mb-2">
        ${(c.subjects || []).map(s => `<span class="chip chip-purple text-xs mb-1" style="display:inline-block;margin-right:3px;">${s}</span>`).join('')}
      </div>
      <a href="#applyFormCard" class="btn btn-outline btn-sm btn-block mt-1" onclick="selectCourseAndScrollToForm('${c.title.replace(/'/g, "\\'")}', '', '')">
        <i class="fa-solid fa-pen-to-square"></i> Apply For Course
      </a>
    </div>
  `).join('');

  if (window.setupReveal) window.setupReveal();
}

// Render Dynamic Class-Targeted Course Recommendations
function renderDynamicRecommendations() {
  const primaryCourse = document.getElementById('admCourse') ? document.getElementById('admCourse').value : '';
  const wrapper = document.getElementById('dynamicAddonWrapper');
  const container = document.getElementById('dynamicAddonContainer');

  if (!wrapper || !container) return;

  if (!primaryCourse) {
    wrapper.classList.add('hidden');
    container.innerHTML = '';
    updateMultiCourseSummary();
    return;
  }

  // Preserve existing checked states if re-rendering
  const checkedIds = new Set();
  container.querySelectorAll('input[type=checkbox]:checked').forEach(cb => checkedIds.add(cb.id));

  let html = '';
  const isClass11or12 = primaryCourse.includes('11') || primaryCourse.includes('12');
  const isClass9or10 = primaryCourse.includes('9') || primaryCourse.includes('10');
  const isClass5to8 = primaryCourse.includes('5') || primaryCourse.includes('6') || primaryCourse.includes('7') || primaryCourse.includes('8');

  if (isClass11or12) {
    const isClass11 = primaryCourse.includes('11');
    const isClass12 = primaryCourse.includes('12');
    const clsName = isClass11 ? 'Class 11' : isClass12 ? 'Class 12' : 'Class 11/12';

    if (primaryCourse.includes('Physics') && !primaryCourse.includes('Package') && !primaryCourse.includes('Both')) {
      html += `
        <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;" class="text-sm">
          <input type="checkbox" id="recCombineBoth" data-price="2000" data-name="${clsName} Mathematics (Combined Physics + Mathematics)" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCombineBoth') ? 'checked' : ''} />
          <span><i class="fa-solid fa-calculator c-cyan"></i> Upgrade &amp; Add <strong>${clsName} Mathematics</strong> — <span class="chip chip-amber text-xs" style="font-weight:800;">+₹2,000/mo (Combine Both Package for ₹3,500/mo)</span></span>
        </label>
      `;
    } else if (primaryCourse.includes('Mathematics') && !primaryCourse.includes('Package') && !primaryCourse.includes('Both')) {
      html += `
        <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;" class="text-sm">
          <input type="checkbox" id="recCombineBoth" data-price="2000" data-name="${clsName} Physics (Combined Physics + Mathematics)" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCombineBoth') ? 'checked' : ''} />
          <span><i class="fa-solid fa-atom c-gold"></i> Upgrade &amp; Add <strong>${clsName} Physics</strong> — <span class="chip chip-amber text-xs" style="font-weight:800;">+₹2,000/mo (Combine Both Package for ₹3,500/mo)</span></span>
        </label>
      `;
    }

    // Always offer Class 11/12 Computer Science Add-on for Class 11/12
    html += `
      <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;" class="text-sm">
        <input type="checkbox" id="recCoding11" data-price="1500" data-name="Class 11 & 12 Computer Science / Python" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCoding11') ? 'checked' : ''} />
        <span><i class="fa-solid fa-code c-cyan"></i> Add <strong>Class 11 &amp; 12 Computer Science / Python</strong> — <span class="chip chip-green text-xs" style="font-weight:800;">₹500 OFF! Only ₹1,500/mo as Add-on</span></span>
      </label>
    `;
  } else if (isClass9or10) {
    html += `
      <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;" class="text-sm">
        <input type="checkbox" id="recCoding9" data-price="1000" data-name="Class 9 & 10 Computer / Coding Class" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCoding9') ? 'checked' : ''} />
        <span><i class="fa-solid fa-laptop-code c-cyan"></i> Add <strong>Class 9 &amp; 10 Computer / Coding Class</strong> — <span class="chip chip-green text-xs" style="font-weight:800;">₹200 OFF! Only ₹1,000/mo as Add-on</span></span>
      </label>
    `;
  } else if (isClass5to8) {
    html += `
      <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;" class="text-sm">
        <input type="checkbox" id="recCodingBasic" data-price="1000" data-name="Class 5–8 Python Coding Specialization" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCodingBasic') ? 'checked' : ''} />
        <span><i class="fa-solid fa-code c-gold"></i> Add <strong>Class 5–8 Python Coding Specialization</strong> (+₹1,000 / month)</span>
      </label>
    `;
  }

  if (html) {
    container.innerHTML = html;
    wrapper.classList.remove('hidden');
  } else {
    wrapper.classList.add('hidden');
    container.innerHTML = '';
  }

  updateMultiCourseSummary();
}
window.renderDynamicRecommendations = renderDynamicRecommendations;

// Update live course fee calculation breakdown
function updateMultiCourseSummary() {
  const primaryCourse = document.getElementById('admCourse') ? document.getElementById('admCourse').value : '';
  const summaryBox = document.getElementById('multiCourseSummary');

  if (!summaryBox) return;

  if (!primaryCourse) {
    summaryBox.innerHTML = '';
    return;
  }

  let totalFee = 0;
  let items = [];
  let discountsApplied = [];

  // 1. Base Primary Course Fee
  if (primaryCourse.includes('Combined') || primaryCourse.includes('Both')) {
    items.push(primaryCourse + ' (₹3,000/mo)');
    totalFee += 3000;
  } else if (primaryCourse.includes('Physics') || primaryCourse.includes('Chemistry')) {
    items.push(primaryCourse + ' (₹1,500/mo)');
    totalFee += 1500;
  } else if (primaryCourse.includes('9') || primaryCourse.includes('10')) {
    if (primaryCourse.includes('Computer Science')) {
      items.push(primaryCourse + ' (₹1,200/mo)');
      totalFee += 1200;
    } else {
      items.push(primaryCourse + ' (₹4,000/mo)');
      totalFee += 4000;
    }
  } else if (primaryCourse.includes('5') || primaryCourse.includes('6')) {
    items.push(primaryCourse + ' (₹1,500/mo)');
    totalFee += 1500;
  } else if (primaryCourse.includes('7') || primaryCourse.includes('8')) {
    items.push(primaryCourse + ' (₹2,500/mo)');
    totalFee += 2500;
  } else {
    items.push(primaryCourse + ' (₹2,000/mo)');
    totalFee += 2000;
  }

  // 2. Add Checked Dynamic Recommendation Add-ons
  const container = document.getElementById('dynamicAddonContainer');
  if (container) {
    container.querySelectorAll('input[type=checkbox]:checked').forEach(cb => {
      const price = Number(cb.dataset.price) || 0;
      const name = cb.dataset.name || 'Add-on';
      totalFee += price;
      items.push(`${name} (+₹${price}/mo)`);

      if (cb.id === 'recCoding11') {
        discountsApplied.push('₹500 OFF on Class 11/12 Computer Science');
      } else if (cb.id === 'recCoding9') {
        discountsApplied.push('₹200 OFF on Class 9/10 Computer Class');
      }
    });
  }

  summaryBox.innerHTML = `
    <div style="background:rgba(255,183,3,0.06);border:1.5px solid var(--gold);padding:1rem;border-radius:var(--r-sm);" class="mt-2 mb-2">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;" class="mb-1">
        <span class="text-xs text-muted font-bold"><i class="fa-solid fa-calculator c-gold"></i> Live Course Fee Calculation Breakdown:</span>
        <span class="chip chip-purple font-bold" style="font-size:1.05rem;">Total Monthly Fee: ₹${totalFee} / mo</span>
      </div>
      <div class="text-sm font-bold c-gold mb-1">${items.join(' + ')}</div>
      ${discountsApplied.length ? `
        <div class="text-xs c-cyan font-bold" style="background:rgba(0,240,255,0.08);padding:0.4rem 0.6rem;border-radius:var(--r-xs);display:inline-block;">
          <i class="fa-solid fa-tag"></i> Special Discount Applied: ${discountsApplied.join(', ')}
        </div>
      ` : ''}
    </div>
  `;
}
window.updateMultiCourseSummary = updateMultiCourseSummary;

async function handleAdmission(e) {
  e.preventDefault();

  const primaryCourse = document.getElementById('admCourse').value;
  let fullCourseList = [primaryCourse];

  const container = document.getElementById('dynamicAddonContainer');
  if (container) {
    container.querySelectorAll('input[type=checkbox]:checked').forEach(cb => {
      if (cb.dataset.name) fullCourseList.push(`${cb.dataset.name} (Add-on)`);
    });
  }

  const payload = {
    name:               document.getElementById('admName').value.trim(),
    email:              document.getElementById('admEmail').value.trim(),
    phone:              document.getElementById('admPhone').value.trim(),
    targetCourse:       fullCourseList.join(' + '),
    previousPercentage: document.getElementById('admMarks').value || 0,
    message:            document.getElementById('admMsg').value.trim()
  };

  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';

  const res = await apiRequest('/admissions/apply', 'POST', payload);

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Application';

  if (res.success) {
    document.getElementById('successAppId').textContent = res.applicationId;
    document.getElementById('admissionSuccess').classList.remove('hidden');
    e.target.reset();
    if (document.getElementById('multiCourseSummary')) document.getElementById('multiCourseSummary').innerHTML = '';
    const wrapper = document.getElementById('dynamicAddonWrapper');
    if (wrapper) wrapper.classList.add('hidden');
    showToast('Application submitted! Reference ID: ' + res.applicationId);
    if (window._loadAdmissionsTable) window._loadAdmissionsTable();
  } else {
    showToast(res.message || 'Failed to submit. Please try again.', 'error');
  }
}

function selectCourseAndScrollToForm(course, board, gradeNum) {
  if (course) sessionStorage.setItem('jigyasa_preselect_course', course);
  if (board) sessionStorage.setItem('jigyasa_preselect_board', board);
  if (gradeNum) sessionStorage.setItem('jigyasa_preselect_grade', gradeNum);

  const courseSelect = document.getElementById('admCourse');
  if (courseSelect) {
    let targetGradeStr = gradeNum ? `Class ${gradeNum}` : '';
    if (!targetGradeStr && course) {
      const match = course.match(/Class\s*(\d+)/i);
      if (match) targetGradeStr = `Class ${match[1]}`;
    }

    let matchedOptValue = '';
    
    // Priority 1: Match option containing "Class X"
    if (targetGradeStr) {
      for (let opt of courseSelect.options) {
        if (opt.value.includes(targetGradeStr)) {
          matchedOptValue = opt.value;
          break;
        }
      }
    }

    // Priority 2: Fuzzy keyword match
    if (!matchedOptValue && course) {
      const cLower = course.toLowerCase();
      for (let opt of courseSelect.options) {
        const oLower = opt.value.toLowerCase();
        if (oLower === cLower || cLower.includes(oLower) || oLower.includes(cLower)) {
          matchedOptValue = opt.value;
          break;
        }
      }
    }

    if (matchedOptValue) {
      courseSelect.value = matchedOptValue;
    } else if (course) {
      const newOpt = document.createElement('option');
      newOpt.value = course;
      newOpt.textContent = course;
      newOpt.selected = true;
      courseSelect.appendChild(newOpt);
    }
  }

  if (board) {
    const boardInput = document.getElementById('admMsg');
    if (boardInput) boardInput.value = `Target Board: ${board}`;
  }

  // Trigger dynamic recommendation rendering and price calculation
  if (window.renderDynamicRecommendations) window.renderDynamicRecommendations();

  const card = document.getElementById('applyFormCard');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth' });
    const nameInp = document.getElementById('admName');
    if (nameInp) setTimeout(() => nameInp.focus(), 400);
  }
}
window.selectCourseAndScrollToForm = selectCourseAndScrollToForm;

async function checkStatus() {
  const queryEl = document.getElementById('statusQuery') || document.getElementById('portalStatusQuery');
  const outEl = document.getElementById('statusResult') || document.getElementById('portalStatusResult');

  if (!queryEl || !outEl) return;
  const q = queryEl.value.trim();

  if (!q) {
    queryEl.classList.add('shake-error');
    setTimeout(() => queryEl.classList.remove('shake-error'), 800);
    showToast('Please enter your Application ID, Student ID, or Email.', 'error');
    return;
  }

  outEl.innerHTML = '<p class="text-muted text-sm mt-2"><i class="fa-solid fa-spinner fa-spin"></i> Checking status…</p>';

  const res = await apiRequest('/admissions/status/' + encodeURIComponent(q));

  if (res.success && res.application) {
    const app = res.application;
    const statusChip = app.status === 'Approved' ? 'chip-green' : app.status === 'Rejected' ? 'chip-red' : 'chip-amber';
    const uniquePass = app.assignedPassword || 'JIG#' + Math.floor(1000 + Math.random() * 9000);

    outEl.innerHTML = `
      <div class="status-result-card mt-2 card card-p2" style="border-color:var(--gold);background:rgba(255,183,3,0.05);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;" class="mb-1">
          <div>
            <div style="font-weight:800;font-size:1.1rem;color:#fff;">${app.name}</div>
            <div class="text-xs text-muted">App Reference ID: <strong class="c-gold">${app.applicationId}</strong> &nbsp;•&nbsp; ${app.targetCourse}</div>
          </div>
          <span class="chip ${statusChip}" style="font-size:0.85rem;font-weight:800;">${app.status}</span>
        </div>
        <div class="text-xs text-muted mb-2">Applied Date: ${new Date(app.appliedAt).toLocaleDateString()} &nbsp;|&nbsp; Gmail: ${app.email}</div>

        ${app.status === 'Approved' ? `
          <div style="background:rgba(0,240,255,0.08);border:1.5px solid var(--cyan);padding:1rem;border-radius:var(--r-sm);" class="mt-2">
            <h4 style="font-size:1.05rem;font-weight:800;" class="c-cyan mb-1">
              <i class="fa-solid fa-circle-check"></i> Admission Approved! Your Portal Credentials:
            </h4>
            <div class="grid g2 mb-2">
              <div style="background:rgba(0,0,0,0.3);padding:0.75rem;border-radius:var(--r-xs);">
                <div class="text-xs text-muted">Assigned Student ID:</div>
                <div style="font-family:var(--font-heading);font-size:1.3rem;font-weight:800;" class="c-gold">${app.studentIdAssigned}</div>
              </div>
              <div style="background:rgba(0,0,0,0.3);padding:0.75rem;border-radius:var(--r-xs);">
                <div class="text-xs text-muted">Unique Portal Password (Sent to Gmail):</div>
                <div style="font-family:var(--font-heading);font-size:1.3rem;font-weight:800;" class="c-cyan"><i class="fa-solid fa-key text-xs"></i> ${uniquePass}</div>
              </div>
            </div>
            <p class="text-xs text-muted mb-2"><i class="fa-solid fa-envelope c-gold"></i> Credentials forwarded to registered Gmail: <strong>${app.email}</strong></p>
            <a href="/student-portal.html" class="btn btn-grad btn-sm btn-block">
              <i class="fa-solid fa-right-to-bracket"></i> Login To Student Portal Now
            </a>
          </div>
        ` : app.status === 'Pending' ? `
          <div style="background:rgba(255,183,3,0.08);border:1px solid rgba(255,183,3,0.3);padding:0.9rem;border-radius:var(--r-sm);" class="mt-2 text-xs text-muted">
            <i class="fa-solid fa-clock c-gold"></i> Your application is currently under review by Director Shahriyar Taufik. Credentials will appear here upon approval.
          </div>
        ` : `
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);padding:0.9rem;border-radius:var(--r-sm);" class="mt-2 text-xs text-muted">
            <i class="fa-solid fa-times-circle c-red"></i> Application was not selected. Contact lead office for more details.
          </div>
        `}
      </div>`;
  } else {
    queryEl.classList.add('shake-error');
    setTimeout(() => queryEl.classList.remove('shake-error'), 800);
    outEl.innerHTML = `<div class="status-result-card text-center card card-p2 mt-2" style="border-color:#ef4444;"><i class="fa-solid fa-circle-xmark c-red" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i><p class="text-muted text-sm">${res.message || 'No application record found with provided Application ID, Student ID, or Email.'}</p></div>`;
  }
}
window.checkStatus = checkStatus;

