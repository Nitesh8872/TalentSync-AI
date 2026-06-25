"""
# WORKFLOW NUMBER
# WORKFLOW 9 - RECRUITER LOGIN
#
# PURPOSE
# Define request and response schemas for recruiter login.
#
# INPUT
# Recruiter email and password.
#
# OUTPUT
# Authenticated Recruiter model instance.
"""

from pydantic import BaseModel, EmailStr, Field


class RecruiterLoginData(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(...)


class RecruiterLoginResponse(BaseModel):
    success: bool
    recruiter_id: int
    company_name: str
    recruiter_name: str
    access_token: str
    token_type: str = "bearer"
