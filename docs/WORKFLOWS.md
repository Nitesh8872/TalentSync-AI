# TalentSync AI Workflow Guide

## Workflow Map

TalentSync AI contains one public workflow, ten candidate workflows, and four
recruiter workflows.

| Workflow | Domain | Purpose |
|---|---|---|
| 0 | Public | Landing page and role selection |
| 1 | Candidate | Registration |
| 2 | Candidate | Login |
| 3 | Candidate | Resume upload |
| 4 | Candidate | Resume parsing |
| 5 | Candidate | Job description submission |
| 6 | Candidate | Resume-to-job matching |
| 7 | Candidate | AI feedback |
| 8 | Recruiter | Registration |
| 9 | Recruiter | Login |
| 10 | Recruiter | Job posting |
| 11 | Candidate | Browse jobs |
| 12 | Candidate | Automatic job recommendations |
| 13 | Candidate | Apply to a job |
| 14 | Recruiter | Ranked candidate matching |

## Workflow 0: Landing Page

The public `/` route introduces TalentSync AI as a two-sided hiring platform.

```text
Open Application
    -> Landing Page
    -> Choose Candidate or Recruiter
    -> Register or Login
    -> Enter Role-Specific Workspace
```

The landing page contains role-specific calls to action, platform features, and
candidate and recruiter process summaries.

## Candidate Workflows

### Workflow 1: Registration

Creates a candidate account with validated identity and password data.

```text
Candidate Form -> POST /register -> User Record -> Registration Response
```

### Workflow 2: Login

Validates candidate credentials and creates the frontend candidate session.

```text
Credentials -> POST /login -> Password Verification -> Candidate Dashboard
```

### Workflow 3: Resume Upload

Accepts a PDF resume, extracts text, and stores the upload against the candidate
when a candidate ID is supplied.

```text
PDF Upload -> Validation -> Text Extraction -> Resume Record
```

### Workflow 4: Resume Parsing

Converts extracted resume text into structured candidate data such as name,
skills, education, and experience.

The frontend presents upload and parsing as one continuous Resume Upload
experience.

```text
Extracted Text -> Resume Parser -> Structured Resume Data
```

### Workflow 5: Job Description

Stores target job descriptions for direct resume matching and AI feedback.

```text
Job Title + Description -> Validation -> Job Description Record
```

### Workflow 6: Matching

Compares a parsed resume with a selected job and calculates:

- Match score
- Matched skills
- Missing skills

```text
Resume + Job -> Skill Normalization -> Score -> Match Result
```

### Workflow 7: AI Feedback

Builds structured feedback from resume data, job requirements, and matching
results.

The frontend combines matching and feedback into one AI Matching page.

```text
Resume + Job + Match Result -> Feedback Engine -> Strengths and Suggestions
```

### Workflow 11: Browse Jobs

Lists active recruiter-created jobs with search, filtering, pagination, and job
detail support.

```text
Candidate Search -> GET /jobs -> Filtered Jobs -> Job Details
```

### Workflow 12: Automatic Job Recommendations

Loads the candidate's latest parsed resume, compares it with active jobs, and
ranks the strongest matches.

```text
Candidate Resume -> All Active Jobs -> Match Scores -> Ranked Recommendations
```

### Workflow 13: Apply to a Job

Validates the candidate and job, prevents duplicate applications, and links the
application to the job's recruiter.

```text
Candidate + Job -> Validation -> Duplicate Check -> Application Record
```

## Recruiter Workflows

### Workflow 8: Registration

Creates a recruiter account with company and recruiter identity data.

```text
Recruiter Form -> Validation -> Recruiter Record
```

### Workflow 9: Login

Validates recruiter credentials and creates the separate frontend recruiter
session.

```text
Credentials -> Recruiter Verification -> Recruiter Dashboard
```

### Workflow 10: Job Posting

Creates recruiter-owned jobs with title, skills, experience, and description.

```text
Recruiter -> Create Job -> Ownership Validation -> Job Record
```

### Workflow 14: Candidate Matching

Verifies job ownership, loads all applications for that job, compares each
candidate's parsed resume against the job, and ranks applicants.

```text
Recruiter Job
    -> Applications
    -> Parsed Candidate Resumes
    -> Matching Engine
    -> Ranked Candidate List
```

Candidates without parsed resumes are handled without failing the complete
ranking request.

## End-to-End Candidate Flow

```text
Landing Page
    -> Candidate Registration
    -> Candidate Login
    -> Resume Upload and Parsing
    -> Browse Jobs or Enter Job Description
    -> AI Matching and Feedback
    -> Recommended Jobs
    -> Apply
```

## End-to-End Recruiter Flow

```text
Landing Page
    -> Recruiter Registration
    -> Recruiter Login
    -> Create Job
    -> Receive Applications
    -> Open Candidate Matches
    -> Review Ranked Applicants
```

## Workflow Dependencies

- Workflow 4 depends on resume data from Workflow 3.
- Workflows 6 and 7 depend on resume and job data.
- Workflow 11 depends on recruiter jobs from Workflow 10.
- Workflow 12 depends on parsed resumes and active jobs.
- Workflow 13 depends on candidates and recruiter-owned jobs.
- Workflow 14 depends on jobs, applications, and parsed resumes.

