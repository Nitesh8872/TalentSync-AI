"""
# WORKFLOW NUMBER
# WORKFLOW 7 - AI RESUME FEEDBACK
#
# PURPOSE
# Orchestrate AI resume feedback workflow.
#
# INPUT
# Resume id, job id, and database session.
#
# OUTPUT
# Structured feedback JSON with resume score, strengths, weaknesses, missing
# skills, and improvement suggestions.
#
# FLOW DESCRIPTION
# Resume Data + Job Description + Matching Results -> LLM Prompt -> AI Provider
# -> Structured Feedback Report -> API Response.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_07_ai_feedback.schema import (
    AIFeedbackRequest,
)
from backend.app.workflows.candidate.workflow_07_ai_feedback.service import (
    generate_ai_resume_feedback,
)


def generate_feedback(payload: AIFeedbackRequest, db: Session, candidate_id: int):
    """
    Execute Workflow 7: AI Resume Feedback.
    
    Steps:
    1. Validate request via schema
    2. Call service to generate AI feedback
    3. Return feedback results
    """
    return generate_ai_resume_feedback(resume_id=payload.resume_id, job_id=payload.job_id, db=db, candidate_id=candidate_id)


# Export service functions for direct route access
__all__ = ["generate_feedback", "generate_ai_resume_feedback"]
