"""
# WORKFLOW NUMBER
# WORKFLOW 9 - RECRUITER LOGIN
#
# PURPOSE
# Orchestrate recruiter login workflow.
#
# INPUT
# Recruiter email, password, and database session.
#
# OUTPUT
# Authenticated Recruiter model instance.
#
# FLOW DESCRIPTION
# Recruiter Login Form -> POST /api/recruiter/login -> Verify Credentials ->
# Create Recruiter Session Data -> Recruiter Dashboard.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.recruiter.workflow_09_login.schema import RecruiterLoginData
from backend.app.workflows.recruiter.workflow_09_login.service import authenticate_recruiter


def login_recruiter(payload: RecruiterLoginData, db: Session):
    """
    Execute Workflow 9: Recruiter Login.
    
    Steps:
    1. Validate login data via schema
    2. Call service to authenticate recruiter
    3. Return authenticated recruiter
    """
    return authenticate_recruiter(payload=payload, db=db)


# Export service functions for direct route access
__all__ = ["login_recruiter", "RecruiterLoginData", "authenticate_recruiter"]
