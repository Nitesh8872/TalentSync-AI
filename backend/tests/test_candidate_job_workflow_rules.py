import datetime
import json
import os
import tempfile
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from backend.app.api.routes import login as login_routes
from backend.app.api.routes.jobs import router as jobs_router
from backend.app.core.security import create_access_token
from backend.app.database.database import get_db
from backend.app.database.models import Base, Job, Recruiter, Resume, User
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import parse_resume_for_storage
from backend.app.workflows.candidate.workflow_11_browse_jobs.service import browse_available_jobs
from backend.app.workflows.candidate.workflow_11_browse_jobs.schema import JobBrowseQuery
from backend.app.workflows.candidate.workflow_12_auto_matching.service import recommend_jobs_for_candidate
from backend.app.workflows.candidate.workflow_13_job_application.service import (
    DeadlinePassedError,
    MissingResumeError,
    submit_job_application,
)


class CandidateJobWorkflowRuleTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        today = datetime.date.today()
        self.db.add_all([
            User(id=1, full_name="Candidate", email="candidate@example.com", password_hash="x", role="candidate"),
            User(id=2, full_name="No Resume", email="no-resume@example.com", password_hash="x", role="candidate"),
            Recruiter(id=1, company_name="TalentSync", recruiter_name="Recruiter", email="recruiter@example.com", password_hash="x"),
            Job(
                id=1,
                recruiter_id=1,
                title="Frontend Engineer",
                skills=json.dumps(["React", "JavaScript"]),
                experience="1 year",
                description="Build React products with JavaScript and accessible UI components.",
                application_deadline=today + datetime.timedelta(days=7),
                status="ACTIVE",
            ),
            Job(
                id=2,
                recruiter_id=1,
                title="Expired Engineer",
                skills=json.dumps(["Python"]),
                experience="1 year",
                description="Past deadline job.",
                application_deadline=today - datetime.timedelta(days=1),
                status="ACTIVE",
            ),
            Job(
                id=3,
                recruiter_id=1,
                title="Applied Engineer",
                skills=json.dumps(["React"]),
                experience="1 year",
                description="Already applied job.",
                application_deadline=today + datetime.timedelta(days=7),
                status="ACTIVE",
            ),
        ])
        _, parsed = parse_resume_for_storage(
            "Candidate\ncandidate@example.com\nSUMMARY\nFrontend engineer building accessible React UI systems.\n"
            "SKILLS\nLanguages: JavaScript\nFrontend: React\nPROJECTS\nReact portfolio application"
        )
        self.db.add(
            Resume(
                id=1,
                candidate_id=1,
                filename="resume.pdf",
                file_size=100,
                upload_time=datetime.datetime.utcnow(),
                extracted_text="Candidate frontend engineer JavaScript React portfolio application accessible UI systems",
                parsed_data=parsed,
            )
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_public_browse_excludes_expired_active_jobs(self):
        result = browse_available_jobs(JobBrowseQuery(page=1, page_size=10), db=self.db)
        job_ids = {job["job_id"] for job in result["jobs"]}
        self.assertIn(1, job_ids)
        self.assertIn(3, job_ids)
        self.assertNotIn(2, job_ids)

        app = FastAPI()
        app.include_router(jobs_router)
        app.dependency_overrides[get_db] = lambda: self.db
        response = TestClient(app).get("/jobs")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Authentication required", response.text)

    def test_apply_requires_resume_and_rejects_past_deadline(self):
        with self.assertRaises(MissingResumeError):
            submit_job_application(job_id=1, candidate_id=2, db=self.db)

        with self.assertRaises(DeadlinePassedError):
            submit_job_application(job_id=2, candidate_id=1, db=self.db)

    def test_recommendations_exclude_applied_and_expired_jobs(self):
        submit_job_application(job_id=3, candidate_id=1, db=self.db)
        result = recommend_jobs_for_candidate(candidate_id=1, db=self.db, limit=10)
        recommended_ids = [item["job_id"] for item in result["recommendations"]]
        self.assertEqual(recommended_ids, [1])


class CandidateProfilePhotoAccessTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.tmpdir = tempfile.TemporaryDirectory()
        self.original_upload_dir = login_routes.UPLOAD_DIR
        login_routes.UPLOAD_DIR = self.tmpdir.name
        os.makedirs(login_routes.UPLOAD_DIR, exist_ok=True)
        with open(os.path.join(login_routes.UPLOAD_DIR, "candidate_1.png"), "wb") as file:
            file.write(b"fake-png")
        self.db.add_all([
            User(
                id=1,
                full_name="Candidate One",
                email="one@example.com",
                password_hash="x",
                role="candidate",
                profile_image_url="/uploads/candidate_1.png",
            ),
            User(id=2, full_name="Candidate Two", email="two@example.com", password_hash="x", role="candidate"),
        ])
        self.db.commit()
        app = FastAPI()
        app.include_router(login_routes.router)
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        login_routes.UPLOAD_DIR = self.original_upload_dir
        self.tmpdir.cleanup()
        self.db.close()
        self.engine.dispose()

    def test_profile_photo_requires_owner_authentication(self):
        unauthenticated = self.client.get("/uploads/candidate_1.png")
        self.assertEqual(unauthenticated.status_code, 401)

        owner_token = create_access_token(1, "candidate")
        owner = self.client.get("/uploads/candidate_1.png", headers={"Authorization": f"Bearer {owner_token}"})
        self.assertEqual(owner.status_code, 200)
        self.assertEqual(owner.content, b"fake-png")

        other_token = create_access_token(2, "candidate")
        other = self.client.get("/uploads/candidate_1.png", headers={"Authorization": f"Bearer {other_token}"})
        self.assertEqual(other.status_code, 404)


if __name__ == "__main__":
    unittest.main()
