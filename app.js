// ============================================================
// ClinicFlow — نسخة بدون مكتبات خارجية
// ============================================================
// بدل ما نحمّل مكتبة @supabase/supabase-js من CDN خارجي (اللي كان
// بيتعلّق على بعض الأجهزة/المتصفحات)، بنكلّم Supabase مباشرة باستخدام
// fetch() المدمجة في كل متصفح. مفيش أي اعتماد على أي مصدر خارجي غير
// Supabase نفسه.
// ============================================================

window.__clinicflow_started__ = true;

const API_BASE = window.SUPABASE_URL;
const ANON_KEY = window.SUPABASE_ANON_KEY;
const STORAGE_KEY = 'clinicflow_session';

function showStartupError(title, detail) {
    const el = document.getElementById('app');
    if (el) {
        el.innerHTML = `
            <div style="max-width:600px;margin:40px auto;padding:20px;background:#fee;border:2px solid #f88;border-radius:8px;font-family:sans-serif;direction:rtl;text-align:right;">
                <h2 style="color:#c00;margin-top:0;">${title}</h2>
                <p style="color:#600;white-space:pre-wrap;">${detail}</p>
            </div>`;
    }
}

// بديل عن alert() المدمجة في المتصفح — بعض متصفحات الموبايل بتمنع أو
// بتخفي نوافذ alert() الافتراضية، فبدل ما نعتمد عليها، نعرض الرسالة
// كشريط ملوّن ثابت فوق الصفحة، مضمون الظهور دايمًا.
function showMessage(text, type = 'info') {
    const colors = {
        error: { bg: '#fee', border: '#f88', text: '#c00' },
        success: { bg: '#efe', border: '#8c8', text: '#070' },
        info: { bg: '#eef', border: '#88c', text: '#007' },
    };
    const c = colors[type] || colors.info;
    let banner = document.getElementById('clinicflow-message-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'clinicflow-message-banner';
        banner.style.cssText = `position:sticky;top:0;z-index:9999;margin:0;padding:14px 20px;font-family:sans-serif;direction:rtl;text-align:right;font-size:15px;line-height:1.5;`;
        document.body.prepend(banner);
    }
    banner.style.background = c.bg;
    banner.style.borderBottom = `2px solid ${c.border}`;
    banner.style.color = c.text;
    banner.textContent = text;
    banner.style.display = 'block';
    clearTimeout(window.__clinicflow_msg_timeout__);
    window.__clinicflow_msg_timeout__ = setTimeout(() => { banner.style.display = 'none'; }, 8000);
}

// ---------- طبقة اتصال خام بـ Supabase (بدون أي مكتبة) ----------

async function authRequest(path, body) {
    const res = await fetch(`${API_BASE}/auth/v1/${path}`, {
        method: 'POST',
        headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error_description || data.msg || data.error || 'حدث خطأ في المصادقة');
    }
    return data;
}

async function getAuthUser(accessToken) {
    const res = await fetch(`${API_BASE}/auth/v1/user`, {
        headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + accessToken },
    });
    if (!res.ok) return null;
    return res.json();
}

async function pgFetch(path, { method = 'GET', body, accessToken, extraHeaders = {} } = {}) {
    const res = await fetch(`${API_BASE}/rest/v1/${path}`, {
        method,
        headers: {
            'apikey': ANON_KEY,
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
        const msg = (data && (data.message || data.error_description || data.msg)) || 'حدث خطأ في الطلب';
        throw new Error(msg);
    }
    return data;
}

function pgRpc(fnName, params, accessToken) {
    return pgFetch(`rpc/${fnName}`, { method: 'POST', body: params, accessToken });
}

function saveSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadStoredSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
}

// ---------- التطبيق ----------

class ClinicApp {
    constructor() {
        this.session = null; // { access_token, refresh_token, user }
        this.profile = null;
        this.currentPage = 'login';
        this.selectedPatient = null;
        this.init().catch((e) => {
            console.error(e);
            showStartupError('حدث خطأ أثناء تحميل التطبيق', e.message || String(e));
        });
    }

    async init() {
        const stored = loadStoredSession();
        if (stored && stored.access_token) {
            const user = await getAuthUser(stored.access_token);
            if (user) {
                this.session = { ...stored, user };
            } else if (stored.refresh_token) {
                try {
                    const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: stored.refresh_token });
                    this.session = refreshed;
                    saveSession(refreshed);
                } catch {
                    clearSession();
                }
            } else {
                clearSession();
            }
        }

        if (this.session) {
            await this.loadProfile();
        }
        this.currentPage = this.profile ? 'dashboard' : (this.session ? 'complete-signup' : 'login');
        this.render();
        if (this.currentPage === 'dashboard') this.loadDashboard();
    }

    async loadProfile() {
        try {
            const rows = await pgFetch(`profiles?id=eq.${this.session.user.id}&select=*`, {
                accessToken: this.session.access_token,
            });
            this.profile = rows && rows[0] ? rows[0] : null;
        } catch (e) {
            console.error(e);
            this.profile = null;
        }
    }

    logout() {
        clearSession();
        this.session = null;
        this.profile = null;
        this.currentPage = 'login';
        this.render();
    }

    // ---------- Auth ----------
    async login(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        try {
            const session = await authRequest('token?grant_type=password', {
                email: form.get('email'),
                password: form.get('password'),
            });
            this.session = session;
            saveSession(session);
            await this.loadProfile();
            this.navigate(this.profile ? 'dashboard' : 'complete-signup');
        } catch (e) {
            showMessage('فشل تسجيل الدخول: ' + e.message, 'error');
        }
    }

    async registerAccount(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        try {
            const result = await authRequest('signup', {
                email: form.get('email'),
                password: form.get('password'),
            });
            if (!result.access_token) {
                showMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب، ثم سجّل الدخول. (إذا لم تصلك رسالة، تأكد أن "Confirm email" مطفأ في إعدادات Supabase)', 'info');
                this.navigate('login');
                return;
            }
            this.session = result;
            saveSession(result);
            this._pendingClinicName = form.get('clinic_name');
            this._pendingAdminName = form.get('admin_full_name');
            await this.finishClinicRegistration();
        } catch (e) {
            showMessage('فشل إنشاء الحساب: ' + e.message, 'error');
        }
    }

    async finishClinicRegistration() {
        try {
            await pgRpc('register_clinic', {
                p_clinic_name: this._pendingClinicName,
                p_admin_full_name: this._pendingAdminName,
            }, this.session.access_token);
            await this.loadProfile();
            this.navigate('dashboard');
        } catch (e) {
            showMessage('فشل إنشاء العيادة: ' + e.message, 'error');
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
        const token = this.session.access_token;
        try {
            const [todayAppointments, totalPatients, totalVisits, activePregnancies] = await Promise.all([
                this._todayAppointmentsCount(token),
                pgFetch('patients?select=id', { accessToken: token }),
                pgFetch('visits?select=id', { accessToken: token }),
                pgFetch('pregnancies?status=eq.active&select=id', { accessToken: token }),
            ]);
            document.getElementById('today-appointments').textContent = todayAppointments;
            document.getElementById('total-patients').textContent = totalPatients.length;
            document.getElementById('total-visits').textContent = totalVisits.length;
            document.getElementById('active-pregnancies').textContent = activePregnancies.length;
        } catch (e) { console.error(e); }

        try {
            const pregnancies = await pgFetch('active_pregnancies_view?select=*&order=edd_date.asc', { accessToken: token });
            let patientsById = {};
            if (pregnancies && pregnancies.length) {
                const ids = pregnancies.map(p => p.patient_id).join(',');
                const patients = await pgFetch(`patients?id=in.(${ids})&select=id,name`, { accessToken: token });
                patientsById = Object.fromEntries(patients.map(p => [p.id, p.name]));
            }
            const el = document.getElementById('active-pregnancies-list');
            if (el) {
                el.innerHTML = (pregnancies && pregnancies.length)
                    ? pregnancies.map(p => `
                        <div class="flex justify-between items-center border-b py-2">
                            <span>${patientsById[p.patient_id] || 'مريضة'}</span>
                            <span class="text-sm text-gray-600">أسبوع ${p.current_ga_weeks ?? '-'} + ${p.current_ga_days ?? 0} يوم</span>
                            <span class="text-xs text-gray-500">EDD: ${p.edd_date ? new Date(p.edd_date).toLocaleDateString('ar-EG') : '-'}</span>
                        </div>`).join('')
                    : '<p class="text-gray-500">لا توجد حالات حمل نشطة</p>';
            }
        } catch (e) { console.error(e); }
    }

    async _todayAppointmentsCount(token) {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        const rows = await pgFetch(`appointments?select=id&start_time=gte.${start}&start_time=lt.${end}`, { accessToken: token });
        return rows.length;
    }

    // ---------- Patients ----------
    async loadPatients() {
        try {
            const data = await pgFetch('patients?select=*&order=created_at.desc', { accessToken: this.session.access_token });
            this.renderPatients(data);
        } catch (e) { console.error(e); }
    }

    async createPatient(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        const token = this.session.access_token;
        try {
            const branches = await pgFetch(`branches?clinic_id=eq.${this.profile.clinic_id}&select=id&limit=1`, { accessToken: token });
            const branchId = branches && branches[0] ? branches[0].id : null;

            const payload = {
                clinic_id: this.profile.clinic_id,
                branch_id: branchId,
                name: form.get('name'),
                gender: form.get('gender'),
                phone: form.get('phone'),
                date_of_birth: form.get('date_of_birth') || null,
                allergies: form.get('allergies') || null,
                chronic_conditions: form.get('chronic_conditions') || null,
            };
            const rows = await pgFetch('patients', {
                method: 'POST', body: payload, accessToken: token,
                extraHeaders: { 'Prefer': 'return=representation' },
            });
            const patient = rows[0];
            showMessage('تم إضافة المريضة/المريض بنجاح! رقم الملف: ' + patient.patient_number, 'success');
            event.target.reset();
            this.loadPatients();
        } catch (e) {
            showMessage('حدث خطأ: ' + e.message, 'error');
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

    // ---------- Patient detail ----------
    async loadPatientDetail() {
        const id = this.selectedPatient?.id;
        if (!id) return;
        const token = this.session.access_token;

        try {
            const rows = await pgFetch(`patients?id=eq.${id}&select=*`, { accessToken: token });
            const patient = rows[0];
            if (patient) {
                document.getElementById('patient-detail-header').innerHTML = `
                    <h2 class="text-xl font-bold">${patient.name}</h2>
                    <p class="text-sm text-gray-600">رقم الملف: ${patient.patient_number} — ${patient.phone || ''}</p>
                    ${patient.allergies ? `<p class="text-sm text-red-600">حساسية: ${patient.allergies}</p>` : ''}
                `;
            }
        } catch (e) { console.error(e); }

        try {
            const visits = await pgFetch(`visits?patient_id=eq.${id}&select=*&order=created_at.desc`, { accessToken: token });
            document.getElementById('patient-visits').innerHTML = (visits && visits.length)
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
            const readings = await pgFetch(`vital_readings?patient_id=eq.${id}&select=*&order=reading_date.desc&limit=50`, { accessToken: token });
            document.getElementById('patient-vitals').innerHTML = (readings && readings.length)
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
        const payload = { clinic_id: this.profile.clinic_id, patient_id: id, reading_type: type, recorded_by: this.profile.id };
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
            await pgFetch('vital_readings', { method: 'POST', body: payload, accessToken: this.session.access_token });
            event.target.reset();
            this.loadPatientDetail();
        } catch (e) {
            alert('خطأ: ' + e.message);
        }
    }

    // ---------- Appointments ----------
    async loadAppointments() {
        try {
            const data = await pgFetch('appointments?select=*&order=start_time.asc', { accessToken: this.session.access_token });
            const container = document.getElementById('appointments-list');
            container.innerHTML = (data && data.length)
                ? data.map(a => `
                    <div class="bg-white p-4 rounded-lg shadow mb-3">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="font-bold">موعد</h3>
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
        if (!this.profile) {
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
        if (this.currentPage === 'complete-signup') {
            return `
            <div class="min-h-screen flex items-center justify-center bg-gray-100">
                <div class="bg-white p-8 rounded-lg shadow w-full max-w-md">
                    <h1 class="text-2xl font-bold text-blue-600 mb-2">🏥 استكمال إنشاء العيادة</h1>
                    <p class="text-sm text-gray-600 mb-6">حسابك موجود لكن لم يتم إنشاء ملف العيادة بعد. أكمل البيانات:</p>
                    <form id="complete-signup-form" class="space-y-4">
                        <input name="clinic_name" placeholder="اسم العيادة" required class="w-full px-4 py-2 border rounded-lg">
                        <input name="admin_full_name" placeholder="اسم المدير/الطبيب" required class="w-full px-4 py-2 border rounded-lg">
                        <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">إنشاء العيادة</button>
                    </form>
                </div>
            </div>`;
        }
        if (this.currentPage === 'register') {
            return `
            <div class="min-h-screen flex items-center justify-center bg-gray-100">
                <div class="bg-white p-8 rounded-lg shadow w-full max-w-md">
                    <h1 class="text-2xl font-bold text-blue-600 mb-6">🏥 إنشاء عيادة جديدة</h1>
                    <form id="register-form" class="space-y-4">
                        <input name="clinic_name" placeholder="اسم العيادة" required class="w-full px-4 py-2 border rounded-lg">
                        <input name="admin_full_name" placeholder="اسم المدير/الطبيب" required class="w-full px-4 py-2 border rounded-lg">
                        <input name="email" type="email" placeholder="البريد الإلكتروني" required class="w-full px-4 py-2 border rounded-lg">
                        <input name="password" type="password" placeholder="كلمة المرور (6 أحرف على الأقل)" required minlength="6" class="w-full px-4 py-2 border rounded-lg">
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
                    <input name="email" type="email" placeholder="البريد الإلكتروني" required class="w-full px-4 py-2 border rounded-lg">
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
        if (registerForm) registerForm.addEventListener('submit', (e) => this.registerAccount(e));
        const completeForm = document.getElementById('complete-signup-form');
        if (completeForm) completeForm.addEventListener('submit', (e) => this.completeSignup(e));
        const goRegister = document.getElementById('go-register');
        if (goRegister) goRegister.addEventListener('click', (e) => { e.preventDefault(); this.currentPage = 'register'; this.render(); });
        const goLogin = document.getElementById('go-login');
        if (goLogin) goLogin.addEventListener('click', (e) => { e.preventDefault(); this.currentPage = 'login'; this.render(); });
    }

    async completeSignup(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        this._pendingClinicName = form.get('clinic_name');
        this._pendingAdminName = form.get('admin_full_name');
        await this.finishClinicRegistration();
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
