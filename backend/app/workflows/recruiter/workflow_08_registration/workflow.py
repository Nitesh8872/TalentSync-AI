"""
# WORKFLOW NUMBER
# WORKFLOW 8 - RECRUITER REGISTRATION
#
# PURPOSE
# Orchestrate recruiter registration workflow.
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

from backend.app.workflows.recruiter.workflow_08_registration.schema import (
    RecruiterRegistrationData,
)
from backend.app.workflows.recruiter.workflow_08_registration.service import (
    create_recruiter_account,
)


def register_recruiter(payload: RecruiterRegistrationData, db: Session):
    """
    Execute Workflow 8: Recruiter Registration.
    
    Steps:
    1. Validate registration data via schema
    2. Call service to create recruiter account
    3. Return created recruiter
    """
    return create_recruiter_account(payload=payload, db=db)


# Export service functions for direct route access
__all__ = ["register_recruiter", "RecruiterRegistrationData", "create_recruiter_account"]
