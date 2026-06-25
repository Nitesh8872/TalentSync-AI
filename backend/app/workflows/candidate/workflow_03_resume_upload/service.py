"""
# WORKFLOW NUMBER
# WORKFLOW 3 — RESUME UPLOAD
#
# PURPOSE
# Receive PDF resumes, extract text, and save upload records.
#
# INPUT
# FastAPI UploadFile and database session.
#
# OUTPUT
# Resume metadata, extracted text, and parsed data returned in the existing API shape.
#
# FLOW DESCRIPTION
# Upload Resume -> Validate PDF -> Extract Text -> Call Workflow 4 Parser -> Save Resume.
"""

import io
import logging
from typing import Any

from fastapi import UploadFile
from pypdf import PdfReader
from sqlalchemy.orm import Session

from backend.app.database.models import Resume, User
from backend.app.services.candidate_resume_service import newest_resume_ordering
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import (
    decode_parsed_resume_json,
    ensure_parsed_resume_data,
    get_resume_display_name,
    parse_resume_for_storage,
)

logger = logging.getLogger(__name__)


# ==================================================
# Function: extract_text_from_pdf()
#
# Purpose:
# Convert uploaded PDF bytes into plain text for Workflow 3.
#
# Steps:
# 1. Wrap PDF bytes in an in-memory stream.
# 2. Open the stream with pypdf.PdfReader.
# 3. Extract selectable text from every page.
# 4. Return one combined text string.
# ==================================================
def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)

        extracted_pages = []
        hyperlinks: list[str] = []
        for index, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                extracted_pages.append(text.strip())
            else:
                logger.warning("No text found on page %s", index + 1)

            for annotation_ref in page.get("/Annots", []):
                annotation = annotation_ref.get_object()
                action = annotation.get("/A")
                uri = action.get("/URI") if action else None
                if uri:
                    value = str(uri).strip()
                    if value and value not in hyperlinks:
                        hyperlinks.append(value)

        extracted_text = "\n\n".join(extracted_pages).strip()
        if hyperlinks:
            extracted_text += "\n\nRESUME LINKS\n" + "\n".join(hyperlinks)
        return extracted_text
    except Exception as exc:
        logger.error("Error extracting text from PDF: %s", exc)
        raise ValueError(f"Failed to parse PDF file: {exc}") from exc


# ==================================================
# Function: serialize_resume()
#
# Purpose:
# Convert one Resume row into the existing Workflow 3 API response shape.
#
# Steps:
# 1. Copy resume metadata.
# 2. Attach parsed_data decoded by Workflow 4.
# 3. Optionally attach extracted text.
# 4. Return a JSON-serializable dictionary.
# ==================================================
def serialize_resume(resume: Resume, include_text: bool = True) -> dict[str, Any]:
    data = {
        "id": resume.id,
        "filename": resume.filename,
        "file_size": resume.file_size,
        "upload_time": resume.upload_time.isoformat(),
        "parsed_data": decode_parsed_resume_json(resume.parsed_data),
    }
    if include_text:
        data["extracted_text"] = resume.extracted_text
    return data


# ==================================================
# Function: upload_resume_file()
#
# Purpose:
# Handle one PDF upload for Workflow 3.
#
# Steps:
# 1. Validate that the uploaded file is a PDF.
# 2. Read uploaded bytes.
# 3. Extract text from the PDF.
# 4. Call Workflow 4 to parse the extracted text.
# 5. Save the resume row and return the existing response payload.
# ==================================================
async def upload_resume_file(file: UploadFile, db: Session, candidate_id: int) -> dict[str, Any]:
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise ValueError("Invalid file format. Only PDF files are supported.")

    file_bytes = await file.read()
    file_size = len(file_bytes)
    if file_size == 0:
        raise ValueError("Uploaded file is empty.")

    logger.info("Uploading file: %s (%s bytes)", filename, file_size)

    extracted_text = extract_text_from_pdf(file_bytes)
    if not extracted_text:
        extracted_text = "[No text could be extracted from this PDF]"

    _, parsed_json = parse_resume_for_storage(extracted_text)

    candidate = db.query(User).filter(User.id == candidate_id, User.role == "candidate").first()
    if not candidate:
        raise ValueError("Candidate not found")

    db_resume = Resume(
        candidate_id=candidate_id,
        filename=filename,
        file_size=file_size,
        extracted_text=extracted_text,
        parsed_data=parsed_json,
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    return {
        "success": True,
        **serialize_resume(db_resume, include_text=True),
    }


# ==================================================
# Function: list_uploaded_resumes()
#
# Purpose:
# Return resume upload history for Workflow 3.
#
# Steps:
# 1. Query all resume rows newest-first.
# 2. Ask Workflow 4 for parsed display names.
# 3. Build compact history records.
# 4. Return the list to the API route.
# ==================================================
def list_uploaded_resumes(db: Session, candidate_id: int) -> list[dict[str, Any]]:
    resumes = (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate_id)
        .order_by(*newest_resume_ordering())
        .all()
    )
    return [
        {
            "id": resume.id,
            "filename": resume.filename,
            "file_size": resume.file_size,
            "upload_time": resume.upload_time.isoformat(),
            "parsed_name": get_resume_display_name(resume.parsed_data),
        }
        for resume in resumes
    ]


# ==================================================
# Function: get_uploaded_resume_details()
#
# Purpose:
# Return one full resume record for Workflow 3 details view.
#
# Steps:
# 1. Find the resume row by id.
# 2. Raise not-found when missing.
# 3. Ask Workflow 4 to ensure parsed data exists.
# 4. Return the full resume payload.
# ==================================================
def get_uploaded_resume_details(resume_id: int, db: Session, candidate_id: int) -> dict[str, Any]:
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.candidate_id == candidate_id).first()
    if not resume:
        raise ValueError("Resume not found")

    ensure_parsed_resume_data(resume=resume, db=db)
    return serialize_resume(resume, include_text=True)
