"""
# WORKFLOW NUMBER
# WORKFLOW 2 — CANDIDATE LOGIN
#
# PURPOSE
# Define request and response schemas for signing in.
#
# INPUT
# Email and password.
#
# OUTPUT
# Login status and authenticated user profile fields.
#
# FLOW DESCRIPTION
# Login Form -> POST /login -> Validate Credentials -> Return User Session Data.
"""

from pydantic import BaseModel, EmailStr, Field


# ==================================================
# WORKFLOW 2 — CANDIDATE LOGIN
# Purpose:
# Validate login request data before credential verification.
#
# Flow:
# Browser Login Form
# -> CandidateLoginRequest
# -> Login Service
# ==================================================
class CandidateLoginRequest(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(...)


# ==================================================
# WORKFLOW 2 — CANDIDATE LOGIN
# Purpose:
# Shape the successful login response consumed by the frontend session.
#
# Flow:
# Login Service
# -> CandidateLoginResponse
# -> Browser Session
# ==================================================
class CandidateLoginResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    full_name: str
    email: EmailStr
    role: str
    profile_image_url: str | None = None
    access_token: str
    token_type: str = "bearer"
