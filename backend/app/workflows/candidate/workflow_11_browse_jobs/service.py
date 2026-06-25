"""
# WORKFLOW NUMBER
# WORKFLOW 11 - CANDIDATE BROWSE JOBS
#
# PURPOSE
# Query recruiter-created jobs for candidate browsing.
#
# INPUT
# Search text, field filters, pagination, and database session.
#
# OUTPUT
# Paginated job lists and job detail payloads.
#
# FLOW DESCRIPTION
# Candidate Dashboard -> Query Jobs -> Apply Filters -> Return Structured Jobs.
"""

import math
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Query, Session

from backend.app.database.models import Job
from backend.app.services.job_visibility import filter_candidate_open_jobs
from backend.app.workflows.candidate.workflow_11_browse_jobs.schema import JobBrowseQuery
from backend.app.workflows.recruiter.workflow_10_job_posting.service import serialize_job


def browse_available_jobs(query: JobBrowseQuery, db: Session) -> dict[str, Any]:
    jobs_query = apply_job_filters(filter_candidate_open_jobs(db.query(Job)), query)
    total = jobs_query.count()
    offset = (query.page - 1) * query.page_size
    jobs = jobs_query.order_by(Job.created_at.desc(), Job.id.desc()).offset(offset).limit(query.page_size).all()

    return {
        "success": True,
        "pagination": {
            "page": query.page,
            "page_size": query.page_size,
            "total": total,
            "total_pages": math.ceil(total / query.page_size) if total else 0,
        },
        "jobs": [serialize_job(job) for job in jobs],
    }


def get_available_job(job_id: int, db: Session) -> dict[str, Any]:
    job = filter_candidate_open_jobs(db.query(Job)).filter(Job.id == job_id).first()
    if not job:
        raise ValueError("Job not found")
    return {"success": True, "job": serialize_job(job)}


def apply_job_filters(jobs_query: Query, query: JobBrowseQuery) -> Query:
    search = normalize_query_value(query.search)
    title = normalize_query_value(query.title)
    skill = normalize_query_value(query.skill)
    keyword = normalize_query_value(query.keyword)
    experience = normalize_query_value(query.experience)

    if search:
        pattern = f"%{search}%"
        jobs_query = jobs_query.filter(
            or_(
                Job.title.ilike(pattern),
                Job.skills.ilike(pattern),
                Job.description.ilike(pattern),
            )
        )
    if title:
        jobs_query = jobs_query.filter(Job.title.ilike(f"%{title}%"))
    if skill:
        jobs_query = jobs_query.filter(Job.skills.ilike(f"%{skill}%"))
    if keyword:
        pattern = f"%{keyword}%"
        jobs_query = jobs_query.filter(or_(Job.title.ilike(pattern), Job.description.ilike(pattern)))
    if experience:
        jobs_query = jobs_query.filter(Job.experience.ilike(f"%{experience}%"))

    return jobs_query


def normalize_query_value(value: str | None) -> str | None:
    text = str(value or "").strip()
    return text or None
