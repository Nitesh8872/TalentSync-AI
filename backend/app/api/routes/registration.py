"""
# WORKFLOW NUMBER
# WORKFLOW 1 - CANDIDATE REGISTRATION
#
# PURPOSE
# Centralized HTTP route for candidate registration.
#
# INPUT
# CandidateRegistrationRequest JSON body.
#
# OUTPUT
# CandidateRegistrationResponse JSON body.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 1 Schema -> Workflow 1 Service -> Database -> HTTP Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.workflows.candidate.workflow_01_registration.schema import (
    CandidateRegistrationRequest,
    CandidateRegistrationResponse,
)
from backend.app.workflows.candidate.workflow_01_registration.workflow import (
    register_candidate as execute_registration,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /register
#
# Input:
# - full_name
# - email
# - password
# - role
#
# Output:
# - success flag
# - created user id
# - created user role
#
# Used By:
# Workflow 1 - Candidate Registration
# ==================================================
@router.post("/register", response_model=CandidateRegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_candidate(payload: CandidateRegistrationRequest, db: Session = Depends(get_db)):
    try:
        user = execute_registration(payload=payload, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return CandidateRegistrationResponse(success=True, user_id=user.id, role=user.role)
