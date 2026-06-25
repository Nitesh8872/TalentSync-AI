"""Workflow 12 API contracts."""

from pydantic import BaseModel


class JobRecommendation(BaseModel):
    job_id: int
    title: str
    match_score: int


class RecommendationResponse(BaseModel):
    success: bool
    candidate_id: int
    recommendations: list[JobRecommendation]
    message: str | None = None
