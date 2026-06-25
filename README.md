# TalentSync AI

TalentSync AI is a two-sided hiring platform that helps candidates understand
their resumes, discover relevant jobs, and apply with confidence. Recruiters
can publish roles, review applications, and rank candidates using
resume-to-job matching.

The project combines a workflow-oriented FastAPI backend with a responsive
React and Vite single-page application.

## Key Features

### Candidate

- Account registration and login
- PDF resume upload and text extraction
- Structured resume parsing
- Resume-to-job skill matching
- AI-assisted feedback
- Searchable and filterable job browsing
- Ranked job recommendations
- Duplicate-safe job applications

### Recruiter

- Separate recruiter registration and login
- Recruiter-owned job posting
- Application review
- Resume-to-job applicant scoring
- Ranked candidate lists with matched and missing skills

### Platform

- Public landing page with separate candidate and recruiter entry points
- Consistent workflow packages for Workflows 1-14
- Layered backend architecture
- SQLite persistence with SQLAlchemy
- Responsive candidate and recruiter workspaces
- React Router route guards for candidate and recruiter workspaces
- Centralized Axios API access and environment-ready frontend configuration

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| Validation | Pydantic |
| Database | SQLite, SQLAlchemy |
| Security | Passlib, bcrypt |
| Resume processing | pypdf |
| Frontend | React 19, Vite, React Router, Lucide |
| API communication | Axios shared API client |

## User Workflows

### Candidate Journey

```text
Landing Page
    -> Register or Login
    -> Upload and Parse Resume
    -> Browse or Match Jobs
    -> Review Recommendations
    -> Apply to a Job
```

Candidate workflows: Registration, Login, Resume Upload, Resume Parsing, Job
Description, Matching, AI Feedback, Browse Jobs, Recommendations, and Job
Applications.

### Recruiter Journey

```text
Landing Page
    -> Register or Login
    -> Create a Job
    -> Review Applications
    -> Rank Candidates
    -> Shortlist Best-Fit Talent
```

Recruiter workflows: Registration, Login, Job Posting, Application Review, and
Candidate Matching.

See [Workflow Guide](docs/WORKFLOWS.md) for the complete Workflow 0-14 map.

## Project Structure

```text
TalentSync AI/
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |   |-- routes/
|   |   |   `-- router.py
|   |   |-- core/
|   |   |-- database/
|   |   |-- services/
|   |   |-- utils/
|   |   `-- workflows/
|   |       |-- candidate/
|   |       `-- recruiter/
|   |-- main.py
|   `-- requirements.txt
|-- frontend/
|   |-- public/
|   |-- package.json
|   |-- vite.config.js
|   |-- index.html
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- config/
|   |   |-- context/
|   |   |-- pages/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- styles/
|   |   `-- utils/
|   `-- package-lock.json
|-- data/
|   `-- resumes.db
|-- docs/
|-- scripts/
`-- README.md
```

Each backend workflow uses the same structure:

```text
workflow_xx_name/
|-- __init__.py
|-- schema.py
|-- service.py
`-- workflow.py
```

## Quick Start

Requirements:

- Python 3.12 or newer
- `pip` and a Python virtual environment
- Node.js 20 or newer and npm

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
cd frontend
npm install
```

Start the backend from the repository root:

```powershell
python -m uvicorn backend.main:app --reload --port 8000
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open the application at
[http://localhost:5173](http://localhost:5173/). The API and interactive
documentation remain available on
[http://localhost:8000](http://localhost:8000/) and
[http://localhost:8000/docs](http://localhost:8000/docs).

For platform-specific setup and troubleshooting, see
[Setup Guide](docs/SETUP.md).

## API Overview

| Area | Main Endpoints |
|---|---|
| Candidate authentication | `POST /register`, `POST /login` |
| Recruiter authentication | `POST /api/recruiter/register`, `POST /api/recruiter/login` |
| Resumes | `POST /api/upload`, `GET /api/resumes`, `GET /api/resumes/{id}/parsed` |
| Job descriptions | `POST /job-description`, `GET /job-descriptions` |
| Jobs | `POST /jobs`, `GET /jobs`, `GET /jobs/{id}` |
| Matching and feedback | `POST /match`, `POST /api/ai-feedback` |
| Recommendations | `GET /recommendations/{candidate_id}` |
| Applications | `POST /applications`, `GET /recruiter/applications` |
| Recruiter candidate ranking | `GET /recruiter/jobs/{job_id}/candidate-matches` |

Interactive API documentation is available at
[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) while the server is
running.

See [API Reference](docs/API.md) for parameters, ownership requirements, and
response behavior.

## Screenshots

Project screenshots can be added here as the UI evolves:

| Screen | Suggested file |
|---|---|
| Landing page | `docs/assets/landing-page.png` |
| Candidate workspace | `docs/assets/candidate-dashboard.png` |
| Recruiter candidate ranking | `docs/assets/recruiter-candidate-matches.png` |

## Verification

```powershell
python -c "from backend.main import app; print('Import OK')"
python scripts/audit_backend.py
python scripts/audit_api_workflows.py
python scripts/audit_code_quality.py
node scripts/audit_frontend.js
cd frontend
npm run lint
npm run build
```

## Future Improvements

- Token-based authentication and server-managed sessions
- Database migrations with Alembic
- Candidate application-history API and page
- Recruiter shortlist and application-status updates
- Email notifications
- Automated unit, integration, and end-to-end test suites
- PostgreSQL deployment configuration
- Object storage for uploaded resumes
- Observability, structured logging, and production metrics

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Workflow Guide](docs/WORKFLOWS.md)
- [Setup Guide](docs/SETUP.md)
