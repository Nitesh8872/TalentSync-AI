"""
# WORKFLOW NUMBER
# WORKFLOW 1 — CANDIDATE REGISTRATION
#
# PURPOSE
# Define request and response schemas for creating a new account.
#
# INPUT
# Full name, email, password, and role.
#
# OUTPUT
# Registration success response with created user id and role.
#
# FLOW DESCRIPTION
# Register Form -> POST /register -> Validate Input -> Save User -> Return Success.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator


# ==================================================
# WORKFLOW 1 — CANDIDATE REGISTRATION
# Purpose:
# Validate registration request data before the route calls the service.
#
# Flow:
# Browser Register Form
# -> CandidateRegistrationRequest
# -> Registration Service
# ==================================================
class CandidateRegistrationRequest(BaseModel):
    email: EmailStr = Field(...)
    full_name: str = Field(..., min_length=1)
    password: str = Field(...)
    role: str = "candidate"

    @field_validator("role")
    @classmethod
    def validate_candidate_role(cls, v: str) -> str:
        if v != "candidate":
            raise ValueError("Candidate registration only supports candidate accounts.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not any(c.isdigit() or not c.isalnum() for c in v):
            raise ValueError("Password must contain at least one digit or special character.")
        return v


# ==================================================
# WORKFLOW 1 — CANDIDATE REGISTRATION
# Purpose:
# Shape the success response returned after account creation.
#
# Flow:
# Registration Service
# -> CandidateRegistrationResponse
# -> Browser
# ==================================================
class CandidateRegistrationResponse(BaseModel):
    success: bool
    user_id: int
    role: str
