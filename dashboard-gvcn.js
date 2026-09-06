/* MATH-AI / APP-GVCN — Dashboard Tổng quan
 * Safe extension: keeps the existing GVCN app and augments only renderViewTongQuan().
 */
(function () {
  'use strict';

  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function listStudents() {
    return Array.isArray(window.state?.students) ? window.state.students : [];
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function averageOf(s) {
    const keys = ['average','avg','averageScore','gpa','diemTB','diemTrungBinh','scoreAverage'];
    for (const k of keys) {
      const n = num(s?.[k]);
      if (n !== null && n >= 0 && n <= 10) return n;
    }
    const gradeContainers = [s?.scores, s?.grades, s?.diem, s?.subjects];
    for (const box of gradeContainers) {
      if (!box || typeof box !== 'object') continue;
      const vals = Object.values(box).flatMap(v => {
        if (typeof v === 'number' || typeof v === 'string') return [num(v)];
        if (v && typeof v === 'object') return Object.values(v).map(num);
        return [];
      }).filter(v => v !== null && v >= 0 && v <= 10);
      if (vals.length) return vals.reduce((a,b)=>a+b,0) / vals.length;
    }
    return null;
  }

  function subjectMap(s) {
    const source = s?.subjects || s?.scores || s?.grades || s?.diem || {};
    const out = {};
    if (!source || typeof source !== 'object') return out;
    Object.entries(source).forEach(([subject, value]) => {
      const vals = (value && typeof value === 'object') ? Object.values(value).map(num).filter(v=>v!==null&&v>=0&&v<=10) : [num(value)];
      const valid = vals.filter(v=>v!==null&&v>=0&&v<=10);
      if (valid.length) out[subject] = valid.reduce((a,b)=>a+b,0)/valid.length;
    });
    return out;
  }

  function renderDashboard() {
    const root = document.getElementById('gvcn-dashboard-live');
    if (!root) return;
    const all = listStudents();
    const scores = all.map(averageOf).filter(v => v !== null);
    const classAvg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
    const attention = all.filter(s => {
      const avg = averageOf(s);
      return avg !== null && avg < 5;
    });
    const improving = all.filter(s => Number(s?.weekProg || s?.weeklyProgress || s?.progress || 0) > 0)
      .sort((a,b)=>Number(b.weekProg||b.weeklyProgress||b.progress||0)-Number(a.weekProg||a.weeklyProgress||a.progress||0));

    const subjectTotals = {};
    all.forEach(s => Object.entries(subjectMap(s)).forEach(([name, value]) => {
      if (!subjectTotals[name]) subjectTotals[name] = [];
      subjectTotals[name].push(value);
    }));
    const subjects = Object.entries(subjectTotals).map(([name, vals]) => ({name, avg: vals.reduce((a,b)=>a+b,0)/vals.length}))
      .sort((a,b)=>b.avg-a.avg);

    root.innerHTML = `
      <section class="mt-6 space-y-5" aria-label="Dashboard lớp học">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div class="text-[10px] font-black text-blueAccent uppercase tracking-[0.2em] mb-1">GVCN DASHBOARD</div>
            <h3 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Toàn cảnh lớp học</h3>
            <p class="text-sm text-slate-500 font-medium mt-1">Theo dõi nhanh sĩ số, kết quả học tập và tình hình từng học sinh.</p>
          </div>
          <div class="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-4 py-2 rounded-xl">Dữ liệu lấy trực tiếp từ lớp hiện tại</div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${statCard('ph-users','blue','TỔNG HỌC SINH',all.length,'')}
          ${statCard('ph-chart-line-up','emerald','ĐIỂM TRUNG BÌNH',classAvg===null?'—':classAvg.toFixed(2),scores.length?'10 điểm':'Chưa có dữ liệu điểm')}
          ${statCard('ph-lightning','amber','HS TIẾN BỘ',improving.length,'Theo dữ liệu tiến bộ hiện có')}
          ${statCard('ph-warning-circle','red','HS CẦN CHÚ Ý',attention.length,'Điểm TB dưới 5')}
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div class="xl:col-span-2 bg-white rounded-[1.75rem] border border-slate-200 p-5 shadow-sm">
            <div class="flex justify-between items-center mb-5">
              <div><h4 class="font-black text-slate-800">Thống kê theo môn</h4><p class="text-xs text-slate-400 mt-1">Tự nhận diện dữ liệu điểm hiện có</p></div>
              <i class="ph-fill ph-chart-bar text-xl text-blueAccent"></i>
            </div>
            <div id="gvcn-subject-bars" class="space-y-4">
              ${subjects.length ? subjects.slice(0,8).map(x => `
                <div>
                  <div class="flex justify-between text-xs font-bold text-slate-600 mb-1.5"><span>${esc(x.name)}</span><span>${x.avg.toFixed(2)}</span></div>
                  <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blueAccent rounded-full" style="width:${Math.min(100,x.avg*10)}%"></div></div>
                </div>`).join('') : `<div class="py-10 text-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-2xl">Chưa có dữ liệu điểm theo môn trong hồ sơ học sinh.</div>`}
            </div>
          </div>

          <div class="xl:col-span-3 bg-white rounded-[1.75rem] border border-slate-200 p-5 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div><h4 class="font-black text-slate-800">Danh sách học sinh</h4><p class="text-xs text-slate-400 mt-1">Tìm kiếm · lọc · sắp xếp · mở hồ sơ</p></div>
              <div class="flex gap-2 w-full md:w-auto">
                <input id="gvcn-student-search" oninput="window.MATHAIGVCNFilter && window.MATHAIGVCNFilter()" placeholder="Tìm học sinh..." class="flex-1 md:w-48 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-blueAccent">
                <select id="gvcn-student-sort" onchange="window.MATHAIGVCNFilter && window.MATHAIGVCNFilter()" class="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none">
                  <option value="name">Tên A-Z</option><option value="points">Điểm thi đua</option><option value="average">Điểm TB</option>
                </select>
              </div>
            </div>
            <div id="gvcn-student-list" class="space-y-2 max-h-[430px] overflow-y-auto custom-scrollbar"></div>
          </div>
        </div>
      </section>`;

    window.MATHAIGVCNFilter();
  }

  function statCard(icon, tone, label, value, note) {
    const bg = {blue:'bg-blue-50 text-blue-500',emerald:'bg-emerald-50 text-emerald-500',amber:'bg-amber-50 text-amber-500',red:'bg-red-50 text-red-500'}[tone] || 'bg-slate-50 text-slate-500';
    return `<div class="bg-white rounded-[1.5rem] p-5 border border-slate-200 shadow-sm"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl ${bg} flex items-center justify-center"><i class="ph-fill ${icon} text-xl"></i></div><div class="min-w-0"><div class="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">${label}</div><div class="text-2xl font-black text-slate-900 leading-none mt-1">${value}</div><div class="text-[9px] font-semibold text-slate-400 mt-1 truncate">${note}</div></div></div></div>`;
  }

  window.MATHAIGVCNFilter = function () {
    const box = document.getElementById('gvcn-student-list');
    if (!box) return;
    const q = (document.getElementById('gvcn-student-search')?.value || '').toLowerCase().trim();
    const sort = document.getElementById('gvcn-student-sort')?.value || 'name';
    let arr = listStudents().filter(s => String(s.name||'').toLowerCase().includes(q));
    if (sort === 'points') arr.sort((a,b)=>(Number(b.points)||0)-(Number(a.points)||0));
    else if (sort === 'average') arr.sort((a,b)=>(averageOf(b)??-1)-(averageOf(a)??-1));
    else arr.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi'));
    box.innerHTML = arr.length ? arr.map((s,i) => {
      const avg = averageOf(s);
      const p = Number(s.points)||0;
      return `<button onclick="window.MATHAIGVCNOpenStudent(${JSON.stringify(s.id)})" class="w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
        <div class="w-7 text-center text-xs font-black text-slate-300">${i+1}</div>
        <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">${typeof window.getAvatarImg==='function'?window.getAvatarImg(s.avatarUrl,s.name,'w-10 h-10'):''}</div>
        <div class="flex-1 min-w-0"><div class="font-black text-sm text-slate-800 truncate">${esc(s.name)}</div><div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${esc(s.group||'Chưa nhóm')}</div></div>
        <div class="text-right"><div class="font-black text-sm text-blueAccent">${avg===null?'—':avg.toFixed(2)}</div><div class="text-[9px] text-slate-400 font-bold">TB · ${p}đ</div></div>
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
    function wrapped() {
      const html = original.apply(this, arguments);
      return html.replace('</div>\n            `;', '</div>\n            `;');
    }
    // The original is a template function. Inject a mount point before its final wrapper closes.
    const wrappedSource = original.toString();
    const marker = '\n                </div>\n            `;';
    window.renderViewTongQuan = function () {
      const html = original.apply(this, arguments);
      const idx = html.lastIndexOf(marker);
      if (idx === -1) return html;
      return html.slice(0, idx) + '\n                    <div id="gvcn-dashboard-live"></div>\n' + html.slice(idx);
    };
    window.renderViewTongQuan.__mathaiDashboard = true;
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (install()) { clearInterval(timer); if (typeof window.renderLayout==='function') window.renderLayout(); setTimeout(renderDashboard,80); }
    if (tries > 100) clearInterval(timer);
  }, 50);

  const observer = new MutationObserver(() => { if (document.getElementById('gvcn-dashboard-live')) renderDashboard(); });
  observer.observe(document.body, { childList: true, subtree: true });
})();
