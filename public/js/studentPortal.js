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
  if (window.updateNavAuthState) window.updateNavAuthState();
});

async function handleStudentLogin(e) {
  if (e) e.preventDefault();
  const idEl   = document.getElementById('loginStudentId') || document.getElementById('stuLoginId');
  const passEl = document.getElementById('loginPassword') || document.getElementById('stuLoginPass');

  const id   = idEl ? idEl.value.trim() : '';
  const pass = passEl ? passEl.value.trim() : '';

  if (!id || !pass) {
    if (!id && idEl) idEl.classList.add('shake-error');
    if (!pass && passEl) passEl.classList.add('shake-error');
    setTimeout(() => {
      if (idEl) idEl.classList.remove('shake-error');
      if (passEl) passEl.classList.remove('shake-error');
    }, 800);
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
    if (idEl) idEl.classList.add('shake-error');
    if (passEl) passEl.classList.add('shake-error');
    setTimeout(() => {
      if (idEl) idEl.classList.remove('shake-error');
      if (passEl) passEl.classList.remove('shake-error');
    }, 800);
    showToast(res.message || 'Invalid User ID or Password', 'error');
  }
}

async function _renderStudentDash() {
  if (!_currentStudent) return;

  // Fetch live student profile directly from MongoDB Atlas to guarantee updated fees, batch & status
  try {
    const res = await apiRequest('/students/' + _currentStudent.studentId + '?t=' + Date.now());
    if (res && res.success && res.student) {
      _currentStudent = { ..._currentStudent, ...res.student };
      sessionStorage.setItem('stuData', JSON.stringify(_currentStudent));
    }
  } catch (e) {
    console.warn('Live student profile sync notice:', e.message);
  }

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

  if (window.updateNavAuthState) window.updateNavAuthState();

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

  if (window.updateNavAuthState) window.updateNavAuthState();

  showToast('Logged out of Student Portal.');
}

// Helper: Compile raw phone or clipboard text into a clean Google Meet URL
function compileMeetLink(input) {
  if (!input) return 'https://meet.google.com';
  let str = String(input).trim();

  // Extract URL substring if full text copied from phone (e.g. "Join Meet: https://meet.google.com/xyz")
  const urlMatch = str.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    str = urlMatch[0];
  }

  str = str.replace(/\s+/g, '');

  if (/^https?:\/\//i.test(str)) return str;
  if (/^meet\.google\.com/i.test(str) || /^google\.com\/meet/i.test(str)) return 'https://' + str;

  const cleanCode = str.replace(/[^a-zA-Z0-9-]/g, '');
  if (/^[a-z0-9]{3,4}-[a-z0-9]{3,4}-[a-z0-9]{3,4}$/i.test(cleanCode)) {
    return 'https://meet.google.com/' + cleanCode;
  }
  if (/^[a-z0-9]{10}$/i.test(cleanCode)) {
    const formatted = `${cleanCode.slice(0,3)}-${cleanCode.slice(3,7)}-${cleanCode.slice(7)}`;
    return 'https://meet.google.com/' + formatted;
  }
  return 'https://' + str;
}

function _evalClassLiveStatus(dateStr, timeStr) {
  try {
    const now = new Date();
    const parts = (timeStr || '').split('-');
    if (parts.length < 2) return 'LIVE';

    function parseTimeStr(tStr, baseDateStr) {
      let t = tStr.trim();
      let isPM = t.toLowerCase().includes('pm');
      let isAM = t.toLowerCase().includes('am');
      let clean = t.replace(/(am|pm)/gi, '').trim();
      let [h, m] = clean.split(':').map(Number);
      if (isNaN(m)) m = 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;

      let d = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }

    const startObj = parseTimeStr(parts[0], dateStr);
    const endObj = parseTimeStr(parts[1], dateStr);

    if (now > endObj) return 'ENDED';
    if (now < startObj) return 'UPCOMING';
    return 'LIVE';
  } catch (e) {
    return 'LIVE';
  }
}

async function handleJoinLiveClass(classId, classTitle, rawMeetingLink) {
  if (!_currentStudent) return;
  const cleanUrl = compileMeetLink(rawMeetingLink);

  try {
    await apiRequest('/live-classes/join-log', 'POST', {
      classId,
      classTitle,
      studentId: _currentStudent.studentId,
      studentName: _currentStudent.name,
      targetBatch: _currentStudent.batch || _currentStudent.course || 'General Batch'
    });
  } catch (e) {
    console.warn('Could not log join timestamp:', e);
  }

  window.open(cleanUrl, '_blank');
}

// 0. TAILORED LIVE CLASSES & MEETING LINKS
async function _loadStudentLiveClasses() {
  if (!_currentStudent) return;
  const container = document.getElementById('stuLiveClassContainer');
  if (!container) return;

  const res = await apiRequest('/live-classes/student/' + _currentStudent.studentId);

  if (!res.success || !res.liveClasses || !res.liveClasses.length) {
    container.innerHTML = `
      <div style="background:var(--bg-subcard);border:1px dashed var(--border-subcard);padding:1.2rem;border-radius:var(--r-sm);text-align:center;">
        <i class="fa-solid fa-calendar-xmark c-amber" style="font-size:1.5rem;" class="mb-1"></i>
        <p class="text-xs text-muted">No live classes scheduled right now for batch: <strong>${_currentStudent.course}</strong>.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = res.liveClasses.map(c => {
    const cleanLink = compileMeetLink(c.meetingLink);
    const liveState = _evalClassLiveStatus(c.date, c.time);

    let statusChip = '';
    let actionBtn = '';
    let cardBg = '';

    if (liveState === 'LIVE') {
      statusChip = `<span class="chip chip-green"><i class="fa-solid fa-circle-dot fa-beat-fade c-emerald"></i> Live Class Now</span>`;
      actionBtn = `<button onclick="handleJoinLiveClass('${c.classId}', '${c.title.replace(/'/g, "\\'")}', '${cleanLink}')" class="btn btn-grad btn-sm" style="box-shadow: 0 0 15px rgba(0,240,255,0.4);"><i class="fa-solid fa-right-to-bracket"></i> Join Live Meeting Class</button>`;
      cardBg = 'border-color:var(--cyan);background:rgba(0,240,255,0.06);';
    } else if (liveState === 'ENDED') {
      statusChip = `<span class="chip chip-red" style="font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> Class Over / Lecture Ended</span>`;
      actionBtn = `<button class="btn btn-sm btn-outline text-muted" disabled style="opacity:0.55;cursor:not-allowed;border-color:#ef4444;color:#ef4444;"><i class="fa-solid fa-lock"></i> Class Over • Meeting Closed</button>`;
      cardBg = 'border-color:rgba(239,68,68,0.4);background:rgba(239,68,68,0.05);';
    } else {
      statusChip = `<span class="chip chip-amber"><i class="fa-solid fa-clock"></i> Starts at ${c.time}</span>`;
      actionBtn = `<button class="btn btn-sm btn-outline" disabled style="opacity:0.65;cursor:not-allowed;"><i class="fa-solid fa-clock"></i> Session Starts at ${c.time}</button>`;
      cardBg = 'border-color:var(--border-active);background:var(--bg-subcard);';
    }

    return `
      <div class="card card-p2 mb-2" style="${cardBg}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;" class="mb-1">
          <span class="chip chip-cyan"><i class="fa-solid fa-video"></i> ${c.targetBatch}</span>
          ${statusChip}
        </div>
        <h3 class="font-heading mb-1" style="font-size:1.15rem;font-weight:800;">${c.title}</h3>
        <p class="text-xs text-muted mb-2"><i class="fa-solid fa-clock c-gold"></i> Schedule: <strong>${c.date} • ${c.time}</strong> ${c.notes ? '• ' + c.notes : ''}</p>
        ${actionBtn}
      </div>
    `;
  }).join('');
}

// 1. ATTENDANCE
async function _loadAttendance() {
  if (!_currentStudent) return;
  const res = await apiRequest('/attendance/' + _currentStudent.studentId + '?t=' + Date.now());
  if (!res.success) return;

  const s = res.summary || {};
  const ovAttPct = document.getElementById('ovAttPct');
  const ovAttCount = document.getElementById('ovAttCount');

  const present = s.presentCount !== undefined ? s.presentCount : (s.present || 0);
  const total = s.totalDays !== undefined ? s.totalDays : (s.totalLectures || 0);
  const percentage = s.percentage !== undefined ? s.percentage : 100;

  if (ovAttPct) ovAttPct.textContent = percentage + '%';
  if (ovAttCount) ovAttCount.textContent = `${present} / ${total} Lectures`;

  const logsContainer = document.getElementById('attLogsFeed');
  const records = res.logs || res.records || [];
  if (logsContainer) {
    if (!records.length) {
      logsContainer.innerHTML = '<p class="text-muted text-sm">No attendance records logged yet.</p>';
    } else {
      logsContainer.innerHTML = records.map(r => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0.9rem;background:var(--bg-subcard);border-radius:var(--r-sm);margin-bottom:0.5rem;border:1px solid var(--border-subcard);">
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

// 2. EXAM PERFORMANCE & ANIMATED SPEEDOMETER GAUGE
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
  if (ovRank && res.reports && res.reports[0]) ovRank.textContent = 'Rank #' + res.reports[0].rank;
  if (ovPercentile && res.reports && res.reports[0]) ovPercentile.textContent = res.reports[0].percentile + '%';

  // Render Interactive Speedometer Gauge Widget
  const gaugeBox = document.getElementById('stuPerformanceIndexWidget');
  if (gaugeBox) {
    const auraClass = idx >= 90 ? 'mastery-aura' : idx >= 75 ? 'proficient-aura' : idx >= 50 ? 'developing-aura' : 'critical-aura';
    const strokeColor = idx >= 90 ? '#10b981' : idx >= 75 ? '#00f0ff' : idx >= 50 ? '#ffb703' : '#ef4444';
    const badgeChipClass = idx >= 90 ? 'chip-green' : idx >= 75 ? 'chip-cyan' : idx >= 50 ? 'chip-purple' : 'chip-red';

    gaugeBox.innerHTML = `
      <div class="speedometer-card ${auraClass} mb-3">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;" class="mb-2">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;" class="mb-1">
              <span class="chip ${badgeChipClass}" style="font-weight:800;font-size:0.9rem;">
                <i class="fa-solid fa-gauge-high"></i> ${info.statusText || 'Academic Performance Index'}
              </span>
            </div>
            <h3 class="font-heading" style="font-size:1.6rem;font-weight:800;">Performance Speedometer</h3>
          </div>
          <div style="text-align:right;">
            <div class="font-heading" style="font-size:1.1rem;font-weight:700;color:var(--text-muted);">
              Overall Index: <span id="speedoScoreNum" style="font-size:2.4rem;font-weight:800;color:${strokeColor};">0</span> / 100
            </div>
          </div>
        </div>

        <!-- SVG SPEEDOMETER ARCHITECTURE -->
        <div class="speedo-wrap mb-2">
          <svg class="speedometer-svg" viewBox="0 0 280 160">
            <!-- Background Arc (180 Degrees) -->
            <path class="speedo-bg-arc" d="M 30 140 A 110 110 0 0 1 250 140"></path>

            <!-- Animated Foreground Arc -->
            <path id="speedoArc" class="speedo-meter-arc" stroke="${strokeColor}" d="M 30 140 A 110 110 0 0 1 250 140"></path>

            <!-- Animated Needle -->
            <g id="speedoNeedle" class="speedo-needle" style="transform: rotate(0deg);">
              <line x1="140" y1="140" x2="45" y2="140" stroke="${strokeColor}" stroke-width="4.5" stroke-linecap="round" />
              <circle cx="140" cy="140" r="8" fill="${strokeColor}" />
              <circle cx="140" cy="140" r="4" fill="var(--bg-card)" />
            </g>
          </svg>
        </div>

        <!-- 3 WEIGHTED METRIC BARS -->
        <div class="grid g3 mb-3">
          <div style="background:var(--bg-subcard);padding:0.9rem;border-radius:var(--r-sm);border:1px solid var(--border-subcard);">
            <div style="display:flex;justify-content:space-between;" class="text-xs mb-1">
              <span><i class="fa-solid fa-file-pen c-gold"></i> Exam Marks (50%)</span>
              <strong class="c-gold">${weights.examPct}% (${weights.examWeighted}/50 pts)</strong>
            </div>
            <div class="prog-track"><div class="prog-fill" style="width:${weights.examPct}%"></div></div>
          </div>

          <div style="background:var(--bg-subcard);padding:0.9rem;border-radius:var(--r-sm);border:1px solid var(--border-subcard);">
            <div style="display:flex;justify-content:space-between;" class="text-xs mb-1">
              <span><i class="fa-solid fa-calendar-check c-emerald"></i> Attendance (30%)</span>
              <strong class="c-emerald">${weights.attPct}% (${weights.attWeighted}/30 pts)</strong>
            </div>
            <div class="prog-track"><div class="prog-fill" style="width:${weights.attPct}%"></div></div>
          </div>

          <div style="background:var(--bg-subcard);padding:0.9rem;border-radius:var(--r-sm);border:1px solid var(--border-subcard);">
            <div style="display:flex;justify-content:space-between;" class="text-xs mb-1">
              <span><i class="fa-solid fa-comments c-cyan"></i> Class Engagement (20%)</span>
              <strong class="c-cyan">${weights.classParticipation}% (${weights.participationWeighted}/20 pts)</strong>
            </div>
            <div class="prog-track"><div class="prog-fill" style="width:${weights.classParticipation}%"></div></div>
          </div>
        </div>

        <!-- ACTIONABLE IMPROVEMENT RECOMMENDATION CARD -->
        <div class="card card-p2" style="border-color:${strokeColor};background:rgba(0,0,0,0.25);">
          <h4 style="font-size:1.05rem;font-weight:800;color:${strokeColor};" class="mb-1">
            <i class="fa-solid fa-lightbulb"></i> Personalized Mentor Guidance &amp; Action Plan
          </h4>
          <p class="text-sm text-muted mb-2">${info.summaryMessage}</p>

          ${info.actionableSteps && info.actionableSteps.length ? `
            <div class="text-xs" style="display:flex;flex-direction:column;gap:0.45rem;">
              ${info.actionableSteps.map(step => `
                <div style="display:flex;align-items:flex-start;gap:0.5rem;">
                  <i class="fa-solid fa-arrow-right" style="color:${strokeColor};margin-top:2px;"></i>
                  <span>${step}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // TRIGGER SPEEDOMETER COUNT-UP & NEEDLE ROTATION ANIMATION
    setTimeout(() => {
      _animateSpeedometer(idx);
    }, 200);

    // SCREEN-FILLING GREEN AURA CELEBRATION FOR 90+ SCORES
    if (idx >= 90) {
      _launchGreenCelebration();
    }
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

// SPEEDOMETER ANIMATION HELPER (COUNTS 0 TO TARGET SCORE)
function _animateSpeedometer(targetScore) {
  const arc = document.getElementById('speedoArc');
  const needle = document.getElementById('speedoNeedle');
  const scoreNum = document.getElementById('speedoScoreNum');

  // Arc length offset (380 is full arc, 0 is full circle)
  // Angle maps 0 -> 100 to 0deg -> 180deg
  const offset = 380 - (targetScore / 100) * 340;
  const degrees = (targetScore / 100) * 180;

  if (arc) arc.style.strokeDashoffset = offset;
  if (needle) needle.style.transform = `rotate(${degrees}deg)`;

  // Count-up numbers from 0 to targetScore
  if (scoreNum) {
    let current = 0;
    const duration = 1800; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = targetScore / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        current = targetScore;
        clearInterval(timer);
      }
      scoreNum.textContent = Math.round(current);
    }, stepTime);
  }
}

// SCREEN-FILLING GREEN CELEBRATION PARTICLES FOR 90+ MASTERY SCORE
function _launchGreenCelebration() {
  let canvas = document.getElementById('celebrationCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'celebrationCanvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#ffb703', '#ffffff'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height - height,
      r: Math.random() * 6 + 2,
      d: Math.random() * 80,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    });
  }

  let animationFrame;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();

      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.tilt = Math.sin(p.tiltAngle) * 15;

      if (p.y > height) {
        particles[i] = {
          x: Math.random() * width,
          y: -20,
          r: p.r,
          d: p.d,
          color: p.color,
          tilt: p.tilt,
          tiltAngleIncremental: p.tiltAngleIncremental,
          tiltAngle: p.tiltAngle
        };
      }
    }

    animationFrame = requestAnimationFrame(draw);
  }

  draw();

  // Automatically fade out celebration after 7 seconds
  setTimeout(() => {
    cancelAnimationFrame(animationFrame);
    if (canvas) canvas.remove();
  }, 7000);
}

// 3. DOUBT RESOLUTION DESK
async function _loadDoubts() {
  if (!_currentStudent) return;
  const feed = document.getElementById('studentDoubtsFeed');
  if (!feed) return;

  const res = await apiRequest('/doubts/student/' + encodeURIComponent(_currentStudent.studentId));
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

// 4. STUDENT FEE LEDGER (LIVE DB SYNC)
async function _loadStudentFeeLedger() {
  if (!_currentStudent) return;
  const feeStatusEl = document.getElementById('stuFeeStatus');
  const feeDueEl = document.getElementById('stuFeeDue');

  const status = _currentStudent.feeStatus || 'Paid';
  const due = Number(_currentStudent.feeDueAmount) || 0;

  if (feeStatusEl) {
    const chipClass = status === 'Paid' ? 'chip-green' : status === 'Partial' ? 'chip-amber' : 'chip-red';
    feeStatusEl.innerHTML = `<span class="chip ${chipClass}">${status}</span>`;
  }
  if (feeDueEl) {
    if (status === 'Paid' || due <= 0) {
      feeDueEl.textContent = '₹0 (Clear)';
      feeDueEl.className = 'text-xs text-dim';
    } else {
      feeDueEl.textContent = `₹${due.toLocaleString()}`;
      feeDueEl.className = 'text-xs text-dim';
    }
  }
}

async function refreshStudentData() {
  if (!_currentStudent) return;
  showToast('Refreshing student portal data...', 'info');
  await _renderStudentDash();
  showToast('Student portal updated!', 'success');
}

// Global Exports
window.handleStudentLogin    = handleStudentLogin;
window.logoutStudent         = logoutStudent;
window.handleRaiseDoubt       = handleRaiseDoubt;
window.refreshStudentData    = refreshStudentData;
window.handleJoinLiveClass   = handleJoinLiveClass;

