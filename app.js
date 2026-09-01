const API_URL = (window.CLINICFLOW_API_URL) || 'http://localhost:8000/api/v1';

class ClinicApp {
    constructor() {
        this.token = localStorage.getItem('clinicflow_token') || null;
        this.currentPage = this.token ? 'dashboard' : 'login';
        this.selectedPatient = null;
        this.init();
    }

    init() {
        this.render();
        if (this.token) this.loadDashboard();
    }

    // ---------- API helper ----------
    async api(path, options = {}) {
        const headers = options.headers || {};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        if (options.body && !(options.body instanceof URLSearchParams)) {
            headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(`${API_URL}${path}`, { ...options, headers });
        if (res.status === 401) {
            this.logout();
            throw new Error('Unauthorized');
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'خطأ غير متوقع' }));
            throw new Error(err.detail || 'خطأ غير متوقع');
        }
        return res.status === 204 ? null : res.json();
    }

    logout() {
        this.token = null;
        localStorage.removeItem('clinicflow_token');
        this.currentPage = 'login';
        this.render();
    }

    // ---------- Auth ----------
    async login(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        const body = new URLSearchParams();
        body.set('username', form.get('username'));
        body.set('password', form.get('password'));
        try {
            const data = await this.api('/auth/login', { method: 'POST', body });
            this.token = data.access_token;
            localStorage.setItem('clinicflow_token', this.token);
            this.navigate('dashboard');
        } catch (e) {
            alert('فشل تسجيل الدخول: ' + e.message);
        }
    }

    async registerClinic(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        const params = new URLSearchParams({
            clinic_name: form.get('clinic_name'),
            admin_full_name: form.get('admin_full_name'),
            admin_username: form.get('admin_username'),
            admin_password: form.get('admin_password'),
        });
        try {
            await this.api(`/auth/register-clinic?${params.toString()}`, { method: 'POST' });
            alert('تم إنشاء العيادة بنجاح، سجّل الدخول الآن');
            this.navigate('login');
        } catch (e) {
            alert('فشل إنشاء العيادة: ' + e.message);
        }
    }

    // ---------- Navigation ----------
    navigate(page, data = null) {
        this.currentPage = page;
        if (data) this.selectedPatient = data;
        this.render();
        if (page === 'dashboard') this.loadDashboard();
        if (page === 'patients') this.loadPatients();
        if (page === 'appointments') this.loadAppointments();
        if (page === 'patient-detail') this.loadPatientDetail();
    }

    // ---------- Dashboard ----------
    async loadDashboard() {
        try {
            const stats = await this.api('/dashboard/stats');
            document.getElementById('today-appointments').textContent = stats.today_appointments ?? 0;
            document.getElementById('total-patients').textContent = stats.total_patients ?? 0;
            document.getElementById('total-visits').textContent = stats.total_visits ?? 0;
            document.getElementById('active-pregnancies').textContent = stats.active_pregnancies ?? 0;
        } catch (e) { console.error(e); }

        try {
            const pregnancies = await this.api('/pregnancies/active');
            const el = document.getElementById('active-pregnancies-list');
            if (el) {
                el.innerHTML = pregnancies.length
                    ? pregnancies.map(p => `
                        <div class="flex justify-between items-center border-b py-2">
                            <span>مريضة #${p.patient_id}</span>
                            <span class="text-sm text-gray-600">
                                أسبوع ${p.current_gestational_age_weeks ?? '-'} +
                                ${p.current_gestational_age_days ?? 0} يوم
                            </span>
                            <span class="text-xs text-gray-500">EDD: ${p.edd_date ? new Date(p.edd_date).toLocaleDateString('ar-EG') : '-'}</span>
                        </div>`).join('')
                    : '<p class="text-gray-500">لا توجد حالات حمل نشطة</p>';
            }
        } catch (e) { console.error(e); }
    }

    // ---------- Patients ----------
    async loadPatients() {
        try {
            const patients = await this.api('/patients');
            this.renderPatients(patients);
        } catch (e) { console.error(e); }
    }

    async createPatient(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        const payload = {
            branch_id: 1,
            name: form.get('name'),
            gender: form.get('gender'),
            phone: form.get('phone'),
            email: form.get('email') || null,
            date_of_birth: form.get('date_of_birth') || null,
            allergies: form.get('allergies') || null,
            chronic_conditions: form.get('chronic_conditions') || null,
        };
        try {
            const patient = await this.api('/patients', { method: 'POST', body: JSON.stringify(payload) });
            alert('تم إضافة المريضة/المريض بنجاح! رقم الملف: ' + patient.patient_number);
            event.target.reset();
            this.loadPatients();
        } catch (e) {
            alert('حدث خطأ: ' + e.message);
        }
    }

    renderPatients(patients) {
        const container = document.getElementById('patients-list');
        if (!container) return;
        if (!patients || patients.length === 0) {
            container.innerHTML = '<p class="text-gray-500">لا يوجد مرضى</p>';
            return;
        }
        container.innerHTML = patients.map(p => `
            <div class="bg-white p-4 rounded-lg shadow mb-3">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-lg">${p.name}</h3>
                        <p class="text-sm text-gray-600">رقم الملف: ${p.patient_number}</p>
                        <p class="text-sm text-gray-600">الهاتف: ${p.phone || '-'}</p>
                    </div>
                    <button data-id="${p.id}" class="view-patient-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        عرض الملف
                    </button>
                </div>
            </div>
        `).join('');
        container.querySelectorAll('.view-patient-btn').forEach(btn => {
            btn.addEventListener('click', () => this.navigate('patient-detail', { id: btn.dataset.id }));
        });
    }

    // ---------- Patient detail: visits + pregnancy + chronic vitals ----------
    async loadPatientDetail() {
        const id = this.selectedPatient?.id;
        if (!id) return;
        try {
            const patient = await this.api(`/patients/${id}`);
            document.getElementById('patient-detail-header').innerHTML = `
                <h2 class="text-xl font-bold">${patient.name}</h2>
                <p class="text-sm text-gray-600">رقم الملف: ${patient.patient_number} — ${patient.phone || ''}</p>
                ${patient.allergies ? `<p class="text-sm text-red-600">حساسية: ${patient.allergies}</p>` : ''}
            `;
        } catch (e) { console.error(e); }

        try {
            const visits = await this.api(`/visits/patient/${id}`);
            document.getElementById('patient-visits').innerHTML = visits.length
                ? visits.map(v => `
                    <div class="border-b py-2">
                        <div class="flex justify-between">
                            <span class="font-semibold">${v.diagnosis || v.chief_complaint}</span>
                            <span class="text-xs text-gray-500">${new Date(v.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                        ${v.bp_systolic ? `<p class="text-sm text-gray-600">ضغط: ${v.bp_systolic}/${v.bp_diastolic}</p>` : ''}
                    </div>`).join('')
                : '<p class="text-gray-500">لا توجد زيارات مسجلة</p>';
        } catch (e) { console.error(e); }

        try {
            const readings = await this.api(`/chronic/readings/patient/${id}`);
            document.getElementById('patient-vitals').innerHTML = readings.length
                ? readings.map(r => `
                    <div class="border-b py-2 flex justify-between">
                        <span>
                            ${r.reading_type === 'blood_pressure' ? `ضغط: ${r.systolic}/${r.diastolic}` : ''}
                            ${r.reading_type === 'blood_glucose' ? `سكر: ${r.glucose_value} (${r.glucose_context || ''})` : ''}
                            ${!['blood_pressure', 'blood_glucose'].includes(r.reading_type) ? `${r.reading_type}: ${r.value ?? ''} ${r.unit ?? ''}` : ''}
                        </span>
                        <span class="text-xs ${r.is_abnormal === 'high' || r.is_abnormal === 'critical' ? 'text-red-600' : 'text-gray-500'}">
                            ${new Date(r.reading_date).toLocaleDateString('ar-EG')} ${r.is_abnormal ? '· ' + r.is_abnormal : ''}
                        </span>
                    </div>`).join('')
                : '<p class="text-gray-500">لا توجد قياسات مسجلة</p>';
        } catch (e) { console.error(e); }
    }

    async addVitalReading(event) {
        event.preventDefault();
        const id = this.selectedPatient?.id;
        const form = new FormData(event.target);
        const type = form.get('reading_type');
        const payload = { patient_id: parseInt(id), reading_type: type };
        if (type === 'blood_pressure') {
            payload.systolic = parseFloat(form.get('systolic'));
            payload.diastolic = parseFloat(form.get('diastolic'));
        } else if (type === 'blood_glucose') {
            payload.glucose_value = parseFloat(form.get('glucose_value'));
            payload.glucose_context = form.get('glucose_context');
        } else {
            payload.value = parseFloat(form.get('value'));
            payload.unit = form.get('unit');
        }
        try {
            await this.api('/chronic/readings', { method: 'POST', body: JSON.stringify(payload) });
            event.target.reset();
            this.loadPatientDetail();
        } catch (e) {
            alert('خطأ: ' + e.message);
        }
    }

    // ---------- Appointments ----------
    async loadAppointments() {
        try {
            const appointments = await this.api('/appointments');
            const container = document.getElementById('appointments-list');
            container.innerHTML = appointments.length
                ? appointments.map(a => `
                    <div class="bg-white p-4 rounded-lg shadow mb-3">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="font-bold">مريض #${a.patient_id}</h3>
                                <p class="text-sm text-gray-600">${new Date(a.start_time).toLocaleString('ar-EG')}</p>
                            </div>
                            <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">${a.status}</span>
                        </div>
                    </div>`).join('')
                : '<p class="text-gray-500">لا توجد مواعيد</p>';
        } catch (e) { console.error(e); }
    }

    // ---------- Render ----------
    render() {
        const app = document.getElementById('app');
        if (!this.token) {
            app.innerHTML = this.renderAuthPages();
            this.bindAuthForms();
            return;
        }
        app.innerHTML = `
            <nav class="bg-white shadow-lg">
                <div class="max-w-7xl mx-auto px-4">
                    <div class="flex justify-between h-16 items-center">
                        <h1 class="text-2xl font-bold text-blue-600">🏥 ClinicFlow</h1>
                        <div class="flex items-center gap-2">
                            <button data-nav="dashboard" class="nav-btn px-4 py-2 rounded hover:bg-gray-100 ${this.currentPage === 'dashboard' ? 'bg-blue-500 text-white' : ''}">الرئيسية</button>
                            <button data-nav="patients" class="nav-btn px-4 py-2 rounded hover:bg-gray-100 ${this.currentPage === 'patients' ? 'bg-blue-500 text-white' : ''}">المرضى</button>
                            <button data-nav="appointments" class="nav-btn px-4 py-2 rounded hover:bg-gray-100 ${this.currentPage === 'appointments' ? 'bg-blue-500 text-white' : ''}">المواعيد</button>
                            <button id="logout-btn" class="px-4 py-2 rounded text-red-600 hover:bg-red-50">خروج</button>
                        </div>
                    </div>
                </div>
            </nav>
            <main class="max-w-7xl mx-auto px-4 py-8">${this.renderCurrentPage()}</main>
        `;
        app.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => this.navigate(btn.dataset.nav)));
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        this.bindPageForms();
    }

    renderAuthPages() {
        if (this.currentPage === 'register') {
            return `
            <div class="min-h-screen flex items-center justify-center bg-gray-100">
                <div class="bg-white p-8 rounded-lg shadow w-full max-w-md">
                    <h1 class="text-2xl font-bold text-blue-600 mb-6">🏥 إنشاء عيادة جديدة</h1>
                    <form id="register-form" class="space-y-4">
                        <input name="clinic_name" placeholder="اسم العيادة" required class="w-full px-4 py-2 border rounded-lg">
                        <input name="admin_full_name" placeholder="اسم المدير/الطبيب" required class="w-full px-4 py-2 border rounded-lg">
                        <input name="admin_username" placeholder="اسم المستخدم" required class="w-full px-4 py-2 border rounded-lg">
                        <input name="admin_password" type="password" placeholder="كلمة المرور" required class="w-full px-4 py-2 border rounded-lg">
                        <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">إنشاء العيادة</button>
                    </form>
                    <p class="mt-4 text-sm text-center">
                        <a href="#" id="go-login" class="text-blue-600">لديك حساب بالفعل؟ سجّل الدخول</a>
                    </p>
                </div>
            </div>`;
        }
        return `
        <div class="min-h-screen flex items-center justify-center bg-gray-100">
            <div class="bg-white p-8 rounded-lg shadow w-full max-w-md">
                <h1 class="text-2xl font-bold text-blue-600 mb-6">🏥 ClinicFlow — تسجيل الدخول</h1>
                <form id="login-form" class="space-y-4">
                    <input name="username" placeholder="اسم المستخدم" required class="w-full px-4 py-2 border rounded-lg">
                    <input name="password" type="password" placeholder="كلمة المرور" required class="w-full px-4 py-2 border rounded-lg">
                    <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">دخول</button>
                </form>
                <p class="mt-4 text-sm text-center">
                    <a href="#" id="go-register" class="text-blue-600">عيادة جديدة؟ أنشئ حسابًا</a>
                </p>
            </div>
        </div>`;
    }

    bindAuthForms() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.login(e));
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.addEventListener('submit', (e) => this.registerClinic(e));
        const goRegister = document.getElementById('go-register');
        if (goRegister) goRegister.addEventListener('click', (e) => { e.preventDefault(); this.currentPage = 'register'; this.render(); });
        const goLogin = document.getElementById('go-login');
        if (goLogin) goLogin.addEventListener('click', (e) => { e.preventDefault(); this.currentPage = 'login'; this.render(); });
    }

    bindPageForms() {
        const patientForm = document.getElementById('patient-form');
        if (patientForm) patientForm.addEventListener('submit', (e) => this.createPatient(e));
        const vitalForm = document.getElementById('vital-form');
        if (vitalForm) vitalForm.addEventListener('submit', (e) => this.addVitalReading(e));
        const backBtn = document.getElementById('back-to-patients');
        if (backBtn) backBtn.addEventListener('click', () => this.navigate('patients'));
    }

    renderCurrentPage() {
        switch (this.currentPage) {
            case 'patients': return this.renderPatientsPage();
            case 'appointments': return this.renderAppointmentsPage();
            case 'patient-detail': return this.renderPatientDetailPage();
            default: return this.renderDashboard();
        }
    }

    renderDashboard() {
        return `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-gray-600 text-sm">مواعيد اليوم</h3>
                    <p id="today-appointments" class="text-3xl font-bold text-blue-600">0</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-gray-600 text-sm">إجمالي المرضى</h3>
                    <p id="total-patients" class="text-3xl font-bold text-green-600">0</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-gray-600 text-sm">إجمالي الزيارات</h3>
                    <p id="total-visits" class="text-3xl font-bold text-purple-600">0</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-gray-600 text-sm">حالات حمل نشطة</h3>
                    <p id="active-pregnancies" class="text-3xl font-bold text-pink-600">0</p>
                </div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-xl font-bold mb-4">متابعة الحمل النشطة</h2>
                <div id="active-pregnancies-list"></div>
            </div>
        `;
    }

    renderPatientsPage() {
        return `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-1">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h2 class="text-xl font-bold mb-4">إضافة مريض جديد</h2>
                        <form id="patient-form" class="space-y-4">
                            <input type="text" name="name" placeholder="اسم المريض" required class="w-full px-4 py-2 border rounded-lg">
                            <select name="gender" class="w-full px-4 py-2 border rounded-lg">
                                <option value="female">أنثى</option>
                                <option value="male">ذكر</option>
                            </select>
                            <input type="text" name="phone" placeholder="رقم الهاتف" required class="w-full px-4 py-2 border rounded-lg">
                            <input type="date" name="date_of_birth" class="w-full px-4 py-2 border rounded-lg">
                            <input type="text" name="allergies" placeholder="الحساسية (إن وجدت)" class="w-full px-4 py-2 border rounded-lg">
                            <input type="text" name="chronic_conditions" placeholder="أمراض مزمنة (إن وجدت)" class="w-full px-4 py-2 border rounded-lg">
                            <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">إضافة</button>
                        </form>
                    </div>
                </div>
                <div class="lg:col-span-2">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h2 class="text-xl font-bold mb-4">قائمة المرضى</h2>
                        <div id="patients-list"></div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAppointmentsPage() {
        return `
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-xl font-bold mb-4">المواعيد</h2>
                <div id="appointments-list"></div>
            </div>
        `;
    }

    renderPatientDetailPage() {
        return `
            <button id="back-to-patients" class="mb-4 text-blue-600">&rarr; رجوع لقائمة المرضى</button>
            <div id="patient-detail-header" class="bg-white p-6 rounded-lg shadow mb-6"></div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="font-bold mb-3">سجل الزيارات</h3>
                    <div id="patient-visits"></div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="font-bold mb-3">متابعة السكر والضغط</h3>
                    <form id="vital-form" class="space-y-2 mb-4 border-b pb-4">
                        <select name="reading_type" class="w-full px-3 py-2 border rounded-lg">
                            <option value="blood_pressure">ضغط الدم</option>
                            <option value="blood_glucose">سكر الدم</option>
                            <option value="weight">الوزن</option>
                        </select>
                        <div class="grid grid-cols-2 gap-2">
                            <input name="systolic" placeholder="الانقباضي" type="number" class="px-3 py-2 border rounded-lg">
                            <input name="diastolic" placeholder="الانبساطي" type="number" class="px-3 py-2 border rounded-lg">
                        </div>
                        <input name="glucose_value" placeholder="قيمة السكر" type="number" class="w-full px-3 py-2 border rounded-lg">
                        <select name="glucose_context" class="w-full px-3 py-2 border rounded-lg">
                            <option value="fasting">صائم</option>
                            <option value="postprandial">بعد الأكل</option>
                            <option value="random">عشوائي</option>
                        </select>
                        <input name="value" placeholder="القيمة (للوزن مثلاً)" type="number" class="w-full px-3 py-2 border rounded-lg">
                        <input name="unit" placeholder="الوحدة (kg مثلاً)" class="w-full px-3 py-2 border rounded-lg">
                        <button type="submit" class="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600">تسجيل قياسة</button>
                    </form>
                    <div id="patient-vitals"></div>
                </div>
            </div>
        `;
    }
}

const app = new ClinicApp();
