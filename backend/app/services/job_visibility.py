"""Shared visibility rules for candidate-facing job workflows."""

import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Query

from backend.app.database.models import Job


def filter_candidate_open_jobs(jobs_query: Query, today: datetime.date | None = None) -> Query:
    """Return active jobs whose application deadline has not passed."""
    today = today or datetime.date.today()
    return jobs_query.filter(
        Job.status == "ACTIVE",
        or_(Job.application_deadline.is_(None), Job.application_deadline >= today),
    )


def is_candidate_open_job(job: Job, today: datetime.date | None = None) -> bool:
    today = today or datetime.date.today()
    return (
        job.status == "ACTIVE"
        and (job.application_deadline is None or job.application_deadline >= today)
    )
