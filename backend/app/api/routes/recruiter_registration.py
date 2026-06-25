"""
# WORKFLOW NUMBER
# WORKFLOW 8 - RECRUITER REGISTRATION
#
# PURPOSE
# Validate recruiter registration requests and format API responses.
#
# INPUT
# Recruiter registration JSON body.
#
# OUTPUT
# Recruiter registration success response.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 8 Recruiter Registration -> Recruiter Table ->
# HTTP Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.workflows.recruiter.workflow_08_registration.schema import (
    RecruiterRegistrationData,
    RecruiterRegistrationResponse,
)
from backend.app.workflows.recruiter.workflow_08_registration.workflow import (
    register_recruiter as execute_registration,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /api/recruiter/register
#
# Input:
# - company_name
# - recruiter_name
# - email
# - password
#
# Output:
# - success flag
# - recruiter id
# - company name
#
# Used By:
# Workflow 8 - Recruiter Registration
# ==================================================
@router.post(
    "/api/recruiter/register",
    response_model=RecruiterRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_recruiter(payload: RecruiterRegistrationData, db: Session = Depends(get_db)):
    try:
        recruiter = execute_registration(payload=payload, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return RecruiterRegistrationResponse(
        success=True,
        recruiter_id=recruiter.id,
        company_name=recruiter.company_name,
    )
