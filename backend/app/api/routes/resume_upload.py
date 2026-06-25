"""
# WORKFLOW NUMBER
# WORKFLOW 3 - RESUME UPLOAD
#
# PURPOSE
# Centralized HTTP routes for resume upload, resume history, and resume details.
#
# INPUT
# PDF upload files and resume id path parameters.
#
# OUTPUT
# Upload response, resume history response, and resume details response.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 3 Schema -> Workflow 3 Service -> Database -> HTTP Response.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.workflows.candidate.workflow_03_resume_upload.schema import (
    LatestResumeResponse,
    ResumeDetailsResponse,
    ResumeHistoryItem,
    ResumeUploadResponse,
)
from backend.app.services.candidate_resume_service import get_latest_candidate_resume_payload
from backend.app.workflows.candidate.workflow_03_resume_upload.workflow import (
    get_resume_details,
    list_resumes as load_resumes,
    upload_resume as execute_upload,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /api/upload
#
# Input:
# - file: PDF resume
#
# Output:
# - success flag
# - resume id
# - filename
# - file size
# - upload time
# - extracted text
# - parsed data from Workflow 4
#
# Used By:
# Workflow 3 - Resume Upload
# ==================================================
@router.post("/api/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db),
):
    try:
        return await execute_upload(file=file, db=db, candidate_id=candidate_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


# ==================================================
# Endpoint: GET /api/resumes
#
# Input:
# - none
#
# Output:
# - list of uploaded resume history records
#
# Used By:
# Workflow 3 - Resume Upload
# ==================================================
@router.get("/api/resumes", response_model=list[ResumeHistoryItem], status_code=status.HTTP_200_OK)
def list_resumes(candidate_id: int = Depends(get_authenticated_candidate_id), db: Session = Depends(get_db)):
    return load_resumes(db=db, candidate_id=candidate_id)


@router.get("/candidate/resume/latest", response_model=LatestResumeResponse, status_code=status.HTTP_200_OK)
@router.get("/api/resumes/latest", response_model=LatestResumeResponse, status_code=status.HTTP_200_OK)
def get_latest_resume(candidate_id: int = Depends(get_authenticated_candidate_id), db: Session = Depends(get_db)):
    resume = get_latest_candidate_resume_payload(candidate_id=candidate_id, db=db)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume


# ==================================================
# Endpoint: GET /api/resumes/{resume_id}
#
# Input:
# - resume_id
#
# Output:
# - full uploaded resume details
# - extracted text
# - parsed data from Workflow 4
#
# Used By:
# Workflow 3 - Resume Upload
# ==================================================
@router.get("/api/resumes/{resume_id}", response_model=ResumeDetailsResponse, status_code=status.HTTP_200_OK)
def get_resume(resume_id: int, candidate_id: int = Depends(get_authenticated_candidate_id), db: Session = Depends(get_db)):
    try:
        return get_resume_details(resume_id=resume_id, db=db, candidate_id=candidate_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
