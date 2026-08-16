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

const courseOrderMap = {
  'CRS-5': 1,
  'CRS-6': 2,
  'CRS-7': 3,
  'CRS-8': 4,
  'CRS-9': 5,
  'CRS-10': 6,
  'CRS-11-PHY': 7,
  'CRS-11-MTH': 8,
  'CRS-11-COMBO': 9,
  'CRS-12-PHY': 10,
  'CRS-12-MTH': 11,
  'CRS-12-COMBO': 12,
  'CRS-CS-9': 13,
  'CRS-CS-10': 14
};

function getCourseSortWeight(c) {
  if (c.courseId && courseOrderMap[c.courseId]) return courseOrderMap[c.courseId];
  if (c.classes) {
    if (c.classes.includes('5')) return 1;
    if (c.classes.includes('6')) return 2;
    if (c.classes.includes('7')) return 3;
    if (c.classes.includes('8')) return 4;
    if (c.classes.includes('9')) return 5;
    if (c.classes.includes('10')) return 6;
    if (c.classes.includes('11')) return 7;
    if (c.classes.includes('12')) return 8;
  }
  return 99;
}

async function _loadAdmissionCourseCatalog() {
  const container = document.getElementById('coursesCatalogContainer');
  if (!container) return;

  const res = await apiRequest('/courses?t=' + Date.now());
  if (!res.success || !res.courses || !res.courses.length) {
    return;
  }

  _fetchedCourses = res.courses;

  // Sort courses strictly in ascending order (Class 5 -> Class 12 -> Computer Science)
  const sortedCourses = res.courses.sort((a, b) => getCourseSortWeight(a) - getCourseSortWeight(b));

  // Dynamically update course cards with live database prices and subjects
  container.innerHTML = sortedCourses.map(c => `
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

  // Dynamically populate Application Form dropdown with live prices
  const selectEl = document.getElementById('admCourse');
  if (selectEl) {
    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="">Select Primary Program</option>' + sortedCourses.map(c => `
      <option value="${c.title}">${c.title} (₹${c.currentFee.toLocaleString()}/mo)</option>
    `).join('');
    if (currentVal) selectEl.value = currentVal;
  }

  if (window.setupReveal) window.setupReveal();
  updateMultiCourseSummary();
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

    // 1. Dynamic DB pricing lookup for Individual Physics, Mathematics, and Combo Courses
    const phyCourse = _fetchedCourses.find(c => c.courseId === (isClass11 ? 'CRS-11-PHY' : 'CRS-12-PHY')) || { currentFee: 1800 };
    const mathCourse = _fetchedCourses.find(c => c.courseId === (isClass11 ? 'CRS-11-MTH' : 'CRS-12-MTH')) || { currentFee: 1800 };
    const comboCourse = _fetchedCourses.find(c => c.courseId === (isClass11 ? 'CRS-11-COMBO' : 'CRS-12-COMBO')) || { currentFee: 3500 };

    const phyFee = Number(phyCourse.currentFee) || 1800;
    const mathFee = Number(mathCourse.currentFee) || 1800;
    const comboFee = Number(comboCourse.currentFee) || 3500;
    const sumIndividual = phyFee + mathFee;
    const comboSavings = Math.max(0, sumIndividual - comboFee);

    if (primaryCourse.includes('Physics') && !primaryCourse.includes('Package') && !primaryCourse.includes('Both')) {
      const upgradePrice = Math.max(0, comboFee - phyFee);
      html += `
        <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;flex-wrap:wrap;" class="text-sm">
          <input type="checkbox" id="recCombineBoth" data-price="${upgradePrice}" data-name="${clsName} Mathematics (Combined Package)" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCombineBoth') ? 'checked' : ''} />
          <span>
            <i class="fa-solid fa-calculator c-cyan"></i> Upgrade &amp; Add <strong>${clsName} Mathematics</strong> — 
            <span class="chip chip-amber text-xs" style="font-weight:800;">+₹${upgradePrice.toLocaleString()}/mo</span>
            ${comboSavings > 0 
              ? `<span class="chip chip-green text-xs" style="font-weight:800;"><i class="fa-solid fa-tag"></i> Save ₹${comboSavings.toLocaleString()} OFF Combo! (Total: ₹${comboFee.toLocaleString()}/mo)</span>`
              : `<span class="text-xs text-muted">(Combined Package: ₹${comboFee.toLocaleString()}/mo)</span>`
            }
          </span>
        </label>
      `;
    } else if (primaryCourse.includes('Mathematics') && !primaryCourse.includes('Package') && !primaryCourse.includes('Both')) {
      const upgradePrice = Math.max(0, comboFee - mathFee);
      html += `
        <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;flex-wrap:wrap;" class="text-sm">
          <input type="checkbox" id="recCombineBoth" data-price="${upgradePrice}" data-name="${clsName} Physics (Combined Package)" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCombineBoth') ? 'checked' : ''} />
          <span>
            <i class="fa-solid fa-atom c-gold"></i> Upgrade &amp; Add <strong>${clsName} Physics</strong> — 
            <span class="chip chip-amber text-xs" style="font-weight:800;">+₹${upgradePrice.toLocaleString()}/mo</span>
            ${comboSavings > 0 
              ? `<span class="chip chip-green text-xs" style="font-weight:800;"><i class="fa-solid fa-tag"></i> Save ₹${comboSavings.toLocaleString()} OFF Combo! (Total: ₹${comboFee.toLocaleString()}/mo)</span>`
              : `<span class="text-xs text-muted">(Combined Package: ₹${comboFee.toLocaleString()}/mo)</span>`
            }
          </span>
        </label>
      `;
    }

    // School Computer Science Add-on for Class 11/12
    const csCourse = _fetchedCourses.find(c => c.courseId === 'CRS-CS-11' || (c.title.toLowerCase().includes('computer') && c.classes && c.classes.includes('11')));
    if (csCourse) {
      const csFee = Number(csCourse.currentFee) || 1500;
      const csDiscount = (csCourse.originalFee && csCourse.originalFee > csFee) ? (csCourse.originalFee - csFee) : 0;

      html += `
        <div style="background:var(--bg-card);border:1px solid var(--border-subcard);border-radius:var(--r-xs);padding:0.85rem;" class="mt-1">
          <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;flex-wrap:wrap;" class="text-sm">
            <input type="checkbox" id="recCoding11" data-price="${csFee}" ${csDiscount > 0 ? `data-discount="₹${csDiscount} OFF on ${csCourse.title}"` : ''} data-name="${csCourse.title}" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCoding11') ? 'checked' : ''} />
            <span>
              <i class="fa-solid fa-laptop-code c-cyan"></i> Add <strong>${csCourse.title}</strong> — 
              <span class="chip chip-purple text-xs" style="font-weight:800;">+₹${csFee.toLocaleString()}/mo</span>
              ${csDiscount > 0 ? `<span class="chip chip-green text-xs" style="font-weight:800;"><i class="fa-solid fa-bolt"></i> ₹${csDiscount.toLocaleString()} OFF!</span>` : ''}
            </span>
          </label>
          <div class="mt-1 text-xs text-muted" style="line-height:1.55;padding-left:1.5rem;">
            <i class="fa-solid fa-graduation-cap c-cyan"></i> <strong>School Academic Curriculum:</strong> 100% synchronized with CBSE / ISC / WBCHSE board textbooks, practical lab exam drills, school assignments, and board project submissions.
          </div>
        </div>
      `;
    }
  } else if (isClass9or10) {
    // School Computer Science Add-on for Class 9/10
    const csCourse = _fetchedCourses.find(c => c.courseId === 'CRS-CS-9' || (c.title.toLowerCase().includes('computer') && c.classes && (c.classes.includes('9') || c.classes.includes('10'))));
    if (csCourse) {
      const csFee = Number(csCourse.currentFee) || 1000;
      const csDiscount = (csCourse.originalFee && csCourse.originalFee > csFee) ? (csCourse.originalFee - csFee) : 0;

      html += `
        <div style="background:var(--bg-card);border:1px solid var(--border-subcard);border-radius:var(--r-xs);padding:0.85rem;" class="mt-1">
          <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;flex-wrap:wrap;" class="text-sm">
            <input type="checkbox" id="recCoding9" data-price="${csFee}" ${csDiscount > 0 ? `data-discount="₹${csDiscount} OFF on ${csCourse.title}"` : ''} data-name="${csCourse.title}" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCoding9') ? 'checked' : ''} />
            <span>
              <i class="fa-solid fa-laptop-code c-cyan"></i> Add <strong>${csCourse.title}</strong> — 
              <span class="chip chip-purple text-xs" style="font-weight:800;">+₹${csFee.toLocaleString()}/mo</span>
              ${csDiscount > 0 ? `<span class="chip chip-green text-xs" style="font-weight:800;"><i class="fa-solid fa-bolt"></i> ₹${csDiscount.toLocaleString()} OFF!</span>` : ''}
            </span>
          </label>
          <div class="mt-1 text-xs text-muted" style="line-height:1.55;padding-left:1.5rem;">
            <i class="fa-solid fa-graduation-cap c-cyan"></i> <strong>School Academic Curriculum:</strong> Covers full school syllabus (CBSE / ICSE / WBBSE), lab practicals, algorithmic logic, and board exam drills.
          </div>
        </div>
      `;
    }
  }

  // 2. PYTHON PROGRAMMING SPECIALIZATION (CLASS 5 TO 12) - AVAILABLE ACROSS ALL ACADEMIC COURSES
  const pytCourse = _fetchedCourses.find(c => c.courseId === 'CRS-PYT' || c.title.toLowerCase().includes('python')) || { currentFee: 1000, title: 'Python Coding Specialization (Class 5 to 12)' };
  const pytFee = Number(pytCourse.currentFee) || 1000;
  const pytDiscount = (pytCourse.originalFee && pytCourse.originalFee > pytFee) ? (pytCourse.originalFee - pytFee) : 0;
  const pytTitle = 'Python Coding Specialization (Class 5 to 12)';

  html += `
    <div style="background:var(--bg-card);border:1px solid var(--border-subcard);border-radius:var(--r-xs);padding:0.85rem;" class="mt-1">
      <label style="display:flex;align-items:center;gap:0.65rem;cursor:pointer;flex-wrap:wrap;" class="text-sm">
        <input type="checkbox" id="recCodingBasic" data-price="${pytFee}" ${pytDiscount > 0 ? `data-discount="₹${pytDiscount} OFF on ${pytTitle}"` : ''} data-name="${pytTitle}" onchange="updateMultiCourseSummary()" ${checkedIds.has('recCodingBasic') ? 'checked' : ''} />
        <span>
          <i class="fa-solid fa-code c-gold"></i> Add <strong>${pytTitle}</strong> — 
          <span class="chip chip-purple text-xs" style="font-weight:800;">+₹${pytFee.toLocaleString()}/mo</span>
          ${pytDiscount > 0 ? `<span class="chip chip-green text-xs" style="font-weight:800;"><i class="fa-solid fa-bolt"></i> ₹${pytDiscount.toLocaleString()} OFF!</span>` : ''}
        </span>
      </label>
      <div class="mt-1" style="font-size:0.8rem;line-height:1.55;color:var(--text-muted);padding-left:1.5rem;">
        <strong class="c-gold"><i class="fa-solid fa-code"></i> Python Programming &amp; Practical Development:</strong>
        <ul style="margin:0.25rem 0 0 1.1rem;list-style-type:disc;">
          <li>Build a strong foundation in Python from basic syntax to advanced programming concepts.</li>
          <li>Learn Object-Oriented Programming (OOP), data structures, file handling, and error handling.</li>
          <li>Develop real-world projects such as automation tools, desktop applications, and web applications.</li>
          <li>Introduction to Data Science, Artificial Intelligence, and Machine Learning using Python.</li>
        </ul>
      </div>
    </div>
  `;

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

let _fetchedCourses = [];
let _lastCalculatedTotalFee = 0;
let _lastCalculatedItems = [];

// Update live course fee calculation breakdown
function updateMultiCourseSummary() {
  const primaryCourse = document.getElementById('admCourse') ? document.getElementById('admCourse').value : '';
  const summaryBox = document.getElementById('multiCourseSummary');

  if (!summaryBox) return;

  if (!primaryCourse) {
    summaryBox.innerHTML = '';
    _lastCalculatedTotalFee = 0;
    _lastCalculatedItems = [];
    return;
  }

  let totalFee = 0;
  let items = [];
  let discountsApplied = [];

  // 1. Base Primary Course Fee - Look up live course from _fetchedCourses database array
  let primaryPrice = 0;
  const matched = _fetchedCourses.find(c =>
    c.title.toLowerCase() === primaryCourse.toLowerCase() ||
    primaryCourse.toLowerCase().includes(c.title.toLowerCase()) ||
    c.title.toLowerCase().includes(primaryCourse.toLowerCase())
  );

  if (matched && matched.currentFee !== undefined) {
    primaryPrice = matched.currentFee;
  } else {
    if (primaryCourse.includes('Combined') || primaryCourse.includes('Both') || primaryCourse.includes('Package')) {
      primaryPrice = 3500;
    } else if (primaryCourse.includes('Physics') || primaryCourse.includes('Mathematics')) {
      primaryPrice = 1500;
    } else if (primaryCourse.includes('9') || primaryCourse.includes('10')) {
      primaryPrice = primaryCourse.includes('Computer') ? 1200 : 4000;
    } else if (primaryCourse.includes('5') || primaryCourse.includes('6')) {
      primaryPrice = 1500;
    } else if (primaryCourse.includes('7') || primaryCourse.includes('8')) {
      primaryPrice = 2500;
    } else {
      primaryPrice = 2000;
    }
  }

  items.push(`${primaryCourse} (₹${primaryPrice.toLocaleString()}/mo)`);
  totalFee += primaryPrice;

  // 2. Add Checked Dynamic Recommendation Add-ons
  const container = document.getElementById('dynamicAddonContainer');
  if (container) {
    container.querySelectorAll('input[type=checkbox]:checked').forEach(cb => {
      const price = Number(cb.dataset.price) || 0;
      const name = cb.dataset.name || 'Add-on';
      totalFee += price;
      items.push(`${name} (+₹${price.toLocaleString()}/mo)`);

      if (cb.dataset.discount) {
        discountsApplied.push(cb.dataset.discount);
      }
    });
  }

  _lastCalculatedTotalFee = totalFee;
  _lastCalculatedItems = [...items];

  const isPythonSelected = items.some(it => it.toLowerCase().includes('python') || primaryCourse.toLowerCase().includes('python'));
  const isSchoolCsSelected = items.some(it => it.toLowerCase().includes('computer') && !it.toLowerCase().includes('python'));

  summaryBox.innerHTML = `
    <div style="background:rgba(255,183,3,0.06);border:1.5px solid var(--gold);padding:1.15rem;border-radius:var(--r-sm);" class="mt-2 mb-2">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;" class="mb-1">
        <span class="text-xs text-muted font-bold"><i class="fa-solid fa-calculator c-gold"></i> Live Course Fee Calculation Breakdown:</span>
        <span class="chip chip-purple font-bold" style="font-size:1.05rem;">Total Monthly Fee: ₹${totalFee.toLocaleString()} / mo</span>
      </div>
      <div class="text-sm font-bold c-gold mb-1">${items.join(' + ')}</div>
      ${discountsApplied.length ? `
        <div class="text-xs c-cyan font-bold mb-1" style="background:rgba(0,240,255,0.08);padding:0.4rem 0.6rem;border-radius:var(--r-xs);display:inline-block;">
          <i class="fa-solid fa-tag"></i> Special Discount Applied: ${discountsApplied.join(', ')}
        </div>
      ` : ''}

      ${isPythonSelected ? `
        <div class="mt-2 pt-2" style="border-top:1px dashed rgba(255,183,3,0.35);font-size:0.82rem;line-height:1.6;color:var(--text-muted);">
          <strong class="c-gold"><i class="fa-solid fa-code"></i> Python Programming &amp; Practical Development:</strong>
          <ul style="margin:0.35rem 0 0 1.2rem;list-style-type:disc;">
            <li>Build a strong foundation in Python from basic syntax to advanced programming concepts.</li>
            <li>Learn Object-Oriented Programming (OOP), data structures, file handling, and error handling.</li>
            <li>Develop real-world projects such as automation tools, desktop applications, and web applications.</li>
            <li>Introduction to Data Science, Artificial Intelligence, and Machine Learning using Python.</li>
          </ul>
        </div>
      ` : ''}

      ${(isSchoolCsSelected && !isPythonSelected) ? `
        <div class="mt-2 pt-2 text-xs text-muted" style="border-top:1px dashed rgba(0,240,255,0.35);line-height:1.55;">
          <strong class="c-cyan"><i class="fa-solid fa-graduation-cap"></i> School Academic Curriculum Alignment:</strong> 100% synchronized with your school board curriculum (CBSE / ICSE / ISC / WBBSE / WBCHSE), practical lab exam drills, school assignments, and board project work.
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

  const userMsg = document.getElementById('admMsg').value.trim();
  const combinedMsg = userMsg 
    ? `${userMsg} | Total Fee: ₹${_lastCalculatedTotalFee}/mo | Opted Items: ${_lastCalculatedItems.join(', ')}`
    : `Total Monthly Fee: ₹${_lastCalculatedTotalFee}/mo | Opted Items: ${_lastCalculatedItems.join(', ')}`;

  const payload = {
    name:               document.getElementById('admName').value.trim(),
    email:              document.getElementById('admEmail').value.trim(),
    phone:              document.getElementById('admPhone').value.trim(),
    targetCourse:       fullCourseList.join(' + ') + (_lastCalculatedTotalFee ? ` [Total Fee: ₹${_lastCalculatedTotalFee}/mo]` : ''),
    previousPercentage: document.getElementById('admMarks').value || 0,
    message:            combinedMsg,
    calculatedFee:      _lastCalculatedTotalFee,
    selectedSubjects:   _lastCalculatedItems
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
            <div style="font-weight:800;font-size:1.1rem;color:var(--text);">${app.name}</div>
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
              <div style="background:var(--bg-subcard);border:1px solid var(--border-subcard);padding:0.75rem;border-radius:var(--r-xs);">
                <div class="text-xs text-muted">Assigned Student ID:</div>
                <div style="font-family:var(--font-heading);font-size:1.3rem;font-weight:800;" class="c-gold">${app.studentIdAssigned}</div>
              </div>
              <div style="background:var(--bg-subcard);border:1px solid var(--border-subcard);padding:0.75rem;border-radius:var(--r-xs);">
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

