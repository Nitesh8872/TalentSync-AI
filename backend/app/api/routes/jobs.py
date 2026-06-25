"""
# WORKFLOW NUMBER
# WORKFLOW 11 - CANDIDATE BROWSE JOBS
#
# PURPOSE
# Expose candidate job browsing APIs (public — no auth required).
# Job creation is the sole responsibility of POST /api/recruiter/jobs
# (recruiter_jobs.py) which uses the canonical RecruiterJobCreateRequest
# and populates all Job metadata fields (company, location, deadline).
#
# INPUT
# Browse filters, pagination, and job id.
#
# OUTPUT
# Paginated jobs and job detail responses.
#
# FLOW DESCRIPTION
# Candidate Browses Jobs -> Candidate Opens Job Details.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_optional_candidate_id
from backend.app.workflows.candidate.workflow_11_browse_jobs.schema import (
    JobBrowseQuery,
    JobDetailResponse,
    JobListResponse,
)
from backend.app.workflows.candidate.workflow_11_browse_jobs.workflow import (
    browse_jobs,
    get_job_details,
)

router = APIRouter()


# ==================================================
# Endpoint: GET /jobs
#
# Input:
# - optional search, title, skill, keyword, experience filters
# - page and page_size
# - optional Bearer token (unauthenticated requests browse anonymously)
#
# Output:
# - paginated available jobs
#
# Used By:
# Workflow 11 - Candidate Browse Jobs
# ==================================================
@router.get("/jobs", response_model=JobListResponse, status_code=status.HTTP_200_OK)
def list_jobs(
    search: str | None = None,
    title: str | None = None,
    skill: str | None = None,
    keyword: str | None = None,
    experience: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    # Optional: authenticated candidates may use candidate_id for future
    # personalization; unauthenticated requests browse anonymously.
    candidate_id: int | None = Depends(get_optional_candidate_id),
    db: Session = Depends(get_db),
):
    query = JobBrowseQuery(
        search=search,
        title=title,
        skill=skill,
        keyword=keyword,
        experience=experience,
        page=page,
        page_size=page_size,
    )
    return browse_jobs(query=query, db=db)


# ==================================================
# Endpoint: GET /jobs/{job_id}
#
# Input:
# - job_id
# - optional Bearer token (unauthenticated requests browse anonymously)
#
# Output:
# - selected job details
#
# Used By:
# Workflow 11 - Candidate Browse Jobs
# ==================================================
@router.get("/jobs/{job_id}", response_model=JobDetailResponse, status_code=status.HTTP_200_OK)
def get_job(
    job_id: int,
    # Optional auth: candidates get personalized context; anonymous users browse freely.
    candidate_id: int | None = Depends(get_optional_candidate_id),
    db: Session = Depends(get_db),
):
    try:
        return get_job_details(job_id=job_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
