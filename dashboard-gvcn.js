/* MATH-AI / APP-GVCN — GVCN Dashboard
 * Safe extension: preserves the existing app and augments only the Tong quan view.
 */
(function () {
  'use strict';

  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const students = () => Array.isArray(window.state?.students) ? window.state.students : [];
  const n = value => {
    const x = Number(value);
    return Number.isFinite(x) ? x : null;
  };

  function academicAverage(student) {
    const directKeys = ['average', 'avg', 'averageScore', 'gpa', 'diemTB', 'diemTrungBinh', 'scoreAverage'];
    for (const key of directKeys) {
      const value = n(student?.[key]);
      if (value !== null && value >= 0 && value <= 10) return value;
    }

    const containers = [student?.scores, student?.grades, student?.diem, student?.subjects];
    for (const source of containers) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
      const values = [];
      Object.values(source).forEach(value => {
        if (typeof value === 'number' || typeof value === 'string') {
          const x = n(value);
          if (x !== null && x >= 0 && x <= 10) values.push(x);
        } else if (value && typeof value === 'object') {
          Object.values(value).forEach(item => {
            const x = n(item);
            if (x !== null && x >= 0 && x <= 10) values.push(x);
          });
        }
      });
      if (values.length) return values.reduce((a, b) => a + b, 0) / values.length;
    }
    return null;
  }

  function subjectAverages() {
    const totals = {};
    students().forEach(student => {
      const source = student?.subjects || student?.scores || student?.grades || student?.diem;
      if (!source || typeof source !== 'object' || Array.isArray(source)) return;
      Object.entries(source).forEach(([subject, value]) => {
        const values = [];
        if (typeof value === 'number' || typeof value === 'string') {
          const x = n(value);
          if (x !== null && x >= 0 && x <= 10) values.push(x);
        } else if (value && typeof value === 'object') {
          Object.values(value).forEach(item => {
            const x = n(item);
            if (x !== null && x >= 0 && x <= 10) values.push(x);
          });
        }
        if (values.length) {
          if (!totals[subject]) totals[subject] = [];
          totals[subject].push(...values);
        }
      });
    });
    return Object.entries(totals)
      .map(([name, values]) => ({ name, avg: values.reduce((a, b) => a + b, 0) / values.length }))
      .sort((a, b) => b.avg - a.avg);
  }

  function recentProgress(student) {
    const history = Array.isArray(student?.history) ? student.history : [];
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return history.reduce((sum, item) => {
      const date = new Date(item?.date || 0).getTime();
      const points = n(item?.points) || 0;
      return date >= since ? sum + points : sum;
    }, 0);
  }

  function attendanceFlags(student) {
    const records = window.state?.attendanceRecords || {};
    let late = 0, unexcused = 0;
    Object.values(records).forEach(day => {
      if (day?.[student?.id] === 'late') late++;
      if (day?.[student?.id] === 'unexcused') unexcused++;
    });
    return { late, unexcused };
  }

  function attentionStudents() {
    return students().filter(student => {
      const avg = academicAverage(student);
      const attendance = attendanceFlags(student);
      if (avg !== null && avg < 5) return true;
      return attendance.unexcused >= 2 || attendance.late >= 3;
    });
  }

  function renderStat(icon, tone, label, value, note) {
    const tones = {
      blue: 'bg-blue-50 text-blue-500',
      emerald: 'bg-emerald-50 text-emerald-500',
      amber: 'bg-amber-50 text-amber-500',
      red: 'bg-red-50 text-red-500'
    };
    return `<div class="bg-white rounded-[1.5rem] p-5 border border-slate-200 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl ${tones[tone] || tones.blue} flex items-center justify-center"><i class="ph-fill ${icon} text-xl"></i></div>
        <div class="min-w-0">
          <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">${label}</div>
          <div class="text-2xl font-black text-slate-900 leading-none mt-1">${value}</div>
          <div class="text-[9px] font-semibold text-slate-400 mt-1 truncate">${esc(note)}</div>
        </div>
      </div>
    </div>`;
  }

  function renderDashboard() {
    const root = document.getElementById('gvcn-dashboard-live');
    if (!root) return;

    const all = students();
    const academicScores = all.map(academicAverage).filter(value => value !== null);
    const classAverage = academicScores.length
      ? academicScores.reduce((a, b) => a + b, 0) / academicScores.length
      : null;
    const progressList = all.map(student => ({ student, progress: recentProgress(student) }))
      .filter(item => item.progress > 0)
      .sort((a, b) => b.progress - a.progress);
    const attention = attentionStudents();
    const subjects = subjectAverages();

    root.innerHTML = `<section class="mt-6 space-y-5" aria-label="Dashboard lớp học">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <div class="text-[10px] font-black text-blueAccent uppercase tracking-[0.2em] mb-1">GVCN DASHBOARD</div>
          <h3 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Toàn cảnh lớp học</h3>
          <p class="text-sm text-slate-500 font-medium mt-1">Tổng hợp nhanh sĩ số, kết quả học tập, tiến bộ và học sinh cần quan tâm.</p>
        </div>
        <div class="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-4 py-2 rounded-xl">Dữ liệu lớp hiện tại</div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${renderStat('ph-users', 'blue', 'TỔNG HỌC SINH', all.length, 'Sĩ số hiện tại')}
        ${renderStat('ph-chart-line-up', 'emerald', 'ĐIỂM TRUNG BÌNH', classAverage === null ? '—' : classAverage.toFixed(2), classAverage === null ? 'Chưa có dữ liệu học tập' : 'Thang điểm 10')}
        ${renderStat('ph-lightning', 'amber', 'HS TIẾN BỘ', progressList.length, 'Tăng điểm trong 7 ngày gần nhất')}
        ${renderStat('ph-warning-circle', 'red', 'HS CẦN CHÚ Ý', attention.length, 'Theo điểm học tập / chuyên cần')}
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div class="xl:col-span-2 bg-white rounded-[1.75rem] border border-slate-200 p-5 shadow-sm">
          <div class="flex justify-between items-center mb-5">
            <div><h4 class="font-black text-slate-800">Thống kê theo môn</h4><p class="text-xs text-slate-400 mt-1">Tự đọc dữ liệu điểm nếu hồ sơ có lưu</p></div>
            <i class="ph-fill ph-chart-bar text-xl text-blueAccent"></i>
          </div>
          <div class="space-y-4">
            ${subjects.length ? subjects.slice(0, 8).map(item => `<div>
              <div class="flex justify-between text-xs font-bold text-slate-600 mb-1.5"><span>${esc(item.name)}</span><span>${item.avg.toFixed(2)}</span></div>
              <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blueAccent rounded-full" style="width:${Math.min(100, item.avg * 10)}%"></div></div>
            </div>`).join('') : `<div class="py-10 text-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-2xl">Chưa có dữ liệu điểm theo môn trong hồ sơ học sinh.</div>`}
          </div>
        </div>

        <div class="xl:col-span-3 bg-white rounded-[1.75rem] border border-slate-200 p-5 shadow-sm">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div><h4 class="font-black text-slate-800">Danh sách học sinh</h4><p class="text-xs text-slate-400 mt-1">Tìm kiếm · sắp xếp · mở hồ sơ</p></div>
            <div class="flex gap-2 w-full md:w-auto">
              <input id="gvcn-student-search" oninput="window.MATHAIGVCNFilter && window.MATHAIGVCNFilter()" placeholder="Tìm học sinh..." class="flex-1 md:w-48 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-blueAccent">
              <select id="gvcn-student-sort" onchange="window.MATHAIGVCNFilter && window.MATHAIGVCNFilter()" class="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none">
                <option value="name">Tên A-Z</option>
                <option value="points">Điểm thi đua</option>
                <option value="average">Điểm TB</option>
                <option value="progress">Tiến bộ 7 ngày</option>
              </select>
            </div>
          </div>
          <div id="gvcn-student-list" class="space-y-2 max-h-[430px] overflow-y-auto custom-scrollbar"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-white rounded-[1.75rem] border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4"><div><h4 class="font-black text-slate-800">Tiến bộ nổi bật</h4><p class="text-xs text-slate-400 mt-1">Dựa trên lịch sử cộng/trừ điểm 7 ngày gần nhất</p></div><i class="ph-fill ph-lightning text-xl text-amber-500"></i></div>
          <div class="space-y-2">${progressList.length ? progressList.slice(0, 5).map((item, index) => `<button onclick="window.MATHAIGVCNOpenStudent(${JSON.stringify(item.student.id)})" class="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all text-left">
            <div class="w-7 text-center text-xs font-black text-slate-300">${index + 1}</div>
            <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">${typeof window.getAvatarImg === 'function' ? window.getAvatarImg(item.student.avatarUrl, item.student.name, 'w-10 h-10') : ''}</div>
            <div class="flex-1 min-w-0"><div class="font-black text-sm text-slate-800 truncate">${esc(item.student.name)}</div><div class="text-[10px] text-slate-400 font-bold">${esc(item.student.group || 'Chưa nhóm')}</div></div>
            <div class="font-black text-emerald-600">${item.progress > 0 ? '+' : ''}${item.progress}</div>
          </button>`).join('') : `<div class="py-8 text-center text-slate-400 text-sm">Chưa có phát sinh điểm trong 7 ngày gần nhất.</div>`}</div>
        </div>

        <div class="bg-white rounded-[1.75rem] border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4"><div><h4 class="font-black text-slate-800">Học sinh cần chú ý</h4><p class="text-xs text-slate-400 mt-1">Ưu tiên kiểm tra học tập và chuyên cần</p></div><i class="ph-fill ph-warning-circle text-xl text-red-500"></i></div>
          <div class="space-y-2">${attention.length ? attention.slice(0, 6).map(student => {
            const avg = academicAverage(student);
            const attendance = attendanceFlags(student);
            const reason = avg !== null && avg < 5 ? `Điểm TB ${avg.toFixed(2)}` : `${attendance.unexcused} vắng KP · ${attendance.late} lần muộn`;
            return `<button onclick="window.MATHAIGVCNOpenStudent(${JSON.stringify(student.id)})" class="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-red-50/50 hover:border-red-200 transition-all text-left">
              <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">${typeof window.getAvatarImg === 'function' ? window.getAvatarImg(student.avatarUrl, student.name, 'w-10 h-10') : ''}</div>
              <div class="flex-1 min-w-0"><div class="font-black text-sm text-slate-800 truncate">${esc(student.name)}</div><div class="text-[10px] text-red-400 font-bold">${esc(reason)}</div></div>
              <i class="ph-bold ph-caret-right text-slate-300"></i>
            </button>`;
          }).join('') : `<div class="py-8 text-center text-slate-400 text-sm">Chưa phát hiện trường hợp cần chú ý.</div>`}</div>
        </div>
      </div>
    </section>`;

    window.MATHAIGVCNFilter();
  }

  window.MATHAIGVCNFilter = function () {
    const box = document.getElementById('gvcn-student-list');
    if (!box) return;
    const query = (document.getElementById('gvcn-student-search')?.value || '').toLowerCase().trim();
    const sort = document.getElementById('gvcn-student-sort')?.value || 'name';
    let list = students().filter(student => String(student.name || '').toLowerCase().includes(query));

    if (sort === 'points') list.sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
    else if (sort === 'average') list.sort((a, b) => (academicAverage(b) ?? -1) - (academicAverage(a) ?? -1));
    else if (sort === 'progress') list.sort((a, b) => recentProgress(b) - recentProgress(a));
    else list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));

    box.innerHTML = list.length ? list.map((student, index) => {
      const avg = academicAverage(student);
      const progress = recentProgress(student);
      const points = Number(student.points) || 0;
      return `<button onclick="window.MATHAIGVCNOpenStudent(${JSON.stringify(student.id)})" class="w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
        <div class="w-7 text-center text-xs font-black text-slate-300">${index + 1}</div>
        <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">${typeof window.getAvatarImg === 'function' ? window.getAvatarImg(student.avatarUrl, student.name, 'w-10 h-10') : ''}</div>
        <div class="flex-1 min-w-0"><div class="font-black text-sm text-slate-800 truncate">${esc(student.name)}</div><div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${esc(student.group || 'Chưa nhóm')}</div></div>
        <div class="text-right"><div class="font-black text-sm text-blueAccent">${avg === null ? '—' : avg.toFixed(2)}</div><div class="text-[9px] text-slate-400 font-bold">TB · ${points}đ</div>${progress !== 0 ? `<div class="text-[9px] font-black ${progress > 0 ? 'text-emerald-500' : 'text-red-500'}">${progress > 0 ? '+' : ''}${progress}/7 ngày</div>` : ''}</div>
      </button>`;
    }).join('') : `<div class="py-12 text-center text-slate-400 text-sm font-medium">Không tìm thấy học sinh.</div>`;
  };

  window.MATHAIGVCNOpenStudent = function (id) {
    if (typeof window.openEditStudentModal === 'function') return window.openEditStudentModal(id);
    if (typeof window.switchTab === 'function') window.switchTab('hoc-sinh');
  };

  function install() {
    if (typeof window.renderViewTongQuan !== 'function' || window.renderViewTongQuan.__mathaiDashboard) return false;
    const original = window.renderViewTongQuan;

    window.renderViewTongQuan = function () {
      const html = original.apply(this, arguments);
      if (html.includes('id="gvcn-dashboard-live"')) return html;

      // Stable marker from the original Tong quan view: dashboard sits between stats and quick actions.
      const marker = '                    <!-- Hành động nhanh -->';
      const index = html.indexOf(marker);
      if (index === -1) return html;

      return html.slice(0, index)
        + '                    <div id="gvcn-dashboard-live"></div>\n                    '
        + html.slice(index);
    };

    window.renderViewTongQuan.__mathaiDashboard = true;
    return true;
  }

  let attempts = 0;
  const installer = setInterval(() => {
    attempts++;
    if (install()) {
      clearInterval(installer);
      if (typeof window.renderLayout === 'function') window.renderLayout();
      setTimeout(renderDashboard, 50);
    }
    if (attempts >= 120) clearInterval(installer);
  }, 50);

  const observer = new MutationObserver(() => {
    if (document.getElementById('gvcn-dashboard-live')) renderDashboard();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
