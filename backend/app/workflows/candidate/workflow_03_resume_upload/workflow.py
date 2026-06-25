"""
# WORKFLOW NUMBER
# WORKFLOW 3 — RESUME UPLOAD
#
# PURPOSE
# Orchestrate resume upload workflow.
#
# INPUT
# UploadFile and database session.
#
# OUTPUT
# Resume metadata and parsed data.
#
# FLOW DESCRIPTION
# Upload Resume -> Validate PDF -> Extract Text -> Call Workflow 4 Parser -> Save Resume.
"""

from fastapi import UploadFile
from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_03_resume_upload.service import (
    get_uploaded_resume_details,
    list_uploaded_resumes,
    upload_resume_file,
)


async def upload_resume(
    file: UploadFile,
    db: Session,
    candidate_id: int,
):
    """
    Execute Workflow 3: Resume Upload.
    
    Steps:
    1. Validate file is PDF
    2. Extract text from PDF
    3. Parse resume data
    4. Save to database
    5. Return resume data
    """
    return await upload_resume_file(file=file, db=db, candidate_id=candidate_id)


def list_resumes(db: Session, candidate_id: int):
    """
    List all uploaded resumes.
    """
    return list_uploaded_resumes(db=db, candidate_id=candidate_id)


def get_resume_details(resume_id: int, db: Session, candidate_id: int):
    """
    Get detailed resume information.
    """
    return get_uploaded_resume_details(resume_id=resume_id, db=db, candidate_id=candidate_id)
