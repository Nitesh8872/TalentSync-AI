"""
# WORKFLOW NUMBER
# Shared Application Infrastructure
#
# PURPOSE
# Start the TalentSync AI FastAPI application without mixing workflow logic.
#
# INPUT
# Centralized route modules, database initialization, and static frontend files.
#
# OUTPUT
# FastAPI app serving Workflow 1-14 APIs and the frontend SPA.
#
# FLOW DESCRIPTION
# App Startup -> Initialize Database -> Register Centralized Routes -> Serve Frontend.
"""

import logging
import mimetypes
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.staticfiles import StaticFiles

from backend.app.api.router import include_workflow_routers
from backend.app.core.config import APP_TITLE, CORS_ORIGINS, FRONTEND_DIR
from backend.app.database.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
mimetypes.add_type("application/javascript", ".jsx")


# ==================================================
# SHARED APPLICATION STARTUP
# Purpose:
# Initialize shared infrastructure before any workflow endpoint is used.
#
# Flow:
# Uvicorn Startup
# -> init_db()
# -> Centralized Workflow Routes Become Available
# ==================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TalentSync AI database...")
    init_db()
    yield


# ==================================================
# SHARED FASTAPI APP
# Purpose:
# Create the application shell used by all workflow routers.
#
# Flow:
# FastAPI App
# -> CORS Middleware
# -> Centralized Route Registration
# -> Static Frontend Mount
# ==================================================
app = FastAPI(title=APP_TITLE, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

include_workflow_routers(app)


# ==================================================
# Class: NoCacheStaticFiles
#
# Purpose:
# Serve frontend assets without stale browser cache during local development.
#
# Steps:
# 1. Let Starlette load the requested static file.
# 2. Add no-cache headers to successful responses.
# 3. Return the response to the browser.
# ==================================================
class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response


static_dir = FRONTEND_DIR


# ==================================================
# Endpoint: GET /, /register, /login, /dashboard, and dashboard workflow screens
#
# Input:
# - Browser navigation path
#
# Output:
# - frontend/index.html
#
# Used By:
# Shared Frontend SPA Routing
# ==================================================
@app.get("/", include_in_schema=False)
@app.get("/register", include_in_schema=False)
@app.get("/login", include_in_schema=False)
@app.get("/candidate/register", include_in_schema=False)
@app.get("/candidate/login", include_in_schema=False)
@app.get("/candidate/dashboard", include_in_schema=False)
@app.get("/candidate/resume-upload", include_in_schema=False)
@app.get("/candidate/resume-parser", include_in_schema=False)
@app.get("/candidate/job-description", include_in_schema=False)
@app.get("/candidate/matching", include_in_schema=False)
@app.get("/candidate/ai-feedback", include_in_schema=False)
@app.get("/candidate/browse-jobs", include_in_schema=False)
@app.get("/candidate/recommended-jobs", include_in_schema=False)
@app.get("/candidate/applications", include_in_schema=False)
@app.get("/recruiter/register", include_in_schema=False)
@app.get("/recruiter/login", include_in_schema=False)
@app.get("/recruiter/dashboard", include_in_schema=False)
@app.get("/recruiter/create-job", include_in_schema=False)
@app.get("/recruiter/jobs/create", include_in_schema=False)
@app.get("/recruiter/candidate-matches", include_in_schema=False)
@app.get("/dashboard", include_in_schema=False)
@app.get("/dashboard/resume", include_in_schema=False)
@app.get("/dashboard/jobs", include_in_schema=False)
@app.get("/dashboard/recommendations", include_in_schema=False)
@app.get("/dashboard/resume-upload", include_in_schema=False)
@app.get("/dashboard/resume-parsing", include_in_schema=False)
@app.get("/dashboard/job-description", include_in_schema=False)
@app.get("/dashboard/matching", include_in_schema=False)
@app.get("/dashboard/ai-feedback", include_in_schema=False)
def serve_frontend_app():
    return FileResponse(static_dir / "index.html")


# ==================================================
# SHARED STATIC FILE MOUNT
# Purpose:
# Serve frontend JavaScript, CSS, and static assets after API routes are registered.
#
# Flow:
# Browser Asset Request
# -> NoCacheStaticFiles
# -> Static File Response
# ==================================================
app.mount("/", NoCacheStaticFiles(directory=str(static_dir), html=True), name="static")
