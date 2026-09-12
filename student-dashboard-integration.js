(function () {
  'use strict';

  function getStudents() {
    if (Array.isArray(window.state?.students) && window.state.students.length) {
      return window.state.students;
    }

    try {
      const saved = localStorage.getItem('chuyen_tau_data');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed?.students)) return parsed.students;
    } catch (error) {
      console.warn('[StudentDashboardIntegration] Cannot read local data.', error);
    }

    return [];
  }

  function hydrateSharedState(students) {
    if (!Array.isArray(students) || !students.length) return;
    window.state = window.state || {};
    if (!Array.isArray(window.state.students) || !window.state.students.length) {
      window.state.students = students;
    }
  }

  function studentLabel(student, index) {
    return student.name || student.fullName || student.hoTen || student.code || student.studentId || `Học sinh ${index + 1}`;
  }

  function openDashboard() {
    if (!window.StudentDashboard) {
      alert('Student Dashboard chưa được tải. Vui lòng tải lại trang.');
      return;
    }

    let modal = document.getElementById('student-dashboard-integration-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'student-dashboard-integration-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
      modal.innerHTML = `
        <div style="background:#f8fafc;width:min(1100px,100%);max-height:92vh;overflow:auto;border-radius:20px;box-shadow:0 25px 60px rgba(0,0,0,.25);position:relative;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:#1e1b4b;color:white;position:sticky;top:0;z-index:2;">
            <strong>Hồ sơ học tập học sinh</strong>
            <button id="student-dashboard-close" style="font-size:24px;line-height:1;background:transparent;border:0;color:white;cursor:pointer">×</button>
          </div>
          <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;background:white;">
            <label for="student-dashboard-selector" style="font-weight:700;display:block;margin-bottom:8px">Chọn học sinh</label>
            <select id="student-dashboard-selector" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;background:white"></select>
          </div>
          <div id="student-dashboard-integration-content" style="padding:20px"></div>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById('student-dashboard-close').onclick = () => modal.remove();
      modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    }

    const students = getStudents();
    hydrateSharedState(students);

    const selector = document.getElementById('student-dashboard-selector');
    const content = document.getElementById('student-dashboard-integration-content');
    selector.innerHTML = '';

    if (!students.length) {
      selector.innerHTML = '<option value="">Chưa có dữ liệu học sinh</option>';
      content.innerHTML = '<div style="padding:30px;text-align:center;color:#64748b">Chưa có dữ liệu học sinh trong hệ thống.</div>';
      return;
    }

    students.forEach((student, index) => {
      const option = document.createElement('option');
      option.value = String(student.id ?? student.code ?? student.studentId ?? index);
      option.textContent = studentLabel(student, index);
      selector.appendChild(option);
    });

    function renderSelected() {
      const selected = students.find((student, index) => String(student.id ?? student.code ?? student.studentId ?? index) === selector.value) || students[0];
      const key = selected.id ?? selected.code ?? selected.studentId ?? students.indexOf(selected);

      try {
        const html = window.StudentDashboard.render(key);
        content.innerHTML = html || '<div>Không có dữ liệu hiển thị.</div>';
      } catch (error) {
        console.error('[StudentDashboardIntegration] Render error:', error);
        content.innerHTML = '<div style="padding:30px;text-align:center;color:#b91c1c">Không thể hiển thị hồ sơ học tập. Vui lòng mở Console để kiểm tra lỗi.</div>';
      }
    }

    selector.onchange = renderSelected;
    renderSelected();
  }

  function mountButton() {
    if (document.getElementById('student-dashboard-integration-button')) return;
    const button = document.createElement('button');
    button.id = 'student-dashboard-integration-button';
    button.type = 'button';
    button.textContent = '📊 Hồ sơ học tập';
    button.title = 'Mở hồ sơ học tập học sinh';
    button.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:999px;padding:12px 18px;background:#1e1b4b;color:white;font:700 14px Quicksand,sans-serif;box-shadow:0 8px 24px rgba(30,27,75,.3);cursor:pointer;';
    button.onclick = openDashboard;
    document.body.appendChild(button);
  }

  function init() {
    if (document.body) mountButton();
    else document.addEventListener('DOMContentLoaded', mountButton, { once: true });
  }

  init();
  window.StudentDashboardIntegration = { open: openDashboard, mount: mountButton, getStudents };
})();
