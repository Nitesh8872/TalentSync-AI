# TalentSync AI Setup Guide

## Requirements

- Python 3.12 or newer
- `pip`
- Node.js 20 or newer
- npm
- A terminal opened at the repository root

## 1. Create a Virtual Environment

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### macOS or Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 2. Install Dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

Main dependencies include FastAPI, Uvicorn, SQLAlchemy, pypdf, multipart form
support, Passlib, and bcrypt.

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

## 3. Start the Backend

From the repository root:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

## 4. Start the Frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Open the application:

[http://localhost:5173](http://localhost:5173/)

API documentation:

[http://localhost:8000/docs](http://localhost:8000/docs)

## Database Notes

The application uses SQLite.

```text
data/resumes.db
```

Database tables are initialized during FastAPI startup. Existing data is
preserved when the application restarts.

Do not delete or replace the database during routine setup or refactoring.

The repository may contain a legacy root-level database from earlier
development. The active application database is the file under `data/`.

## Application URLs

### Public

- `/`: landing page

### Candidate

- `/candidate/register`
- `/candidate/login`
- `/candidate/dashboard`
- `/candidate/resume-upload`
- `/candidate/job-description`
- `/candidate/matching`
- `/candidate/browse-jobs`
- `/candidate/recommended-jobs`

### Recruiter

- `/recruiter/register`
- `/recruiter/login`
- `/recruiter/dashboard`
- `/recruiter/create-job`
- `/recruiter/candidate-matches`

## Verification

Verify application imports:

```bash
python -c "from backend.main import app; print('Import OK')"
```

Run repository audits:

```bash
python scripts/audit_backend.py
python scripts/audit_api_workflows.py
python scripts/audit_code_quality.py
node scripts/audit_frontend.js
cd frontend
npm run lint
npm run build
```

## Common Issues

### Port 8000 Is Already in Use

Stop the existing Uvicorn or Python process that owns port 8000, then rerun:

```bash
python -m uvicorn backend.main:app --reload
```

The backend is designed to run on port 8000.

### Port 5173 Is Already in Use

Stop the process that owns port 5173, then rerun `npm run dev` from
`frontend/`. Vite is configured with `strictPort`, so it will not silently
move the app to another port.

### Python Cannot Import `backend`

Run commands from the repository root, not from inside `backend/`.

### Resume Upload Fails

- Confirm the file is a PDF.
- Confirm `python-multipart` and `pypdf` are installed.
- Check the FastAPI terminal output for validation details.

### Frontend Module Returns 404

- Confirm `npm install` completed in `frontend/`.
- Confirm Vite is running at `http://localhost:5173`.
- Refresh the browser after restarting Vite.
- Run `node scripts/audit_frontend.js` to validate frontend imports.

### CORS Error

- Confirm the backend is running on `http://localhost:8000`.
- Confirm the frontend is running on `http://localhost:5173`.
- Do not hardcode a different API URL in pages or services; use
  `frontend/src/config/apiConfig.js`.
