// ============================================================
// STUDENT PORTAL LOGIC & UNIFIED AUTHENTICATION
// ============================================================
let _currentStudent = null;

document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('stuData');
  if (saved) {
    try {
      _currentStudent = JSON.parse(saved);
      _renderStudentDash();
    } catch (e) {}
  }
});

async function handleStudentLogin(e) {
  if (e) e.preventDefault();
  const idEl   = document.getElementById('loginStudentId') || document.getElementById('stuLoginId');
  const passEl = document.getElementById('loginPassword') || document.getElementById('stuLoginPass');

  const id   = idEl ? idEl.value.trim() : '';
  const pass = passEl ? passEl.value.trim() : '';

  if (!id || !pass) {
    showToast('Please enter User ID and Password', 'error');
    return;
  }

  const btn = e ? e.target.querySelector('[type=submit]') : null;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…';
  }

  const res = await apiRequest('/auth/student-login', 'POST', { studentId: id, password: pass });

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login to Portal';
  }

  if (res.success) {
    if (res.role === 'admin') {
      sessionStorage.setItem('jigyasa_admin_token', 'admin_logged_in_' + Date.now());
      sessionStorage.setItem('jigyasa_admin_user', JSON.stringify(res.admin));
      showToast('Admin Access Granted! Redirecting to Director Desk...', 'success');
      setTimeout(() => {
        window.location.href = '/admin-portal.html';
      }, 500);
      return;
    }

    _currentStudent = res.student;
    sessionStorage.setItem('stuData', JSON.stringify(_currentStudent));
    showToast('Welcome back, ' + _currentStudent.name + '!', 'success');
    _renderStudentDash();
  } else {
    showToast(res.message || 'Invalid User ID or Password', 'error');
  }
}

async function _renderStudentDash() {
  if (!_currentStudent) return;

  const authBox = document.getElementById('studentLoginSection') || document.getElementById('studentAuthBox');
  const dashBox = document.getElementById('studentDashboard') || document.getElementById('studentDash');

  if (authBox) authBox.classList.add('hidden');
  if (dashBox) dashBox.classList.remove('hidden');

  // Populate Name and Header Badges
  const nameEl = document.getElementById('stuDashName') || document.getElementById('dName');
  const idEl   = document.getElementById('stuDashId') || document.getElementById('dId');
  const crsEl  = document.getElementById('stuDashCourse') || document.getElementById('dCourse');
  const btchEl = document.getElementById('stuDashBatch') || document.getElementById('dBatch');

  if (nameEl) nameEl.textContent = _currentStudent.name;
  if (idEl)   idEl.textContent   = _currentStudent.studentId;
  if (crsEl)  crsEl.textContent  = _currentStudent.course;
  if (btchEl) btchEl.textContent = _currentStudent.batch || 'Evening Batch Alpha';

  // Render Sub-modules
  _loadStudentLiveClasses();
  _loadAttendance();
  _loadPerformance();
  _loadDoubts();
  _loadStudentFeeLedger();
}

function logoutStudent() {
  _currentStudent = null;
  sessionStorage.removeItem('stuData');

  const authBox = document.getElementById('studentLoginSection') || document.getElementById('studentAuthBox');
  const dashBox = document.getElementById('studentDashboard') || document.getElementById('studentDash');

  if (authBox) authBox.classList.remove('hidden');
  if (dashBox) dashBox.classList.add('hidden');
  showToast('Logged out of Student Portal.');
}

// 0. TAILORED LIVE CLASSES & MEETING LINKS
async function _loadStudentLiveClasses() {
  if (!_currentStudent) return;
  const container = document.getElementById('stuLiveClassContainer');
  if (!container) return;

  const res = await apiRequest('/live-classes/student/' + _currentStudent.studentId);

  if (!res.success || !res.liveClasses || !res.liveClasses.length) {
    container.innerHTML = `
      <div style="background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.1);padding:1.2rem;border-radius:var(--r-sm);text-align:center;">
        <i class="fa-solid fa-calendar-xmark c-amber" style="font-size:1.5rem;" class="mb-1"></i>
        <p class="text-xs text-muted">No live classes scheduled right now for batch: <strong>${_currentStudent.course}</strong>.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = res.liveClasses.map(c => `
    <div class="card card-p2 mb-2" style="border-color:var(--cyan);background:rgba(0,240,255,0.05);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;" class="mb-1">
        <span class="chip chip-cyan"><i class="fa-solid fa-video"></i> Live Class • ${c.targetBatch}</span>
        <span class="chip chip-green"><i class="fa-solid fa-clock"></i> ${c.date} • ${c.time}</span>
      </div>
      <h3 class="font-heading mb-1" style="font-size:1.15rem;font-weight:800;">${c.title}</h3>
      <p class="text-xs text-muted mb-2"><i class="fa-solid fa-user-ninja c-gold"></i> Instructor: <strong>${c.instructor}</strong> ${c.notes ? '• ' + c.notes : ''}</p>
      <a href="${c.meetingLink}" target="_blank" class="btn btn-grad btn-sm">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> Join Live Meeting Class
      </a>
    </div>
  `).join('');
}

// 1. ATTENDANCE
async function _loadAttendance() {
  if (!_currentStudent) return;
  const res = await apiRequest('/attendance/' + _currentStudent.studentId);
  if (!res.success) return;

  const s = res.summary;
  const ovAttPct = document.getElementById('ovAttPct');
  const ovAttCount = document.getElementById('ovAttCount');
  if (ovAttPct) ovAttPct.textContent = s.percentage + '%';
  if (ovAttCount) ovAttCount.textContent = `${s.present} / ${s.totalLectures} Lectures`;

  const logsContainer = document.getElementById('attLogsFeed');
  if (logsContainer) {
    if (!res.records || !res.records.length) {
      logsContainer.innerHTML = '<p class="text-muted text-sm">No attendance records logged yet.</p>';
    } else {
      logsContainer.innerHTML = res.records.map(r => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0.9rem;background:rgba(255,255,255,0.03);border-radius:var(--r-sm);margin-bottom:0.5rem;border:1px solid rgba(255,255,255,0.06);">
          <div>
            <div style="font-weight:700;font-size:0.9rem;">${r.topicCovered || 'Lecture Session'}</div>
            <div class="text-xs text-muted">${new Date(r.date).toLocaleDateString()}</div>
          </div>
          <span class="chip ${r.status === 'Present' ? 'chip-green' : r.status === 'Late' ? 'chip-amber' : 'chip-red'}">${r.status}</span>
        </div>
      `).join('');
    }
  }
}

// 2. EXAM PERFORMANCE & WEIGHTED COMPOSITE INDEX (OUT OF 100)
async function _loadPerformance() {
  if (!_currentStudent) return;
  const res = await apiRequest('/performance/' + _currentStudent.studentId);
  if (!res.success) return;

  const idx = res.compositeIndex || 90;
  const weights = res.weights || { examPct: 90, examWeighted: 45, attPct: 100, attWeighted: 30, classParticipation: 85, participationWeighted: 17 };
  const info = res.tierInfo || {};

  // Overview score updates
  const ovRank = document.getElementById('ovRank');
  const ovPercentile = document.getElementById('ovPercentile');
  const ovIndexScore = document.getElementById('ovIndexScore');

  if (ovIndexScore) ovIndexScore.textContent = idx + ' / 100';
  if (ovRank && res.reports && res.reports[0]) ovRank.textContent = 'AIR #' + res.reports[0].rank;
  if (ovPercentile && res.reports && res.reports[0]) ovPercentile.textContent = res.reports[0].percentile + '%';

  // Render Interactive Gauge & Score Breakdown Widget
  const gaugeBox = document.getElementById('stuPerformanceIndexWidget');
  if (gaugeBox) {
    const badgeChipClass = info.badgeColor === 'gold' ? 'chip-amber' : info.badgeColor === 'cyan' ? 'chip-cyan' : info.badgeColor === 'amber' ? 'chip-purple' : 'chip-red';

    gaugeBox.innerHTML = `
      <div class="card card-p3 mb-3" style="border-color:var(--${info.badgeColor || 'gold'});background:rgba(255,255,255,0.03);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;" class="mb-2">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;" class="mb-1">
              <span class="chip ${badgeChipClass}" style="font-weight:800;font-size:0.9rem;"><i class="fa-solid fa-gauge-high"></i> ${info.statusText || 'Academic Performance Index'}</span>
            </div>
            <h3 class="font-heading" style="font-size:1.6rem;font-weight:800;">Composite Performance Score</h3>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-heading);font-size:3rem;font-weight:800;" class="c-${info.badgeColor || 'gold'}">${idx} <span style="font-size:1rem;color:var(--text-muted);">/ 100</span></div>
          </div>
        </div>

        <!-- 3 WEIGHTED METRIC BARS -->
        <div class="grid g3 mb-3">
          <div style="background:rgba(255,255,255,0.04);padding:0.9rem;border-radius:var(--r-sm);border:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;justify-content:space-between;" class="text-xs mb-1">
              <span><i class="fa-solid fa-file-pen c-gold"></i> Exam Marks (50%)</span>
              <strong class="c-gold">${weights.examPct}% (${weights.examWeighted}/50 pts)</strong>
            </div>
            <div class="prog-track"><div class="prog-fill" style="width:${weights.examPct}%"></div></div>
          </div>

          <div style="background:rgba(255,255,255,0.04);padding:0.9rem;border-radius:var(--r-sm);border:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;justify-content:space-between;" class="text-xs mb-1">
              <span><i class="fa-solid fa-calendar-check c-emerald"></i> Attendance (30%)</span>
              <strong class="c-emerald">${weights.attPct}% (${weights.attWeighted}/30 pts)</strong>
            </div>
            <div class="prog-track"><div class="prog-fill" style="width:${weights.attPct}%"></div></div>
          </div>

          <div style="background:rgba(255,255,255,0.04);padding:0.9rem;border-radius:var(--r-sm);border:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;justify-content:space-between;" class="text-xs mb-1">
              <span><i class="fa-solid fa-comments c-cyan"></i> Class Engagement (20%)</span>
              <strong class="c-cyan">${weights.classParticipation}% (${weights.participationWeighted}/20 pts)</strong>
            </div>
            <div class="prog-track"><div class="prog-fill" style="width:${weights.classParticipation}%"></div></div>
          </div>
        </div>

        <!-- ACTIONABLE IMPROVEMENT RECOMMENDATION CARD (VISIBLE IF < 95 OR CRITICAL) -->
        <div class="card card-p2" style="border-color:var(--${info.badgeColor || 'gold'});background:rgba(0,0,0,0.2);">
          <h4 style="font-size:1.05rem;font-weight:800;" class="mb-1 c-${info.badgeColor || 'gold'}">
            <i class="fa-solid fa-lightbulb"></i> Personalized Mentor Analysis &amp; Action Plan
          </h4>
          <p class="text-sm text-muted mb-2">${info.summaryMessage}</p>

          ${info.actionableSteps && info.actionableSteps.length ? `
            <div class="text-xs" style="display:flex;flex-direction:column;gap:0.45rem;">
              ${info.actionableSteps.map(step => `
                <div style="display:flex;align-items:flex-start;gap:0.5rem;">
                  <i class="fa-solid fa-arrow-right c-${info.badgeColor || 'gold'}" style="margin-top:2px;"></i>
                  <span>${step}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  const tableBody = document.getElementById('perfHistoryBody');
  if (tableBody) {
    if (!res.reports || !res.reports.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted text-sm">No test score reports published yet.</td></tr>';
    } else {
      tableBody.innerHTML = res.reports.map(r => `
        <tr>
          <td class="font-bold">${r.examTitle}</td>
          <td class="text-xs text-muted">${new Date(r.date).toLocaleDateString()}</td>
          <td class="c-gold font-bold">${r.totalScore} / ${r.maxMarks}</td>
          <td><span class="chip chip-purple">Rank #${r.rank} (${r.percentile}%)</span></td>
          <td class="text-xs text-muted">${r.remarks || 'Good progress'}</td>
        </tr>
      `).join('');
    }
  }
}

// 3. DOUBT RESOLUTION DESK
async function _loadDoubts() {
  if (!_currentStudent) return;
  const feed = document.getElementById('studentDoubtsFeed');
  if (!feed) return;

  const res = await apiRequest('/doubts/' + _currentStudent.studentId);
  if (!res.success || !res.doubts || !res.doubts.length) {
    feed.innerHTML = '<p class="text-muted text-sm">You haven\'t submitted any doubt tickets yet.</p>';
    return;
  }

  feed.innerHTML = res.doubts.map(d => `
    <div class="card card-p2 mb-2">
      <div style="display:flex;align-items:center;justify-content:space-between;" class="mb-1">
        <span class="chip ${d.status === 'Resolved' ? 'chip-green' : 'chip-amber'}">${d.status}</span>
        <span class="text-xs text-muted">${d.subject} • ${d.topic}</span>
      </div>
      <p class="text-sm font-bold mb-1">Q: "${d.question}"</p>
      ${d.solution ? `
        <div class="solution-box mt-1"><i class="fa-solid fa-circle-check c-emerald"></i> <strong>Solution:</strong> ${d.solution}</div>
      ` : `<p class="text-xs text-muted mt-1"><i class="fa-solid fa-clock c-amber"></i> Faculty is reviewing your doubt ticket...</p>`}
    </div>
  `).join('');
}

async function handleRaiseDoubt(e) {
  e.preventDefault();
  if (!_currentStudent) return;

  const subject = document.getElementById('doubtSubject').value;
  const topic = document.getElementById('doubtTopic').value.trim();
  const question = document.getElementById('doubtQuestion').value.trim();

  if (!subject || !topic || !question) {
    showToast('Please fill all fields to submit your doubt ticket.', 'error');
    return;
  }

  const res = await apiRequest('/doubts/raise', 'POST', {
    studentId: _currentStudent.studentId,
    subject,
    topic,
    question
  });

  if (res.success) {
    showToast('Doubt ticket submitted! Mentor will post solution soon.', 'success');
    e.target.reset();
    _loadDoubts();
  } else {
    showToast(res.message || 'Error submitting doubt ticket', 'error');
  }
}

// 4. STUDENT FEE LEDGER
async function _loadStudentFeeLedger() {
  if (!_currentStudent) return;
  const feeStatusEl = document.getElementById('stuFeeStatus');
  const feeDueEl = document.getElementById('stuFeeDue');

  if (feeStatusEl) {
    const status = _currentStudent.feeStatus || 'Paid';
    feeStatusEl.textContent = status;
    feeStatusEl.className = 'chip ' + (status === 'Paid' ? 'chip-green' : status === 'Partial' ? 'chip-amber' : 'chip-red');
  }
  if (feeDueEl) {
    feeDueEl.textContent = _currentStudent.feeDueAmount ? '₹' + _currentStudent.feeDueAmount : '₹0 (Clear)';
  }
}

// Global Exports
window.handleStudentLogin  = handleStudentLogin;
window.logoutStudent       = logoutStudent;
window.handleRaiseDoubt     = handleRaiseDoubt;
