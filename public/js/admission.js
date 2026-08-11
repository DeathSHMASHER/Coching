// ============================================================
// ADMISSION FORM & MULTI-COURSE STATUS TRACKER
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Check URL parameters for pre-selected course & board
  const params = new URLSearchParams(window.location.search);
  const courseParam = params.get('course');
  const boardParam = params.get('board');

  if (courseParam) {
    const courseSelect = document.getElementById('admCourse');
    if (courseSelect) {
      // Find matching option or set value
      let matchFound = false;
      for (let opt of courseSelect.options) {
        if (opt.value.toLowerCase() === courseParam.toLowerCase() || courseParam.toLowerCase().includes(opt.value.toLowerCase())) {
          courseSelect.value = opt.value;
          matchFound = true;
          break;
        }
      }
      if (!matchFound) {
        const newOpt = document.createElement('option');
        newOpt.value = courseParam;
        newOpt.textContent = courseParam;
        newOpt.selected = true;
        courseSelect.appendChild(newOpt);
      }
    }
  }

  if (boardParam) {
    const boardInput = document.getElementById('admMsg');
    if (boardInput && !boardInput.value) {
      boardInput.value = `Target Board: ${boardParam}`;
    }
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
  const addCoding = document.getElementById('addonCoding') ? document.getElementById('addonCoding').checked : false;
  const addScience = document.getElementById('addonScience') ? document.getElementById('addonScience').checked : false;
  const summaryBox = document.getElementById('multiCourseSummary');

  if (!summaryBox) return;

  let totalFee = 0;
  let items = [];

  if (primaryCourse) {
    items.push(primaryCourse);
    if (primaryCourse.includes('5') || primaryCourse.includes('6')) totalFee += 1500;
    else if (primaryCourse.includes('7') || primaryCourse.includes('8')) totalFee += 2500;
    else if (primaryCourse.includes('9') || primaryCourse.includes('10')) totalFee += 4000;
    else if (primaryCourse.includes('11') || primaryCourse.includes('12')) totalFee += 3500;
    else totalFee += 2000;
  }

  if (addCoding) {
    items.push('Python Coding Specialization (+₹1,000/mo)');
    totalFee += 1000;
  }

  if (addScience) {
    items.push('Computer Science & Practical Booster (+₹1,500/mo)');
    totalFee += 1500;
  }

  if (!items.length) {
    summaryBox.innerHTML = '';
    return;
  }

  summaryBox.innerHTML = `
    <div style="background:rgba(255,183,3,0.06);border:1px solid rgba(255,183,3,0.3);padding:0.85rem;border-radius:var(--r-sm);" class="mt-2 mb-2">
      <div style="display:flex;align-items:center;justify-content:space-between;" class="mb-1">
        <span class="text-xs text-muted font-bold"><i class="fa-solid fa-layer-group c-gold"></i> Selected Program &amp; Add-ons:</span>
        <span class="chip chip-purple font-bold">Total Estimated: ₹${totalFee} / mo</span>
      </div>
      <div class="text-sm font-bold c-gold">${items.join(' + ')}</div>
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

function selectCourseAndScrollToForm(course, board) {
  const courseSelect = document.getElementById('admCourse');
  if (courseSelect && course) {
    let matchFound = false;
    for (let opt of courseSelect.options) {
      if (opt.value.toLowerCase() === course.toLowerCase() || course.toLowerCase().includes(opt.value.toLowerCase())) {
        courseSelect.value = opt.value;
        matchFound = true;
        break;
      }
    }
    if (!matchFound) {
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

  if (window.updateMultiCourseSummary) window.updateMultiCourseSummary();

  const card = document.getElementById('applyFormCard');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth' });
    const nameInp = document.getElementById('admName');
    if (nameInp) setTimeout(() => nameInp.focus(), 500);
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

