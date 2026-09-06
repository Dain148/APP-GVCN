(() => {
  'use strict';

  function getState() {
    return window.state || {};
  }

  function getStudents() {
    const value = getState().students;
    return Array.isArray(value) ? value : [];
  }

  function getAttendanceIssues(studentId) {
    const records = getState().attendanceRecords || {};
    let late = 0;
    let unexcused = 0;

    Object.values(records).forEach(day => {
      if (!day || typeof day !== 'object') return;
      const status = day[studentId];
      if (status === 'late') late += 1;
      if (status === 'unexcused') unexcused += 1;
    });

    return { late, unexcused };
  }

  function recentPoints(student) {
    if (!Array.isArray(student?.history)) return 0;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    return student.history.reduce((sum, item) => {
      const time = item?.date ? new Date(item.date).getTime() : NaN;
      if (!Number.isFinite(time) || now - time < 0 || now - time > sevenDays) return sum;
      const points = Number(item?.points);
      return Number.isFinite(points) ? sum + points : sum;
    }, 0);
  }

  function buildSignals(student) {
    const attendance = getAttendanceIssues(student?.id);
    const progress = recentPoints(student);
    const reasons = [];

    if (attendance.unexcused >= 2) {
      reasons.push(`Vắng không phép: ${attendance.unexcused}`);
    }
    if (attendance.late >= 3) {
      reasons.push(`Đi muộn: ${attendance.late}`);
    }
    if (progress < 0) {
      reasons.push(`Điểm thi đua 7 ngày: ${progress}`);
    }

    return { attendance, progress, reasons };
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderAttention() {
    const host = document.getElementById('gvcn-dashboard-attention-live');
    if (!host) return;

    const flagged = getStudents()
      .map(student => ({ student, ...buildSignals(student) }))
      .filter(item => item.reasons.length > 0)
      .sort((a, b) => {
        if (b.attendance.unexcused !== a.attendance.unexcused) {
          return b.attendance.unexcused - a.attendance.unexcused;
        }
        if (b.attendance.late !== a.attendance.late) {
          return b.attendance.late - a.attendance.late;
        }
        return a.progress - b.progress;
      });

    if (!flagged.length) {
      host.innerHTML = `
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div class="font-bold text-emerald-800">Không có tín hiệu cần xem lại</div>
          <div class="mt-1 text-sm text-emerald-700">Dựa trên chuyên cần và biến động điểm thi đua thực tế hiện có.</div>
        </div>`;
      return;
    }

    host.innerHTML = `
      <div class="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <div class="font-bold text-slate-800">Tín hiệu cần GVCN xem lại</div>
            <div class="text-sm text-slate-500 mt-1">Chỉ dựa trên dữ liệu chuyên cần và điểm thi đua đã có.</div>
          </div>
          <div class="rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-700">${flagged.length}</div>
        </div>
        <div class="space-y-3">
          ${flagged.slice(0, 8).map(({ student, reasons }) => `
            <button type="button" class="w-full text-left rounded-xl bg-white border border-slate-100 p-4 hover:shadow-sm transition" onclick="window.MATHAIGVCNAttentionOpen && window.MATHAIGVCNAttentionOpen(${JSON.stringify(student?.id ?? '')})">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-slate-800">${esc(student?.name || 'Chưa có tên')}</div>
                  <div class="text-xs text-slate-500 mt-1">${reasons.map(esc).join(' · ')}</div>
                </div>
                <span class="text-xs font-medium text-amber-700">Xem học sinh</span>
              </div>
            </button>`).join('')}
        </div>
        ${flagged.length > 8 ? `<div class="text-xs text-slate-500 mt-3">Hiển thị 8 học sinh đầu tiên theo mức độ cần xem lại.</div>` : ''}
      </div>`;
  }

  function install() {
    const root = document.getElementById('gvcn-dashboard-live');
    if (!root) return false;

    if (!document.getElementById('gvcn-dashboard-attention-live')) {
      root.insertAdjacentHTML('beforeend', '<div id="gvcn-dashboard-attention-live" class="mt-6"></div>');
    }

    window.MATHAIGVCNAttentionOpen = function (id) {
      if (typeof window.openEditStudentModal === 'function') {
        window.openEditStudentModal(id);
      } else if (typeof window.switchTab === 'function') {
        window.switchTab('hoc-sinh');
      }
    };

    renderAttention();

    if (typeof window.renderLayout === 'function' && !window.renderLayout.__mathaiAttention) {
      const originalRenderLayout = window.renderLayout;
      window.renderLayout = function () {
        const result = originalRenderLayout.apply(this, arguments);
        setTimeout(renderAttention, 0);
        return result;
      };
      window.renderLayout.__mathaiAttention = true;
    }

    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (install() || attempts >= 120) clearInterval(timer);
  }, 50);
})();
