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

// ---- PUBLISH PERFORMANCE REPORT ----
async function handleAddPerformance(e) {
  e.preventDefault();
  const studentId = document.getElementById('perfStudentId').value.trim();
  const examTitle = document.getElementById('perfExamTitle').value.trim();
  const date = document.getElementById('perfDate').value;
  const totalScore = Number(document.getElementById('perfTotalScore').value);
  const maxMarks = Number(document.getElementById('perfMaxMarks').value) || 100;
  const physics = Number(document.getElementById('perfPhysics').value) || 0;
  const chemistry = Number(document.getElementById('perfChemistry').value) || 0;
  const maths = Number(document.getElementById('perfMaths').value) || 0;
  const rank = Number(document.getElementById('perfRank').value) || 1;
  const percentile = Number(document.getElementById('perfPercentile').value) || 95;
  const remarks = document.getElementById('perfRemarks').value.trim();
  const classParticipation = Number(document.getElementById('perfParticipation').value) || 85;

  if (!studentId || !examTitle || isNaN(totalScore)) {
    showToast('Student ID, Exam Title, and Total Score are required.', 'error');
    return;
  }

  const payload = {
    studentId,
    examTitle,
    date,
    totalScore,
    maxMarks,
    subjectBreakdown: { Physics: physics, Chemistry: chemistry, Mathematics: maths },
    rank,
    percentile,
    remarks,
    classParticipation
  };

  const res = await apiRequest('/performance/add', 'POST', payload);

  if (res.success) {
    showToast('Exam performance & 100-point index published to student portal!', 'success');
    document.getElementById('perfForm').reset();
  } else {
    showToast(res.message || 'Error publishing report', 'error');
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
        <div class="text-xs c-gold mt-1" style="font-weight:700;"><i class="fa-solid fa-key"></i> Pass: ${s.password || '1234'}</div>
      </td>
      <td><div class="font-bold">${s.name}</div><div class="text-xs text-muted">${s.email}</div></td>
      <td class="text-sm">${s.course}</td>
      <td>
        <span class="chip ${s.feeStatus === 'Paid' ? 'chip-green' : s.feeStatus === 'Partial' ? 'chip-amber' : 'chip-red'}">${s.feeStatus}</span>
        ${s.feeDueAmount ? `<div class="text-xs c-red mt-1">Due: ₹${s.feeDueAmount}</div>` : ''}
      </td>
      <td><span class="chip chip-green">${s.status}</span></td>
      <td>
        <div style="display:flex;gap:0.4rem;align-items:center;">
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
window.handleAddPerformance         = handleAddPerformance;
window.handlePostNotice             = handlePostNotice;
window.deleteNotice                 = deleteNotice;
window.resolveDoubtAdmin            = resolveDoubtAdmin;
window.deleteDoubtAdmin             = deleteDoubtAdmin;
window.deleteStudentAdmin           = deleteStudentAdmin;
window.openPassResetModal           = openPassResetModal;
window.handleSavePassReset          = handleSavePassReset;
window.closePassResetModal          = closePassResetModal;
window.openFeeEditModal             = openFeeEditModal;
window.handleSaveFeeStatus          = handleSaveFeeStatus;
window.closeFeeModal                = closeFeeModal;
