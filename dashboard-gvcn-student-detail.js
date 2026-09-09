(() => {
  'use strict';

  const students = () => Array.isArray(window.state?.students) ? window.state.students : [];
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const num = value => { const n = Number(value); return Number.isFinite(n) ? n : 0; };

  function findStudent(id) {
    return students().find(student => String(student?.id) === String(id));
  }

  function attendance(studentId) {
    const records = window.state?.attendanceRecords || {};
    const result = { present: 0, late: 0, excused: 0, unexcused: 0 };
    Object.values(records).forEach(day => {
      const status = day?.[studentId];
      if (status === 'present') result.present++;
      else if (status === 'late') result.late++;
      else if (status === 'excused') result.excused++;
      else if (status === 'unexcused') result.unexcused++;
    });
    result.marked = result.present + result.late + result.excused + result.unexcused;
    result.rate = result.marked ? ((result.present + result.late) / result.marked) * 100 : null;
    return result;
  }

  function history(student) {
    return (Array.isArray(student?.history) ? student.history : [])
      .map((item, index) => ({ item, index, points: num(item?.points), time: new Date(item?.date || 0).getTime() }))
      .filter(x => Number.isFinite(x.time))
      .sort((a, b) => b.time - a.time);
  }

  function progress7(student) {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return history(student).filter(x => x.time >= since).reduce((sum, x) => sum + x.points, 0);
  }

  function academicAverage(student) {
    const keys = ['average', 'avg', 'averageScore', 'gpa', 'diemTB', 'diemTrungBinh', 'scoreAverage'];
    for (const key of keys) {
      const value = Number(student?.[key]);
      if (Number.isFinite(value) && value >= 0 && value <= 10) return value;
    }
    return null;
  }

  function close() {
    document.getElementById('gvcn-student-detail-overlay')?.remove();
    document.body.style.overflow = '';
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-mathai-src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.dataset.mathaiSrc = src;
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function mountAIRecommendation(studentId) {
    const slot = document.getElementById('student-ai-recommendation-slot');
    if (!slot) return;
    try {
      await loadScriptOnce('./student-ai-recommendation.js');
      await loadScriptOnce('./student-dashboard.js');
      const student = findStudent(studentId);
      if (!student) return;

      if (window.StudentAIRecommendation?.render) {
        slot.innerHTML = window.StudentAIRecommendation.render(student.id);
      } else {
        slot.innerHTML = '<div class="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">Chưa tải được AI Recommendation.</div>';
      }
    } catch (error) {
      console.warn('[StudentDetail] AI Recommendation unavailable.', error);
      slot.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">AI Recommendation tạm thời chưa sẵn sàng.</div>';
    }
  }

  function open(id) {
    const student = findStudent(id);
    if (!student) return;

    close();
    const a = attendance(student.id);
    const h = history(student);
    const p7 = progress7(student);
    const avg = academicAverage(student);

    const overlay = document.createElement('div');
    overlay.id = 'gvcn-student-detail-overlay';
    overlay.className = 'fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 md:p-6';
    overlay.innerHTML = `
      <div class="w-full max-w-5xl max-h-[94vh] overflow-hidden bg-slate-50 rounded-[2rem] shadow-2xl border border-white/20" role="dialog" aria-modal="true" aria-label="Hồ sơ học sinh">
        <div class="bg-gradient-to-r from-primary to-secondary text-white p-5 md:p-7">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-4 min-w-0">
              <div class="w-16 h-16 rounded-2xl bg-white/15 overflow-hidden flex-shrink-0 flex items-center justify-center">
                ${typeof window.getAvatarImg === 'function' ? window.getAvatarImg(student.avatarUrl, student.name, 'w-16 h-16') : `<span class="text-2xl font-black">${esc((student.name || '?').charAt(0))}</span>`}
              </div>
              <div class="min-w-0">
                <div class="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">HỒ SƠ HỌC SINH</div>
                <h2 class="text-2xl md:text-3xl font-black truncate mt-1">${esc(student.name || 'Chưa có tên')}</h2>
                <div class="flex flex-wrap gap-2 mt-2 text-xs font-bold text-white/75">
                  <span>${esc(student.code ? `Mã HS: ${student.code}` : 'Chưa có mã HS')}</span>
                  <span>•</span><span>${esc(student.group || 'Chưa phân tổ')}</span>
                </div>
              </div>
            </div>
            <button type="button" data-close class="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl" aria-label="Đóng"><i class="ph-bold ph-x"></i></button>
          </div>
        </div>

        <div class="overflow-y-auto max-h-[calc(94vh-145px)] custom-scrollbar p-4 md:p-6 space-y-5">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="bg-white rounded-2xl border border-slate-200 p-4"><div class="text-[9px] font-black uppercase tracking-widest text-slate-400">Điểm thi đua</div><div class="text-2xl font-black text-slate-900 mt-1">${num(student.points)}</div></div>
            <div class="bg-white rounded-2xl border border-slate-200 p-4"><div class="text-[9px] font-black uppercase tracking-widest text-slate-400">Biến động 7 ngày</div><div class="text-2xl font-black ${p7 >= 0 ? 'text-emerald-600' : 'text-red-600'} mt-1">${p7 > 0 ? '+' : ''}${p7}</div></div>
            <div class="bg-white rounded-2xl border border-slate-200 p-4"><div class="text-[9px] font-black uppercase tracking-widest text-slate-400">Chuyên cần</div><div class="text-2xl font-black text-blue-600 mt-1">${a.rate === null ? '—' : a.rate.toFixed(1) + '%'}</div></div>
            <div class="bg-white rounded-2xl border border-slate-200 p-4"><div class="text-[9px] font-black uppercase tracking-widest text-slate-400">Điểm TB</div><div class="text-2xl font-black text-slate-900 mt-1">${avg === null ? '—' : avg.toFixed(2)}</div><div class="text-[9px] text-slate-400 mt-1">${avg === null ? 'Chưa có dữ liệu học tập' : 'Dữ liệu có trong hồ sơ'}</div></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div class="lg:col-span-2 bg-white rounded-[1.5rem] border border-slate-200 p-5">
              <div class="flex items-center justify-between mb-4"><div><h3 class="font-black text-slate-800">Thống kê chuyên cần</h3><p class="text-xs text-slate-400 mt-1">Toàn bộ lượt điểm danh đã lưu</p></div><i class="ph-fill ph-calendar-check text-xl text-emerald-500"></i></div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="rounded-xl bg-emerald-50 p-3"><div class="text-[9px] font-black text-emerald-500 uppercase">Có mặt</div><div class="text-xl font-black text-emerald-700 mt-1">${a.present}</div></div>
                <div class="rounded-xl bg-amber-50 p-3"><div class="text-[9px] font-black text-amber-500 uppercase">Đi muộn</div><div class="text-xl font-black text-amber-700 mt-1">${a.late}</div></div>
                <div class="rounded-xl bg-blue-50 p-3"><div class="text-[9px] font-black text-blue-500 uppercase">Vắng P</div><div class="text-xl font-black text-blue-700 mt-1">${a.excused}</div></div>
                <div class="rounded-xl bg-red-50 p-3"><div class="text-[9px] font-black text-red-500 uppercase">Vắng KP</div><div class="text-xl font-black text-red-700 mt-1">${a.unexcused}</div></div>
              </div>
            </div>

            <div class="bg-white rounded-[1.5rem] border border-slate-200 p-5">
              <h3 class="font-black text-slate-800">Thông tin lớp</h3>
              <div class="mt-4 space-y-3 text-sm">
                <div class="flex justify-between gap-3"><span class="text-slate-400">Tổ</span><b class="text-slate-700">${esc(student.group || '—')}</b></div>
                <div class="flex justify-between gap-3"><span class="text-slate-400">Vai trò</span><b class="text-slate-700">${esc(student.role || 'Học sinh')}</b></div>
                <div class="flex justify-between gap-3"><span class="text-slate-400">Ngày sinh</span><b class="text-slate-700">${esc(student.dob || '—')}</b></div>
                <div class="flex justify-between gap-3"><span class="text-slate-400">Mục tiêu</span><b class="text-slate-700 text-right">${esc(student.goal || '—')}</b></div>
              </div>
            </div>
          </div>

          <div id="student-ai-recommendation-slot">
            <div class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-sm text-indigo-700">Đang chuẩn bị AI Recommendation…</div>
          </div>

          <div class="bg-white rounded-[1.5rem] border border-slate-200 p-5">
            <div class="flex items-center justify-between mb-4"><div><h3 class="font-black text-slate-800">Lịch sử thi đua</h3><p class="text-xs text-slate-400 mt-1">Các lần cộng/trừ điểm đã lưu</p></div><span class="text-xs font-bold text-slate-400">${h.length} bản ghi</span></div>
            ${h.length ? `<div class="space-y-2">${h.slice(0, 12).map(x => `<div class="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><div class="w-9 h-9 rounded-lg ${x.points >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} flex items-center justify-center font-black">${x.points >= 0 ? '+' : ''}${x.points}</div><div class="flex-1 min-w-0"><div class="text-sm font-bold text-slate-700 truncate">${esc(x.item.reason || x.item.note || x.item.category || 'Cập nhật điểm')}</div><div class="text-[10px] text-slate-400 mt-0.5">${esc(x.item.date || '')}</div></div></div>`).join('')}</div>` : `<div class="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">Chưa có lịch sử thi đua.</div>`}
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" data-close class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold">Đóng</button>
            <button type="button" data-edit class="px-4 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-sm font-bold"><i class="ph-bold ph-pencil-simple mr-1"></i> Mở chỉnh sửa hồ sơ</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-close]')) close();
      if (event.target.closest('[data-edit]')) {
        close();
        if (typeof window.openEditStudentModal === 'function') window.openEditStudentModal(student.id);
        else if (typeof window.switchTab === 'function') window.switchTab('hoc-sinh');
      }
    });
    document.addEventListener('keydown', onEscape);
    mountAIRecommendation(student.id);
  }

  function onEscape(event) {
    if (event.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onEscape);
    }
  }

  window.MATHAIGVCNOpenStudent = open;
  window.MATHAIGVCNAttentionOpen = open;
})();
