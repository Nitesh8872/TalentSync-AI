"""
# WORKFLOW NUMBER
# WORKFLOW 5 - JOB DESCRIPTION PARSING SERVICE
#
# PURPOSE
# Extract structured job metadata while preserving the raw job description.
#
# INPUT
# Job title and raw job-description text.
#
# OUTPUT
# Future-ready structured job metadata for matching, ranking, scoring,
# recruiter analytics, and interview shortlisting.
#
# FLOW DESCRIPTION
# Raw Job Description -> Job Parser -> Normalized Skills + Requirements ->
# Workflow 5 Storage -> Workflow 6 Matching.
"""

import json
import re
from typing import Any

SKILLS_VERSION = "job-skills-v1"

CANONICAL_SKILLS = {
    "agile": "Agile",
    "angular": "Angular",
    "aws": "AWS",
    "azure": "Azure",
    "c": "C",
    "c plus plus": "C++",
    "cplusplus": "C++",
    "cpp": "C++",
    "c sharp": "C#",
    "csharp": "C#",
    "ci cd": "CI/CD",
    "cicd": "CI/CD",
    "css": "CSS",
    "deep learning": "Deep Learning",
    "django": "Django",
    "docker": "Docker",
    "express": "Express",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "gcp": "GCP",
    "git": "Git",
    "github": "GitHub",
    "go": "Go",
    "graphql": "GraphQL",
    "html": "HTML",
    "java": "Java",
    "javascript": "JavaScript",
    "kotlin": "Kotlin",
    "kubernetes": "Kubernetes",
    "laravel": "Laravel",
    "linux": "Linux",
    "machine learning": "Machine Learning",
    "microservices": "Microservices",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "node js": "Node.js",
    "nodejs": "Node.js",
    "nlp": "NLP",
    "numpy": "NumPy",
    "oracle": "Oracle",
    "pandas": "Pandas",
    "php": "PHP",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "python": "Python",
    "pytorch": "PyTorch",
    "r": "R",
    "rails": "Rails",
    "react": "React",
    "redis": "Redis",
    "rest": "REST API",
    "rest api": "REST API",
    "rest apis": "REST API",
    "restful api": "REST API",
    "ruby": "Ruby",
    "rust": "Rust",
    "scikit learn": "Scikit-learn",
    "scrum": "Scrum",
    "spring boot": "Spring Boot",
    "sql": "SQL",
    "sqlite": "SQLite",
    "swift": "Swift",
    "tensorflow": "TensorFlow",
    "typescript": "TypeScript",
    "vue": "Vue",
}

SKILL_ALIASES = {
    "amazon web services": "aws",
    "google cloud": "gcp",
    "google cloud platform": "gcp",
    "ms sql": "sql",
    "node": "node js",
    "nodejs": "node js",
    "postgre sql": "postgresql",
    "react js": "react",
    "reactjs": "react",
    "vue js": "vue",
    "vuejs": "vue",
}

REQUIRED_LABEL_PATTERN = re.compile(
    r"\b(required|required\s+skills?|must\s+have|mandatory|technical\s+skills?|"
    r"skills?|requirements?|qualifications?|tech\s+stack|technologies?)\b",
    re.I,
)
PREFERRED_LABEL_PATTERN = re.compile(
    r"\b(preferred|preferred\s+skills?|nice\s+to\s+have|good\s+to\s+have|"
    r"bonus|plus|desired)\b",
    re.I,
)
SECTION_STOP_PATTERN = re.compile(
    r"\b(responsibilities|benefits|about\s+us|salary|location|education|"
    r"experience|interview|shortlisting)\b",
    re.I,
)
EXPERIENCE_PATTERN = re.compile(
    r"(?:(\d+)\s*\+?\s*(?:years?|yrs?)|(?:minimum|min)\s+(\d+)\s*(?:years?|yrs?))",
    re.I,
)
EDUCATION_PATTERN = re.compile(
    r"\b(Bachelor'?s?|Bachelors|B\.?Tech|B\.?E\.?|BSc|BS|Master'?s?|Masters|M\.?Tech|"
    r"MSc|MS|MBA|PhD|Diploma)\b",
    re.I,
)


# ==================================================
# Function: parse_job_description()
#
# Purpose:
# Convert raw Workflow 5 job-description text into structured metadata.
#
# Steps:
# 1. Preserve the submitted job title as the parsed job title.
# 2. Extract and normalize required skills.
# 3. Extract and normalize preferred skills.
# 4. Extract experience and education requirements.
# 5. Return a future-ready parsed_job_data payload.
# ==================================================
def parse_job_description(title: str, description: str) -> dict[str, Any]:
    text = f"{title}\n{description}".strip()
    required_skills = extract_required_skills(text)
    preferred_skills = extract_preferred_skills(text)

    return {
        "schema_version": 1,
        "skills_version": SKILLS_VERSION,
        "job_title": title.strip(),
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "experience_required": extract_experience_required(text),
        "education_required": extract_education_required(text),
        "matching": {
            "required_skill_count": len(required_skills),
            "preferred_skill_count": len(preferred_skills),
        },
        "candidate_ranking": {
            "skill_weight": 0.7,
            "experience_weight": 0.2,
            "education_weight": 0.1,
        },
        "resume_scoring": {
            "minimum_match_score": 0,
            "score_basis": "required_skills",
        },
        "recruiter_analytics": {
            "skill_gap_tracking": True,
            "version": SKILLS_VERSION,
        },
        "interview_shortlisting": {
            "shortlist_threshold": 70,
            "priority_skills": required_skills[:5],
        },
    }


def parsed_job_data_to_json(parsed_job_data: dict[str, Any]) -> str:
    return json.dumps(parsed_job_data, ensure_ascii=False)


def parsed_job_data_from_json(value: str | None) -> dict[str, Any] | None:
    if not value:
        return None
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def skills_to_json(skills: list[str]) -> str:
    return json.dumps(skills, ensure_ascii=False)


def skills_from_json(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [str(item).strip() for item in data if str(item).strip()]


# ==================================================
# Function: extract_required_skills()
#
# Purpose:
# Extract normalized must-have skills from labeled sections and known keywords.
# ==================================================
def extract_required_skills(text: str) -> list[str]:
    labeled = _extract_section_skills(text, REQUIRED_LABEL_PATTERN)
    keywords = _extract_keyword_skills(text)
    preferred = {normalize_skill(skill) for skill in extract_preferred_skills(text)}
    return _dedupe_skills([skill for skill in labeled + keywords if normalize_skill(skill) not in preferred])


# ==================================================
# Function: extract_preferred_skills()
#
# Purpose:
# Extract normalized nice-to-have skills from preferred/bonus sections.
# ==================================================
def extract_preferred_skills(text: str) -> list[str]:
    return _dedupe_skills(_extract_section_skills(text, PREFERRED_LABEL_PATTERN))


def extract_experience_required(text: str) -> int | None:
    matches: list[int] = []
    for match in EXPERIENCE_PATTERN.finditer(text):
        value = match.group(1) or match.group(2)
        if value:
            matches.append(int(value))
    return min(matches) if matches else None


def extract_education_required(text: str) -> str:
    match = EDUCATION_PATTERN.search(text)
    if not match:
        return ""

    value = match.group(0).lower().replace(".", "")
    if value.startswith("b") or value in {"bs"}:
        return "Bachelor"
    if value.startswith("m") or value in {"ms", "mba"}:
        return "Master"
    if value == "phd":
        return "PhD"
    return "Diploma" if value == "diploma" else match.group(0)


# ==================================================
# Function: normalize_skill()
#
# Purpose:
# Normalize equivalent skill spellings into one canonical display value.
# ==================================================
def normalize_skill(skill: str) -> str:
    key = normalize_skill_key(skill)
    return CANONICAL_SKILLS.get(key, str(skill).strip())


def normalize_skill_key(skill: str) -> str:
    value = str(skill).lower().strip()
    if not value:
        return ""
    value = value.replace("&", " and ")
    value = value.replace("+", " plus ")
    value = value.replace("#", " sharp ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return SKILL_ALIASES.get(value, value)


def _extract_section_skills(text: str, label_pattern: re.Pattern[str]) -> list[str]:
    skills: list[str] = []
    in_section = False

    for raw_line in text.splitlines():
        line = raw_line.strip(" -*\t")
        if not line:
            continue

        label, separator, value = line.partition(":")
        if separator and label_pattern.search(label):
            in_section = True
            skills.extend(_split_skill_values(value))
            continue

        if separator and in_section and SECTION_STOP_PATTERN.search(label):
            in_section = False
            continue

        if in_section:
            if separator and (REQUIRED_LABEL_PATTERN.search(label) or PREFERRED_LABEL_PATTERN.search(label)):
                in_section = label_pattern.search(label) is not None
                skills.extend(_split_skill_values(value) if in_section else [])
                continue
            skills.extend(_split_skill_values(line))

    return skills


def _extract_keyword_skills(text: str) -> list[str]:
    normalized_text = f" {normalize_skill_key(text)} "
    skills: list[str] = []

    for skill in CANONICAL_SKILLS.values():
        key = normalize_skill_key(skill)
        if key and f" {key} " in normalized_text:
            skills.append(skill)

    for alias, target in SKILL_ALIASES.items():
        if f" {alias} " in normalized_text:
            skills.append(normalize_skill(target))

    return skills


def _split_skill_values(raw: str) -> list[str]:
    parts = re.split(r"[,;|/]|(?:\s+-\s+)|(?:\s+and\s+)", raw)
    skills: list[str] = []

    for part in parts:
        value = re.sub("^[\\-*\\u2022\\s]+", "", part).strip(" .")
        if not value or len(value) > 60:
            continue

        known_skills = _extract_keyword_skills(value)
        if known_skills:
            skills.extend(known_skills)
            continue

        if SECTION_STOP_PATTERN.search(value):
            continue
        if len(value.split()) > 3 or not re.search(r"[A-Za-z]", value):
            continue
        skills.append(normalize_skill(value))

    return skills


def _dedupe_skills(skills: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for skill in skills:
        normalized = normalize_skill_key(skill)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalize_skill(skill))

    return result
