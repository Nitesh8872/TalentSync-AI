"""
# WORKFLOW NUMBER
# WORKFLOW 1 — CANDIDATE REGISTRATION
#
# PURPOSE
# Orchestrate candidate registration workflow.
#
# INPUT
# CandidateRegistrationRequest and database session.
#
# OUTPUT
# Newly created User model instance.
#
# FLOW DESCRIPTION
# Register Form -> POST /register -> Validate Input -> Hash Password -> Save User.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_01_registration.schema import (
    CandidateRegistrationRequest,
)
from backend.app.workflows.candidate.workflow_01_registration.service import create_candidate


def register_candidate(payload: CandidateRegistrationRequest, db: Session):
    """
    Execute Workflow 1: Candidate Registration.
    
    Steps:
    1. Validate registration data via schema
    2. Call service to create candidate account
    3. Return created user
    """
    return create_candidate(payload=payload, db=db)
