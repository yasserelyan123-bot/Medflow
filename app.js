// علامة بداية التشغيل — تُستخدم بواسطة ساعة الإنذار في index.html
// لمعرفة هل app.js بدأ ينفّذ أصلاً أم لا.
window.__clinicflow_started__ = true;

// عرض أي خطأ في بداية التشغيل مكتوبًا على الصفحة نفسها، بدل ما تفضل الشاشة
// بيضاء من غير أي سبب ظاهر (أخطاء البداية عادةً بتروح في console المتصفح بس،
// وده صعب توصله من الموبايل).
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

let supabase;
try {
    if (!window.supabase) {
        throw new Error('مكتبة Supabase لم تُحمَّل من الإنترنت. تحقق من اتصالك، أو أن سطر <script src="...supabase-js@2"> موجود في index.html قبل app.js.');
    }
    if (!window.SUPABASE_URL || window.SUPABASE_URL.includes('YOUR-PROJECT')) {
        throw new Error('لم تضع رابط مشروعك (SUPABASE_URL) في index.html بعد.');
    }
    if (!window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY.includes('YOUR-ANON')) {
        throw new Error('لم تضع مفتاح anon key (SUPABASE_ANON_KEY) في index.html بعد.');
    }
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
} catch (e) {
    showStartupError('فشل الاتصال بـ Supabase', e.message);
    throw e;
}

class ClinicApp {
    constructor() {
        this.session = null;
        this.profile = null;
        this.currentPage = 'login';
        this.selectedPatient = null;
        this.init().catch((e) => {
            console.error(e);
            showStartupError('حدث خطأ أثناء تحميل التطبيق', e.message || String(e));
        });
    }

    async init() {
        // بعض متصفحات الموبايل (خصوصًا المتصفحات المدمجة جوه تطبيقات زي
        // فيسبوك/واتساب) بتعلّق صامتة عند استدعاء getSession() بسبب مشاكل
        // في دعم Web Locks API. نضع حد أقصى 5 ثواني: لو تجاوزناه نكمّل
        // عادي بافتراض عدم وجود جلسة، بدل ما نفضل معلّقين للأبد.
        let session = null;
        try {
            const result = await Promise.race([
                supabase.auth.getSession(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]);
            if (result.error) throw result.error;
            session = result.data.session;
        } catch (e) {
            console.warn('getSession timed out or failed, continuing without session:', e.message);
        }

        this.session = session;
        if (this.session) {
            await this.loadProfile();
        }
        this.currentPage = this.profile ? 'dashboard' : (this.session ? 'complete-signup' : 'login');
        this.render();
        if (this.currentPage === 'dashboard') this.loadDashboard();

        supabase.auth.onAuthStateChange((_event, session) => {
            this.session = session;
        });
    }

    async loadProfile() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.session.user.id)
            .maybeSingle();
        if (!error) this.profile = data;
    }

    logout() {
        supabase.auth.signOut();
        this.session = null;
        this.profile = null;
        this.currentPage = 'login';
        this.render();
    }

    // ---------- Auth ----------
    async login(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: form.get('email'),
            password: form.get('password'),
        });
        if (error) { alert('فشل تسجيل الدخول: ' + error.message); return; }
        this.session = data.session;
        await this.loadProfile();
        this.navigate(this.profile ? 'dashboard' : 'complete-signup');
    }

    async registerAccount(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        const { data, error } = await supabase.auth.signUp({
            email: form.get('email'),
            password: form.get('password'),
        });
        if (error) { alert('فشل إنشاء الحساب: ' + error.message); return; }

        if (!data.session) {
            alert('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب، ثم سجّل الدخول.');
            this.navigate('login');
            return;
        }
        this.session = data.session;
        this._pendingClinicName = form.get('clinic_name');
        this._pendingAdminName = form.get('admin_full_name');
        await this.finishClinicRegistration();
    }

    async finishClinicRegistration() {
        const { error } = await supabase.rpc('register_clinic', {
            p_clinic_name: this._pendingClinicName,
            p_admin_full_name: this._pendingAdminName,
        });
        if (error) { alert('فشل إنشاء العيادة: ' + error.message); return; }
        await this.loadProfile();
        this.navigate('dashboard');
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
        const clinicId = this.profile.clinic_id;
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

        const [{ count: todayAppointments }, { count: totalPatients }, { count: totalVisits }, { count: activePregnancies }] = await Promise.all([
            supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('start_time', startOfDay).lt('start_time', endOfDay),
            supabase.from('patients').select('*', { count: 'exact', head: true }),
            supabase.from('visits').select('*', { count: 'exact', head: true }),
            supabase.from('pregnancies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ]);

        document.getElementById('today-appointments').textContent = todayAppointments ?? 0;
        document.getElementById('total-patients').textContent = totalPatients ?? 0;
        document.getElementById('total-visits').textContent = totalVisits ?? 0;
        document.getElementById('active-pregnancies').textContent = activePregnancies ?? 0;

        const { data: pregnancies } = await supabase
            .from('active_pregnancies_view')
            .select('*, patients(name)')
            .order('edd_date', { ascending: true });

        const el = document.getElementById('active-pregnancies-list');
        if (el) {
            el.innerHTML = (pregnancies && pregnancies.length)
                ? pregnancies.map(p => `
                    <div class="flex justify-between items-center border-b py-2">
                        <span>${p.patients?.name || 'مريضة'}</span>
                        <span class="text-sm text-gray-600">أسبوع ${p.current_ga_weeks ?? '-'} + ${p.current_ga_days ?? 0} يوم</span>
                        <span class="text-xs text-gray-500">EDD: ${p.edd_date ? new Date(p.edd_date).toLocaleDateString('ar-EG') : '-'}</span>
                    </div>`).join('')
                : '<p class="text-gray-500">لا توجد حالات حمل نشطة</p>';
        }
    }

    // ---------- Patients ----------
    async loadPatients() {
        const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
        if (error) { console.error(error); return; }
        this.renderPatients(data);
    }

    async createPatient(event) {
        event.preventDefault();
        const form = new FormData(event.target);

        const { data: branches } = await supabase.from('branches').select('id').eq('clinic_id', this.profile.clinic_id).limit(1);
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
        const { data, error } = await supabase.from('patients').insert(payload).select().single();
        if (error) { alert('حدث خطأ: ' + error.message); return; }
        alert('تم إضافة المريضة/المريض بنجاح! رقم الملف: ' + data.patient_number);
        event.target.reset();
        this.loadPatients();
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

        const { data: patient } = await supabase.from('patients').select('*').eq('id', id).single();
        if (patient) {
            document.getElementById('patient-detail-header').innerHTML = `
                <h2 class="text-xl font-bold">${patient.name}</h2>
                <p class="text-sm text-gray-600">رقم الملف: ${patient.patient_number} — ${patient.phone || ''}</p>
                ${patient.allergies ? `<p class="text-sm text-red-600">حساسية: ${patient.allergies}</p>` : ''}
            `;
        }

        const { data: visits } = await supabase.from('visits').select('*').eq('patient_id', id).order('created_at', { ascending: false });
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

        const { data: readings } = await supabase.from('vital_readings').select('*').eq('patient_id', id).order('reading_date', { ascending: false }).limit(50);
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
        const { error } = await supabase.from('vital_readings').insert(payload);
        if (error) { alert('خطأ: ' + error.message); return; }
        event.target.reset();
        this.loadPatientDetail();
    }

    // ---------- Appointments ----------
    async loadAppointments() {
        const { data } = await supabase.from('appointments').select('*').order('start_time', { ascending: true });
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
