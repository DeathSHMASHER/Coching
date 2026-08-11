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
});

// Update fee calculation summary when checkboxes are toggled
function updateMultiCourseSummary() {
  const primaryCourse = document.getElementById('admCourse') ? document.getElementById('admCourse').value : '';
  const optPhysics = document.getElementById('subjectPhysics') ? document.getElementById('subjectPhysics').checked : false;
  const optChemistry = document.getElementById('subjectChemistry') ? document.getElementById('subjectChemistry').checked : false;
  const optCoding11 = document.getElementById('addonCoding11') ? document.getElementById('addonCoding11').checked : false;
  const optCoding9 = document.getElementById('addonCoding9') ? document.getElementById('addonCoding9').checked : false;
  const optCodingBasic = document.getElementById('addonCoding') ? document.getElementById('addonCoding').checked : false;
  const summaryBox = document.getElementById('multiCourseSummary');

  if (!summaryBox) return;

  let totalFee = 0;
  let items = [];
  let discountsApplied = [];

  const isClass11or12 = primaryCourse.includes('11') || primaryCourse.includes('12');
  const isClass9or10 = primaryCourse.includes('9') || primaryCourse.includes('10');
  const isClass5to8 = primaryCourse.includes('5') || primaryCourse.includes('6') || primaryCourse.includes('7') || primaryCourse.includes('8');

  // CLASS 11 & 12 SPECIFIC PER-SUBJECT LOGIC
  if (isClass11or12) {
    let academicCount = 0;
    if (optPhysics) { academicCount++; items.push('Physics (₹1,500/mo)'); }
    if (optChemistry) { academicCount++; items.push('Chemistry (₹1,500/mo)'); }

    if (academicCount === 1) {
      totalFee += 1500;
    } else if (academicCount === 2) {
      totalFee += 3000;
    } else if (primaryCourse.includes('Physics + Chemistry') || primaryCourse.includes('Package')) {
      items.push('Physics & Chemistry Combined (₹3,000/mo)');
      totalFee += 3000;
      academicCount = 2;
    } else if (primaryCourse.includes('Physics')) {
      items.push('Physics (₹1,500/mo)');
      totalFee += 1500;
      academicCount = 1;
    } else if (primaryCourse.includes('Chemistry')) {
      items.push('Chemistry (₹1,500/mo)');
      totalFee += 1500;
      academicCount = 1;
    }

    if (optCoding11 || primaryCourse.includes('Computer Science')) {
      if (academicCount > 0) {
        totalFee += 1500; // ₹500 OFF as add-on!
        items.push('Computer Science & Coding (Add-on: ₹1,500/mo)');
        discountsApplied.push('₹500 OFF on Computer Science (Secondary Add-on Discount)');
      } else {
        totalFee += 2000; // Standalone ₹2,000
        items.push('Computer Science & Coding (Standalone: ₹2,000/mo)');
      }
    }
  } 
  // CLASS 9 & 10 SPECIFIC LOGIC
  else if (isClass9or10) {
    let hasAcademic = false;
    if (!primaryCourse.includes('Computer Science')) {
      items.push(primaryCourse + ' (₹4,000/mo)');
      totalFee += 4000;
      hasAcademic = true;
    }

    if (optCoding9 || primaryCourse.includes('Computer Science')) {
      if (hasAcademic) {
        totalFee += 1000; // ₹200 OFF as add-on!
        items.push('Computer / Coding (Add-on: ₹1,000/mo)');
        discountsApplied.push('₹200 OFF on Computer / Coding (Secondary Add-on Discount)');
      } else {
        totalFee += 1200; // Standalone ₹1,200
        items.push('Computer / Coding (Standalone: ₹1,200/mo)');
      }
    }
  }
  // CLASS 5 TO 8 SPECIFIC LOGIC
  else if (isClass5to8) {
    if (primaryCourse.includes('5') || primaryCourse.includes('6')) {
      items.push(primaryCourse + ' (₹1,500/mo)');
      totalFee += 1500;
    } else {
      items.push(primaryCourse + ' (₹2,500/mo)');
      totalFee += 2500;
    }

    if (optCodingBasic || primaryCourse.includes('Python Coding')) {
      items.push('Python Coding Specialization (+₹1,000/mo)');
      totalFee += 1000;
    }
  } 
  // GENERAL FALLBACK
  else if (primaryCourse) {
    items.push(primaryCourse);
    totalFee += 2000;
  }

  if (!items.length) {
    summaryBox.innerHTML = '';
    return;
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
  const addCoding = document.getElementById('addonCoding') ? document.getElementById('addonCoding').checked : false;
  const addScience = document.getElementById('addonScience') ? document.getElementById('addonScience').checked : false;

  let fullCourseList = [primaryCourse];
  if (addCoding) fullCourseList.push('Python Coding Specialization (Add-on)');
  if (addScience) fullCourseList.push('Computer Science / Science Booster (Add-on)');

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

  // Auto check checkboxes based on grade or course type
  const gNum = gradeNum || (course ? parseInt((course.match(/Class\s*(\d+)/i) || [])[1], 10) : null);
  
  if (gNum === 11 || gNum === 12) {
    const phys = document.getElementById('subjectPhysics');
    const chem = document.getElementById('subjectChemistry');
    if (phys) phys.checked = true;
    if (chem) chem.checked = true;
    if (course && (course.toLowerCase().includes('computer') || course.toLowerCase().includes('coding'))) {
      const coding11 = document.getElementById('addonCoding11');
      if (coding11) coding11.checked = true;
    }
  } else if (gNum === 9 || gNum === 10) {
    if (course && (course.toLowerCase().includes('computer') || course.toLowerCase().includes('coding'))) {
      const coding9 = document.getElementById('addonCoding9');
      if (coding9) coding9.checked = true;
    }
  } else if (gNum >= 5 && gNum <= 8) {
    if (course && (course.toLowerCase().includes('python') || course.toLowerCase().includes('coding'))) {
      const coding = document.getElementById('addonCoding');
      if (coding) coding.checked = true;
    }
  }

  if (window.updateMultiCourseSummary) window.updateMultiCourseSummary();

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

  if (!q) { showToast('Please enter your Application ID or Email.', 'error'); return; }

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
    outEl.innerHTML = `<div class="status-result-card text-center card card-p2 mt-2"><i class="fa-solid fa-folder-open" style="font-size:2rem;color:var(--gold);margin-bottom:0.5rem;display:block;"></i><p class="text-muted text-sm">${res.message || 'No application record found with provided ID or Email.'}</p></div>`;
  }
}
window.checkStatus = checkStatus;

