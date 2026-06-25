"""
# WORKFLOW NUMBER
# WORKFLOW 4 — RESUME PARSING
#
# PURPOSE
# Orchestrate resume parsing workflow.
#
# INPUT
# Resume database rows and extracted resume text.
#
# OUTPUT
# Structured parsed resume JSON.
#
# FLOW DESCRIPTION
# Resume Text -> Parser Engine -> Parsed JSON -> Resume Details API.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_04_resume_parsing.service import (
    ensure_parsed_resume_data,
    get_resume_parsed_payload,
    parse_resume_for_storage,
)


def parse_resume(extracted_text: str):
    """
    Execute Workflow 4: Parse resume text.
    
    Steps:
    1. Parse extracted text into structured data
    2. Convert to JSON for storage
    3. Return parsed data and JSON
    """
    return parse_resume_for_storage(extracted_text=extracted_text)


def get_parsed_resume(resume_id: int, db: Session, candidate_id: int):
    """
    Get parsed resume data for a specific resume.
    """
    return get_resume_parsed_payload(resume_id=resume_id, db=db, candidate_id=candidate_id)


def ensure_parsed_data(resume, db: Session):
    """
    Ensure resume has current parsed data.
    """
    return ensure_parsed_resume_data(resume=resume, db=db)
