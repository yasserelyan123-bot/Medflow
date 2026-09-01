# ClinicFlow API

Backend مبني بـ FastAPI + SQLAlchemy، يدعم:
- تسجيل دخول حقيقي بـ JWT وعزل كامل بين بيانات كل عيادة (Multi-tenant)
- صلاحيات حسب الدور (admin / doctor / receptionist / nurse)
- المرضى، المواعيد، الزيارات، الوصفات، الفواتير
- **وحدة الحمل والتوليد**: LMP/EDD، عمر الحمل التلقائي، متابعة ANC، قياسات الجنين، سجل الولادة
- **وحدة متابعة الأمراض المزمنة**: تشخيص الحالة + سجل قياسات زمني للضغط والسكر وغيرها (لعمل رسم بياني لتطور الحالة)
- سجل تدقيق (Audit Log) لكل عملية إنشاء/تعديل/عرض حساسة

## التشغيل محليًا

```bash
cd backend
python -m venv venv
source venv/bin/activate      # على Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # وغيّر SECRET_KEY
uvicorn app.main:app --reload
```

الـ API هيشتغل على `http://localhost:8000`، والتوثيق التفاعلي على `http://localhost:8000/docs`.

## أول خطوة بعد التشغيل: إنشاء عيادة

مفيش بيانات افتراضية أو مستخدم admin جاهز، لازم تعمل أول عيادة بنفسك عن طريق:

```
POST /api/v1/auth/register-clinic
```

بالـ query params: `clinic_name`, `admin_full_name`, `admin_username`, `admin_password`, `admin_email` (اختياري).

بعدها استخدم `/api/v1/auth/login` (OAuth2 password flow) عشان تاخد access token، وابعته في كل طلب لاحق كـ:

```
Authorization: Bearer <token>
```

## بنية المشروع

```
app/
├── core/       # config, database, security, JWT deps, audit helper
├── models/     # SQLAlchemy tables
├── schemas/    # Pydantic request/response shapes
├── services/   # منطق الأعمال (كل استعلام معزول بـ clinic_id)
└── api/v1/     # الـ routers والـ endpoints
```

## ملاحظات أمان مهمة قبل أي استخدام حقيقي (Production)

- غيّر `SECRET_KEY` في `.env` لقيمة عشوائية طويلة.
- انتقل من SQLite إلى PostgreSQL (`DATABASE_URL`).
- ضيّق `allow_origins` في `main.py` بدل `"*"`.
- فعّل HTTPS/TLS أمام الخادم.
- راجع متطلبات حماية البيانات الصحية في بلدك قبل التشغيل التجاري.
