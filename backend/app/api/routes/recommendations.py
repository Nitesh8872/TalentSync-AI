"""
# WORKFLOW NUMBER
# WORKFLOW 12 - AUTO MATCH CANDIDATE TO JOBS
#
# PURPOSE
# Expose ranked job recommendations for a candidate.
#
# INPUT
# Candidate id and optional recommendation limit.
#
# OUTPUT
# Ranked recruiter-created jobs with match scores.
#
# FLOW DESCRIPTION
# Candidate Request -> Latest Parsed Resume -> Match Active Jobs -> Response.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.workflows.candidate.workflow_12_auto_matching.schema import (
    RecommendationResponse,
)
from backend.app.workflows.candidate.workflow_12_auto_matching.workflow import (
    recommend_jobs_for_candidate,
)

router = APIRouter()


# ==================================================
# Endpoint: GET /recommendations/{candidate_id}
#
# Input:
# - candidate_id
# - optional limit
#
# Output:
# - ranked active jobs and match scores
#
# Used By:
# Workflow 12 - Auto Match Candidate To Jobs
# ==================================================
@router.get(
    "/recommendations",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
)
def get_recommendations(
    candidate_id: int = Depends(get_authenticated_candidate_id),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    try:
        return recommend_jobs_for_candidate(candidate_id=candidate_id, db=db, limit=limit)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/recommendations/{candidate_id}", response_model=RecommendationResponse)
def get_legacy_recommendations(
    candidate_id: int,
    limit: int = Query(default=10, ge=1, le=100),
    authenticated_candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db),
):
    if candidate_id != authenticated_candidate_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access another candidate")
    return recommend_jobs_for_candidate(candidate_id=authenticated_candidate_id, db=db, limit=limit)
