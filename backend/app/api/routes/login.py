"""
# WORKFLOW NUMBER
# WORKFLOW 2 - CANDIDATE LOGIN
#
# PURPOSE
# Centralized HTTP route for candidate login.
#
# INPUT
# CandidateLoginRequest JSON body.
#
# OUTPUT
# CandidateLoginResponse JSON body.
#
# FLOW DESCRIPTION
# Route Layer -> Workflow 2 Schema -> Workflow 2 Service -> Database -> HTTP Response.
"""

import os
import shutil
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.database.models import User
from backend.app.core.security import create_access_token
from backend.app.workflows.candidate.workflow_02_login.schema import (
    CandidateLoginRequest,
    CandidateLoginResponse,
)
from backend.app.workflows.candidate.workflow_02_login.workflow import (
    login_candidate as execute_login,
)

router = APIRouter()

UPLOAD_DIR = "data/uploads"


def _candidate_upload_path(filename: str) -> str:
    upload_root = os.path.abspath(UPLOAD_DIR)
    filepath = os.path.abspath(os.path.join(upload_root, os.path.basename(filename)))
    if os.path.commonpath([upload_root, filepath]) != upload_root:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile photo not found")
    return filepath


# ==================================================
# Endpoint: POST /login
#
# Input:
# - email
# - password
#
# Output:
# - success flag
# - login message
# - user id
# - full name
# - email
# - role
# - profile_image_url
#
# Used By:
# Workflow 2 - Candidate Login
# ==================================================
@router.post("/login", response_model=CandidateLoginResponse, status_code=status.HTTP_200_OK)
async def login_candidate(payload: CandidateLoginRequest, db: Session = Depends(get_db)):
    try:
        user = execute_login(payload=payload, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return CandidateLoginResponse(
        success=True,
        message="Login successful",
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        profile_image_url=user.profile_image_url,
        access_token=create_access_token(user.id, "candidate"),
    )


# ==================================================
# Endpoint: POST /api/candidate/profile-photo
#
# Input:
# - file: profile image
#
# Output:
# - success flag
# - profile_image_url
# ==================================================
@router.post("/api/candidate/profile-photo", status_code=status.HTTP_200_OK)
async def upload_profile_photo(
    file: UploadFile = File(...),
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only image files are allowed."
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1]
    if not ext:
        ext = ".png"

    filename = f"candidate_{candidate_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile photo: {str(exc)}"
        )

    user = db.query(User).filter(User.id == candidate_id, User.role == "candidate").first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate user not found"
        )

    url_path = f"/uploads/{filename}"
    user.profile_image_url = url_path
    db.commit()

    return {
        "success": True,
        "profile_image_url": url_path
    }


@router.get("/uploads/{filename}", include_in_schema=False)
def get_candidate_profile_photo(
    filename: str,
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == candidate_id, User.role == "candidate").first()
    if not user or not user.profile_image_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile photo not found")

    stored_filename = os.path.basename(user.profile_image_url)
    if stored_filename != filename:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile photo not found")

    filepath = _candidate_upload_path(filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile photo not found")
    return FileResponse(filepath)


# ==================================================
# Endpoint: DELETE /api/candidate/profile-photo
#
# Output:
# - success flag
# ==================================================
@router.delete("/api/candidate/profile-photo", status_code=status.HTTP_200_OK)
async def remove_profile_photo(
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == candidate_id, User.role == "candidate").first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate user not found"
        )

    if user.profile_image_url:
        filename = os.path.basename(user.profile_image_url)
        filepath = _candidate_upload_path(filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

    user.profile_image_url = None
    db.commit()

    return {"success": True}
