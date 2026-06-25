"""
# WORKFLOW NUMBER
# WORKFLOW 9 - RECRUITER LOGIN
#
# PURPOSE
# Authenticate recruiters from the recruiter-specific table.
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

from backend.app.core.security import verify_password
from backend.app.database.models import Recruiter
from backend.app.workflows.recruiter.workflow_09_login.schema import RecruiterLoginData


def authenticate_recruiter(payload: RecruiterLoginData, db: Session) -> Recruiter:
    """
    Verify recruiter credentials without reading candidate users.
    
    Steps:
    1. Find the recruiter row by email.
    2. Verify the submitted password with the shared verifier.
    3. Reject missing or invalid credentials.
    4. Return the authenticated recruiter row.
    """
    email = str(payload.email).strip().lower()
    recruiter = db.query(Recruiter).filter(Recruiter.email == email).first()
    if not recruiter or not verify_password(payload.password, recruiter.password_hash):
        raise ValueError("Invalid email or password")
    return recruiter
