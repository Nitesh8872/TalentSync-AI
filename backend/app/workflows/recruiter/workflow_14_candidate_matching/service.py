"""
# WORKFLOW NUMBER
# WORKFLOW 14 - RECRUITER CANDIDATE MATCHING
#
# PURPOSE
# Rank applicants for a recruiter-owned job using parsed resume data.
#
# INPUT
# Recruiter id, job id, and database session.
#
# OUTPUT
# Ranked candidate match records for the selected job.
#
# FLOW DESCRIPTION
# Recruiter Opens Job -> Validate Ownership -> Load Applicants -> Match Resumes
# -> Rank Candidates -> Return Results.
#
# SCORING CONTRACT (WF13 vs WF14)
# WF13 (Apply To Job) stores a SNAPSHOT match score at application time using
# the candidate's resume as it existed when they applied. This snapshot is
# displayed on the candidate's Application Tracker and is immutable after apply.
#
# WF14 (Recruiter Candidate Matching) RE-COMPUTES match scores LIVE at read
# time using the candidate's current resume. This means the recruiter always
# sees rankings based on the latest resume data, even if the candidate updated
# their resume after applying.
#
# The two views intentionally differ:
# - Candidate sees: "what I submitted"  (WF13 snapshot)
# - Recruiter sees: "best current match" (WF14 live)
"""

from typing import Any

from sqlalchemy.orm import Session

from backend.app.database.models import Application, Job, Recruiter, Resume, User
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import (
    ensure_parsed_resume_data,
)
from backend.app.workflows.candidate.workflow_06_matching.service import (
    compare_skills,
    extract_resume_skills,
)
from backend.app.workflows.candidate.workflow_12_auto_matching.service import (
    build_resume_search_text,
    calculate_job_match_score,
)
from backend.app.workflows.recruiter.workflow_10_job_posting.service import skills_from_json


def rank_job_applicants(recruiter_id: int, job_id: int, db: Session) -> dict[str, Any]:
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not recruiter:
        raise RecruiterNotFoundError("Recruiter not found")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise JobNotFoundError("Job not found")
    if job.recruiter_id != recruiter.id:
        raise JobOwnershipError("Recruiter does not own this job")

    applicant_rows = (
        db.query(Application, User)
        .join(User, User.id == Application.candidate_id)
        .filter(
            Application.job_id == job.id,
            Application.recruiter_id == recruiter.id,
            User.role == "candidate",
        )
        .all()
    )
    if not applicant_rows:
        return build_response(job=job, candidates=[])

    resumes = get_latest_resumes(
        candidate_ids=[candidate.id for _, candidate in applicant_rows],
        db=db,
    )
    candidates = [
        build_candidate_match(
            application=application,
            candidate=candidate,
            resume=(
                db.query(Resume)
                .filter(Resume.id == application.resume_id, Resume.candidate_id == candidate.id)
                .first()
                if application.resume_id
                else resumes.get(candidate.id)
            ),
            job=job,
            db=db,
        )
        for application, candidate in applicant_rows
    ]
    candidates.sort(
        key=lambda item: (-item["match_score"], item["application_id"])
    )
    return build_response(job=job, candidates=candidates)


def get_latest_resumes(candidate_ids: list[int], db: Session) -> dict[int, Resume]:
    if not candidate_ids:
        return {}

    rows = (
        db.query(Resume)
        .filter(Resume.candidate_id.in_(candidate_ids))
        .order_by(Resume.candidate_id, Resume.upload_time.desc(), Resume.id.desc())
        .all()
    )
    latest: dict[int, Resume] = {}
    for resume in rows:
        if resume.candidate_id is not None and resume.candidate_id not in latest:
            latest[resume.candidate_id] = resume
    return latest


def build_candidate_match(
    application: Application,
    candidate: User,
    resume: Resume | None,
    job: Job,
    db: Session,
) -> dict[str, Any]:
    job_skills = skills_from_json(job.skills)
    if not resume:
        return empty_candidate_match(
            application=application,
            candidate=candidate,
            missing_skills=job_skills,
        )

    try:
        parsed_resume = ensure_parsed_resume_data(resume=resume, db=db)
        resume_skills = extract_resume_skills(parsed_resume)
        matched_skills, missing_skills = compare_skills(
            resume_skills=resume_skills,
            required_skills=job_skills,
        )
        score = calculate_job_match_score(
            resume_skills=resume_skills,
            resume_text=build_resume_search_text(
                resume=resume,
                parsed_resume=parsed_resume,
            ),
            parsed_resume=parsed_resume,
            job=job,
        )
    except (TypeError, ValueError):
        return empty_candidate_match(
            application=application,
            candidate=candidate,
            missing_skills=job_skills,
        )

    return {
        "candidate_id": candidate.id,
        "candidate_name": candidate.full_name,
        "application_id": application.id,
        "match_score": score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }


def empty_candidate_match(
    application: Application,
    candidate: User,
    missing_skills: list[str],
) -> dict[str, Any]:
    return {
        "candidate_id": candidate.id,
        "candidate_name": candidate.full_name,
        "application_id": application.id,
        "match_score": 0,
        "matched_skills": [],
        "missing_skills": missing_skills,
    }


def build_response(job: Job, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "success": True,
        "job_id": job.id,
        "job_title": job.title,
        "candidates": candidates,
    }


class RecruiterNotFoundError(ValueError):
    pass


class JobNotFoundError(ValueError):
    pass


class JobOwnershipError(PermissionError):
    pass
