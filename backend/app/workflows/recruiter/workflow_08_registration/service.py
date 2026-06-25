"""
# WORKFLOW NUMBER
# WORKFLOW 8 - RECRUITER REGISTRATION
#
# PURPOSE
# Create recruiter accounts in a recruiter-specific database table.
#
# INPUT
# Company name, recruiter name, email, password, and database session.
#
# OUTPUT
# Newly created Recruiter model instance.
#
# FLOW DESCRIPTION
# Recruiter Registration Form -> POST /api/recruiter/register ->
# Validate Input -> Hash Password -> Store Recruiter Profile -> Success Response.
"""

from sqlalchemy.orm import Session

from backend.app.core.security import hash_password
from backend.app.database.models import Recruiter
from backend.app.workflows.recruiter.workflow_08_registration.schema import (
    RecruiterRegistrationData,
)


def create_recruiter_account(payload: RecruiterRegistrationData, db: Session) -> Recruiter:
    """
    Register a recruiter without touching candidate users.
    
    Steps:
    1. Normalize and validate required recruiter fields.
    2. Check recruiter email uniqueness in the recruiters table.
    3. Hash the submitted password using the shared password utility.
    4. Store the recruiter profile.
    5. Return the created recruiter row.
    """
    company_name = payload.company_name.strip()
    recruiter_name = payload.recruiter_name.strip()
    email = str(payload.email).strip().lower()

    if not company_name:
        raise ValueError("Company name is required")
    if not recruiter_name:
        raise ValueError("Recruiter name is required")

    existing = db.query(Recruiter).filter(Recruiter.email == email).first()
    if existing:
        raise ValueError("Recruiter email already registered")

    recruiter = Recruiter(
        company_name=company_name,
        recruiter_name=recruiter_name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(recruiter)
    db.commit()
    db.refresh(recruiter)
    return recruiter
