// ============================================================
// ADMIN PORTAL JS — Protected Admin Workspace & Batch Logger
// ============================================================

let currentAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('jigyasa_admin_token');
  if (token) {
    unlockAdminDesk();
  } else {
    showAdminAuthModal();
  }
});

function showAdminAuthModal() {
  const modal = document.getElementById('adminAuthModal');
  const mainWorkspace = document.getElementById('adminWorkspace');
  
  if (modal) modal.classList.remove('hidden');
  if (mainWorkspace) mainWorkspace.classList.add('hidden');
}

async function handleAdminPasscodeLogin(e) {
  if (e) e.preventDefault();
  const passcodeEl = document.getElementById('adminPasscodeInput');
  const passcode = passcodeEl ? passcodeEl.value.trim() : '';

  if (!passcode) {
    showToast('Please enter Admin Passcode.', 'error');
    return;
  }

  const res = await apiRequest('/auth/admin-login', 'POST', { passcode });

  if (res.success) {
    sessionStorage.setItem('jigyasa_admin_token', 'admin_logged_in_' + Date.now());
    sessionStorage.setItem('jigyasa_admin_user', JSON.stringify(res.admin));
    showToast('Admin Access Granted!', 'success');
    unlockAdminDesk();
  } else {
    showToast(res.message || 'Invalid Passcode', 'error');
  }
}

function unlockAdminDesk() {
  const modal = document.getElementById('adminAuthModal');
  const mainWorkspace = document.getElementById('adminWorkspace');

  if (modal) modal.classList.add('hidden');
  if (mainWorkspace) mainWorkspace.classList.remove('hidden');

  const adminUser = sessionStorage.getItem('jigyasa_admin_user');
  if (adminUser) {
    try {
      currentAdmin = JSON.parse(adminUser);
      const nameEl = document.getElementById('adminName');
      if (nameEl) nameEl.textContent = currentAdmin.name || 'Head Admin';
    } catch (e) {}
  }

  // Load all admin modules
  loadAdmissionsQueue();
  loadLiveClassesAdmin();
  loadCourseCatalogAdmin();
  loadStudentsDirectoryAdmin();
  loadNoticesAdmin();
  loadDoubtsAdmin();
  onPerfBatchChange();
  loadAllPerformanceReportsAdmin();
}

async function refreshAdminData() {
  showToast('Refreshing Director Desk data...', 'info');
  unlockAdminDesk();
  showToast('Director Desk updated!', 'success');
}

function logoutAdmin() {
  sessionStorage.removeItem('jigyasa_admin_token');
  sessionStorage.removeItem('jigyasa_admin_user');
  showToast('Logged out of Admin Desk.', 'info');
  window.location.href = '/student-portal.html';
}

function cancelAdminLogin() {
  window.location.href = '/student-portal.html';
}

// ---- LIVE CLASS SCHEDULER & MEETING LINK BROADCASTER ----
async function loadLiveClassesAdmin() {
  const feed = document.getElementById('adminLiveClassesFeed');
  if (!feed) return;

  const res = await apiRequest('/live-classes');
  if (!res.success || !res.liveClasses || !res.liveClasses.length) {
    feed.innerHTML = '<p class="text-muted text-sm">No live classes scheduled yet.</p>';
    return;
  }

  feed.innerHTML = res.liveClasses.map(c => `
    <div class="card card-p2 mb-2">
      <div style="display:flex;align-items:center;justify-content:space-between;" class="mb-1">
        <span class="chip chip-cyan">${c.targetBatch}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteLiveClass('${c.classId}')">
          <i class="fa-solid fa-trash"></i> Cancel Class
        </button>
      </div>
      <h4 style="font-weight:700;">${c.title}</h4>
      <p class="text-xs text-muted mb-1"><i class="fa-solid fa-clock"></i> Date: ${c.date} • ${c.time}</p>
      <div class="mb-2 text-xs c-gold font-bold"><i class="fa-solid fa-link"></i> Link: <a href="${c.meetingLink}" target="_blank" class="c-cyan">${c.meetingLink}</a></div>
    </div>
  `).join('');
}

async function handleScheduleLiveClass(e) {
  e.preventDefault();
  const title = document.getElementById('lcTitle').value.trim();
  const targetBatch = document.getElementById('lcTargetBatch').value;
  const meetingLink = document.getElementById('lcMeetingLink').value.trim();
  const date = document.getElementById('lcDate').value;
  const time = document.getElementById('lcTime').value.trim();
  const notes = document.getElementById('lcNotes').value.trim();

  if (!title || !meetingLink || !targetBatch) {
    showToast('Title, Target Batch, and Meeting Link are required.', 'error');
    return;
  }

  const res = await apiRequest('/live-classes/schedule', 'POST', {
    title,
    targetBatch,
    meetingLink,
    date,
    time,
    notes
  });

  if (res.success) {
    showToast(res.message, 'success');
    document.getElementById('liveClassForm').reset();
    loadLiveClassesAdmin();
  } else {
    showToast(res.message || 'Error scheduling live class', 'error');
  }
}

async function deleteLiveClass(classId) {
  if (!confirm(`Cancel and delete live class ${classId}?`)) return;

  const res = await apiRequest(`/live-classes/${classId}`, 'DELETE');
  if (res.success) {
    showToast(res.message, 'success');
    loadLiveClassesAdmin();
  } else {
    showToast(res.message || 'Error deleting class link', 'error');
  }
}

// ---- BATCH-WISE ATTENDANCE LOGGER ----
async function loadBatchStudentsForAttendance() {
  const batchSelect = document.getElementById('attBatchSelect');
  const container = document.getElementById('batchAttRosterContainer');
  if (!batchSelect || !container) return;

  const batchFilter = batchSelect.value;
  const res = await apiRequest('/students');

  if (!res.success || !res.students || !res.students.length) {
    container.innerHTML = '<p class="text-muted text-sm">No students available.</p>';
    return;
  }

  let students = res.students;
  if (batchFilter && batchFilter !== 'All Batches') {
    students = students.filter(s => (s.course || '').toLowerCase().includes(batchFilter.toLowerCase()));
  }

  if (!students.length) {
    container.innerHTML = `<p class="text-muted text-sm">No students found matching batch filter: <strong>${batchFilter}</strong>.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Student ID &amp; Name</th>
            <th>Enrolled Course</th>
            <th>Attendance Status</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td>
                <div class="font-bold">${s.name}</div>
                <div class="text-xs c-cyan">${s.studentId}</div>
              </td>
              <td class="text-sm">${s.course}</td>
              <td>
                <select class="form-control batch-att-val" data-studentid="${s.studentId}" style="padding:0.4rem 0.8rem;">
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                  <option value="Excused">Excused</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function handleBatchAttendanceSubmit(e) {
  e.preventDefault();
  const date = document.getElementById('batchAttDate').value;
  const topicCovered = document.getElementById('batchAttTopic').value.trim();

  if (!date) {
    showToast('Please select lecture date.', 'error');
    return;
  }

  const selects = document.querySelectorAll('.batch-att-val');
  if (!selects.length) {
    showToast('No students loaded to mark attendance.', 'error');
    return;
  }

  let count = 0;
  for (let sel of selects) {
    const studentId = sel.dataset.studentid;
    const status = sel.value;
    await apiRequest('/attendance/mark', 'POST', { studentId, date, status, topicCovered });
    count++;
  }

  showToast(`Logged attendance for ${count} students successfully!`, 'success');
}

// ---- DYNAMIC COURSE CATALOG & PRICE ADJUSTER ----
async function loadCourseCatalogAdmin() {
  const body = document.getElementById('adminCoursesBody');
  if (!body) return;

  const res = await apiRequest('/courses');
  if (!res.success || !res.courses || !res.courses.length) {
    body.innerHTML = '<tr><td colspan="6" class="text-center text-muted text-sm">No courses available.</td></tr>';
    return;
  }

  body.innerHTML = res.courses.map(c => `
    <tr>
      <td><span class="chip chip-cyan">${c.courseId}</span></td>
      <td>
        <div class="font-bold">${c.title}</div>
        <div class="text-xs text-muted">${c.classes} • ${c.category}</div>
      </td>
      <td class="text-sm c-gold font-bold">₹${c.currentFee} <span class="text-xs text-dim">(${c.billingPeriod})</span></td>
      <td class="text-sm text-dim" style="text-decoration:line-through;">₹${c.originalFee}</td>
      <td class="text-xs text-muted">${c.timings}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openCourseFeeModal('${c.courseId}', '${c.title.replace(/'/g, "\\'")}', ${c.currentFee}, ${c.originalFee})">
          <i class="fa-solid fa-pen-to-square"></i> Adjust Price
        </button>
      </td>
    </tr>
  `).join('');
}

function openCourseFeeModal(courseId, title, currentFee, originalFee) {
  const idEl = document.getElementById('courseEditId');
  const titleEl = document.getElementById('courseEditTitle');
  const feeEl = document.getElementById('courseEditFee');
  const origEl = document.getElementById('courseEditOriginalFee');

  if (idEl) idEl.value = courseId;
  if (titleEl) titleEl.textContent = title;
  if (feeEl) feeEl.value = currentFee;
  if (origEl) origEl.value = originalFee;

  const modal = document.getElementById('courseEditModal');
  if (modal) modal.classList.remove('hidden');
}

async function handleSaveCourseFee(e) {
  e.preventDefault();
  const courseId = document.getElementById('courseEditId').value;
  const currentFee = Number(document.getElementById('courseEditFee').value);
  const originalFee = Number(document.getElementById('courseEditOriginalFee').value);

  if (isNaN(currentFee) || currentFee < 0) {
    showToast('Please enter a valid price amount.', 'error');
    return;
  }

  const res = await apiRequest(`/courses/${courseId}`, 'PUT', { currentFee, originalFee });

  if (res.success) {
    showToast('Course price updated live in system!', 'success');
    closeCourseFeeModal();
    loadCourseCatalogAdmin();
    if (window._loadDynamicCourses) window._loadDynamicCourses();
  } else {
    showToast(res.message || 'Error updating course price', 'error');
  }
}

function closeCourseFeeModal() {
  const modal = document.getElementById('courseEditModal');
  if (modal) modal.classList.add('hidden');
}

// ---- ADMISSIONS QUEUE MANAGER & PERMANENT DELETION ----
async function loadAdmissionsQueue() {
  const body = document.getElementById('admissionsTableBody');
  const countBadge = document.getElementById('admCountBadge');
  if (!body) return;

  const res = await apiRequest('/admissions/all');

  if (!res.success || !res.applications || !res.applications.length) {
    body.innerHTML = '<tr><td colspan="6" class="text-center text-muted text-sm">No applications submitted yet.</td></tr>';
    if (countBadge) countBadge.textContent = '0 Pending';
    return;
  }

  const apps = res.applications;
  const pending = apps.filter(a => a.status === 'Pending').length;
  if (countBadge) countBadge.textContent = `${pending} Pending`;

  body.innerHTML = apps.map(a => `
    <tr>
      <td><span class="chip chip-cyan">${a.applicationId}</span></td>
      <td>
        <div class="font-bold">${a.name}</div>
        <div class="text-xs text-muted">${a.email} • ${a.phone}</div>
      </td>
      <td class="text-sm">${a.targetCourse}</td>
      <td class="text-sm">${a.previousPercentage ? a.previousPercentage + '%' : 'N/A'}</td>
      <td>
        <span class="chip ${a.status === 'Approved' ? 'chip-green' : a.status === 'Rejected' ? 'chip-red' : 'chip-amber'}">${a.status}</span>
        ${a.studentIdAssigned ? `<div class="text-xs c-cyan mt-1">ID: ${a.studentIdAssigned} (Pass: 1234)</div>` : ''}
      </td>
      <td>
        <div style="display:flex;gap:0.4rem;align-items:center;">
          ${a.status === 'Pending' ? `
            <button class="btn btn-sm btn-grad" onclick="updateAppStatus('${a.applicationId}', 'Approved')">Approve</button>
            <button class="btn btn-sm btn-outline" onclick="updateAppStatus('${a.applicationId}', 'Rejected')">Reject</button>
          ` : `<span class="text-xs text-muted">Processed</span>`}
          <button class="btn btn-sm btn-danger" onclick="deleteAdmissionApp('${a.applicationId}')" title="Delete application permanently">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function updateAppStatus(appId, newStatus) {
  const res = await apiRequest(`/admissions/${appId}/status`, 'PUT', { status: newStatus });

  if (res.success) {
    showToast(res.message + (res.assignedStudentId ? ` (Student ID: ${res.assignedStudentId} | Password: 1234)` : ''), 'success');
    loadAdmissionsQueue();
    loadStudentsDirectoryAdmin();
  } else {
    showToast(res.message || 'Error updating status', 'error');
  }
}

async function deleteAdmissionApp(appId) {
  if (!confirm(`Are you sure you want to permanently delete application ${appId}?`)) return;

  const res = await apiRequest(`/admissions/${appId}`, 'DELETE');

  if (res.success) {
    showToast(res.message, 'success');
    loadAdmissionsQueue();
  } else {
    showToast(res.message || 'Error deleting application', 'error');
  }
}

// ---- DYNAMIC BATCH-WISE SUBJECT MARKING & PUBLISH PERFORMANCE REPORT ----
function onPerfBatchChange() {
  const batchSelect = document.getElementById('perfBatchSelect');
  const container = document.getElementById('perfDynamicSubjectsContainer');
  if (!batchSelect || !container) return;

  const batch = batchSelect.value;
  let subjects = [];

  if (batch.includes('11') || batch.includes('12')) {
    subjects = ['Physics', 'Chemistry']; // Batch 11 & 12 default to Physics and Chemistry
  } else if (batch.includes('9') || batch.includes('10')) {
    subjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics'];
  } else if (batch.includes('Coding') || batch.includes('Python')) {
    subjects = ['Python Logic', 'Coding Projects'];
  } else {
    subjects = ['Science', 'Mathematics', 'English', 'Social Science'];
  }

  container.innerHTML = `
    <div class="grid g3 mb-1">
      ${subjects.map(s => `
        <div class="form-group mb-1">
          <label class="form-label">${s} Marks</label>
          <input type="number" step="0.5" class="form-control perf-subj-input" data-subject="${s}" placeholder="Enter ${s} score" oninput="recalcTotalPerfMarks()" />
        </div>
      `).join('')}
    </div>
  `;
}

function addCustomSubjectInput() {
  const container = document.getElementById('perfDynamicSubjectsContainer');
  if (!container) return;

  const subjectName = prompt('Enter custom subject name (e.g. Computer Science, Practical):');
  if (!subjectName || !subjectName.trim()) return;

  const cleanSubj = subjectName.trim();
  let grid = container.querySelector('.grid');
  if (!grid) {
    container.innerHTML = '<div class="grid g3 mb-1"></div>';
    grid = container.querySelector('.grid');
  }

  const div = document.createElement('div');
  div.className = 'form-group mb-1';
  div.innerHTML = `
    <label class="form-label">${cleanSubj} Marks</label>
    <input type="number" step="0.5" class="form-control perf-subj-input" data-subject="${cleanSubj}" placeholder="Enter ${cleanSubj} score" oninput="recalcTotalPerfMarks()" />
  `;
  grid.appendChild(div);
}

function recalcTotalPerfMarks() {
  const inputs = document.querySelectorAll('.perf-subj-input');
  let sum = 0;
  let hasVal = false;
  inputs.forEach(inp => {
    const v = parseFloat(inp.value);
    if (!isNaN(v)) {
      sum += v;
      hasVal = true;
    }
  });
  const totalScoreEl = document.getElementById('perfTotalScore');
  if (totalScoreEl && hasVal) {
    totalScoreEl.value = sum;
  }
}

async function handleAddPerformance(e) {
  e.preventDefault();
  const batch = document.getElementById('perfBatchSelect') ? document.getElementById('perfBatchSelect').value : 'Class 11';
  const studentId = document.getElementById('perfStudentId').value.trim();
  const examTitle = document.getElementById('perfExamTitle').value.trim();
  const date = document.getElementById('perfDate').value;
  const totalScore = Number(document.getElementById('perfTotalScore').value);
  const maxMarks = Number(document.getElementById('perfMaxMarks').value) || 100;
  const rank = Number(document.getElementById('perfRank').value) || 1;
  const percentile = Number(document.getElementById('perfPercentile').value) || 95;
  const remarks = document.getElementById('perfRemarks').value.trim();
  const classParticipation = Number(document.getElementById('perfParticipation').value) || 85;

  const subjectBreakdown = {};
  document.querySelectorAll('.perf-subj-input').forEach(inp => {
    const subj = inp.dataset.subject;
    const val = Number(inp.value) || 0;
    if (subj) subjectBreakdown[subj] = val;
  });

  if (!studentId || !examTitle || isNaN(totalScore)) {
    showToast('Student ID, Exam Title, and Total Score are required.', 'error');
    return;
  }

  const payload = {
    batch,
    studentId,
    examTitle,
    date,
    totalScore,
    maxMarks,
    subjectBreakdown,
    rank,
    percentile,
    remarks,
    classParticipation
  };

  const res = await apiRequest('/performance/add', 'POST', payload);

  if (res.success) {
    showToast('Exam performance & subject marks published to student portal!', 'success');
    document.getElementById('perfForm').reset();
    onPerfBatchChange();
    loadAllPerformanceReportsAdmin();
  } else {
    showToast(res.message || 'Error publishing report', 'error');
  }
}

// ---- ALL PUBLISHED PERFORMANCE REPORTS DESK ----
async function loadAllPerformanceReportsAdmin() {
  const body = document.getElementById('allPerfReportsBody');
  if (!body) return;

  const res = await apiRequest('/performance/all/reports');
  if (!res.success || !res.reports || !res.reports.length) {
    body.innerHTML = '<tr><td colspan="6" class="text-center text-muted text-sm">No published exam reports found.</td></tr>';
    return;
  }

  body.innerHTML = res.reports.map(r => {
    const subjStr = Object.entries(r.subjectBreakdown || {}).map(([k,v]) => `${k}: ${v}`).join(', ');
    return `
      <tr>
        <td><span class="chip chip-cyan" style="font-weight:800;">${r.studentId}</span></td>
        <td>
          <div class="font-bold">${r.examTitle}</div>
          <div class="text-xs text-muted">${r.batch || 'General Batch'} • ${r.date || 'N/A'}</div>
        </td>
        <td class="c-gold font-bold">${r.totalScore} / ${r.maxMarks}</td>
        <td class="text-xs text-muted">${subjStr || 'N/A'}</td>
        <td><span class="chip chip-purple">Rank #${r.rank} (${r.percentile}%)</span></td>
        <td>
          <div style="display:flex;gap:0.4rem;">
            <button class="btn btn-sm btn-outline" onclick="openEditPerfModal('${r._id || r.reportId}', '${r.studentId}', '${(r.examTitle||'').replace(/'/g, "\\'")}', ${r.totalScore}, ${r.maxMarks}, ${r.rank}, ${r.percentile}, '${(r.remarks||'').replace(/'/g, "\\'")}')">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deletePerformanceAdmin('${r._id || r.reportId}')">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditPerfModal(reportId, studentId, examTitle, totalScore, maxMarks, rank, percentile, remarks) {
  const rIdEl = document.getElementById('editPerfReportId');
  const sIdEl = document.getElementById('editPerfStudentId');
  const eTitleEl = document.getElementById('editPerfExamTitle');
  const tScoreEl = document.getElementById('editPerfTotalScore');
  const mMarksEl = document.getElementById('editPerfMaxMarks');
  const rRankEl = document.getElementById('editPerfRank');
  const rPercEl = document.getElementById('editPerfPercentile');
  const rRemEl = document.getElementById('editPerfRemarks');

  if (rIdEl) rIdEl.value = reportId;
  if (sIdEl) sIdEl.value = studentId;
  if (eTitleEl) eTitleEl.value = examTitle;
  if (tScoreEl) tScoreEl.value = totalScore;
  if (mMarksEl) mMarksEl.value = maxMarks;
  if (rRankEl) rRankEl.value = rank;
  if (rPercEl) rPercEl.value = percentile;
  if (rRemEl) rRemEl.value = remarks;

  const modal = document.getElementById('editPerfModal');
  if (modal) modal.classList.remove('hidden');
}

function closeEditPerfModal() {
  const modal = document.getElementById('editPerfModal');
  if (modal) modal.classList.add('hidden');
}

async function handleSavePerfEdit(e) {
  e.preventDefault();
  const reportId = document.getElementById('editPerfReportId').value;
  const studentId = document.getElementById('editPerfStudentId').value.trim();
  const examTitle = document.getElementById('editPerfExamTitle').value.trim();
  const totalScore = Number(document.getElementById('editPerfTotalScore').value);
  const maxMarks = Number(document.getElementById('editPerfMaxMarks').value) || 100;
  const rank = Number(document.getElementById('editPerfRank').value) || 1;
  const percentile = Number(document.getElementById('editPerfPercentile').value) || 95;
  const remarks = document.getElementById('editPerfRemarks').value.trim();

  const res = await apiRequest(`/performance/${reportId}`, 'PUT', {
    studentId,
    examTitle,
    totalScore,
    maxMarks,
    rank,
    percentile,
    remarks
  });

  if (res.success) {
    showToast('Exam report updated live!', 'success');
    closeEditPerfModal();
    loadAllPerformanceReportsAdmin();
  } else {
    showToast(res.message || 'Error updating report', 'error');
  }
}

async function deletePerformanceAdmin(reportId) {
  if (!confirm('Are you sure you want to delete this exam report?')) return;
  const res = await apiRequest(`/performance/${reportId}`, 'DELETE');
  if (res.success) {
    showToast('Report deleted successfully!', 'success');
    loadAllPerformanceReportsAdmin();
  } else {
    showToast(res.message || 'Error deleting report', 'error');
  }
}

// ---- POST & DELETE BROADCAST NOTICE ----
async function handlePostNotice(e) {
  e.preventDefault();
  const title = document.getElementById('noticeTitle').value.trim();
  const category = document.getElementById('noticeCategory').value;
  const content = document.getElementById('noticeContent').value.trim();
  const isImportant = document.getElementById('noticeImportant').checked;

  if (!title || !content) {
    showToast('Title and content are required.', 'error');
    return;
  }

  const res = await apiRequest('/notices/create', 'POST', {
    title,
    category,
    content,
    isImportant,
    postedBy: currentAdmin ? currentAdmin.name : 'Director Office'
  });

  if (res.success) {
    showToast('Notice broadcasted to home screen!', 'success');
    document.getElementById('noticeForm').reset();
    loadNoticesAdmin();
  } else {
    showToast(res.message || 'Error posting notice', 'error');
  }
}

async function loadNoticesAdmin() {
  const list = document.getElementById('adminNoticesList');
  if (!list) return;
  const res = await apiRequest('/notices');

  if (!res.success || !res.notices || !res.notices.length) {
    list.innerHTML = '<p class="text-muted text-sm">No notices posted yet.</p>';
    return;
  }

  list.innerHTML = res.notices.map(n => `
    <div class="card card-p2 mb-2">
      <div style="display:flex;align-items:center;justify-content:space-between;" class="mb-1">
        <span class="chip chip-cyan">${n.category}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteNotice('${n.noticeId}')">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>
      <h4 style="font-weight:700;">${n.title}</h4>
      <p class="text-sm text-muted">${n.content}</p>
    </div>
  `).join('');
}

async function deleteNotice(noticeId) {
  if (!confirm(`Permanently delete notice ${noticeId}?`)) return;

  const res = await apiRequest(`/notices/${noticeId}`, 'DELETE');
  if (res.success) {
    showToast(res.message, 'success');
    loadNoticesAdmin();
  } else {
    showToast(res.message || 'Error deleting notice', 'error');
  }
}

// ---- RESOLVE & DELETE DOUBTS DESK ----
async function loadDoubtsAdmin() {
  const feed = document.getElementById('adminDoubtsFeed');
  if (!feed) return;

  const res = await apiRequest('/doubts/all');
  if (!res.success || !res.doubts || !res.doubts.length) {
    feed.innerHTML = '<p class="text-muted text-sm">No doubts raised yet.</p>';
    return;
  }

  feed.innerHTML = res.doubts.map(d => `
    <div class="card card-p2 mb-2">
      <div class="di-head">
        <span class="chip ${d.status === 'Resolved' ? 'chip-green' : 'chip-amber'}">${d.status}</span>
        <span class="text-xs text-muted">${d.studentName} (${d.studentId}) • ${d.subject}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteDoubtAdmin('${d.doubtId}')" title="Delete ticket permanently">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>
      <div class="di-topic">${d.topic}</div>
      <div class="di-q">"${d.question}"</div>
      ${d.solution ? `
        <div class="solution-box"><i class="fa-solid fa-check"></i> ${d.solution}</div>
      ` : `
        <div class="input-row mt-2">
          <input class="form-control" id="sol_${d.doubtId}" type="text" placeholder="Type solution for student..." />
          <button class="btn btn-sm btn-grad" onclick="resolveDoubtAdmin('${d.doubtId}')">Post Solution</button>
        </div>
      `}
    </div>
  `).join('');
}

async function resolveDoubtAdmin(doubtId) {
  const input = document.getElementById(`sol_${doubtId}`);
  if (!input) return;
  const solution = input.value.trim();
  if (!solution) {
    showToast('Please type a solution.', 'error');
    return;
  }

  const res = await apiRequest(`/doubts/${doubtId}/resolve`, 'PUT', { solution });
  if (res.success) {
    showToast('Solution posted to student portal!', 'success');
    loadDoubtsAdmin();
  }
}

async function deleteDoubtAdmin(doubtId) {
  if (!confirm(`Permanently delete doubt ticket ${doubtId}?`)) return;

  const res = await apiRequest(`/doubts/${doubtId}`, 'DELETE');
  if (res.success) {
    showToast(res.message, 'success');
    loadDoubtsAdmin();
  } else {
    showToast(res.message || 'Error deleting doubt ticket', 'error');
  }
}

// ---- STUDENTS DIRECTORY, UNIQUE ID & INDIVIDUAL PASSWORD MANAGER ----
async function loadStudentsDirectoryAdmin() {
  const body = document.getElementById('adminStudentsBody');
  if (!body) return;

  const res = await apiRequest('/students');
  if (!res.success || !res.students || !res.students.length) {
    body.innerHTML = '<tr><td colspan="6" class="text-center text-muted text-sm">No enrolled students.</td></tr>';
    return;
  }

  body.innerHTML = res.students.map(s => `
    <tr>
      <td>
        <span class="chip chip-cyan" style="font-weight:800;">${s.studentId}</span>
      </td>
      <td><div class="font-bold">${s.name}</div><div class="text-xs text-muted">${s.email} • ${s.phone || 'N/A'}</div></td>
      <td class="text-sm">${s.course} <div class="text-xs text-muted">${s.batch || 'General Batch'}</div></td>
      <td>
        <span class="chip ${s.feeStatus === 'Paid' ? 'chip-green' : s.feeStatus === 'Partial' ? 'chip-amber' : 'chip-red'}">${s.feeStatus}</span>
        ${s.feeDueAmount ? `<div class="text-xs c-red mt-1">Due: ₹${s.feeDueAmount}</div>` : ''}
      </td>
      <td><span class="chip ${s.status === 'Active' ? 'chip-green' : 'chip-red'}">${s.status}</span></td>
      <td>
        <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
          <button class="btn btn-sm btn-grad" onclick="openEditStudentFullModal('${s.studentId}')" title="Edit full student profile info">
            <i class="fa-solid fa-user-pen"></i> Edit Info
          </button>
          <button class="btn btn-sm btn-outline" onclick="openPassResetModal('${s.studentId}', '${s.password || '1234'}')"><i class="fa-solid fa-key"></i> Pass</button>
          <button class="btn btn-sm btn-outline" onclick="openFeeEditModal('${s.studentId}', '${s.feeStatus}', ${s.feeDueAmount || 0})">Fee</button>
          <button class="btn btn-sm btn-danger" onclick="deleteStudentAdmin('${s.studentId}')" title="Delete student record permanently">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function openEditStudentFullModal(studentId) {
  const res = await apiRequest('/students/' + studentId);
  if (!res.success || !res.student) {
    showToast('Failed to load student details', 'error');
    return;
  }
  const s = res.student;

  document.getElementById('editFullStuId').value = s.studentId;
  document.getElementById('editFullStuIdDisplay').textContent = s.studentId;
  document.getElementById('editFullStuName').value = s.name || '';
  document.getElementById('editFullStuEmail').value = s.email || '';
  document.getElementById('editFullStuPhone').value = s.phone || '';
  document.getElementById('editFullStuCourse').value = s.course || '';
  document.getElementById('editFullStuBatch').value = s.batch || 'Morning Batch Alpha';
  document.getElementById('editFullStuPassword').value = s.password || '1234';
  document.getElementById('editFullStuStatus').value = s.status || 'Active';
  document.getElementById('editFullStuFeeStatus').value = s.feeStatus || 'Paid';
  document.getElementById('editFullStuFeeDue').value = s.feeDueAmount || 0;

  const modal = document.getElementById('editStudentFullModal');
  if (modal) modal.classList.remove('hidden');
}

function closeEditStudentFullModal() {
  const modal = document.getElementById('editStudentFullModal');
  if (modal) modal.classList.add('hidden');
}

async function handleSaveStudentFullEdit(e) {
  e.preventDefault();
  const studentId = document.getElementById('editFullStuId').value;
  const name = document.getElementById('editFullStuName').value.trim();
  const email = document.getElementById('editFullStuEmail').value.trim();
  const phone = document.getElementById('editFullStuPhone').value.trim();
  const course = document.getElementById('editFullStuCourse').value.trim();
  const batch = document.getElementById('editFullStuBatch').value.trim();
  const password = document.getElementById('editFullStuPassword').value.trim();
  const status = document.getElementById('editFullStuStatus').value;
  const feeStatus = document.getElementById('editFullStuFeeStatus').value;
  const feeDueAmount = Number(document.getElementById('editFullStuFeeDue').value) || 0;

  const res = await apiRequest(`/students/${studentId}`, 'PUT', {
    name,
    email,
    phone,
    course,
    batch,
    password,
    status,
    feeStatus,
    feeDueAmount
  });

  if (res.success) {
    showToast(`Student profile for ${studentId} updated live!`, 'success');
    closeEditStudentFullModal();
    loadStudentsDirectoryAdmin();
  } else {
    showToast(res.message || 'Error updating student profile', 'error');
  }
}

function openPassResetModal(studentId, currentPass) {
  const idEl = document.getElementById('passResetStudentId');
  const valEl = document.getElementById('passResetVal');

  if (idEl) idEl.value = studentId;
  if (valEl) valEl.value = currentPass || '1234';

  const modal = document.getElementById('passResetModal');
  if (modal) modal.classList.remove('hidden');
}

async function handleSavePassReset(e) {
  e.preventDefault();
  const studentId = document.getElementById('passResetStudentId').value;
  const password = document.getElementById('passResetVal').value.trim();

  if (!password) {
    showToast('Please enter a valid password.', 'error');
    return;
  }

  const res = await apiRequest(`/students/${studentId}/password`, 'PUT', { password });

  if (res.success) {
    showToast(res.message, 'success');
    closePassResetModal();
    loadStudentsDirectoryAdmin();
  } else {
    showToast(res.message || 'Error updating password', 'error');
  }
}

function closePassResetModal() {
  const modal = document.getElementById('passResetModal');
  if (modal) modal.classList.add('hidden');
}

async function deleteStudentAdmin(studentId) {
  if (!confirm(`Are you sure you want to permanently delete student ${studentId}?`)) return;

  const res = await apiRequest(`/students/${studentId}`, 'DELETE');
  if (res.success) {
    showToast(res.message, 'success');
    loadStudentsDirectoryAdmin();
  } else {
    showToast(res.message || 'Error deleting student', 'error');
  }
}

function openFeeEditModal(studentId, currentStatus, currentDue) {
  const idEl = document.getElementById('feeEditStudentId');
  const statusEl = document.getElementById('feeEditStatus');
  const dueEl = document.getElementById('feeEditDue');

  if (idEl) idEl.value = studentId;
  if (statusEl) statusEl.value = currentStatus;
  if (dueEl) dueEl.value = currentDue;

  const modal = document.getElementById('feeEditModal');
  if (modal) modal.classList.remove('hidden');
}

async function handleSaveFeeStatus(e) {
  e.preventDefault();
  const studentId = document.getElementById('feeEditStudentId').value;
  const feeStatus = document.getElementById('feeEditStatus').value;
  const feeDueAmount = Number(document.getElementById('feeEditDue').value) || 0;

  const res = await apiRequest(`/students/${studentId}/fee`, 'PUT', { feeStatus, feeDueAmount });

  if (res.success) {
    showToast('Fee status updated successfully!', 'success');
    closeFeeModal();
    loadStudentsDirectoryAdmin();
  } else {
    showToast(res.message || 'Error updating fee status', 'error');
  }
}

function closeFeeModal() {
  const modal = document.getElementById('feeEditModal');
  if (modal) modal.classList.add('hidden');
}

// Global Exports
window.handleAdminPasscodeLogin     = handleAdminPasscodeLogin;
window.logoutAdmin                  = logoutAdmin;
window.cancelAdminLogin             = cancelAdminLogin;
window.refreshAdminData             = refreshAdminData;
window.loadLiveClassesAdmin         = loadLiveClassesAdmin;
window.handleScheduleLiveClass      = handleScheduleLiveClass;
window.deleteLiveClass              = deleteLiveClass;
window.loadBatchStudentsForAttendance = loadBatchStudentsForAttendance;
window.handleBatchAttendanceSubmit  = handleBatchAttendanceSubmit;
window.loadCourseCatalogAdmin       = loadCourseCatalogAdmin;
window.openCourseFeeModal           = openCourseFeeModal;
window.handleSaveCourseFee          = handleSaveCourseFee;
window.closeCourseFeeModal          = closeCourseFeeModal;
window.updateAppStatus              = updateAppStatus;
window.deleteAdmissionApp           = deleteAdmissionApp;
window.onPerfBatchChange            = onPerfBatchChange;
window.addCustomSubjectInput        = addCustomSubjectInput;
window.recalcTotalPerfMarks         = recalcTotalPerfMarks;
window.handleAddPerformance         = handleAddPerformance;
window.loadAllPerformanceReportsAdmin = loadAllPerformanceReportsAdmin;
window.openEditPerfModal            = openEditPerfModal;
window.closeEditPerfModal           = closeEditPerfModal;
window.handleSavePerfEdit           = handleSavePerfEdit;
window.deletePerformanceAdmin       = deletePerformanceAdmin;
window.handlePostNotice             = handlePostNotice;
window.deleteNotice                 = deleteNotice;
window.resolveDoubtAdmin            = resolveDoubtAdmin;
window.deleteDoubtAdmin             = deleteDoubtAdmin;
window.deleteStudentAdmin           = deleteStudentAdmin;
window.openEditStudentFullModal    = openEditStudentFullModal;
window.closeEditStudentFullModal   = closeEditStudentFullModal;
window.handleSaveStudentFullEdit   = handleSaveStudentFullEdit;
window.openPassResetModal           = openPassResetModal;
window.handleSavePassReset          = handleSavePassReset;
window.closePassResetModal          = closePassResetModal;
window.openFeeEditModal             = openFeeEditModal;
window.handleSaveFeeStatus          = handleSaveFeeStatus;
window.closeFeeModal                = closeFeeModal;


