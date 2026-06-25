"""
# WORKFLOW NUMBER
# WORKFLOW 10 - JOB POSTING
#
# PURPOSE
# Define request and response schemas for recruiter-created jobs.
#
# INPUT
# Job title, skills, experience, and description.
#
# OUTPUT
# Structured job payloads with recruiter ownership.
#
# FLOW DESCRIPTION
# Recruiter Dashboard -> Create Job -> Validate Payload -> Save Job.
"""

import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class JobCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    skills: list[str] = Field(..., min_length=1)
    experience: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)

    @field_validator("title", "experience", "description", mode="before")
    @classmethod
    def normalize_required_text(cls, value: Any) -> str:
        text = str(value or "").strip()
        if not text:
            raise ValueError("Required fields cannot be empty.")
        return text

    @field_validator("skills", mode="before")
    @classmethod
    def normalize_skills(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            raw_values = value.replace("\r", "\n").replace(",", "\n").splitlines()
        elif isinstance(value, list):
            raw_values = value
        else:
            raw_values = []

        skills: list[str] = []
        seen: set[str] = set()
        for raw_skill in raw_values:
            skill = str(raw_skill or "").strip()
            key = skill.lower()
            if not skill or key in seen:
                continue
            seen.add(key)
            skills.append(skill)

        if not skills:
            raise ValueError("At least one skill is required.")
        return skills


class JobResponse(BaseModel):
    job_id: int
    recruiter_id: int
    title: str
    skills: list[str]
    experience: str
    description: str
    created_at: datetime.datetime


class JobCreateResponse(BaseModel):
    success: bool
    message: str
    job: JobResponse


class RecruiterJobCreateRequest(BaseModel):
    job_title: str = Field(..., min_length=1)
    company_name: str = Field(..., min_length=1)
    job_description: str = Field(..., min_length=1)
    required_skills: str = Field(..., min_length=1)
    experience_required: str = Field(..., min_length=1)
    employment_type: Literal["Full-time", "Part-time", "Contract", "Internship", "Remote"]
    location: str = Field(..., min_length=1)
    salary_range: str | None = None
    application_deadline: datetime.date | None = None

    @field_validator(
        "job_title",
        "company_name",
        "job_description",
        "required_skills",
        "experience_required",
        "location",
        mode="before",
    )
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        text = str(value or "").strip()
        if not text:
            raise ValueError("Required fields cannot be empty.")
        return text

    @field_validator("salary_range", mode="before")
    @classmethod
    def normalize_optional_salary(cls, value: str | None) -> str | None:
        text = str(value or "").strip()
        return text or None

    @field_validator("application_deadline")
    @classmethod
    def validate_deadline(cls, value: datetime.date | None) -> datetime.date | None:
        if value and value < datetime.date.today():
            raise ValueError("Application deadline cannot be in the past.")
        return value


class RecruiterJobResponse(BaseModel):
    id: int
    recruiter_id: int
    job_title: str
    company_name: str
    job_description: str
    required_skills: str
    experience_required: str
    employment_type: str
    location: str
    salary_range: str | None
    application_deadline: datetime.date | None
    status: str
    created_at: str
    updated_at: str


class RecruiterJobCreateResponse(BaseModel):
    success: bool
    message: str
    job: RecruiterJobResponse
