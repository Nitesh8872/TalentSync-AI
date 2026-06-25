"""Workflow 13 orchestration."""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_13_job_application.schema import (
    ApplicationCreateRequest,
)
from backend.app.workflows.candidate.workflow_13_job_application.service import (
    list_candidate_applications as load_candidate_applications,
    list_recruiter_applications as load_recruiter_applications,
    submit_job_application as create_job_application,
)


def submit_job_application(payload: ApplicationCreateRequest, candidate_id: int, db: Session):
    return create_job_application(job_id=payload.job_id, candidate_id=candidate_id, db=db)


def list_recruiter_applications(recruiter_id: int, db: Session):
    return load_recruiter_applications(recruiter_id=recruiter_id, db=db)


def list_candidate_applications(candidate_id: int, db: Session):
    return load_candidate_applications(candidate_id=candidate_id, db=db)
