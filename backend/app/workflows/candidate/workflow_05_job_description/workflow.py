"""
# WORKFLOW NUMBER
# WORKFLOW 5 — CANDIDATE JOB DESCRIPTION SUBMISSION
#
# PURPOSE
# Orchestrate job description submission workflow.
#
# INPUT
# JobDescriptionRequest and database session.
#
# OUTPUT
# Saved JobDescription rows and job-history payloads.
#
# FLOW DESCRIPTION
# Job Description Form -> Validate Text -> Parse Metadata -> Save Row -> Return Confirmation.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_05_job_description.schema import (
    JobDescriptionRequest,
)
from backend.app.workflows.candidate.workflow_05_job_description.service import (
    delete_candidate_job_description,
    list_candidate_job_descriptions,
    save_candidate_job_description,
)


def submit_job_description(payload: JobDescriptionRequest, db: Session, candidate_id: int):
    """
    Execute Workflow 5: Submit job description.
    
    Steps:
    1. Validate job description data via schema
    2. Call service to save job description
    3. Return saved job
    """
    return save_candidate_job_description(payload=payload, db=db, candidate_id=candidate_id)


def list_job_descriptions(db: Session, candidate_id: int):
    """
    List all job descriptions.
    """
    return list_candidate_job_descriptions(db=db, candidate_id=candidate_id)


def delete_job_description(goal_id: int, db: Session, candidate_id: int):
    return delete_candidate_job_description(goal_id=goal_id, db=db, candidate_id=candidate_id)
