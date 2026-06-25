"""
# WORKFLOW NUMBER
# WORKFLOW 12 - AUTO MATCH CANDIDATE TO JOBS
#
# PURPOSE
# Recommend recruiter-created jobs for a candidate using parsed resume data.
#
# INPUT
# Candidate id, database session, and optional recommendation limit.
#
# OUTPUT
# Ranked job recommendations with match scores.
#
# FLOW DESCRIPTION
# Candidate Resume -> Extract Skills -> Compare All Jobs -> Rank Matches.
"""

import re
from typing import Any

from sqlalchemy.orm import Session

from backend.app.database.models import Application, Job, Resume, User
from backend.app.services.candidate_resume_service import get_latest_candidate_resume
from backend.app.services.job_visibility import filter_candidate_open_jobs
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import (
    ensure_parsed_resume_data,
)
from backend.app.workflows.candidate.workflow_06_matching.service import extract_resume_skills
from backend.app.workflows.recruiter.workflow_10_job_posting.service import skills_from_json


def recommend_jobs_for_candidate(candidate_id: int, db: Session, limit: int = 10) -> dict[str, Any]:
    candidate = db.query(User).filter(User.id == candidate_id, User.role == "candidate").first()
    if not candidate:
        raise ValueError("Candidate not found")

    resume = get_latest_candidate_resume(candidate_id=candidate_id, db=db)
    if not resume:
        raise ValueError("Candidate resume not found")

    parsed_resume = ensure_parsed_resume_data(resume=resume, db=db)
    resume_skills = extract_resume_skills(parsed_resume)
    resume_text = build_resume_search_text(resume=resume, parsed_resume=parsed_resume)
    sufficient_data = has_minimum_resume_evidence(
        extracted_text=resume.extracted_text or "",
        parsed_resume=parsed_resume,
        resume_skills=resume_skills,
    )

    # Fetch the set of job IDs the candidate has already applied to so we can
    # exclude them from recommendations (avoids duplicate apply attempts).
    applied_job_ids: set[int] = {
        row[0]
        for row in db.query(Application.job_id)
        .filter(Application.candidate_id == candidate_id)
        .all()
    }
    recommendations = []
    for job in (
        filter_candidate_open_jobs(db.query(Job))
        .order_by(Job.created_at.desc(), Job.id.desc())
        .all()
    ):
        if job.id in applied_job_ids:
            continue

        score = calculate_job_match_score(
            resume_skills=resume_skills,
            resume_text=resume_text,
            parsed_resume=parsed_resume,
            job=job,
        )
        recommendations.append({"job_id": job.id, "title": job.title, "match_score": score if sufficient_data else 0})

    recommendations.sort(key=lambda item: item["match_score"], reverse=True)
    return {
        "success": True,
        "candidate_id": candidate_id,
        "recommendations": recommendations[:limit],
        "message": None if sufficient_data else "Insufficient resume data",
    }

def calculate_job_match_score(
    resume_skills: list[str],
    resume_text: str,
    parsed_resume: dict[str, Any],
    job: Job,
) -> int:
    if not has_minimum_resume_evidence(
        extracted_text=resume_text,
        parsed_resume=parsed_resume,
        resume_skills=resume_skills,
    ):
        return 0
    job_skills = skills_from_json(job.skills)
    skill_score = calculate_skill_score(resume_skills=resume_skills, job_skills=job_skills)
    keyword_score = calculate_keyword_score(resume_text=resume_text, job=job)
    experience_score = calculate_experience_score(parsed_resume=parsed_resume, job_experience=job.experience)

    weighted_score = (skill_score * 0.70) + (keyword_score * 0.15) + (experience_score * 0.15)
    return max(0, min(100, round(weighted_score)))


def has_minimum_resume_evidence(
    extracted_text: str,
    parsed_resume: dict[str, Any],
    resume_skills: list[str],
) -> bool:
    if not isinstance(parsed_resume, dict):
        return False
    raw_text = str(extracted_text or "").strip()
    if not raw_text or raw_text.startswith("[No text could be extracted"):
        return False
    evidence = [
        parsed_resume.get("professional_summary") or parsed_resume.get("summary"),
        parsed_resume.get("work_experience") or parsed_resume.get("experience"),
        parsed_resume.get("project_details") or parsed_resume.get("projects"),
        parsed_resume.get("education"),
        resume_skills,
    ]
    return len(re.findall(r"[A-Za-z0-9]+", raw_text)) >= 12 and any(bool(item) for item in evidence)


def calculate_skill_score(resume_skills: list[str], job_skills: list[str]) -> int:
    if not job_skills:
        return 0

    resume_keys = {normalize_token(skill) for skill in resume_skills if normalize_token(skill)}
    matched = 0
    for skill in job_skills:
        skill_key = normalize_token(skill)
        if skill_key and skill_key in resume_keys:
            matched += 1
    return round((matched / len(job_skills)) * 100)


def calculate_keyword_score(resume_text: str, job: Job) -> int:
    job_keywords = extract_keywords(f"{job.title} {job.description}")
    if not job_keywords:
        return 0

    resume_tokens = set(extract_keywords(resume_text))
    matched = len([keyword for keyword in job_keywords if keyword in resume_tokens])
    return round((matched / len(job_keywords)) * 100)


def calculate_experience_score(parsed_resume: dict[str, Any], job_experience: str) -> int:
    required_years = extract_lowest_year_value(job_experience)
    if required_years is None:
        return 100

    candidate_years = estimate_candidate_experience_years(parsed_resume)
    if candidate_years is None:
        return 50
    if candidate_years >= required_years:
        return 100
    return round((candidate_years / required_years) * 100) if required_years else 100


def estimate_candidate_experience_years(parsed_resume: dict[str, Any]) -> int | None:
    if not isinstance(parsed_resume, dict):
        return None
    work_experience = parsed_resume.get("work_experience") or parsed_resume.get("experience")
    if isinstance(work_experience, list) and work_experience:
        stated_years = extract_highest_year_value(str(work_experience))
        if stated_years is not None:
            return stated_years
        return max(1, len(work_experience))

    text = str(parsed_resume)
    return extract_highest_year_value(text)


def build_resume_search_text(resume: Resume, parsed_resume: dict[str, Any]) -> str:
    return f"{resume.extracted_text or ''} {parsed_resume}"


def extract_keywords(text: str) -> list[str]:
    stop_words = {
        "and",
        "are",
        "for",
        "the",
        "with",
        "this",
        "that",
        "job",
        "role",
        "developer",
        "engineer",
        "looking",
        "experience",
    }
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.]{1,}", text.lower())
    keywords: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        normalized = normalize_token(token)
        if not normalized or normalized in stop_words or normalized in seen:
            continue
        seen.add(normalized)
        keywords.append(normalized)
    return keywords[:30]


def extract_lowest_year_value(text: str) -> int | None:
    values = [int(value) for value in re.findall(r"\d+", text or "")]
    return min(values) if values else None


def extract_highest_year_value(text: str) -> int | None:
    values = [int(value) for value in re.findall(r"(\d+)\s*(?:years?|yrs?)", text or "", flags=re.I)]
    return max(values) if values else None


def normalize_token(value: str) -> str:
    normalized = str(value or "").lower().replace("&", " and ")
    normalized = normalized.replace("+", " plus ").replace("#", " sharp ")
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()
