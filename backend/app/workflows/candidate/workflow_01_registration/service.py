"""
# WORKFLOW NUMBER
# WORKFLOW 1 — CANDIDATE REGISTRATION
#
# PURPOSE
# Create new candidate or recruiter accounts.
#
# INPUT
# Validated registration request data and a database session.
#
# OUTPUT
# Newly created User model instance.
#
# FLOW DESCRIPTION
# Register Form -> POST /register -> Validate Input -> Hash Password -> Save User.
"""

from sqlalchemy.orm import Session

from backend.app.core.security import hash_password
from backend.app.database.models import User
from backend.app.workflows.candidate.workflow_01_registration.schema import (
    CandidateRegistrationRequest,
)


# ==================================================
# Function: hash_registration_password()
#
# Purpose:
# Hash a plain-text password for Workflow 1 account creation.
#
# Steps:
# 1. Generate a unique random salt.
# 2. Derive a PBKDF2 SHA-256 password hash.
# 3. Encode the salt and digest.
# 4. Return one storage-safe hash string.
# ==================================================
def hash_registration_password(password: str) -> str:
    return hash_password(password)


# ==================================================
# Function: create_candidate()
#
# Purpose:
# Create a new TalentSync user account for Workflow 1.
#
# Steps:
# 1. Check whether the email is already registered.
# 2. Hash the submitted password.
# 3. Save the user row.
# 4. Return the created user model.
# ==================================================
def create_candidate(payload: CandidateRegistrationRequest, db: Session) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise ValueError("Email already registered")

    if payload.role != "candidate":
        raise ValueError("Candidate registration only supports candidate accounts.")

    db_user = User(
        full_name=payload.full_name.strip(),
        email=str(payload.email).strip().lower(),
        password_hash=hash_registration_password(payload.password),
        role="candidate",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
