# MedFlow V1

Medical clinic management foundation rebuilt from the strongest parts of the supplied ClinicFlow implementation.

## V1
- React + TypeScript + Vite frontend
- FastAPI + SQLAlchemy backend
- JWT authentication
- Clinic-scoped data access
- Role checks for admin staff management
- Patient management/search
- Appointment listing/status API
- Doctor appointment overlap protection
- Branch/patient/doctor clinic validation
- Pregnancy/chronic data models retained for later modules
- GitHub Pages workflow with `/Medflow/` Vite base
- Render-ready backend

## Development
Backend:
`cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`

Frontend:
`cd frontend && npm install && npm run dev`

Set `VITE_API_URL` to the deployed backend API URL for production.
