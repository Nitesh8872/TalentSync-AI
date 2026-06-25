"""
# WORKFLOW NUMBER
# WORKFLOW 10 - RECRUITER JOB POSTING
#
# PURPOSE
# Expose recruiter-only job posting API endpoints.
#
# INPUT
# X-Recruiter-Id header and job posting JSON body.
#
# OUTPUT
# Created job payloads and recruiter-owned job lists.
#
# FLOW DESCRIPTION
# Recruiter Frontend -> Route Auth Check -> Workflow 10 Service -> Database -> Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_recruiter_id
from backend.app.workflows.recruiter.workflow_10_job_posting.schema import (
    RecruiterJobCreateRequest,
    RecruiterJobCreateResponse,
    RecruiterJobResponse,
)
from backend.app.workflows.recruiter.workflow_10_job_posting.service import (
    get_recruiter_job,
    list_recruiter_jobs,
    serialize_recruiter_job,
)
from backend.app.workflows.recruiter.workflow_10_job_posting.workflow import (
    publish_recruiter_job,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /api/recruiter/jobs
#
# Input:
# - X-Recruiter-Id header
# - job posting JSON body
#
# Output:
# - created recruiter-owned job
#
# Used By:
# Workflow 10 - Recruiter Job Posting
# ==================================================
@router.post(
    "/api/recruiter/jobs",
    response_model=RecruiterJobCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    payload: RecruiterJobCreateRequest,
    recruiter_id: int = Depends(get_authenticated_recruiter_id),
    db: Session = Depends(get_db),
):
    try:
        job = publish_recruiter_job(recruiter_id=recruiter_id, payload=payload, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return RecruiterJobCreateResponse(
        success=True,
        message="Job published successfully",
        job=serialize_recruiter_job(job),
    )


@router.get(
    "/api/recruiter/jobs",
    response_model=list[RecruiterJobResponse],
    status_code=status.HTTP_200_OK,
)
def list_jobs(
    recruiter_id: int = Depends(get_authenticated_recruiter_id),
    db: Session = Depends(get_db),
):
    try:
        return list_recruiter_jobs(recruiter_id=recruiter_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/api/recruiter/jobs/{job_id}",
    response_model=RecruiterJobResponse,
    status_code=status.HTTP_200_OK,
)
def get_job(
    job_id: int,
    recruiter_id: int = Depends(get_authenticated_recruiter_id),
    db: Session = Depends(get_db),
):
    try:
        return get_recruiter_job(job_id=job_id, recruiter_id=recruiter_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
