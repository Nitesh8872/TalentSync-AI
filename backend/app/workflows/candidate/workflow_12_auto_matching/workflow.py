"""Workflow 12 orchestration."""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_12_auto_matching.service import (
    recommend_jobs_for_candidate as build_candidate_recommendations,
)


def recommend_jobs_for_candidate(candidate_id: int, db: Session, limit: int = 10):
    return build_candidate_recommendations(candidate_id=candidate_id, db=db, limit=limit)
