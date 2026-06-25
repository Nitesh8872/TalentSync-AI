"""
# WORKFLOW NUMBER
# Shared Routes Layer
#
# PURPOSE
# Register centralized API route modules with the FastAPI application.
#
# INPUT
# FastAPI application instance from main.py.
#
# OUTPUT
# Application with all Workflow 1-14 HTTP routers included.
#
# FLOW DESCRIPTION
# Main Layer -> Routes Layer -> Workflow Schemas -> Workflow Services -> Database.
"""

from fastapi import FastAPI

from backend.app.api.routes.ai_feedback import router as ai_feedback_router
from backend.app.api.routes.applications import router as applications_router
from backend.app.api.routes.job_description import router as job_description_router
from backend.app.api.routes.jobs import router as jobs_router
from backend.app.api.routes.login import router as login_router
from backend.app.api.routes.matching import router as matching_router
from backend.app.api.routes.recommendations import router as recommendations_router
from backend.app.api.routes.recruiter_candidate_matching import (
    router as recruiter_candidate_matching_router,
)
from backend.app.api.routes.recruiter_jobs import router as recruiter_jobs_router
from backend.app.api.routes.recruiter_login import router as recruiter_login_router
from backend.app.api.routes.recruiter_registration import (
    router as recruiter_registration_router,
)
from backend.app.api.routes.registration import router as registration_router
from backend.app.api.routes.resume_parsing import router as resume_parsing_router
from backend.app.api.routes.resume_upload import router as resume_upload_router


# ==================================================
# Function: include_workflow_routers()
#
# Purpose:
# Attach each centralized route module to the FastAPI app.
#
# Steps:
# 1. Register Workflow 1 registration HTTP routes.
# 2. Register Workflow 2 login HTTP routes.
# 3. Register Workflow 3 resume upload HTTP routes.
# 4. Register Workflow 4 resume parsing HTTP routes.
# 5. Register Workflow 5 job description HTTP routes.
# 6. Register Workflow 6 resume vs job matching HTTP routes.
# 7. Register Workflow 7 AI resume feedback HTTP routes.
# 8. Register Workflow 8 recruiter registration HTTP routes.
# 9. Register Workflow 9 recruiter login HTTP routes.
# 10. Register Workflow 10 recruiter job posting HTTP routes.
# 11. Register Workflow 11 candidate job browsing HTTP routes.
# 12. Register Workflow 12 job recommendation HTTP routes.
# 13. Register Workflow 13 job application HTTP routes.
# 14. Register Workflow 14 recruiter candidate matching HTTP routes.
# ==================================================
def include_workflow_routers(app: FastAPI) -> None:
    app.include_router(registration_router)
    app.include_router(login_router)
    app.include_router(resume_upload_router)
    app.include_router(resume_parsing_router)
    app.include_router(job_description_router)
    app.include_router(jobs_router)
    app.include_router(matching_router)
    app.include_router(ai_feedback_router)
    app.include_router(recruiter_registration_router)
    app.include_router(recruiter_login_router)
    app.include_router(recruiter_jobs_router)
    app.include_router(recommendations_router)
    app.include_router(applications_router)
    app.include_router(recruiter_candidate_matching_router)
