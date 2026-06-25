"""Workflow 13 API contracts."""

import datetime

from typing import Literal

from pydantic import BaseModel, Field


class ApplicationCreateRequest(BaseModel):
    job_id: int = Field(..., gt=0)


class ApplicationCreateResponse(BaseModel):
    success: bool
    message: str


class RecruiterApplicationItem(BaseModel):
    application_id: int
    candidate_id: int
    candidate_name: str
    candidate_email: str
    job_id: int
    job_title: str
    status: str
    applied_at: datetime.datetime


class RecruiterApplicationsResponse(BaseModel):
    success: bool
    recruiter_id: int
    applications: list[RecruiterApplicationItem]


class CandidateApplicationItem(BaseModel):
    application_id: int
    job_id: int
    title: str
    skills: list[str]
    experience: str
    description: str
    company_name: str | None = None
    employment_type: str | None = None
    location: str | None = None
    salary_range: str | None = None
    application_deadline: datetime.date | None = None
    status: str
    applied_at: datetime.datetime
    resume_id: int | None = None
    match_score: int | None = None
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class CandidateApplicationsResponse(BaseModel):
    success: bool
    applications: list[CandidateApplicationItem]


class ApplicationStatusUpdateRequest(BaseModel):
    status: Literal["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]
