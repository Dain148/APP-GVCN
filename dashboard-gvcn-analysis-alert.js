/* MATH-AI / APP-GVCN — Data Analysis + Alert
 * Safe extension: analyzes only data already present in window.state.
 * Never treats thi đua points as academic scores.
 */
(function () {
  'use strict';

  const students = () => Array.isArray(window.state?.students) ? window.state.students : [];
  const n = value => {
    const x = Number(value);
    return Number.isFinite(x) ? x : null;
  };
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function pointHistory(student) {
    return (Array.isArray(student?.history) ? student.history : [])
      .map(item => ({
        date: new Date(item?.date || 0).getTime(),
        points: n(item?.points) || 0,
        reason: item?.reason || item?.note || ''
      }))
      .filter(item => Number.isFinite(item.date))
      .sort((a, b) => a.date - b.date);
  }

  function pointTrend(student) {
    const history = pointHistory(student);
    if (history.length < 2) return { direction: 'stable', delta: 0, label: 'Chưa đủ dữ liệu' };
    const recent = history.slice(-5);
    const delta = recent.reduce((sum, item) => sum + item.points, 0);
    if (delta >= 3) return { direction: 'up', delta, label: 'Đang tiến bộ' };
    if (delta <= -3) return { direction: 'down', delta, label: 'Đang giảm' };
    return { direction: 'stable', delta, label: 'Ổn định' };
  }

  function academicSeries(student) {
    const containers = [student?.scoreHistory, student?.gradeHistory, student?.academicHistory];
    for (const source of containers) {
      if (!Array.isArray(source)) continue;
      const values = source.map(item => {
        if (typeof item === 'number' || typeof item === 'string') return n(item);
        return n(item?.average ?? item?.avg ?? item?.score ?? item?.value ?? item?.diem);
      }).filter(value => value !== null && value >= 0 && value <= 10);
      if (values.length >= 2) return values;
    }
    return [];
  }

  function academicTrend(student) {
    const values = academicSeries(student);
    if (values.length < 2) return { direction: 'unknown', delta: null, label: 'Chưa có chuỗi điểm học tập' };
    const recent = values.slice(-4);
    const delta = recent[recent.length - 1] - recent[0];
    if (delta <= -1) return { direction: 'down', delta, label: 'Giảm' };
    if (delta >= 1) return { direction: 'up', delta, label: 'Tăng' };
    return { direction: 'stable', delta, label: 'Ổn định' };
  }

  function academicAverage(student) {
    const keys = ['average', 'avg', 'averageScore', 'gpa', 'diemTB', 'diemTrungBinh', 'scoreAverage'];
    for (const key of keys) {
      const value = n(student?.[key]);
      if (value !== null && value >= 0 && value <= 10) return value;
    }
    return null;
  }

  function goalScore(student) {
    const raw = student?.targetAverage ?? student?.targetScore ?? student?.goalScore;
    const value = n(raw);
    if (value !== null && value >= 0 && value <= 10) return value;
    const goalText = String(student?.goal || '');
    const match = goalText.match(/(?:\b|^)(10(?:\.0+)?|[0-9](?:\.[0-9]+)?)(?:\s*\/\s*10)?\b/);
    const parsed = match ? n(match[1]) : null;
    return parsed !== null && parsed >= 0 && parsed <= 10 ? parsed : null;
  }

  function attendance(student) {
    const records = window.state?.attendanceRecords || {};
    const result = { late: 0, unexcused: 0 };
    Object.values(records).forEach(day => {
      if (day?.[student?.id] === 'late') result.late++;
      if (day?.[student?.id] === 'unexcused') result.unexcused++;
    });
    return result;
  }

  function analyze(student) {
    const point = pointTrend(student);
    const academic = academicTrend(student);
    const avg = academicAverage(student);
    const target = goalScore(student);
    const a = attendance(student);
    const alerts = [];

    if (academic.direction === 'down') {
      alerts.push({ level: 'attention', reason: `Điểm học tập giảm ${Math.abs(academic.delta).toFixed(1)} điểm trong chuỗi gần nhất.` });
    }
    if (avg !== null && target !== null && target - avg >= 1) {
      alerts.push({ level: 'warning', reason: `Còn thiếu ${ (target - avg).toFixed(1) } điểm so với mục tiêu.` });
    }
    if (a.unexcused >= 2) alerts.push({ level: 'attention', reason: `Vắng không phép: ${a.unexcused} lần.` });
    else if (a.unexcused === 1) alerts.push({ level: 'warning', reason: 'Có 1 lần vắng không phép.' });
    if (a.late >= 3) alerts.push({ level: 'warning', reason: `Đi muộn: ${a.late} lần.` });
    if (point.direction === 'down') alerts.push({ level: 'warning', reason: `Điểm thi đua đang giảm (${point.delta}).` });
    if (academic.direction === 'up' || point.direction === 'up') alerts.push({ level: 'progress', reason: academic.direction === 'up' ? `Điểm học tập tăng ${academic.delta.toFixed(1)} điểm.` : `Điểm thi đua tăng ${point.delta} điểm.` });

    const priority = alerts.some(x => x.level === 'attention') ? 'attention'
      : alerts.some(x => x.level === 'warning') ? 'warning'
      : alerts.some(x => x.level === 'progress') ? 'progress' : 'normal';

    return { point, academic, avg, target, attendance: a, alerts, priority };
  }

  function render() {
    const root = document.getElementById('gvcn-dashboard-live');
    if (!root) return;
    let box = document.getElementById('gvcn-dashboard-analysis-live');
    if (!box) {
      box = document.createElement('div');
      box.id = 'gvcn-dashboard-analysis-live';
      root.appendChild(box);
    }

    const rows = students().map(student => ({ student, data: analyze(student) }));
    const alerts = rows.filter(row => row.data.priority !== 'normal')
      .sort((a, b) => {
        const rank = { attention: 3, warning: 2, progress: 1 };
        return rank[b.data.priority] - rank[a.data.priority];
      });
    const counts = {
      progress: rows.filter(x => x.data.priority === 'progress').length,
      warning: rows.filter(x => x.data.priority === 'warning').length,
      attention: rows.filter(x => x.data.priority === 'attention').length
    };

    const chip = (label, value, cls) => `<div class="rounded-xl border p-3 ${cls}"><div class="text-[9px] font-black uppercase tracking-widest">${label}</div><div class="text-2xl font-black mt-1">${value}</div></div>`;
    const levelMeta = {
      progress: ['🟢', 'Progress', 'border-emerald-100 bg-emerald-50 text-emerald-700'],
      warning: ['🟡', 'Warning', 'border-amber-100 bg-amber-50 text-amber-700'],
      attention: ['🔴', 'Attention', 'border-red-100 bg-red-50 text-red-700']
    };

    box.innerHTML = `<section class="mt-5 bg-white rounded-[1.75rem] border border-slate-200 p-5 shadow-sm">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-3 mb-5">
        <div><div class="text-[10px] font-black text-blueAccent uppercase tracking-[0.2em] mb-1">DATA ANALYSIS + ALERT</div><h4 class="text-xl font-black text-slate-800">Phân tích & tín hiệu lớp học</h4><p class="text-xs text-slate-400 mt-1">Phân tích từ dữ liệu học tập, lịch sử thi đua, mục tiêu và chuyên cần hiện có.</p></div>
        <div class="text-[10px] font-bold text-slate-400">Không suy đoán điểm học tập khi chưa có dữ liệu thật.</div>
      </div>
      <div class="grid grid-cols-3 gap-3 mb-5">
        ${chip('PROGRESS', counts.progress, 'border-emerald-100 bg-emerald-50 text-emerald-700')}
        ${chip('WARNING', counts.warning, 'border-amber-100 bg-amber-50 text-amber-700')}
        ${chip('ATTENTION', counts.attention, 'border-red-100 bg-red-50 text-red-700')}
      </div>
      <div class="space-y-2">
        ${alerts.length ? alerts.slice(0, 10).map(({ student, data }) => {
          const meta = levelMeta[data.priority];
          const first = data.alerts[0]?.reason || 'Có tín hiệu cần xem lại.';
          const avgText = data.avg === null ? 'TB: —' : `TB: ${data.avg.toFixed(2)}`;
          const trendText = data.academic.direction === 'unknown' ? 'Trend học tập: —' : `Trend học tập: ${data.academic.label}`;
          return `<button onclick="window.MATHAIGVCNAttentionOpen && window.MATHAIGVCNAttentionOpen(${JSON.stringify(student.id)})" class="w-full text-left rounded-2xl border p-3 hover:shadow-sm transition-all ${meta[2]}">
            <div class="flex items-center gap-3"><div class="text-xl">${meta[0]}</div><div class="flex-1 min-w-0"><div class="font-black text-sm truncate">${esc(student.name || 'Chưa có tên')}</div><div class="text-[10px] font-bold opacity-80 mt-0.5">${meta[1]} · ${esc(first)}</div><div class="text-[10px] opacity-60 mt-1">${avgText} · ${trendText}</div></div><i class="ph-bold ph-caret-right opacity-50"></i></div>
          </button>`;
        }).join('') : `<div class="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl">Chưa phát hiện tín hiệu cần xử lý.</div>`}
      </div>
    </section>`;
  }

  function install() {
    const original = window.renderLayout;
    if (typeof original === 'function' && !original.__mathaiAnalysisAlert) {
      window.renderLayout = function () {
        const result = original.apply(this, arguments);
        setTimeout(render, 0);
        return result;
      };
      window.renderLayout.__mathaiAnalysisAlert = true;
    }
    let tries = 0;
    const timer = setInterval(() => {
      render();
      if (++tries >= 120) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
