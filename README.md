# ClinicFlow

نظام إدارة عيادات طبية متعدد التخصصات.

## التشغيل

### Backend
```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
