"""
# WORKFLOW NUMBER
# WORKFLOW 9 - RECRUITER LOGIN
#
# PURPOSE
# Validate recruiter login requests and format recruiter session responses.
#
# INPUT
# Recruiter login JSON body.
#
# OUTPUT
# Recruiter login success response.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 9 Recruiter Login -> Recruiter Table ->
# HTTP Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token
from backend.app.database.database import get_db
from backend.app.workflows.recruiter.workflow_09_login.schema import (
    RecruiterLoginData,
    RecruiterLoginResponse,
)
from backend.app.workflows.recruiter.workflow_09_login.workflow import (
    login_recruiter as execute_login,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /api/recruiter/login
#
# Input:
# - email
# - password
#
# Output:
# - success flag
# - recruiter id
# - company name
#
# Used By:
# Workflow 9 - Recruiter Login
# ==================================================
@router.post("/api/recruiter/login", response_model=RecruiterLoginResponse, status_code=status.HTTP_200_OK)
def login_recruiter(payload: RecruiterLoginData, db: Session = Depends(get_db)):
    try:
        recruiter = execute_login(payload=payload, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return RecruiterLoginResponse(
        success=True,
        recruiter_id=recruiter.id,
        company_name=recruiter.company_name,
        recruiter_name=recruiter.recruiter_name,
        access_token=create_access_token(recruiter.id, "recruiter"),
    )
