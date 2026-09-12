/* MATH-AI — Student Data Analysis
 * Explainable analysis based only on available student data.
 * Supports gradeHistory/history and academic.subjects[].scores.
 */
(function (window) {
  'use strict';

  function students() {
    return Array.isArray(window.state && window.state.students) ? window.state.students : [];
  }

  function number(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function getStudent(studentId) {
    if (studentId === undefined || studentId === null || studentId === '') return null;
    var wanted = String(studentId);
    return students().find(function (student) {
      return [student && student.id, student && student.code, student && student.studentId].some(function (value) {
        return value !== undefined && value !== null && String(value) === wanted;
      });
    }) || null;
  }

  function getAcademicSubjects(student) {
    if (!student || !student.academic) return [];
    var subjects = student.academic.subjects;
    if (!Array.isArray(subjects)) return [];
    return subjects.map(function (item) {
      if (!item || typeof item !== 'object') return null;
      var scores = Array.isArray(item.scores) ? item.scores : [];
      scores = scores.map(number).filter(function (score) { return score !== null; });
      return {
        name: item.name || item.subject || item.subjectName || 'Môn học',
        scores: scores
      };
    }).filter(function (item) { return item && item.scores.length > 0; });
  }

  function getHistory(student) {
    if (!student) return [];
    var history = Array.isArray(student.gradeHistory) ? student.gradeHistory : (Array.isArray(student.history) ? student.history : []);
    var result = history.map(function (item) {
      if (typeof item === 'number') return { score: item };
      if (!item || typeof item !== 'object') return null;
      var score = number(item.average ?? item.avg ?? item.score ?? item.grade);
      return score === null ? null : {
        score: score,
        subject: item.subject || item.subjectName || item.name || null,
        date: item.date || item.createdAt || null
      };
    }).filter(Boolean);

    getAcademicSubjects(student).forEach(function (subject) {
      subject.scores.forEach(function (score, index) {
        result.push({ score: score, subject: subject.name, date: null, source: 'academic', index: index });
      });
    });

    return result;
  }

  function getAverage(student) {
    if (!student) return null;
    var direct = number(student.average ?? student.avg ?? student.averageScore ?? student.gpa);
    if (direct !== null) return direct;
    var history = getHistory(student);
    if (!history.length) return null;
    return history.reduce(function (sum, item) { return sum + item.score; }, 0) / history.length;
  }

  function getSubjectAnalysis(student) {
    var grouped = {};
    getAcademicSubjects(student).forEach(function (subject) {
      grouped[subject.name] = subject.scores.reduce(function (sum, score) { return sum + score; }, 0) / subject.scores.length;
    });
    return Object.keys(grouped).map(function (name) {
      return { subject: name, average: grouped[name] };
    });
  }

  function getTrend(student) {
    var history = getHistory(student);
    if (history.length < 2) return { value: null, label: 'Chưa đủ dữ liệu', reason: 'Cần ít nhất hai mốc đánh giá để xác định xu hướng.' };
    var delta = history[history.length - 1].score - history[0].score;
    if (delta > 0) return { value: delta, label: 'Tăng', reason: 'Kết quả gần đây cao hơn mốc đánh giá đầu tiên.' };
    if (delta < 0) return { value: delta, label: 'Giảm', reason: 'Kết quả gần đây thấp hơn mốc đánh giá đầu tiên.' };
    return { value: 0, label: 'Ổn định', reason: 'Kết quả giữa các mốc đánh giá không thay đổi đáng kể.' };
  }

  function analyse(student) {
    var average = getAverage(student);
    var trend = getTrend(student);
    var subjectAnalysis = getSubjectAnalysis(student);
    var strengths = [];
    var weaknesses = [];

    if (student && student.talent) strengths.push({ value: student.talent, reason: 'Được ghi nhận trong hồ sơ học sinh.' });
    subjectAnalysis.forEach(function (item) {
      if (item.average >= 8) {
        strengths.push({ value: item.subject, reason: 'Điểm trung bình môn đạt ' + item.average.toFixed(2) + '.' });
      } else if (item.average < 6.5) {
        weaknesses.push({ value: item.subject, reason: 'Điểm trung bình môn ở mức ' + item.average.toFixed(2) + ', cần củng cố.' });
      }
    });
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
      subjects: subjectAnalysis,
      strengths: strengths,
      weaknesses: weaknesses,
      goal: student && (student.goal || student.learningGoal || null),
      dataQuality: {
        hasAverage: average !== null,
        hasHistory: getHistory(student).length > 0,
        hasSubjectData: subjectAnalysis.length > 0,
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
    getTrend: getTrend,
    getSubjectAnalysis: getSubjectAnalysis
  };

  console.info('[StudentDataAnalysis] Module loaded.');
})(window);
