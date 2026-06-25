"""
# WORKFLOW NUMBER
# WORKFLOW 7 - AI RESUME FEEDBACK
#
# PURPOSE
# Define request and response schemas for AI feedback.
#
# INPUT
# Resume id and job id.
#
# OUTPUT
# Structured feedback JSON with resume score, strengths, weaknesses, missing
# skills, and improvement suggestions.
"""

from pydantic import BaseModel, Field


class AIFeedbackRequest(BaseModel):
    resume_id: int = Field(..., gt=0)
    job_id: int = Field(..., gt=0)


class FeedbackPayload(BaseModel):
    resume_score: int
    strengths: list[str]
    weaknesses: list[str]
    missing_skills: list[str]
    suggestions: list[str]


class AIFeedbackResponse(BaseModel):
    success: bool
    feedback: FeedbackPayload
