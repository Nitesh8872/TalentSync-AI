"""
# WORKFLOW NUMBER
# WORKFLOW 10 - RECRUITER JOB POSTING
#
# PURPOSE
# Orchestrate recruiter job posting use cases.
#
# INPUT
# Recruiter id, job posting request data, and database session.
#
# OUTPUT
# Created and listed recruiter-owned job postings.
#
# FLOW DESCRIPTION
# Recruiter Login -> Recruiter Dashboard -> Create Job -> Save To Database.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.recruiter.workflow_10_job_posting.schema import (
    RecruiterJobCreateRequest,
)
from backend.app.workflows.recruiter.workflow_10_job_posting.service import (
    create_recruiter_job,
    get_recruiter_job,
    list_recruiter_jobs,
)


def publish_recruiter_job(
    recruiter_id: int,
    payload: RecruiterJobCreateRequest,
    db: Session,
):
    return create_recruiter_job(recruiter_id=recruiter_id, payload=payload, db=db)


__all__ = [
    "publish_recruiter_job",
    "create_recruiter_job",
    "list_recruiter_jobs",
    "get_recruiter_job",
]
