import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from backend.app.database.models import Base, JobDescription, User
from backend.app.api.routes.job_description import router as career_goal_router
from backend.app.database.database import get_db
from backend.app.database.dependencies import get_authenticated_candidate_id
from backend.app.workflows.candidate.workflow_05_job_description.service import (
    delete_candidate_job_description,
    list_candidate_job_descriptions,
)


class CareerGoalDeletionTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.db.add_all([
            User(id=1, full_name="Candidate One", email="one@example.com", password_hash="x", role="candidate"),
            User(id=2, full_name="Candidate Two", email="two@example.com", password_hash="x", role="candidate"),
            JobDescription(id=10, candidate_id=1, title="Backend Engineer", description="Build APIs"),
            JobDescription(id=11, candidate_id=1, title="AI Engineer", description="Build models"),
            JobDescription(id=12, candidate_id=2, title="Private Goal", description="Other candidate"),
        ])
        self.db.commit()
        app = FastAPI()
        app.include_router(career_goal_router)
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_authenticated_candidate_id] = lambda: 1
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_delete_own_goal_persists_and_keeps_remaining_goal(self):
        deleted_id = delete_candidate_job_description(goal_id=10, db=self.db, candidate_id=1)
        self.assertEqual(deleted_id, 10)
        self.assertIsNone(self.db.get(JobDescription, 10))
        remaining = list_candidate_job_descriptions(db=self.db, candidate_id=1)
        self.assertEqual([goal["id"] for goal in remaining], [11])

    def test_cannot_delete_another_candidates_goal(self):
        with self.assertRaisesRegex(LookupError, "Career goal not found"):
            delete_candidate_job_description(goal_id=12, db=self.db, candidate_id=1)
        self.assertIsNotNone(self.db.get(JobDescription, 12))

    def test_create_two_delete_one_and_reload_list(self):
        first = self.client.post("/job-description", json={"title": "Goal A", "description": "Required skills: Python"})
        second = self.client.post("/job-description", json={"title": "Goal B", "description": "Required skills: FastAPI"})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)

        created = self.client.get("/job-descriptions").json()
        goal_a = next(goal for goal in created if goal["title"] == "Goal A")
        goal_b = next(goal for goal in created if goal["title"] == "Goal B")

        deleted = self.client.delete(f"/candidate/career-goals/{goal_a['id']}")
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.json()["deleted_goal_id"], goal_a["id"])

        refreshed = self.client.get("/job-descriptions").json()
        refreshed_ids = {goal["id"] for goal in refreshed}
        self.assertNotIn(goal_a["id"], refreshed_ids)
        self.assertIn(goal_b["id"], refreshed_ids)

        forbidden_as_not_found = self.client.delete("/candidate/career-goals/12")
        self.assertEqual(forbidden_as_not_found.status_code, 404)


if __name__ == "__main__":
    unittest.main()
