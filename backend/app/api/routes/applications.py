"""
# WORKFLOW NUMBER
# WORKFLOW 13 - APPLY TO JOB
#
# PURPOSE
# Expose candidate application submission and recruiter application listing.
#
# INPUT
# Candidate/job ids or authenticated recruiter id.
#
# OUTPUT
# Submission confirmation or recruiter-owned application records.
#
# FLOW DESCRIPTION
# Candidate Applies -> Store Application -> Recruiter Lists Owned Applications.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id, get_authenticated_recruiter_id
from backend.app.workflows.candidate.workflow_13_job_application.schema import (
    ApplicationCreateRequest,
    ApplicationCreateResponse,
    ApplicationStatusUpdateRequest,
    CandidateApplicationsResponse,
    RecruiterApplicationItem,
    RecruiterApplicationsResponse,
)
from backend.app.workflows.candidate.workflow_13_job_application.service import (
    DeadlinePassedError,
    DuplicateApplicationError,
    InvalidApplicationTransition,
    MissingResumeError,
    update_application_status,
)
from backend.app.workflows.candidate.workflow_13_job_application.workflow import (
    list_recruiter_applications,
    list_candidate_applications,
    submit_job_application,
)

router = APIRouter()


# ==================================================
# Endpoint: POST /applications
#
# Input:
# - candidate_id
# - job_id
#
# Output:
# - application submission confirmation
#
# Used By:
# Workflow 13 - Apply To Job
# ==================================================
@router.post(
    "/applications",
    response_model=ApplicationCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    payload: ApplicationCreateRequest,
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db),
):
    try:
        submit_job_application(payload=payload, candidate_id=candidate_id, db=db)
    except DuplicateApplicationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except MissingResumeError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except DeadlinePassedError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return ApplicationCreateResponse(
        success=True,
        message="Application submitted successfully",
    )


@router.get("/candidate/applications", response_model=CandidateApplicationsResponse)
def get_candidate_applications(
    candidate_id: int = Depends(get_authenticated_candidate_id),
    db: Session = Depends(get_db),
):
    return CandidateApplicationsResponse(
        success=True,
        applications=list_candidate_applications(candidate_id=candidate_id, db=db),
    )


# ==================================================
# Endpoint: GET /recruiter/applications
#
# Input:
# - X-Recruiter-Id header
#
# Output:
# - applications belonging to the authenticated recruiter's jobs
#
# Used By:
# Workflow 13 - Recruiter Application Review
# ==================================================
@router.get(
    "/recruiter/applications",
    response_model=RecruiterApplicationsResponse,
    status_code=status.HTTP_200_OK,
)
def get_recruiter_applications(
    recruiter_id: int = Depends(get_authenticated_recruiter_id),
    db: Session = Depends(get_db),
):
    try:
        applications = list_recruiter_applications(recruiter_id=recruiter_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return RecruiterApplicationsResponse(
        success=True,
        recruiter_id=recruiter_id,
        applications=applications,
    )


@router.patch(
    "/recruiter/applications/{application_id}/status",
    response_model=RecruiterApplicationItem,
)
def change_application_status(
    application_id: int,
    payload: ApplicationStatusUpdateRequest,
    recruiter_id: int = Depends(get_authenticated_recruiter_id),
    db: Session = Depends(get_db),
):
    try:
        return update_application_status(
            application_id=application_id,
            recruiter_id=recruiter_id,
            next_status=payload.status,
            db=db,
        )
    except InvalidApplicationTransition as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
