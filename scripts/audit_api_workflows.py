#!/usr/bin/env python3
"""Report the Workflow 1-14 route-to-workflow mapping and verify route files."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.main import app

ROUTE_ROOT = ROOT / "backend" / "app" / "api" / "routes"

MAPPINGS = [
    (1, "POST", "/register", "registration.py", "candidate/workflow_01_registration"),
    (2, "POST", "/login", "login.py", "candidate/workflow_02_login"),
    (3, "POST", "/api/upload", "resume_upload.py", "candidate/workflow_03_resume_upload"),
    (4, "GET", "/api/resumes/{resume_id}/parsed", "resume_parsing.py", "candidate/workflow_04_resume_parsing"),
    (5, "POST", "/job-description", "job_description.py", "candidate/workflow_05_job_description"),
    (6, "POST", "/match", "matching.py", "candidate/workflow_06_matching"),
    (7, "POST", "/api/ai-feedback", "ai_feedback.py", "candidate/workflow_07_ai_feedback"),
    (8, "POST", "/api/recruiter/register", "recruiter_registration.py", "recruiter/workflow_08_registration"),
    (9, "POST", "/api/recruiter/login", "recruiter_login.py", "recruiter/workflow_09_login"),
    (10, "POST", "/jobs", "jobs.py", "recruiter/workflow_10_job_posting"),
    (11, "GET", "/jobs", "jobs.py", "candidate/workflow_11_browse_jobs"),
    (12, "GET", "/recommendations/{candidate_id}", "recommendations.py", "candidate/workflow_12_auto_matching"),
    (13, "POST", "/applications", "applications.py", "candidate/workflow_13_job_application"),
    (14, "GET", "/recruiter/jobs/{job_id}/candidate-matches", "recruiter_candidate_matching.py", "recruiter/workflow_14_candidate_matching"),
]


def main() -> None:
    registered = {
        (method, route.path)
        for route in app.routes
        for method in (getattr(route, "methods", None) or set())
    }
    failures: list[str] = []

    for number, method, path, route_file, workflow in MAPPINGS:
        route_exists = (ROUTE_ROOT / route_file).is_file()
        workflow_exists = (
            ROOT / "backend" / "app" / "workflows" / workflow / "workflow.py"
        ).is_file()
        endpoint_exists = (method, path) in registered
        status = "OK" if route_exists and workflow_exists and endpoint_exists else "FAIL"
        print(f"W{number:02} {status}: {method} {path}")

        if not route_exists:
            failures.append(f"W{number:02}: missing route file {route_file}")
        if not workflow_exists:
            failures.append(f"W{number:02}: missing workflow {workflow}")
        if not endpoint_exists:
            failures.append(f"W{number:02}: missing endpoint {method} {path}")

    if failures:
        print("\nAPI WORKFLOW AUDIT: FAIL")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)

    print("\nAPI WORKFLOW AUDIT: PASS")


if __name__ == "__main__":
    main()
