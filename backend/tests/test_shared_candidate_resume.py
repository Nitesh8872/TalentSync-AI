import datetime
import json
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from backend.app.api.routes.resume_upload import router as resume_router
from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.database.models import Base, Job, Recruiter, Resume, User
from backend.app.services.candidate_resume_service import get_latest_candidate_resume_payload
from backend.app.workflows.candidate.workflow_03_resume_upload.service import list_uploaded_resumes
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import parse_resume_for_storage
from backend.app.workflows.candidate.workflow_13_job_application.service import (
    list_candidate_applications,
    submit_job_application,
)
from backend.app.workflows.recruiter.workflow_14_candidate_matching.service import rank_job_applicants


class SharedCandidateResumeTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.db.add_all([
            User(id=1, full_name="Candidate", email="candidate@example.com", password_hash="x", role="candidate"),
            Recruiter(id=1, company_name="TalentSync", recruiter_name="Recruiter", email="recruiter@example.com", password_hash="x"),
            Job(id=1, recruiter_id=1, title="Frontend Engineer", skills=json.dumps(["React", "JavaScript"]), experience="1 year", description="Build React products", status="ACTIVE"),
        ])
        _, old_parsed = parse_resume_for_storage("Old Candidate\nSKILLS\nPython")
        _, latest_parsed = parse_resume_for_storage("Candidate\ncandidate@example.com\nSUMMARY\nFrontend engineer\nSKILLS\nLanguages: JavaScript\nFrontend: React\nPROJECTS\nReact portfolio")
        self.db.add_all([
            Resume(id=1, candidate_id=1, filename="old.pdf", file_size=10, upload_time=datetime.datetime(2025, 1, 1), extracted_text="Old Candidate Python experience", parsed_data=old_parsed),
            Resume(id=2, candidate_id=1, filename="latest.pdf", file_size=20, upload_time=datetime.datetime(2026, 1, 1), extracted_text="Candidate frontend engineer JavaScript React portfolio experience", parsed_data=latest_parsed),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_latest_endpoint_returns_candidate_scoped_parsed_contract(self):
        app = FastAPI()
        app.include_router(resume_router)
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_authenticated_candidate_id] = lambda: 1
        response = TestClient(app).get("/candidate/resume/latest")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["resume_id"], 2)
        self.assertEqual(payload["candidate_id"], 1)
        self.assertEqual(payload["file_name"], "latest.pdf")
        self.assertEqual(payload["parsed_status"], "parsed")
        self.assertIn("React", payload["skills"])

    def test_resume_history_uses_same_newest_order_as_latest_endpoint(self):
        _, newer_parsed = parse_resume_for_storage("Newest Candidate\nSKILLS\nReact")
        self.db.add(
            Resume(
                id=3,
                candidate_id=1,
                filename="newest-by-time.pdf",
                file_size=30,
                upload_time=datetime.datetime(2026, 2, 1),
                extracted_text="Newest Candidate React experience",
                parsed_data=newer_parsed,
            )
        )
        self.db.add(
            Resume(
                id=99,
                candidate_id=1,
                filename="older-high-id.pdf",
                file_size=40,
                upload_time=datetime.datetime(2025, 12, 1),
                extracted_text="Older high id Python experience",
                parsed_data=newer_parsed,
            )
        )
        self.db.commit()

        latest = get_latest_candidate_resume_payload(candidate_id=1, db=self.db)
        history = list_uploaded_resumes(db=self.db, candidate_id=1)

        self.assertEqual(latest["resume_id"], 3)
        self.assertEqual(history[0]["id"], latest["resume_id"])

    def test_application_and_recruiter_ranking_use_application_resume(self):
        latest = get_latest_candidate_resume_payload(candidate_id=1, db=self.db)
        self.assertEqual(latest["resume_id"], 2)
        application = submit_job_application(job_id=1, candidate_id=1, db=self.db)
        self.assertEqual(application.resume_id, 2)

        candidate_app = list_candidate_applications(candidate_id=1, db=self.db)[0]
        self.assertEqual(candidate_app["resume_id"], 2)
        self.assertIn("React", candidate_app["matched_skills"])

        ranked = rank_job_applicants(recruiter_id=1, job_id=1, db=self.db)
        self.assertEqual(ranked["candidates"][0]["candidate_id"], 1)
        self.assertIn("React", ranked["candidates"][0]["matched_skills"])


if __name__ == "__main__":
    unittest.main()
