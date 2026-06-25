"""
# WORKFLOW NUMBER
# WORKFLOW 11 - CANDIDATE BROWSE JOBS
#
# PURPOSE
# Define response schemas and query contracts for job browsing.
#
# INPUT
# Search, filter, and pagination query parameters.
#
# OUTPUT
# Structured job list and job detail responses.
#
# FLOW DESCRIPTION
# Candidate Dashboard -> Browse Jobs -> Search/Filter -> Open Details.
"""

import datetime

from pydantic import BaseModel, Field


class JobBrowseQuery(BaseModel):
    search: str | None = None
    title: str | None = None
    skill: str | None = None
    keyword: str | None = None
    experience: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)


class JobBrowseItem(BaseModel):
    job_id: int
    recruiter_id: int
    title: str
    skills: list[str]
    experience: str
    description: str
    company_name: str | None = None
    employment_type: str | None = None
    location: str | None = None
    salary_range: str | None = None
    application_deadline: datetime.date | None = None
    created_at: datetime.datetime


class PaginationResponse(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class JobListResponse(BaseModel):
    success: bool
    pagination: PaginationResponse
    jobs: list[JobBrowseItem]


class JobDetailResponse(BaseModel):
    success: bool
    job: JobBrowseItem
