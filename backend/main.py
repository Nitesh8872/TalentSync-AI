import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from backend.app.api.router import include_workflow_routers
from backend.app.core.config import APP_TITLE, CORS_ORIGINS
from backend.app.database.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TalentSync AI database...")
    init_db()
    yield


app = FastAPI(
    title=APP_TITLE,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

include_workflow_routers(app)


@app.get("/api/health", tags=["Health"])
async def api_health():
    return {
        "status": "healthy",
        "project": "TalentSync AI",
        "backend": "running",
        "workflows": "0-14",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", include_in_schema=False)
async def health():
    return await api_health()


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def home():
    return """
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>TalentSync AI Backend</title>
        <style>
            :root {
                color-scheme: light;
                --bg: #f4f6f8;
                --card: #ffffff;
                --text: #172033;
                --muted: #5f6b7a;
                --line: #dde4ee;
                --link: #1d4ed8;
                --ok-bg: #e8f7ee;
                --ok: #166534;
            }
            * {
                box-sizing: border-box;
            }
            body {
                margin: 0;
                min-height: 100vh;
                font-family: Arial, Helvetica, sans-serif;
                background: var(--bg);
                color: var(--text);
            }
            main {
                width: min(1080px, calc(100% - 32px));
                margin: 0 auto;
                padding: 48px 0;
            }
            .card {
                background: var(--card);
                border: 1px solid var(--line);
                border-radius: 8px;
                box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
                padding: 32px;
            }
            .top {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 24px;
                border-bottom: 1px solid var(--line);
                padding-bottom: 24px;
            }
            h1 {
                margin: 0 0 8px;
                font-size: 36px;
                letter-spacing: 0;
            }
            h2 {
                margin: 28px 0 14px;
                font-size: 20px;
                letter-spacing: 0;
            }
            p {
                margin: 0;
                color: var(--muted);
                line-height: 1.55;
            }
            .status {
                display: inline-flex;
                align-items: center;
                white-space: nowrap;
                border-radius: 999px;
                padding: 8px 12px;
                background: var(--ok-bg);
                color: var(--ok);
                font-weight: 700;
                font-size: 14px;
            }
            .quick-links {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 18px;
            }
            a {
                color: var(--link);
                text-decoration: none;
                font-weight: 700;
            }
            .quick-links a {
                border: 1px solid var(--line);
                border-radius: 6px;
                padding: 10px 12px;
                background: #f8fbff;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 14px;
            }
            .group {
                border: 1px solid var(--line);
                border-radius: 8px;
                padding: 16px;
                background: #fbfcfe;
            }
            .group h3 {
                margin: 0 0 10px;
                font-size: 16px;
                letter-spacing: 0;
            }
            code {
                display: block;
                margin-top: 8px;
                color: #22304a;
                font-size: 13px;
                line-height: 1.45;
                word-break: break-word;
            }
            @media (max-width: 720px) {
                main {
                    width: min(100% - 20px, 1080px);
                    padding: 20px 0;
                }
                .card {
                    padding: 20px;
                }
                .top {
                    display: block;
                }
                .status {
                    margin-top: 16px;
                }
            }
        </style>
    </head>
    <body>
        <main>
            <section class="card">
                <div class="top">
                    <div>
                        <h1>TalentSync AI Backend</h1>
                        <p>FastAPI is online and Workflow 0-14 routes are registered.</p>
                        <div class="quick-links">
                            <a href="/docs">Swagger Docs</a>
                            <a href="/redoc">ReDoc</a>
                            <a href="/api/health">API Health</a>
                            <a href="/jobs">Browse Jobs</a>
                        </div>
                    </div>
                    <span class="status">Backend Running</span>
                </div>

                <h2>Route Overview</h2>
                <div class="grid">
                    <div class="group">
                        <h3>Candidate Auth</h3>
                        <code>POST /register</code>
                        <code>POST /login</code>
                    </div>
                    <div class="group">
                        <h3>Resume APIs</h3>
                        <code>POST /api/upload</code>
                        <code>GET /api/resumes</code>
                        <code>GET /api/resumes/{resume_id}</code>
                        <code>GET /api/resumes/{resume_id}/parsed</code>
                    </div>
                    <div class="group">
                        <h3>Job APIs</h3>
                        <code>POST /job-description</code>
                        <code>GET /job-descriptions</code>
                        <code>POST /jobs</code>
                        <code>GET /jobs</code>
                        <code>GET /jobs/{job_id}</code>
                    </div>
                    <div class="group">
                        <h3>Matching APIs</h3>
                        <code>POST /match</code>
                        <code>POST /api/ai-feedback</code>
                    </div>
                    <div class="group">
                        <h3>Recommendations</h3>
                        <code>GET /recommendations/{candidate_id}</code>
                    </div>
                    <div class="group">
                        <h3>Applications</h3>
                        <code>POST /applications</code>
                        <code>GET /recruiter/applications</code>
                    </div>
                    <div class="group">
                        <h3>Recruiter APIs</h3>
                        <code>POST /api/recruiter/register</code>
                        <code>POST /api/recruiter/login</code>
                        <code>POST /api/recruiter/jobs</code>
                        <code>GET /api/recruiter/jobs</code>
                        <code>GET /api/recruiter/jobs/{job_id}</code>
                        <code>GET /recruiter/jobs/{job_id}/candidate-matches</code>
                    </div>
                    <div class="group">
                        <h3>System</h3>
                        <code>GET /api/health</code>
                        <code>GET /docs</code>
                        <code>GET /redoc</code>
                    </div>
                </div>
            </section>
        </main>
    </body>
    </html>
    """
