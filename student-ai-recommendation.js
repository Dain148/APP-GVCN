/* MATH-AI — Student AI Recommendation
 * Explainable recommendations from student profile and academic analysis.
 */
(function (window) {
  'use strict';

  function getStudents() {
    return Array.isArray(window.state && window.state.students)
      ? window.state.students
      : [];
  }

  function getStudent(studentId) {
    if (studentId === undefined || studentId === null || studentId === '') return null;
    var wanted = String(studentId);
    return getStudents().find(function (student) {
      return [student && student.id, student && student.code, student && student.studentId]
        .some(function (value) {
          return value !== undefined && value !== null && String(value) === wanted;
        });
    }) || null;
  }

  function numeric(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function averageOf(student) {
    if (!student) return null;
    var direct = numeric(student.average ?? student.avg ?? student.averageScore ?? student.gpa);
    if (direct !== null) return direct;

    var grades = Array.isArray(student.grades)
      ? student.grades
      : Array.isArray(student.subjects) ? student.subjects : [];
    var values = grades.map(function (item) {
      return numeric(item && (item.score ?? item.grade ?? item.average));
    }).filter(function (value) { return value !== null; });

    return values.length
      ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length
      : null;
  }

  function progressOf(student) {
    if (!student) return null;
    var direct = numeric(student.progress ?? student.progressRate ?? student.improvement);
    if (direct !== null) return direct;

    var history = Array.isArray(student.gradeHistory)
      ? student.gradeHistory
      : Array.isArray(student.history) ? student.history : [];
    var values = history.map(function (item) {
      return numeric(item && (item.average ?? item.avg ?? item.score));
    }).filter(function (value) { return value !== null; });

    return values.length >= 2 ? values[values.length - 1] - values[0] : null;
  }

  function attendanceOf(student) {
    return student ? numeric(student.attendanceRate ?? student.attendance ?? student.attendancePercent) : null;
  }

  function nameOf(student) {
    return student ? (student.name || student.fullName || student.displayName || 'học sinh') : 'học sinh';
  }

  function getAnalysis(student) {
    if (window.StudentDataAnalysis && typeof window.StudentDataAnalysis.analyse === 'function') {
      return window.StudentDataAnalysis.analyse(student);
    }
    return null;
  }

  function addRecommendation(list, type, title, text, reason) {
    list.push({
      type: type,
      title: title,
      text: text,
      message: text,
      reason: reason
    });
  }

  function analyse(student) {
    var average = averageOf(student);
    var progress = progressOf(student);
    var attendance = attendanceOf(student);
    var goal = student && (student.goal || student.learningGoal);
    var talent = student && (student.talent || student.strength || student.strengths);
    var history = student && (student.gradeHistory || student.history);
    var hasHistory = Array.isArray(history) && history.length > 0;
    var analysis = getAnalysis(student);
    var recommendations = [];

    if (analysis) {
      if (analysis.average !== null && average === null) average = analysis.average;
      if (analysis.progress !== null && progress === null) progress = analysis.progress;
      if (analysis.attendance !== null && attendance === null) attendance = analysis.attendance;
      if (!goal && analysis.goal) goal = analysis.goal;
      if (!talent && analysis.talent) talent = analysis.talent;
    }

    if (average !== null && average < 5) {
      addRecommendation(recommendations, 'priority', 'Củng cố kiến thức nền',
        'Nên ôn lại các kiến thức cơ bản và làm bài theo từng dạng trước khi tăng độ khó.',
        'Điểm trung bình hiện ở mức cần được hỗ trợ thêm.');
    } else if (average !== null && average < 7) {
      addRecommendation(recommendations, 'practice', 'Luyện tập theo chuyên đề',
        'Nên chia nhỏ nội dung còn yếu, luyện bài tương tự và kiểm tra lại lỗi sau mỗi lần làm.',
        'Điểm trung bình cho thấy vẫn còn dư địa cải thiện rõ rệt.');
    } else if (average !== null) {
      addRecommendation(recommendations, 'growth', 'Duy trì và nâng cao',
        'Có thể thử các bài vận dụng, bài tổng hợp hoặc mục tiêu cao hơn để phát triển năng lực.',
        'Kết quả hiện tại là nền tảng tốt để nâng mức độ thử thách.');
    }

    if (progress !== null && progress < 0) {
      addRecommendation(recommendations, 'alert', 'Theo dõi xu hướng giảm',
        'Nên rà soát các bài kiểm tra gần đây và xác định thời điểm bắt đầu xuất hiện khó khăn.',
        'Kết quả gần đây thấp hơn giai đoạn trước.');
    } else if (progress !== null && progress > 0) {
      addRecommendation(recommendations, 'positive', 'Tiếp tục phát huy',
        'Giữ nhịp học hiện tại và ghi lại phương pháp đã giúp kết quả tiến bộ.',
        'Kết quả học tập đang có xu hướng cải thiện.');
    }

    if (analysis && Array.isArray(analysis.weaknesses)) {
      analysis.weaknesses.slice(0, 2).forEach(function (subject) {
        addRecommendation(recommendations, 'weakness', 'Cải thiện môn ' + subject,
          'Ưu tiên ôn lại kiến thức nền, luyện bài theo chuyên đề và kiểm tra lại lỗi sai ở môn ' + subject + '.',
          'Phân tích dữ liệu học tập xác định ' + subject + ' là nội dung cần được chú ý.');
      });
    }

    if (analysis && analysis.trend && analysis.trend.label && analysis.trend.label !== 'Chưa đủ dữ liệu') {
      var trendLabel = analysis.trend.label;
      if (trendLabel === 'Tăng') {
        addRecommendation(recommendations, 'trend', 'Duy trì đà tiến bộ',
          'Tiếp tục phương pháp học đang hiệu quả và tăng dần độ khó bài tập.',
          'Xu hướng điểm gần đây đang tăng.');
      } else if (trendLabel === 'Giảm') {
        addRecommendation(recommendations, 'trend-alert', 'Rà soát nguyên nhân điểm giảm',
          'Kiểm tra các chủ đề có điểm thấp trong những lần đánh giá gần nhất và lập kế hoạch bù đắp.',
          'Xu hướng điểm gần đây đang giảm.');
      }
    }

    if (attendance !== null && attendance < 80) {
      addRecommendation(recommendations, 'attendance', 'Cải thiện chuyên cần',
        'Cần bảo đảm tham gia đầy đủ và bổ sung nội dung đã bỏ lỡ sau mỗi buổi học.',
        'Tỷ lệ chuyên cần đang thấp hơn mức khuyến nghị.');
    }

    if (average === null && talent) {
      addRecommendation(recommendations, 'strength', 'Phát triển thế mạnh ' + talent,
        'Tiếp tục học sâu môn ' + talent + ', đồng thời ghi lại kết quả từng bài luyện để hệ thống xác định mức độ tiến bộ.',
        'Hồ sơ hiện ghi nhận ' + talent + ' là thế mạnh của học sinh.');
    }

    if (average === null && goal) {
      addRecommendation(recommendations, 'goal', 'Xây dựng lộ trình đạt mục tiêu',
        'Đặt các mục tiêu ngắn hạn theo tuần và bổ sung điểm kiểm tra, bài tập hoặc kết quả môn học để theo dõi mục tiêu “' + goal + '”.',
        'Học sinh đã có mục tiêu “' + goal + '”, nhưng chưa có dữ liệu điểm để đo khoảng cách đến mục tiêu.');
    }

    if (!hasHistory && average === null) {
      addRecommendation(recommendations, 'data', 'Bổ sung dữ liệu học tập',
        'Cần thêm điểm theo môn, lịch sử kiểm tra hoặc kết quả bài tập để AI xác định ưu tiên và xu hướng chính xác hơn.',
        'Hồ sơ hiện chưa có lịch sử điểm hoặc dữ liệu đánh giá học tập.');
    }

    if (!recommendations.length) {
      addRecommendation(recommendations, 'general', 'Tiếp tục theo dõi',
        'Cần thêm dữ liệu học tập để đưa ra khuyến nghị cá nhân hóa chính xác hơn.',
        'Dữ liệu hiện tại chưa đủ để xác định ưu tiên cụ thể.');
    }

    return {
      studentId: student && (student.id ?? student.code ?? student.studentId),
      studentName: nameOf(student),
      average: average,
      progress: progress,
      attendance: attendance,
      goal: goal || null,
      talent: talent || null,
      analysis: analysis,
      recommendations: recommendations
    };
  }

  function recommend(studentId) {
    return analyse(getStudent(studentId));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function render(studentId) {
    var result = recommend(studentId);
    var cards = result.recommendations.map(function (item) {
      return '<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">' +
        '<div class="mb-1 text-sm font-semibold text-slate-800">' + escapeHtml(item.title) + '</div>' +
        '<p class="text-sm leading-6 text-slate-600">' + escapeHtml(item.text) + '</p>' +
        '<p class="mt-2 text-xs text-slate-400">Cơ sở: ' + escapeHtml(item.reason) + '</p>' +
        '</article>';
    }).join('');

    return '<section class="space-y-3" data-module="student-ai-recommendation">' +
      '<div><h3 class="text-base font-bold text-slate-800">Gợi ý học tập từ AI</h3>' +
      '<p class="text-xs text-slate-500">Phân tích giải thích được dựa trên dữ liệu hiện có của ' + escapeHtml(result.studentName) + '.</p></div>' +
      '<div class="grid gap-3">' + cards + '</div>' +
      '</section>';
  }

  window.StudentAIRecommendation = {
    analyse: analyse,
    analyze: analyse,
    recommend: recommend,
    render: render,
    getStudent: getStudent,
    getAnalysis: getAnalysis
  };
})(window);
