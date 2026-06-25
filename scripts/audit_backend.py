#!/usr/bin/env python3
"""Verify the layered backend, workflow packages, database, and API surface."""

from importlib import import_module
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import inspect

from backend.app.database.database import DATABASE_URL, engine
from backend.main import app

WORKFLOW_ROOT = ROOT / "backend" / "app" / "workflows"
REQUIRED_FILES = {"__init__.py", "schema.py", "service.py", "workflow.py"}

WORKFLOWS = [
    "candidate.workflow_01_registration",
    "candidate.workflow_02_login",
    "candidate.workflow_03_resume_upload",
    "candidate.workflow_04_resume_parsing",
    "candidate.workflow_05_job_description",
    "candidate.workflow_06_matching",
    "candidate.workflow_07_ai_feedback",
    "recruiter.workflow_08_registration",
    "recruiter.workflow_09_login",
    "recruiter.workflow_10_job_posting",
    "candidate.workflow_11_browse_jobs",
    "candidate.workflow_12_auto_matching",
    "candidate.workflow_13_job_application",
    "recruiter.workflow_14_candidate_matching",
]

EXPECTED_ENDPOINTS = {
    ("POST", "/register"),
    ("POST", "/login"),
    ("POST", "/api/upload"),
    ("GET", "/api/resumes/{resume_id}/parsed"),
    ("POST", "/job-description"),
    ("POST", "/match"),
    ("POST", "/api/ai-feedback"),
    ("POST", "/api/recruiter/register"),
    ("POST", "/api/recruiter/login"),
    ("POST", "/jobs"),
    ("GET", "/jobs"),
    ("GET", "/jobs/{job_id}"),
    ("GET", "/recommendations/{candidate_id}"),
    ("POST", "/applications"),
    ("GET", "/recruiter/applications"),
    ("GET", "/recruiter/jobs/{job_id}/candidate-matches"),
}


def main() -> None:
    errors: list[str] = []

    for workflow in WORKFLOWS:
        package = f"backend.app.workflows.{workflow}"
        try:
            import_module(f"{package}.workflow")
        except Exception as exc:
            errors.append(f"Import failed for {package}: {exc}")

        directory = WORKFLOW_ROOT.joinpath(*workflow.split("."))
        files = {path.name for path in directory.glob("*.py")}
        if files != REQUIRED_FILES:
            errors.append(
                f"{directory.relative_to(ROOT)} has {sorted(files)}, "
                f"expected {sorted(REQUIRED_FILES)}"
            )

    registered = {
        (method, route.path)
        for route in app.routes
        for method in (getattr(route, "methods", None) or set())
    }
    for endpoint in sorted(EXPECTED_ENDPOINTS):
        if endpoint not in registered:
            errors.append(f"Missing endpoint: {endpoint[0]} {endpoint[1]}")

    tables = set(inspect(engine).get_table_names())
    required_tables = {
        "users",
        "resumes",
        "job_descriptions",
        "recruiters",
        "jobs",
        "applications",
    }
    missing_tables = required_tables - tables
    if missing_tables:
        errors.append(f"Missing database tables: {sorted(missing_tables)}")

    print(f"Backend import: OK ({len(app.routes)} registered routes)")
    print(f"Workflows: {len(WORKFLOWS)}/14 structured and importable")
    print(f"Database: {DATABASE_URL}")
    print(f"Tables: {', '.join(sorted(tables))}")

    if errors:
        print("\nAUDIT FAILED")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("\nBACKEND AUDIT: PASS")


if __name__ == "__main__":
    main()
