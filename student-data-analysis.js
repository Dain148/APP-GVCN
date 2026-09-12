/* MATH-AI — Student Data Analysis
 * Explainable analysis based only on available student data.
 */
(function (window) {
  'use strict';

  function students() {
    return Array.isArray(window.state && window.state.students)
      ? window.state.students
      : [];
  }

  function number(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function getStudent(studentId) {
    if (studentId === undefined || studentId === null || studentId === '') return null;
    var wanted = String(studentId);
    return students().find(function (student) {
      return [student && student.id, student && student.code, student && student.studentId]
        .some(function (value) {
          return value !== undefined && value !== null && String(value) === wanted;
        });
    }) || null;
  }

  function getHistory(student) {
    if (!student) return [];
    var history = Array.isArray(student.gradeHistory)
      ? student.gradeHistory
      : Array.isArray(student.history) ? student.history : [];

    return history.map(function (item) {
      if (typeof item === 'number') return { score: item };
      if (!item || typeof item !== 'object') return null;
      var score = number(item.average ?? item.avg ?? item.score ?? item.grade);
      return score === null ? null : {
        score: score,
        subject: item.subject || item môn || item.name || null,
        date: item.date || item.createdAt || null
      };
    }).filter(Boolean);
  }

  function getAverage(student) {
    if (!student) return null;
    var direct = number(student.average ?? student.avg ?? student.averageScore ?? student.gpa);
    if (direct !== null) return direct;

    var history = getHistory(student);
    if (!history.length) return null;
    return history.reduce(function (sum, item) { return sum + item.score; }, 0) / history.length;
  }

  function getTrend(student) {
    var history = getHistory(student);
    if (history.length < 2) return { value: null, label: 'Chưa đủ dữ liệu', reason: 'Cần ít nhất hai mốc đánh giá để xác định xu hướng.' };
    var first = history[0].score;
    var last = history[history.length - 1].score;
    var delta = last - first;
    if (delta > 0) return { value: delta, label: 'Tăng', reason: 'Kết quả gần đây cao hơn mốc đánh giá đầu tiên.' };
    if (delta < 0) return { value: delta, label: 'Giảm', reason: 'Kết quả gần đây thấp hơn mốc đánh giá đầu tiên.' };
    return { value: 0, label: 'Ổn định', reason: 'Kết quả giữa các mốc đánh giá không thay đổi đáng kể.' };
  }

  function analyse(student) {
    var average = getAverage(student);
    var trend = getTrend(student);
    var strengths = [];
    var weaknesses = [];

    if (student && student.talent) strengths.push({ value: student.talent, reason: 'Được ghi nhận trong hồ sơ học sinh.' });
    if (average !== null) {
      if (average >= 8) strengths.push({ value: 'Kết quả học tập tốt', reason: 'Điểm trung bình hiện từ 8.0 trở lên.' });
      else if (average < 6.5) weaknesses.push({ value: 'Cần củng cố kiến thức', reason: 'Điểm trung bình hiện dưới 6.5.' });
    }
    if (trend.label === 'Giảm') weaknesses.push({ value: 'Xu hướng kết quả giảm', reason: trend.reason });
    if (trend.label === 'Tăng') strengths.push({ value: 'Có tiến bộ theo thời gian', reason: trend.reason });

    return {
      studentId: student && (student.id ?? student.code ?? student.studentId),
      studentName: student && (student.name || student.fullName || 'Học sinh'),
      average: average,
      trend: trend,
      strengths: strengths,
      weaknesses: weaknesses,
      goal: student && (student.goal || student.learningGoal || null),
      dataQuality: {
        hasAverage: average !== null,
        hasHistory: getHistory(student).length > 0,
        hasGoal: Boolean(student && (student.goal || student.learningGoal)),
        hasTalent: Boolean(student && student.talent)
      }
    };
  }

  function analyseById(studentId) { return analyse(getStudent(studentId)); }

  window.StudentDataAnalysis = {
    analyse: analyse,
    analyze: analyse,
    analyseById: analyseById,
    getStudent: getStudent,
    getAverage: getAverage,
    getTrend: getTrend
  };

  console.info('[StudentDataAnalysis] Module loaded.');
})(window);
