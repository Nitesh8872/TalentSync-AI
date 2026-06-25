# TalentSync AI Architecture

## Overview

TalentSync AI uses a layered, workflow-oriented architecture. FastAPI exposes
REST endpoints on port `8000`, while a React and Vite single-page application
runs on port `5173` during development.

```text
Browser
  -> Frontend route
  -> Page
  -> Frontend service
  -> Shared API client
  -> FastAPI route
  -> Workflow
  -> Service
  -> SQLAlchemy model
  -> SQLite
```

## Backend Architecture

`backend/main.py` is the stable Uvicorn entry point. It exports the FastAPI
application assembled in `backend/app/main.py`.

```text
backend/
|-- app/
|   |-- api/
|   |   |-- routes/
|   |   `-- router.py
|   |-- core/
|   |-- database/
|   |-- services/
|   |-- utils/
|   `-- workflows/
|       |-- candidate/
|       `-- recruiter/
|-- main.py
`-- requirements.txt
```

### API Layer

`backend/app/api/routes/` owns HTTP concerns:

- Request and response schemas
- Headers, query parameters, and path parameters
- HTTP status codes
- Translation of domain errors into API errors

`backend/app/api/router.py` registers every Workflow 1-14 route module with the
FastAPI application.

Route functions delegate business execution to workflow entry points. They do
not implement matching or persistence rules directly.

### Core Layer

`backend/app/core/` contains application-wide infrastructure:

- `config.py`: project paths, database URL, frontend directory, and CORS
- `security.py`: password hashing and verification
- `constants.py`: shared domain constants

### Database Layer

`backend/app/database/` contains:

- `database.py`: SQLAlchemy engine, session factory, and initialization
- `dependencies.py`: reusable FastAPI database and recruiter dependencies
- `models.py`: ORM table definitions

The active SQLite database is `data/resumes.db`.

Core tables:

| Table | Purpose |
|---|---|
| `users` | Candidate accounts |
| `recruiters` | Recruiter accounts |
| `resumes` | Uploaded files, extracted text, and parsed data |
| `job_descriptions` | Candidate-submitted job descriptions |
| `jobs` | Current recruiter-owned jobs used by Workflows 10-14 |
| `applications` | Candidate-to-job applications |

The legacy `job_postings` table and `/api/recruiter/jobs` API remain available
for backward compatibility.

Foreign keys connect resumes to candidates, jobs to recruiters, and
applications to candidates, recruiters, and jobs. A unique application
constraint prevents the same candidate from applying to the same job twice.

### Workflow Layer

Business processes live in `backend/app/workflows/`, grouped by domain.

Every workflow follows:

```text
workflow_xx_name/
|-- __init__.py
|-- schema.py
|-- service.py
`-- workflow.py
```

Responsibilities:

- `schema.py`: validated workflow input and output structures
- `service.py`: persistence, queries, and domain calculations
- `workflow.py`: execution order and orchestration
- `__init__.py`: package boundary

Workflow modules use absolute imports rooted at `backend.app`, avoiding fragile
deep relative imports.

### Service Layer

Workflow-specific services live beside their workflows. Shared, cross-workflow
helpers live in `backend/app/services/`.

The service layer handles:

- Database queries and persistence
- Resume and job serialization
- Skill normalization
- Match-score calculations
- Duplicate application checks
- Recruiter ownership validation

This keeps routes thin and allows workflow rules to be reused by candidate and
recruiter features.

## Frontend Architecture

The frontend is a React SPA built and served by Vite.

```text
frontend/
|-- public/
|-- package.json
|-- vite.config.js
|-- index.html
|-- src/
|   |-- api/
|   |-- components/
|   |-- config/
|   |-- context/
|   |-- pages/
|   |-- routes/
|   |-- services/
|   |-- styles/
|   `-- utils/
`-- package-lock.json
```

### Frontend Layers

- `routes`: public routes, authentication guards, and legacy redirects
- `pages`: candidate, recruiter, and landing-page screens
- `components`: shared layouts, forms, cards, buttons, and job actions
- `services`: endpoint-specific API calls
- `api`: the shared Axios client and response error normalization
- `config`: the single backend base URL definition
- `context`: candidate and recruiter browser sessions
- `utils`: formatting and resume-data normalization

Pages call services rather than calling Axios directly. Candidate and
recruiter sessions are isolated in separate browser-storage contexts.

## Frontend Routing

The public `/` route displays the Workflow 0 landing page.

Canonical candidate routes use `/candidate/...`. Canonical recruiter routes
use `/recruiter/...`.

Legacy routes such as `/login`, `/register`, `/dashboard/...`, and
`/recruiter/jobs/create` redirect to their canonical equivalents to preserve
older links.

## Compatibility Decisions

- `backend.main:app` remains the public server entry point.
- The SQLite location remains `data/resumes.db`.
- Existing API behavior remains available.
- The backend explicitly allows development requests from `localhost:5173`
  and `127.0.0.1:5173`.
- Resume Upload automatically parses and displays the uploaded PDF while the
  standalone parser route remains available for compatibility.
- AI Matching automatically generates feedback while the standalone feedback
  route remains available for compatibility.
- `/candidate/applications` reconstructs successful submissions from browser
  storage because the backend does not yet expose candidate application history.
