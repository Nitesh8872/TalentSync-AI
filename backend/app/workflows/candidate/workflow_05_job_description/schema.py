"""
# WORKFLOW NUMBER
# WORKFLOW 5 — CANDIDATE JOB DESCRIPTION SUBMISSION
#
# PURPOSE
# Define request and response schemas for job-description submission.
#
# INPUT
# Job title and job description text.
#
# OUTPUT
# Save status and job-history records.
#
# FLOW DESCRIPTION
# Job Description Form -> POST /job-description -> Save Job -> Return Success.
"""

from pydantic import BaseModel, Field


# ==================================================
# WORKFLOW 5 — CANDIDATE JOB DESCRIPTION SUBMISSION
# Purpose:
# Validate the submitted job title and description.
#
# Flow:
# Job Description Form
# -> JobDescriptionRequest
# -> Job Description Service
# ==================================================
class JobDescriptionRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)


# ==================================================
# WORKFLOW 5 — CANDIDATE JOB DESCRIPTION SUBMISSION
# Purpose:
# Shape the response returned after a job description is saved.
#
# Flow:
# Job Description Service
# -> JobDescriptionResponse
# -> Browser
# ==================================================
class JobDescriptionResponse(BaseModel):
    success: bool
    message: str


class DeleteCareerGoalResponse(BaseModel):
    success: bool
    message: str
    deleted_goal_id: int
