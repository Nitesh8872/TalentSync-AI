"""
# WORKFLOW NUMBER
# WORKFLOW 6 - RESUME VS JOB MATCHING
#
# PURPOSE
# Orchestrate resume vs job matching workflow.
#
# INPUT
# Resume id, job description id, and database session.
#
# OUTPUT
# Match score, matched skills, and missing skills.
#
# FLOW DESCRIPTION
# Resume Data + Job Description -> Matching Engine -> Matched Skills +
# Missing Skills -> Match Score -> API Response.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_06_matching.schema import MatchRequest
from backend.app.workflows.candidate.workflow_06_matching.service import match_resume_to_job


def match_resume_job(payload: MatchRequest, db: Session, candidate_id: int):
    """
    Execute Workflow 6: Resume vs Job Matching.
    
    Steps:
    1. Validate request via schema
    2. Call service to match resume to job
    3. Return match results
    """
    return match_resume_to_job(resume_id=payload.resume_id, job_id=payload.job_id, db=db, candidate_id=candidate_id)


# Export service functions for direct route access
__all__ = ["match_resume_job", "match_resume_to_job"]
