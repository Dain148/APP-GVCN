/*
 * MATH-AI / APP-GVCN
 * Student AI Recommendation — Sprint 07
 * Data-driven, explainable recommendations using window.state.students.
 */
(function () {
    'use strict';

    const MODULE_ID = 'student-ai-recommendation';

    function students() {
        return Array.isArray(window.state?.students) ? window.state.students : [];
    }

    function getStudent(studentId) {
        if (!studentId) return null;
        return students().find(s => String(s.id ?? s.code ?? s.studentId) === String(studentId)) || null;
    }

    function num(...values) {
        for (const value of values) {
            if (value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) {
                return Number(value);
            }
        }
        return 0;
    }

    function nameOf(student) {
        return student?.name || student?.fullName || student?.displayName || 'Học sinh';
    }

    function averageOf(student) {
        const direct = num(student?.average, student?.avg, student?.averageScore, student?.gpa);
        if (direct) return direct;
        const scores = student?.scores || student?.grades || student?.subjects;
        if (Array.isArray(scores) && scores.length) {
            const values = scores.map(item => num(item?.score, item?.value, item?.average)).filter(Boolean);
            if (values.length) return values.reduce((a, b) => a + b, 0) / values.length;
        }
        return 0;
    }

    function progressOf(student) {
        return Math.max(0, Math.min(100, num(student?.progress, student?.learningProgress, student?.completion)));
    }

    function analyse(student) {
        if (!student) return null;
        const average = averageOf(student);
        const progress = progressOf(student);
        const attendance = num(student.attendance, student.attendanceRate, student.presenceRate);
        const recommendations = [];

        if (average > 0 && average < 5) {
            recommendations.push({
                priority: 'high',
                title: 'Củng cố kiến thức nền',
                message: 'Ôn lại các khái niệm cơ bản và luyện bài tập theo từng dạng trước khi chuyển sang phần nâng cao.',
                reason: `Điểm trung bình hiện tại khoảng ${average.toFixed(1)}, cần ưu tiên củng cố nền tảng.`
            });
        } else if (average > 0 && average < 7) {
            recommendations.push({
                priority: 'medium',
                title: 'Luyện tập theo chuyên đề',
                message: 'Chọn một chuyên đề còn yếu, làm bài từ cơ bản đến vận dụng và ghi lại lỗi sai sau mỗi lần luyện.',
                reason: `Điểm trung bình hiện tại khoảng ${average.toFixed(1)}, phù hợp với kế hoạch luyện tập có trọng tâm.`
            });
        } else if (average >= 7) {
            recommendations.push({
                priority: 'low',
                title: 'Mở rộng và nâng cao',
                message: 'Duy trì nền tảng hiện có và thử thêm bài vận dụng, bài tổng hợp để phát triển năng lực giải quyết vấn đề.',
                reason: `Điểm trung bình hiện tại khoảng ${average.toFixed(1)}, có thể mở rộng mức độ thử thách.`
            });
        }

        if (progress > 0 && progress < 60) {
            recommendations.push({
                priority: 'medium',
                title: 'Duy trì lịch học đều đặn',
                message: 'Chia nhiệm vụ thành các phiên học ngắn, đặt mục tiêu hoàn thành từng phần và theo dõi tiến độ hằng tuần.',
                reason: `Tiến độ hiện tại là ${progress}%, nên tăng tính đều đặn trong quá trình học.`
            });
        }

        if (attendance > 0 && attendance < 80) {
            recommendations.push({
                priority: 'high',
                title: 'Cải thiện chuyên cần',
                message: 'Ưu tiên tham gia đầy đủ các buổi học và bổ sung nội dung đã bỏ lỡ để tránh tạo khoảng trống kiến thức.',
                reason: `Tỷ lệ chuyên cần hiện tại khoảng ${attendance}%.`
            });
        }

        if (!recommendations.length) {
            recommendations.push({
                priority: 'low',
                title: 'Tiếp tục duy trì',
                message: 'Tiếp tục học tập ổn định, cập nhật kết quả thường xuyên để hệ thống đưa ra khuyến nghị chính xác hơn.',
                reason: 'Dữ liệu hiện tại chưa cho thấy vấn đề nổi bật cần ưu tiên.'
            });
        }

        return {
            studentId: student.id ?? student.code ?? student.studentId,
            studentName: nameOf(student),
            average,
            progress,
            attendance,
            recommendations,
            summary: `Đã tạo ${recommendations.length} khuyến nghị dựa trên dữ liệu học tập hiện có.`
        };
    }

    function recommend(studentId) {
        return analyse(getStudent(studentId));
    }

    function render(studentId) {
        const result = recommend(studentId);
        if (!result) return '<div class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Chưa có dữ liệu để tạo khuyến nghị.</div>';
        return result.recommendations.map(item => `<article class="rounded-xl border border-indigo-100 bg-white p-4"><div class="flex items-center justify-between gap-2"><strong class="text-slate-800">${escapeHtml(item.title)}</strong><span class="text-xs font-semibold text-indigo-600">${escapeHtml(item.priority)}</span></div><p class="mt-2 text-sm text-slate-600">${escapeHtml(item.message)}</p><p class="mt-2 text-xs text-slate-400">Lý do: ${escapeHtml(item.reason)}</p></article>`).join('');
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    window.StudentAIRecommendation = {
        id: MODULE_ID,
        analyse,
        recommend,
        render,
        getStudent,
        getStudents: students
    };

    console.info('[StudentAIRecommendation] Module loaded.');
})();
