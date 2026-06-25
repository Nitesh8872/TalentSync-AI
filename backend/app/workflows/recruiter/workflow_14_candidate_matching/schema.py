"""Workflow 14 API contracts."""

from pydantic import BaseModel


class CandidateMatchResponse(BaseModel):
    candidate_id: int
    candidate_name: str
    application_id: int
    match_score: int
    matched_skills: list[str]
    missing_skills: list[str]


class RecruiterCandidateMatchesResponse(BaseModel):
    success: bool
    job_id: int
    job_title: str
    candidates: list[CandidateMatchResponse]
