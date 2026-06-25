"""
# WORKFLOW NUMBER
# WORKFLOW 3 — RESUME UPLOAD
#
# PURPOSE
# Define API data contracts for resume upload, resume history, and resume details.
#
# INPUT
# Data returned by Workflow 3 resume upload services.
#
# OUTPUT
# Pydantic response schemas used by the centralized routes layer.
#
# FLOW DESCRIPTION
# Route -> Workflow 3 Schema -> Workflow 3 Service -> Database -> Response Schema.
"""

from typing import Any

from pydantic import BaseModel


# ==================================================
# WORKFLOW 3 — RESUME UPLOAD
# Purpose:
# Describe the response returned after a PDF resume is uploaded.
#
# Flow:
# POST /api/upload
# -> Workflow 3 Service
# -> ResumeUploadResponse
# ==================================================
class ResumeUploadResponse(BaseModel):
    success: bool
    id: int
    filename: str
    file_size: int
    upload_time: str
    parsed_data: dict[str, Any] | None = None
    extracted_text: str


# ==================================================
# WORKFLOW 3 — RESUME UPLOAD
# Purpose:
# Describe one row in the resume upload history list.
#
# Flow:
# GET /api/resumes
# -> Workflow 3 Service
# -> ResumeHistoryItem
# ==================================================
class ResumeHistoryItem(BaseModel):
    id: int
    filename: str
    file_size: int
    upload_time: str
    parsed_name: str | None = None


# ==================================================
# WORKFLOW 3 — RESUME UPLOAD
# Purpose:
# Describe the full resume details payload.
#
# Flow:
# GET /api/resumes/{resume_id}
# -> Workflow 3 Service
# -> ResumeDetailsResponse
# ==================================================
class ResumeDetailsResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    upload_time: str
    parsed_data: dict[str, Any] | None = None
    extracted_text: str


class LatestResumeResponse(BaseModel):
    resume_id: int
    candidate_id: int
    file_name: str
    parsed_name: str | None = None
    email: str | None = None
    phone: str | None = None
    skills: list[str]
    projects: list[Any]
    education: list[Any]
    experience: list[Any]
    uploaded_at: str
    parsed_status: str
    parsed_data: dict[str, Any]
