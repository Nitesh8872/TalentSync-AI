"""
# WORKFLOW NUMBER
# WORKFLOW 11 - CANDIDATE BROWSE JOBS
#
# PURPOSE
# Orchestrate candidate job browsing use cases.
#
# INPUT
# Query filters, pagination, job id, and database session.
#
# OUTPUT
# Paginated job lists and job detail responses.
#
# FLOW DESCRIPTION
# Candidate Dashboard -> Browse Jobs -> Open Job Details.
"""

from sqlalchemy.orm import Session

from backend.app.workflows.candidate.workflow_11_browse_jobs.schema import JobBrowseQuery
from backend.app.workflows.candidate.workflow_11_browse_jobs.service import (
    browse_available_jobs,
    get_available_job,
)


def browse_jobs(query: JobBrowseQuery, db: Session):
    return browse_available_jobs(query=query, db=db)


def get_job_details(job_id: int, db: Session):
    return get_available_job(job_id=job_id, db=db)
