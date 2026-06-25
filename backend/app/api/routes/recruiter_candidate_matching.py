"""
# WORKFLOW NUMBER
# WORKFLOW 14 - RECRUITER CANDIDATE MATCHING
#
# PURPOSE
# Expose ranked applicants for a recruiter-owned job.
#
# INPUT
# Job id path parameter and recruiter id query parameter.
#
# OUTPUT
# Job details and ranked candidate match records.
#
# FLOW DESCRIPTION
# Recruiter Opens Job -> Workflow 14 Matching -> Ranked API Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_recruiter_id
from backend.app.workflows.recruiter.workflow_14_candidate_matching.schema import (
    RecruiterCandidateMatchesResponse,
)
from backend.app.workflows.recruiter.workflow_14_candidate_matching.service import (
    JobNotFoundError,
    JobOwnershipError,
    RecruiterNotFoundError,
)
from backend.app.workflows.recruiter.workflow_14_candidate_matching.workflow import (
    rank_job_applicants,
)

router = APIRouter()


# ==================================================
# Endpoint: GET /recruiter/jobs/{job_id}/candidate-matches
#
# Input:
# - job_id
# - recruiter_id query parameter
#
# Output:
# - ranked applicants for the recruiter-owned job
#
# Used By:
# Workflow 14 - Recruiter Candidate Matching
# ==================================================
@router.get(
    "/recruiter/jobs/{job_id}/candidate-matches",
    response_model=RecruiterCandidateMatchesResponse,
    status_code=status.HTTP_200_OK,
)
def get_candidate_matches(
    job_id: int,
    recruiter_id: int = Depends(get_authenticated_recruiter_id),
    db: Session = Depends(get_db),
):
    try:
        return rank_job_applicants(
            recruiter_id=recruiter_id,
            job_id=job_id,
            db=db,
        )
    except (RecruiterNotFoundError, JobNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except JobOwnershipError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
