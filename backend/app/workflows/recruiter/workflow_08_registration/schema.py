"""
# WORKFLOW NUMBER
# WORKFLOW 8 - RECRUITER REGISTRATION
#
# PURPOSE
# Define request and response schemas for recruiter registration.
#
# INPUT
# Company name, recruiter name, email, and password.
#
# OUTPUT
# Newly created Recruiter model instance.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator


class RecruiterRegistrationData(BaseModel):
    company_name: str = Field(..., min_length=1)
    recruiter_name: str = Field(..., min_length=1)
    email: EmailStr = Field(...)
    password: str = Field(...)

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


class RecruiterRegistrationResponse(BaseModel):
    success: bool
    recruiter_id: int
    company_name: str
