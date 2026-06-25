"""
# WORKFLOW NUMBER
# WORKFLOW 2 — CANDIDATE LOGIN
#
# PURPOSE
# Verify submitted login credentials.
#
# INPUT
# Email, password, and database session.
#
# OUTPUT
# Authenticated User model instance.
#
# FLOW DESCRIPTION
# Login Form -> POST /login -> Find User -> Verify Password -> Return User Info.
"""

from sqlalchemy.orm import Session

from backend.app.core.security import verify_password
from backend.app.database.models import User
from backend.app.workflows.candidate.workflow_02_login.schema import CandidateLoginRequest


# ==================================================
# Function: verify_login_password()
#
# Purpose:
# Verify a plain-text password for Workflow 2 login.
#
# Steps:
# 1. Detect the stored hash format.
# 2. Recreate the PBKDF2 digest for modern hashes.
# 3. Compare the digest using constant-time comparison.
# 4. Fall back to legacy bcrypt verification for older users.
# ==================================================
def verify_login_password(plain_password: str, hashed_password: str) -> bool:
    return verify_password(plain_password, hashed_password)


# ==================================================
# Function: authenticate_candidate()
#
# Purpose:
# Authenticate a TalentSync user for Workflow 2.
#
# Steps:
# 1. Find the user row by email.
# 2. Verify the submitted password.
# 3. Reject missing or invalid credentials.
# 4. Return the authenticated user.
# ==================================================
def authenticate_candidate(payload: CandidateLoginRequest, db: Session) -> User:
    email = str(payload.email).strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_login_password(payload.password, user.password_hash):
        raise ValueError("Invalid email or password")
    if user.role != "candidate":
        raise ValueError("Candidate login is only available for candidate accounts")
    return user
