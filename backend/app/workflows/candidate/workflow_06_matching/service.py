"""
# WORKFLOW NUMBER
# WORKFLOW 6 - RESUME VS JOB MATCHING
#
# PURPOSE
# Compare parsed resume skills with stored job-description requirements.
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

import re
from typing import Any

from sqlalchemy.orm import Session

from backend.app.database.models import JobDescription, Resume
from backend.app.services.job_parser import parsed_job_data_from_json, skills_from_json
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import (
    ensure_parsed_resume_data,
)


SKILL_KEYWORDS = [
    "Python",
    "SQL",
    "FastAPI",
    "Django",
    "Flask",
    "JavaScript",
    "TypeScript",
    "React",
    "Angular",
    "Vue",
    "Node.js",
    "Express",
    "HTML",
    "CSS",
    "Java",
    "Spring Boot",
    "C",
    "C++",
    "C#",
    "Go",
    "Rust",
    "PHP",
    "Laravel",
    "Ruby",
    "Rails",
    "Kotlin",
    "Swift",
    "R",
    "Pandas",
    "NumPy",
    "Machine Learning",
    "Deep Learning",
    "TensorFlow",
    "PyTorch",
    "Scikit-learn",
    "NLP",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "SQLite",
    "Oracle",
    "Docker",
    "Kubernetes",
    "AWS",
    "Azure",
    "GCP",
    "Git",
    "GitHub",
    "CI/CD",
    "Linux",
    "REST API",
    "GraphQL",
    "Microservices",
    "Agile",
    "Scrum",
]

SKILL_ALIASES = {
    "amazon web services": "aws",
    "google cloud": "gcp",
    "google cloud platform": "gcp",
    "postgres": "postgresql",
    "postgre sql": "postgresql",
    "ms sql": "sql",
    "node": "nodejs",
    "node js": "nodejs",
    "nodejs": "nodejs",
    "react js": "react",
    "reactjs": "react",
    "vue js": "vue",
    "vuejs": "vue",
    "rest": "rest api",
    "restful api": "rest api",
    "rest apis": "rest api",
    "ci cd": "cicd",
    "cicd": "cicd",
    "scikit learn": "scikit learn",
}

SECTION_LABEL_PATTERN = re.compile(
    r"\b(required\s+skills?|technical\s+skills?|skills?|requirements?|"
    r"qualifications?|tech\s+stack|technologies?|tools?)\b",
    re.I,
)
SECTION_STOP_PATTERN = re.compile(
    r"\b(responsibilities|benefits|about\s+us|salary|location|education|experience)\b",
    re.I,
)


def match_resume_to_job(resume_id: int, job_id: int, db: Session, candidate_id: int) -> dict[str, Any]:
    """
    Execute Workflow 6 from database lookup through score calculation.
    
    Steps:
    1. Fetch the parsed resume row using resume_id.
    2. Fetch the stored job description row using job_id.
    3. Normalize resume skills and job-required skills.
    4. Compare normalized skill names.
    5. Calculate score as (match_count / required_skill_count) * 100.
    """
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.candidate_id == candidate_id).first()
    if not resume:
        raise ValueError("Resume not found")

    job = db.query(JobDescription).filter(
        JobDescription.id == job_id,
        JobDescription.candidate_id == candidate_id,
    ).first()
    if not job:
        raise ValueError("Job description not found")

    parsed_resume = ensure_parsed_resume_data(resume=resume, db=db)
    resume_skills = extract_resume_skills(parsed_resume)
    required_skills = extract_job_required_skills_from_job(job)

    matched_skills, missing_skills = compare_skills(
        resume_skills=resume_skills,
        required_skills=required_skills,
    )
    required_skill_count = len(required_skills)
    match_score = round((len(matched_skills) / required_skill_count) * 100) if required_skill_count else 0

    return {
        "match_score": match_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }


def extract_resume_skills(parsed_resume: dict[str, Any] | None) -> list[str]:
    """Return one safe flat skill list for legacy and rich resume schemas."""
    if not isinstance(parsed_resume, dict):
        return []

    skills: list[str] = []
    skills.extend(_list_values(parsed_resume.get("all_skills_flat", [])))

    for field in ("categorized_skills", "technical_skills"):
        categorized = parsed_resume.get(field, {})
        if isinstance(categorized, dict):
            for values in categorized.values():
                skills.extend(_list_values(values))
        else:
            skills.extend(_list_values(categorized))

    skills.extend(_list_values(parsed_resume.get("skills", [])))
    return _dedupe_by_normalized(skills)


def extract_job_required_skills_from_job(job: JobDescription) -> list[str]:
    """
    Prefer Workflow 5 parsed_job_data and fallback to raw JD text for old jobs.
    
    Notes:
    Old job_descriptions rows were created before structured job parsing existed,
    so missing parsed data must not block Workflow 6 matching.
    """
    parsed_job_data = parsed_job_data_from_json(getattr(job, "parsed_job_data", None))
    if parsed_job_data:
        required_skills = _list_values(parsed_job_data.get("required_skills", []))
        if required_skills:
            return _dedupe_by_normalized(required_skills)

    column_required_skills = skills_from_json(getattr(job, "required_skills", None))
    if column_required_skills:
        return _dedupe_by_normalized(column_required_skills)

    return extract_job_required_skills(f"{job.title}\n{job.description}")


def extract_job_required_skills(job_text: str) -> list[str]:
    """
    Convert the raw Workflow 5 job-description text into comparable skill names.
    
    Notes:
    Workflow 5 stores the JD as raw text, so Workflow 6 performs matching-specific
    normalization here without changing earlier workflow storage behavior.
    """
    labeled_skills = _extract_labeled_skill_values(job_text)
    keyword_skills = _extract_keyword_skills(job_text)
    return _dedupe_by_normalized(labeled_skills + keyword_skills)


def compare_skills(resume_skills: list[str], required_skills: list[str]) -> tuple[list[str], list[str]]:
    """Split the job-required skills into matched and missing lists."""
    resume_skill_keys = {_normalize_skill(skill) for skill in resume_skills if _normalize_skill(skill)}

    matched: list[str] = []
    missing: list[str] = []
    for skill in required_skills:
        skill_key = _normalize_skill(skill)
        if skill_key in resume_skill_keys:
            matched.append(skill)
        else:
            missing.append(skill)

    return matched, missing


def _extract_labeled_skill_values(job_text: str) -> list[str]:
    skills: list[str] = []
    in_skill_section = False

    for raw_line in job_text.splitlines():
        line = raw_line.strip(" -*\t")
        if not line:
            continue

        label, separator, value = line.partition(":")
        if separator and SECTION_LABEL_PATTERN.search(label):
            in_skill_section = True
            skills.extend(_split_skill_values(value))
            continue

        if separator and in_skill_section and SECTION_STOP_PATTERN.search(label):
            in_skill_section = False
            continue

        if in_skill_section:
            if separator and SECTION_STOP_PATTERN.search(label):
                in_skill_section = False
                continue
            skills.extend(_split_skill_values(line))

    return skills


def _extract_keyword_skills(job_text: str) -> list[str]:
    normalized_text = f" {_normalize_plain_text(job_text)} "
    skills: list[str] = []

    for skill in SKILL_KEYWORDS:
        skill_keys = {_normalize_plain_text(skill), _normalize_skill(skill)}
        if any(skill_key and f" {skill_key} " in normalized_text for skill_key in skill_keys):
            skills.append(skill)

    return skills


def _split_skill_values(raw: str) -> list[str]:
    values = re.split(r"[,;|/]|(?:\s+-\s+)|(?:\s+and\s+)", raw)
    skills: list[str] = []

    for value in values:
        skill = re.sub("^[\\-*\\u2022\\s]+", "", value).strip(" .")
        if not skill or len(skill) > 45:
            continue
        known_skills = _extract_keyword_skills(skill)
        if known_skills:
            skills.extend(known_skills)
            continue
        if SECTION_STOP_PATTERN.search(skill) or SECTION_LABEL_PATTERN.fullmatch(skill):
            continue
        if len(skill.split()) > 3:
            continue
        if not re.search(r"[A-Za-z]", skill):
            continue
        skills.append(skill)

    return skills


def _list_values(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    return []


def _dedupe_by_normalized(skills: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for skill in skills:
        normalized = _normalize_skill(skill)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(skill.strip())

    return result


def _normalize_skill(skill: str) -> str:
    value = _normalize_plain_text(skill)
    return SKILL_ALIASES.get(value, value)


def _normalize_plain_text(value: str) -> str:
    normalized = str(value).lower().strip()
    if not normalized:
        return ""

    normalized = normalized.replace("&", " and ")
    normalized = normalized.replace("+", " plus ")
    normalized = normalized.replace("#", " sharp ")
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()
