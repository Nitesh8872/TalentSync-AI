"""
# WORKFLOW NUMBER
# WORKFLOW 7 - AI RESUME FEEDBACK
#
# PURPOSE
# Validate AI feedback requests and format Workflow 7 API responses.
#
# INPUT
# Resume id and job id.
#
# OUTPUT
# Structured AI feedback response.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 7 AI Feedback -> Workflow 4 + Workflow 5 +
# Workflow 6 Data -> HTTP Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.workflows.candidate.workflow_07_ai_feedback.schema import (
    AIFeedbackRequest,
    AIFeedbackResponse,
)
from backend.app.workflows.candidate.workflow_07_ai_feedback.workflow import (
    generate_feedback,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /api/ai-feedback
#
# Input:
# - resume_id
# - job_id
#
# Output:
# - success flag
# - structured AI feedback report
#
# Used By:
# Workflow 7 - AI Resume Feedback
# ==================================================
@router.post("/api/ai-feedback", response_model=AIFeedbackResponse, status_code=status.HTTP_200_OK)
def create_ai_feedback(
    payload: AIFeedbackRequest,
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db),
):
    try:
        feedback = generate_feedback(payload=payload, db=db, candidate_id=candidate_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return AIFeedbackResponse(success=True, feedback=feedback)
