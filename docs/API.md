# TalentSync AI API Reference

## Base URL

Local development:

```text
http://127.0.0.1:8000
```

Interactive OpenAPI documentation:

- Swagger UI: `GET /docs`
- OpenAPI schema: `GET /openapi.json`

JSON errors use FastAPI's standard `detail` field.

## Authentication and Ownership

Candidate and recruiter login endpoints return identity data used by the
frontend session contexts. The current implementation does not issue bearer
tokens.

Recruiter-owned endpoints use:

```http
X-Recruiter-Id: <recruiter_id>
```

Candidate resume upload optionally uses:

```http
X-Candidate-Id: <candidate_id>
```

## Candidate Authentication

### `POST /register`

Creates a candidate account.

```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass1",
  "role": "candidate"
}
```

Returns `201 Created` with the new user ID and role.

### `POST /login`

Authenticates a candidate.

```json
{
  "email": "john@example.com",
  "password": "SecurePass1"
}
```

Returns candidate identity information. Invalid credentials return `401`.

## Recruiter Authentication

### `POST /api/recruiter/register`

Creates a recruiter account.

```json
{
  "company_name": "Example Labs",
  "recruiter_name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass1"
}
```

### `POST /api/recruiter/login`

Authenticates a recruiter and returns the recruiter ID and company name.

## Resume APIs

### `POST /api/upload`

Uploads a PDF resume as multipart form data.

- Body field: `file`
- Optional header: `X-Candidate-Id`
- Success: `201 Created`

The upload workflow extracts text and stores parsed resume data.

### `GET /api/resumes`

Returns resume history records.

### `GET /api/resumes/{resume_id}`

Returns full resume metadata, extracted text, and parsed data.

### `GET /api/resumes/{resume_id}/parsed`

Returns structured parsed resume information. Missing resumes return `404`.

## Job Description APIs

### `POST /job-description`

Stores a candidate-submitted target job description.

```json
{
  "title": "Backend Engineer",
  "description": "Python, FastAPI, SQL, and Docker experience required."
}
```

### `GET /job-descriptions`

Returns saved job descriptions used by matching and feedback workflows.

## Job APIs

### `POST /jobs`

Creates the current recruiter-owned job used by Workflows 10-14.

Required header:

```http
X-Recruiter-Id: 1
```

Example body:

```json
{
  "title": "Python Developer",
  "skills": ["Python", "FastAPI", "SQL", "Docker"],
  "experience": "1-3 Years",
  "description": "Looking for a Python developer with FastAPI experience."
}
```

Returns `201 Created`.

### `GET /jobs`

Returns active jobs with pagination.

Supported query parameters:

| Parameter | Description |
|---|---|
| `search` | General search |
| `title` | Title filter |
| `skill` | Skill filter |
| `keyword` | Description or keyword filter |
| `experience` | Experience filter |
| `page` | Page number, default `1` |
| `page_size` | Results per page, default `10`, maximum `100` |

### `GET /jobs/{job_id}`

Returns details for one active job.

## Recruiter Job Compatibility APIs

The following endpoints use the earlier `job_postings` model and are retained
for compatibility:

- `POST /api/recruiter/jobs`
- `GET /api/recruiter/jobs`
- `GET /api/recruiter/jobs/{job_id}`

They also require the `X-Recruiter-Id` header.

New Workflow 10-14 integrations should use `/jobs`.

## Matching APIs

### `POST /match`

Matches one resume against one job.

```json
{
  "resume_id": 1,
  "job_id": 10
}
```

Returns a match score plus matched and missing skills.

### `POST /api/ai-feedback`

Generates structured resume feedback for a resume and job pair.

```json
{
  "resume_id": 1,
  "job_id": 10
}
```

Returns strengths, weaknesses, suggestions, and scoring details.

## Recommendation API

### `GET /recommendations/{candidate_id}`

Ranks active jobs against the candidate's latest parsed resume.

Optional query parameter:

- `limit`: default `10`, maximum `100`

Missing candidates or parsed resumes return `404`.

## Application APIs

### `POST /applications`

Submits a candidate application.

```json
{
  "candidate_id": 1,
  "job_id": 10
}
```

Returns `201 Created`. A duplicate application returns `409 Conflict`.

### `GET /recruiter/applications`

Returns applications belonging to jobs owned by the recruiter identified by
the `X-Recruiter-Id` header.

## Recruiter Candidate Matching

### `GET /recruiter/jobs/{job_id}/candidate-matches`

Ranks applicants for a recruiter-owned job.

Required query parameter:

```text
recruiter_id=1
```

Example:

```text
GET /recruiter/jobs/10/candidate-matches?recruiter_id=1
```

The response contains candidate identity, application ID and status, match
score, matched skills, and missing skills.

Error behavior:

- `404`: recruiter or job not found
- `403`: recruiter does not own the job
- Empty candidate list: valid job with no applicants
