/*
 * MATH-AI / APP-GVCN
 * Student Dashboard — Sprint 07 / Phase 1
 *
 * Purpose:
 * - Provide an independent Student Dashboard module.
 * - Reuse the existing global `state.students` data source.
 * - Avoid coupling student UI to the GVCN dashboard rendering logic.
 * - Expose a small public API for the host application.
 *
 * This first version intentionally focuses on the dashboard shell and
 * data-normalisation layer. AI Recommendation is implemented separately.
 */
(function () {
    'use strict';

    const MODULE_ID = 'student-dashboard-module';

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

        const candidates = [
            student.average,
            student.avg,
            student.averageScore,
            student.gpa
        ];

        for (const value of candidates) {
            if (value !== undefined && value !== null && value !== '') {
                return numberOrZero(value);
            }
        }

        return 0;
    }

    function getPoints(student) {
        if (!student) return 0;
        return numberOrZero(
            student.points ??
            student.stars ??
            student.score ??
            student.totalPoints
        );
    }

    function getProgress(student) {
        if (!student) return 0;

        const progress = numberOrZero(
            student.progress ??
            student.learningProgress ??
            student.completion
        );

        return Math.max(0, Math.min(100, progress));
    }

    function getDisplayName(student) {
        if (!student) return 'Học sinh';
        return student.name || student.fullName || student.displayName || 'Học sinh';
    }

    function getInitials(name) {
        return String(name || 'HS')
            .trim()
            .split(/\s+/)
            .slice(-2)
            .map(part => part.charAt(0).toUpperCase())
            .join('') || 'HS';
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatNumber(value) {
        return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }

    function getCurrentStudent(studentId) {
        if (studentId) return getStudent(studentId);

        const students = getStudents();
        if (students.length === 1) return students[0];

        return window.currentStudent || window.selectedStudent || null;
    }

    function renderEmptyState() {
        return `
            <section id="${MODULE_ID}" class="h-full w-full overflow-y-auto custom-scrollbar bg-slate-50 p-6 md:p-8">
                <div class="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
                    <div class="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <i class="ph-user-circle text-4xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800">Student Dashboard</h2>
                        <p class="mt-3 text-slate-500">
                            Chưa có dữ liệu học sinh để hiển thị. Dashboard sẽ tự sử dụng dữ liệu từ hệ thống hiện tại khi dữ liệu sẵn sàng.
                        </p>
                    </div>
                </div>
            </section>`;
    }

    function render(studentId) {
        const student = getCurrentStudent(studentId);
        if (!student) return renderEmptyState();

        const name = getDisplayName(student);
        const average = getAverage(student);
        const points = getPoints(student);
        const progress = getProgress(student);
        const avatar = student.avatarUrl || student.avatar || '';
        const avatarHtml = avatar
            ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="h-full w-full object-cover">`
            : `<span class="text-xl font-bold text-indigo-700">${escapeHtml(getInitials(name))}</span>`;

        return `
            <section id="${MODULE_ID}" class="h-full w-full overflow-y-auto custom-scrollbar bg-slate-50 p-5 md:p-8">
                <div class="mx-auto max-w-7xl space-y-6">
                    <header class="rounded-3xl bg-gradient-to-br from-indigo-950 to-indigo-800 p-6 text-white shadow-lg md:p-8">
                        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div class="flex items-center gap-4">
                                <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md">
                                    ${avatarHtml}
                                </div>
                                <div>
                                    <p class="text-sm font-semibold uppercase tracking-wider text-indigo-200">Student Dashboard</p>
                                    <h1 class="mt-1 text-2xl font-bold md:text-3xl">Xin chào, ${escapeHtml(name)}!</h1>
                                    <p class="mt-1 text-sm text-indigo-200">Không gian theo dõi hành trình học tập cá nhân</p>
                                </div>
                            </div>
                            <div class="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                                <p class="text-xs font-semibold uppercase tracking-wider text-indigo-200">Tiến độ học tập</p>
                                <p class="mt-1 text-3xl font-bold">${formatNumber(progress)}%</p>
                            </div>
                        </div>
                    </header>

                    <div class="grid gap-5 md:grid-cols-3">
                        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-semibold text-slate-500">Điểm trung bình</span>
                                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><i class="ph-chart-line-up text-xl"></i></span>
                            </div>
                            <p class="mt-4 text-3xl font-bold text-slate-800">${formatNumber(average)}</p>
                            <p class="mt-1 text-sm text-slate-400">Theo dữ liệu hiện có</p>
                        </article>

                        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-semibold text-slate-500">Điểm tích lũy</span>
                                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><i class="ph-star text-xl"></i></span>
                            </div>
                            <p class="mt-4 text-3xl font-bold text-slate-800">${formatNumber(points)}</p>
                            <p class="mt-1 text-sm text-slate-400">Từ hệ thống lớp học</p>
                        </article>

                        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-semibold text-slate-500">Mục tiêu</span>
                                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><i class="ph-target text-xl"></i></span>
                            </div>
                            <p class="mt-4 text-lg font-bold text-slate-800">${escapeHtml(student.goal || student.learningGoal || 'Chưa thiết lập')}</p>
                            <p class="mt-1 text-sm text-slate-400">Có thể mở rộng ở phase tiếp theo</p>
                        </article>
                    </div>

                    <div class="grid gap-6 lg:grid-cols-2">
                        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h2 class="text-lg font-bold text-slate-800">Tình hình học tập</h2>
                                    <p class="mt-1 text-sm text-slate-500">Tổng quan tiến độ hiện tại</p>
                                </div>
                                <i class="ph-books text-2xl text-indigo-500"></i>
                            </div>
                            <div class="mt-6">
                                <div class="mb-2 flex items-center justify-between text-sm font-semibold">
                                    <span class="text-slate-600">Tiến độ tổng thể</span>
                                    <span class="text-indigo-600">${formatNumber(progress)}%</span>
                                </div>
                                <div class="h-3 overflow-hidden rounded-full bg-slate-100">
                                    <div class="h-full rounded-full bg-indigo-600 transition-all" style="width:${progress}%"></div>
                                </div>
                            </div>
                            <div class="mt-6 rounded-2xl bg-slate-50 p-4">
                                <p class="text-sm font-semibold text-slate-700">Dữ liệu cá nhân</p>
                                <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div><span class="text-slate-400">Mã HS</span><p class="font-semibold text-slate-700">${escapeHtml(student.code || '—')}</p></div>
                                    <div><span class="text-slate-400">Lớp</span><p class="font-semibold text-slate-700">${escapeHtml(student.className || state?.admin?.className || '—')}</p></div>
                                </div>
                            </div>
                        </section>

                        <section class="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
                            <div class="flex items-start gap-4">
                                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                                    <i class="ph-sparkle text-2xl"></i>
                                </div>
                                <div>
                                    <h2 class="text-lg font-bold text-slate-800">AI Recommendation</h2>
                                    <p class="mt-1 text-sm text-slate-500">Khu vực dành cho hệ thống khuyến nghị học tập thông minh.</p>
                                </div>
                            </div>
                            <div class="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-white/80 p-5">
                                <p class="text-sm font-semibold text-indigo-800">Sắp ra mắt</p>
                                <p class="mt-2 text-sm leading-6 text-slate-600">
                                    AI sẽ phân tích dữ liệu học tập để xác định nội dung ưu tiên, gợi ý ôn tập và giải thích lý do của từng khuyến nghị.
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </section>`;
    }

    function mount(containerId, studentId) {
        const container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;

        if (!container) {
            console.warn('[StudentDashboard] Container not found.');
            return false;
        }

        container.innerHTML = render(studentId);
        return true;
    }

    window.StudentDashboard = {
        id: MODULE_ID,
        render,
        mount,
        getStudent,
        getStudents,
        getCurrentStudent
    };

    console.info('[StudentDashboard] Module loaded.');
})();
