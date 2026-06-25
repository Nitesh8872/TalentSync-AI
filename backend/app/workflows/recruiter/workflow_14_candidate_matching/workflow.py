"""Workflow 14 orchestration."""

from sqlalchemy.orm import Session

from backend.app.workflows.recruiter.workflow_14_candidate_matching.service import (
    rank_job_applicants as build_ranked_applicants,
)


def rank_job_applicants(recruiter_id: int, job_id: int, db: Session):
    return build_ranked_applicants(recruiter_id=recruiter_id, job_id=job_id, db=db)
