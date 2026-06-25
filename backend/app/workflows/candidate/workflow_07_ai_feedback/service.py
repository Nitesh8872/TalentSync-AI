"""
# WORKFLOW NUMBER
# WORKFLOW 7 - AI RESUME FEEDBACK
#
# PURPOSE
# Generate professional hiring feedback for a resume against a selected job.
#
# INPUT
# Resume id, job id, database session, parsed resume data, job description, and
# Workflow 6 matching results.
#
# OUTPUT
# Structured feedback JSON with resume score, strengths, weaknesses, missing
# skills, and improvement suggestions.
#
# FLOW DESCRIPTION
# Resume Data + Job Description + Matching Results -> LLM Prompt -> AI Provider
# -> Structured Feedback Report -> API Response.
"""

import json
import os
import urllib.error
import urllib.request
from typing import Any, Protocol

from sqlalchemy.orm import Session

from backend.app.database.models import JobDescription, Resume
from backend.app.services.job_parser import parsed_job_data_from_json
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import (
    ensure_parsed_resume_data,
)
from backend.app.workflows.candidate.workflow_06_matching.service import (
    extract_resume_skills,
    match_resume_to_job,
)


DEFAULT_FEEDBACK = {
    "resume_score": 0,
    "strengths": [],
    "weaknesses": [],
    "missing_skills": [],
    "suggestions": [],
}


class AIFeedbackProvider(Protocol):
    def generate_feedback(self, prompt: str, context: dict[str, Any]) -> dict[str, Any]:
        """Generate structured feedback from a swappable AI provider."""


class LocalRuleBasedFeedbackProvider:
    """Deterministic fallback provider used when no external LLM is configured."""

    def generate_feedback(self, prompt: str, context: dict[str, Any]) -> dict[str, Any]:
        matching = context["matching"]
        resume_skills = context["resume_skills"]
        job = context["job"]
        matched_skills = matching["matched_skills"]
        missing_skills = matching["missing_skills"]

        strengths = [
            f"Shows relevant experience with {skill}"
            for skill in matched_skills[:4]
        ]
        if not strengths and resume_skills:
            strengths.append(f"Includes technical exposure to {resume_skills[0]}")
        if matching["match_score"] >= 75:
            strengths.append("Strong overall alignment with the job requirements")

        weaknesses = [
            f"Missing required skill: {skill}"
            for skill in missing_skills[:4]
        ]
        if matching["match_score"] < 50:
            weaknesses.append("Resume needs stronger alignment with the selected role")
        if not weaknesses:
            weaknesses.append("No major requirement gaps detected from the parsed data")

        suggestions = [
            f"Add a project or work example demonstrating {skill}"
            for skill in missing_skills[:3]
        ]
        suggestions.extend([
            "Use measurable impact in project and experience descriptions",
            f"Tailor the resume summary toward the {job['title']} role",
        ])

        return {
            "resume_score": matching["match_score"],
            "strengths": strengths[:5],
            "weaknesses": weaknesses[:5],
            "missing_skills": missing_skills,
            "suggestions": suggestions[:6],
        }


class OpenAIChatFeedbackProvider:
    """OpenAI-compatible provider; other vendors can implement the same method."""

    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("AI_FEEDBACK_MODEL", "gpt-4o-mini")

    def generate_feedback(self, prompt: str, context: dict[str, Any]) -> dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "Return structured JSON only. Do not include markdown or prose.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        request = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError("AI provider request failed") from exc

        try:
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise RuntimeError("AI provider returned invalid feedback JSON") from exc


def generate_ai_resume_feedback(resume_id: int, job_id: int, db: Session, candidate_id: int) -> dict[str, Any]:
    """
    Execute Workflow 7 from database lookup through structured AI feedback.
    
    Steps:
    1. Fetch the resume and ensure Workflow 4 parsed data exists.
    2. Fetch the selected Workflow 5 job description.
    3. Fetch Workflow 6 matching results for the same resume/job pair.
    4. Build a strict JSON-only LLM prompt.
    5. Call the configured AI provider.
    6. Validate and return the structured feedback report.
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
    matching = match_resume_to_job(resume_id=resume_id, job_id=job_id, db=db, candidate_id=candidate_id)
    resume_skills = extract_resume_skills(parsed_resume)

    context = {
        "resume": {
            "id": resume.id,
            "filename": resume.filename,
            "parsed_data": parsed_resume,
            "skills": resume_skills,
        },
        "job": {
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "parsed_job_data": parsed_job_data_from_json(getattr(job, "parsed_job_data", None)),
        },
        "matching": matching,
        "resume_skills": resume_skills,
    }
    prompt = build_feedback_prompt(context)

    provider = get_ai_feedback_provider()
    try:
        feedback = provider.generate_feedback(prompt=prompt, context=context)
    except RuntimeError:
        feedback = LocalRuleBasedFeedbackProvider().generate_feedback(prompt=prompt, context=context)

    return normalize_feedback_payload(feedback=feedback, matching=matching)


def build_feedback_prompt(context: dict[str, Any]) -> str:
    """Build the strict provider prompt while keeping AI-specific logic in Workflow 7."""
    prompt_data = {
        "resume_data": context["resume"]["parsed_data"],
        "job_description": {
            "title": context["job"]["title"],
            "description": context["job"]["description"],
            "parsed_job_data": context["job"]["parsed_job_data"],
        },
        "matching_results": context["matching"],
        "required_output_schema": DEFAULT_FEEDBACK,
    }
    return (
        "Analyze this candidate resume against the selected job description. "
        "Return valid JSON only with exactly these keys: resume_score, strengths, "
        "weaknesses, missing_skills, suggestions. Keep feedback professional, "
        "hiring-focused, specific, and actionable.\n\n"
        f"{json.dumps(prompt_data, ensure_ascii=False)}"
    )


def get_ai_feedback_provider() -> AIFeedbackProvider:
    provider_name = os.getenv("AI_FEEDBACK_PROVIDER", "local").strip().lower()
    if provider_name == "openai":
        return OpenAIChatFeedbackProvider()
    return LocalRuleBasedFeedbackProvider()


def normalize_feedback_payload(feedback: dict[str, Any], matching: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(DEFAULT_FEEDBACK)
    if isinstance(feedback, dict):
        normalized.update(feedback)

    normalized["resume_score"] = _score_value(normalized.get("resume_score"), matching["match_score"])
    normalized["strengths"] = _string_list(normalized.get("strengths"))
    normalized["weaknesses"] = _string_list(normalized.get("weaknesses"))
    normalized["missing_skills"] = _string_list(normalized.get("missing_skills")) or matching["missing_skills"]
    normalized["suggestions"] = _string_list(normalized.get("suggestions"))
    return normalized


def _score_value(value: Any, fallback: int) -> int:
    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        score = fallback
    return max(0, min(100, score))


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]
