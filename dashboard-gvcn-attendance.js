/* MATH-AI / APP-GVCN — Real attendance layer for GVCN Dashboard
 * Uses only the existing state.attendanceRecords data. No fake academic scores.
 */
(function () {
  'use strict';

  const students = () => Array.isArray(window.state?.students) ? window.state.students : [];
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function attendanceSummary() {
    const records = window.state?.attendanceRecords || {};
    let present = 0, late = 0, excused = 0, unexcused = 0;
    Object.values(records).forEach(day => {
      Object.values(day || {}).forEach(status => {
        if (status === 'present') present++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;
        else if (status === 'unexcused') unexcused++;
      });
    });
    const marked = present + late + excused + unexcused;
    const attendanceRate = marked ? ((present + late) / marked) * 100 : null;
    return { present, late, excused, unexcused, marked, attendanceRate };
  }

  function renderAttendance() {
    const root = document.getElementById('gvcn-dashboard-live');
    if (!root) return;

    const old = document.getElementById('gvcn-real-attendance');
    if (old) old.remove();

    const s = attendanceSummary();
    const box = document.createElement('div');
    box.id = 'gvcn-real-attendance';
    box.className = 'bg-white rounded-[1.75rem] border border-slate-200 p-5 shadow-sm';
    box.innerHTML = `
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <i class="ph-fill ph-calendar-check text-xl text-emerald-500"></i>
            <h4 class="font-black text-slate-800">Chuyên cần thực tế</h4>
          </div>
          <p class="text-xs text-slate-400 mt-1">Tính trực tiếp từ dữ liệu điểm danh đã lưu, không tạo dữ liệu giả.</p>
        </div>
        <div class="text-right">
          <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">TỶ LỆ CÓ MẶT</div>
          <div class="text-2xl font-black text-emerald-600">${s.attendanceRate === null ? '—' : s.attendanceRate.toFixed(1) + '%'}</div>
          <div class="text-[9px] font-semibold text-slate-400">${s.marked ? s.marked + ' lượt điểm danh' : 'Chưa có dữ liệu'}</div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div class="rounded-2xl bg-emerald-50 p-3"><div class="text-[9px] font-black uppercase text-emerald-500">Có mặt</div><div class="text-xl font-black text-emerald-700 mt-1">${s.present}</div></div>
        <div class="rounded-2xl bg-amber-50 p-3"><div class="text-[9px] font-black uppercase text-amber-500">Đi muộn</div><div class="text-xl font-black text-amber-700 mt-1">${s.late}</div></div>
        <div class="rounded-2xl bg-blue-50 p-3"><div class="text-[9px] font-black uppercase text-blue-500">Vắng P</div><div class="text-xl font-black text-blue-700 mt-1">${s.excused}</div></div>
        <div class="rounded-2xl bg-red-50 p-3"><div class="text-[9px] font-black uppercase text-red-500">Vắng KP</div><div class="text-xl font-black text-red-700 mt-1">${s.unexcused}</div></div>
      </div>`;

    const statsGrid = root.querySelector('.grid.grid-cols-2.lg\\:grid-cols-4');
    if (statsGrid) statsGrid.insertAdjacentElement('afterend', box);
    else root.querySelector('section')?.prepend(box);
  }

  function install() {
    if (typeof window.renderLayout !== 'function' || window.renderLayout.__mathaiAttendance) return false;
    const original = window.renderLayout;
    window.renderLayout = function () {
      const result = original.apply(this, arguments);
      setTimeout(renderAttendance, 0);
      return result;
    };
    window.renderLayout.__mathaiAttendance = true;
    setTimeout(renderAttendance, 0);
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (install() || attempts >= 120) clearInterval(timer);
  }, 50);
})();
