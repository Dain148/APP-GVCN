/*
 * MATH-AI / APP-GVCN
 * Student AI Recommendation Engine — Sprint 07 / Phase 2
 *
 * Purpose:
 * - Analyse the existing student record without requiring an external AI API.
 * - Produce deterministic, explainable learning recommendations.
 * - Keep recommendation logic independent from Student Dashboard UI.
 * - Expose a small public API for later AI/LLM integration.
 */
(function () {
    'use strict';

    const MODULE_ID = 'student-ai-recommendation-module';

    function getStudents() {
        return Array.isArray(window.state?.students) ? window.state.students : [];
    }

    function getStudent(studentId) {
        if (!studentId) return null;
        return getStudents().find(student => String(student.id) === String(studentId)) || null;
    }

    function numberOrZero(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function getAverage(student) {
        if (!student) return 0;
        for (const value of [student.average, student.avg, student.averageScore, student.gpa]) {
            if (value !== undefined && value !== null && value !== '') return numberOrZero(value);
        }
        return 0;
    }

    function getProgress(student) {
        if (!student) return 0;
        const value = numberOrZero(student.progress ?? student.learningProgress ?? student.completion);
        return Math.max(0, Math.min(100, value));
    }

    function getName(student) {
        return student?.name || student?.fullName || student?.displayName || 'Học sinh';
    }

    function addRecommendation(list, priority, type, title, message, reason) {
        list.push({ priority, type, title, message, reason });
    }

    function analyse(student) {
        if (!student) {
            return {
                studentId: null,
                studentName: 'Học sinh',
                status: 'no-data',
                summary: 'Chưa có dữ liệu để tạo khuyến nghị.',
                recommendations: []
            };
        }

        const average = getAverage(student);
        const progress = getProgress(student);
        const recommendations = [];

        if (average > 0 && average < 5) {
            addRecommendation(
                recommendations,
                'high',
                'priority',
                'Ưu tiên củng cố kiến thức nền',
                'Tập trung ôn lại các kiến thức cơ bản trước khi tăng độ khó.',
                `Điểm trung bình hiện tại là ${average.toFixed(1)}.`
            );
        } else if (average > 0 && average < 7) {
            addRecommendation(
                recommendations,
                'medium',
                'practice',
                'Tăng cường luyện tập',
                'Duy trì việc học đều và luyện thêm các dạng bài còn chưa chắc.',
                `Điểm trung bình hiện tại là ${average.toFixed(1)}.`
            );
        } else if (average >= 7) {
            addRecommendation(
                recommendations,
                'low',
                'challenge',
                'Thử thách nâng cao',
                'Có thể chuyển dần sang bài tập vận dụng và nâng cao để phát triển thêm năng lực.',
                `Điểm trung bình hiện tại là ${average.toFixed(1)}.`
            );
        }

        if (progress < 40) {
            addRecommendation(
                recommendations,
                'high',
                'progress',
                'Tăng tiến độ học tập',
                'Đặt mục tiêu nhỏ theo tuần và hoàn thành từng phần thay vì học dồn.',
                `Tiến độ hiện tại là ${progress}%.`
            );
        } else if (progress < 70) {
            addRecommendation(
                recommendations,
                'medium',
                'progress',
                'Duy trì nhịp học ổn định',
                'Tiếp tục hoàn thành các nhiệm vụ đang dang dở để nâng tiến độ.',
                `Tiến độ hiện tại là ${progress}%.`
            );
        } else {
            addRecommendation(
                recommendations,
                'low',
                'progress',
                'Duy trì phong độ',
                'Giữ nhịp học hiện tại và dành thêm thời gian cho mục tiêu nâng cao.',
                `Tiến độ hiện tại là ${progress}%.`
            );
        }

        if (student.goal || student.learningGoal) {
            addRecommendation(
                recommendations,
                'medium',
                'goal',
                'Bám sát mục tiêu cá nhân',
                `Ưu tiên các hoạt động phù hợp với mục tiêu: ${student.goal || student.learningGoal}.`,
                'Hệ thống đã ghi nhận mục tiêu cá nhân của học sinh.'
            );
        }

        if (!recommendations.length) {
            addRecommendation(
                recommendations,
                'medium',
                'data',
                'Bổ sung dữ liệu học tập',
                'Cần thêm dữ liệu điểm số hoặc tiến độ để tạo khuyến nghị chính xác hơn.',
                'Hồ sơ hiện chưa có đủ chỉ số phân tích.'
            );
        }

        const rank = { high: 0, medium: 1, low: 2 };
        recommendations.sort((a, b) => rank[a.priority] - rank[b.priority]);

        return {
            studentId: student.id ?? null,
            studentName: getName(student),
            status: 'ready',
            summary: recommendations[0]?.message || 'Chưa có khuyến nghị.',
            recommendations,
            metrics: { average, progress }
        };
    }

    function recommend(studentId) {
        return analyse(getStudent(studentId));
    }

    function render(studentId) {
        const result = recommend(studentId);
        const items = result.recommendations || [];

        if (!items.length) {
            return `<section id="${MODULE_ID}" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p class="text-sm text-slate-500">${result.summary}</p></section>`;
        }

        const priorityLabel = { high: 'Ưu tiên cao', medium: 'Nên thực hiện', low: 'Khuyến nghị' };

        return `
            <section id="${MODULE_ID}" class="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <div class="flex items-start gap-4">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                        <i class="ph-sparkle text-xl"></i>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-slate-800">AI Recommendation</h2>
                        <p class="mt-1 text-sm text-slate-500">Khuyến nghị tự động cho ${result.studentName}</p>
                    </div>
                </div>
                <div class="mt-5 space-y-3">
                    ${items.map(item => `
                        <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div class="flex items-center justify-between gap-3">
                                <h3 class="font-bold text-slate-800">${item.title}</h3>
                                <span class="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">${priorityLabel[item.priority]}</span>
                            </div>
                            <p class="mt-2 text-sm leading-6 text-slate-600">${item.message}</p>
                            <p class="mt-2 text-xs text-slate-400">Lý do: ${item.reason}</p>
                        </article>
                    `).join('')}
                </div>
            </section>`;
    }

    window.StudentAIRecommendation = {
        id: MODULE_ID,
        analyse,
        recommend,
        render,
        getStudent,
        getStudents
    };

    console.info('[StudentAIRecommendation] Module loaded.');
})();
