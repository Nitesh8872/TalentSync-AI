"""
# WORKFLOW NUMBER
# WORKFLOW 6 - RESUME VS JOB MATCHING
#
# PURPOSE
# Centralized HTTP route for matching parsed resume data against a job.
#
# INPUT
# MatchRequest JSON body containing resume_id and job_id.
#
# OUTPUT
# MatchResponse JSON body with score, matched skills, and missing skills.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 6 Matching Engine -> Database -> HTTP Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.workflows.candidate.workflow_06_matching.schema import (
    MatchRequest,
    MatchResponse,
)
from backend.app.workflows.candidate.workflow_06_matching.workflow import (
    match_resume_job as execute_matching,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /match
#
# Input:
# - resume_id
# - job_id
#
# Output:
# - success flag
# - match score
# - matched skills
# - missing skills
#
# Used By:
# Workflow 6 - Resume vs Job Matching
# ==================================================
@router.post("/match", response_model=MatchResponse, status_code=status.HTTP_200_OK)
def match_resume_job(
    payload: MatchRequest,
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db),
):
    try:
        result = execute_matching(payload=payload, db=db, candidate_id=candidate_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return MatchResponse(success=True, **result)
