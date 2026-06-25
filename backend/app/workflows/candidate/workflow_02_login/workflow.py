"""
# WORKFLOW NUMBER
# WORKFLOW 2 — CANDIDATE LOGIN
#
# PURPOSE
# Orchestrate candidate login workflow.
#
# INPUT
# CandidateLoginRequest and database session.
#
# OUTPUT
# Authenticated User model instance.
#
# FLOW DESCRIPTION
# Login Form -> POST /login -> Find User -> Verify Password -> Return User Info.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_02_login.schema import CandidateLoginRequest
from backend.app.workflows.candidate.workflow_02_login.service import authenticate_candidate


def login_candidate(payload: CandidateLoginRequest, db: Session):
    """
    Execute Workflow 2: Candidate Login.
    
    Steps:
    1. Validate login data via schema
    2. Call service to authenticate candidate
    3. Return authenticated user
    """
    return authenticate_candidate(payload=payload, db=db)
