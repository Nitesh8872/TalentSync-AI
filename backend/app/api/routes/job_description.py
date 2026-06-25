"""
# WORKFLOW NUMBER
# WORKFLOW 5 - CANDIDATE JOB DESCRIPTION SUBMISSION
#
# PURPOSE
# Centralized HTTP routes for job-description submission and history.
#
# INPUT
# JobDescriptionRequest JSON body.
#
# OUTPUT
# JobDescriptionResponse JSON body and job-history records.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 5 Schema -> Workflow 5 Service -> Database -> HTTP Response.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.workflows.candidate.workflow_05_job_description.schema import (
    DeleteCareerGoalResponse,
    JobDescriptionRequest,
    JobDescriptionResponse,
)
from backend.app.workflows.candidate.workflow_05_job_description.workflow import (
    delete_job_description,
    list_job_descriptions as load_job_descriptions,
    submit_job_description,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /job-description
#
# Input:
# - title
# - description
#
# Output:
# - success flag
# - save message
#
# Used By:
# Workflow 5 - Candidate Job Description Submission
# ==================================================
@router.post("/job-description", response_model=JobDescriptionResponse, status_code=status.HTTP_200_OK)
async def create_job_description(payload: JobDescriptionRequest, candidate_id: int = Depends(get_authenticated_candidate_id), db: Session = Depends(get_db)):
    try:
        submit_job_description(payload=payload, db=db, candidate_id=candidate_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return JobDescriptionResponse(success=True, message="Job description saved")


# ==================================================
# Endpoint: GET /job-descriptions
#
# Input:
# - none
#
# Output:
# - list of submitted job descriptions
#
# Used By:
# Workflow 5 - Candidate Job Description Submission
# ==================================================
@router.get("/job-descriptions", status_code=status.HTTP_200_OK)
def list_job_descriptions(candidate_id: int = Depends(get_authenticated_candidate_id), db: Session = Depends(get_db)):
    return load_job_descriptions(db=db, candidate_id=candidate_id)


@router.delete(
    "/candidate/career-goals/{goal_id}",
    response_model=DeleteCareerGoalResponse,
    status_code=status.HTTP_200_OK,
)
def delete_career_goal(
    goal_id: int,
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db),
):
    try:
        deleted_goal_id = delete_job_description(goal_id=goal_id, db=db, candidate_id=candidate_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return DeleteCareerGoalResponse(
        success=True,
        message="Career goal deleted",
        deleted_goal_id=deleted_goal_id,
    )
