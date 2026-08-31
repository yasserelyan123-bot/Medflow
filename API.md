# API Overview

Base URL: `/api/v1`. كل الـ endpoints (ما عدا `/auth/login` و `/auth/register-clinic`) تحتاج:
```
Authorization: Bearer <token>
```

## Auth
- `POST /auth/register-clinic` — إنشاء عيادة جديدة + أول مستخدم admin
- `POST /auth/login` — تسجيل الدخول (OAuth2 password flow)
- `GET /auth/me` — بيانات المستخدم الحالي

## Users
- `POST /users` — إضافة موظف (admin فقط)
- `GET /users` — قائمة موظفي العيادة

## Patients
- `POST /patients`
- `GET /patients?search=`
- `GET /patients/{id}`

## Appointments
- `POST /appointments`
- `GET /appointments?date=&doctor_id=`
- `PATCH /appointments/{id}/status`

## Visits
- `POST /visits`
- `GET /visits/patient/{patient_id}`

## Prescriptions
- `POST /prescriptions`

## Pregnancy & ANC
- `POST /pregnancies` — بدء ملف حمل جديد (LMP → EDD تُحسب تلقائيًا)
- `GET /pregnancies/active` — كل حالات الحمل النشطة مرتبة بأقرب موعد ولادة
- `GET /pregnancies/{id}` — بيانات الحمل + عمر الحمل الحالي محسوبًا
- `POST /pregnancies/anc-visits` — تسجيل زيارة متابعة حمل
- `GET /pregnancies/{id}/anc-visits` — سجل زيارات المتابعة
- `POST /pregnancies/deliveries` — تسجيل الولادة (يقفل ملف الحمل تلقائيًا)

## Chronic Disease Follow-up
- `POST /chronic/conditions` — تسجيل تشخيص مرض مزمن (سكر، ضغط، ...)
- `GET /chronic/conditions/patient/{id}`
- `POST /chronic/readings` — تسجيل قياسة (ضغط/سكر/وزن/...)
- `GET /chronic/readings/patient/{id}?reading_type=` — السجل الزمني الكامل للقياسات

## Dashboard
- `GET /dashboard/stats`
