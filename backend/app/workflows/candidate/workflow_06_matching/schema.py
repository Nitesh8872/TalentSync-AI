"""
# WORKFLOW NUMBER
# WORKFLOW 6 - RESUME VS JOB MATCHING
#
# PURPOSE
# Define request and response schemas for matching.
#
# INPUT
# Resume id and job id.
#
# OUTPUT
# Match score, matched skills, and missing skills.
"""

from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    resume_id: int = Field(..., gt=0)
    job_id: int = Field(..., gt=0)


class MatchResponse(BaseModel):
    success: bool
    match_score: int
    matched_skills: list[str]
    missing_skills: list[str]
