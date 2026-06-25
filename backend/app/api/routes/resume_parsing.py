"""
# WORKFLOW NUMBER
# WORKFLOW 4 - RESUME PARSING
#
# PURPOSE
# Centralized HTTP route for structured parsed resume data.
#
# INPUT
# Resume id path parameter.
#
# OUTPUT
# ParsedResumeResponse JSON body.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 4 Schema -> Workflow 4 Service -> Database -> HTTP Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.workflows.candidate.workflow_04_resume_parsing.schema import (
    ParsedResumeResponse,
)
from backend.app.workflows.candidate.workflow_04_resume_parsing.workflow import (
    get_parsed_resume,
)

router = APIRouter()


# ==================================================
# Endpoint: GET /api/resumes/{resume_id}/parsed
#
# Input:
# - resume_id
#
# Output:
# - resume id
# - filename
# - structured parsed resume JSON
#
# Used By:
# Workflow 4 - Resume Parsing
# ==================================================
@router.get("/api/resumes/{resume_id}/parsed", response_model=ParsedResumeResponse, status_code=status.HTTP_200_OK)
def get_resume_parsed(resume_id: int, candidate_id: int = Depends(get_authenticated_candidate_id), db: Session = Depends(get_db)):
    try:
        return get_parsed_resume(resume_id=resume_id, db=db, candidate_id=candidate_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
