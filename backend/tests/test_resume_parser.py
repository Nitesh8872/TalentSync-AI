import io
import unittest

from pypdf import PdfWriter
from pypdf.generic import RectangleObject

from backend.app.workflows.candidate.workflow_03_resume_upload.service import extract_text_from_pdf
from backend.app.workflows.candidate.workflow_04_resume_parsing.schema import ParsedResumeResponse
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import (
    is_legacy_parsed_schema,
    parse_resume_text,
)
from backend.app.workflows.candidate.workflow_06_matching.service import extract_resume_skills
from backend.app.workflows.candidate.workflow_12_auto_matching.service import calculate_skill_score


NITESH_EXTRACT = """SUMMARY
NITESH SUKHWAL
sukhwalnitesh1212@gmail.com | +91 9828818872 | Portfolio | LinkedIn |
GitHub | LeetCode | CodeChef
Aspiring AI Backend Engineer focused on scalable backend systems, APIs, AI-powered applications, and
problem-solving.
EDUCATION
Parul University | CGPA: 7.76 Vadodara, Gujarat
B.Tech - Computer Science & Engineering (AI) Expected 2027
PROJECTS
TalentSync AI| FastAPI, MongoDB, LLM APIs, Vector Embeddings | [In Progress] GitHub
– Developing an AI-powered recruitment assistant for resume analysis and candidate matching.
– Building backend APIs using FastAPI.
Neural Spark: AI-Powered E-Learning with Automated Grading| Group Project| GitHub
– Built an AI-based e-learning platform with automated grading features.
– Developed an assignment evaluation pipeline using Transformers.
AI-Powered Smart Task Management Dashboard| Node.js, Express.js, HTML, CSS, JavaScript | GitHub
– Built a full-stack task management dashboard with authentication and task tracking.
– Developed REST APIs using Node.js and Express.js.
TECHNICAL SKILLS
• Languages: Java, C, Python(Basic).
• Backend: FastAPI, Node.js, Express.js.
• Web Technologies: HTML, CSS, Tailwind CSS, JavaScript (Basic)
• Databases: MySQL, MongoDB Atlas
• Core Concepts: Data Structures & Algorithms (DSA), Object-Oriented Programming (OOP), REST APIs.
• Tools: VS Code, Eclipse, IntelliJ, PostMan, GitHub.
ACHIEVEMENTS & CERTIFICATIONS
• Solved 190+ coding problems across Leet Code
• IBM AI Foundations[View]
• Hacker Rank Software Engineer[View].
• NPTEL Computer Networks Certificate (IIT Kharagpur) [View].
SOFT SKILLS
• Problem-Solving, Team Collaboration, Adaptability, Leadership
RESUME LINKS
https://niteshsukhwal.dev
https://linkedin.com/in/nitesh-sukhwal
https://github.com/nitesh-sukhwal
https://leetcode.com/u/nitesh-sukhwal
https://www.codechef.com/users/nitesh-sukhwal
https://github.com/nitesh-sukhwal/talentsync-ai
https://github.com/nitesh-sukhwal/neural-spark
https://github.com/nitesh-sukhwal/task-dashboard
"""


class ResumeParserTests(unittest.TestCase):
    def setUp(self):
        self.parsed = parse_resume_text(NITESH_EXTRACT)

    def test_summary_and_contact_are_isolated(self):
        self.assertEqual(
            self.parsed["professional_summary"],
            "Aspiring AI Backend Engineer focused on scalable backend systems, APIs, "
            "AI-powered applications, and problem-solving.",
        )
        self.assertNotIn("@", self.parsed["professional_summary"])
        contact = self.parsed["personal_information"]
        self.assertEqual(contact["full_name"], "Nitesh Sukhwal")
        self.assertIn("linkedin.com", contact["linkedin"])
        self.assertIn("leetcode.com", contact["leetcode"])
        self.assertIn("codechef.com", contact["codechef"])

    def test_projects_skills_and_education_are_structured(self):
        projects = self.parsed["projects"]
        self.assertEqual(len(projects), 3)
        self.assertEqual(projects[0]["status_type"], "In Progress")
        self.assertEqual(len(projects[0]["bullet_descriptions"]), 2)
        self.assertTrue(all(project["github_link"] for project in projects))
        self.assertEqual(self.parsed["technical_skills"]["languages"], ["Java", "C", "Python(Basic)"])
        self.assertIn("REST APIs", self.parsed["technical_skills"]["core_concepts"])
        education = self.parsed["education"][0]
        self.assertEqual(education["university"], "Parul University")
        self.assertEqual(education["expected_year"], "2027")

    def test_achievements_soft_skills_and_empty_experience(self):
        self.assertEqual(self.parsed["work_experience"], [])
        self.assertEqual(len(self.parsed["certifications"]), 3)
        self.assertIn("Solved 190+ coding problems across LeetCode", self.parsed["achievements"])
        self.assertEqual(
            self.parsed["soft_skills"],
            ["Problem-Solving", "Team Collaboration", "Adaptability", "Leadership"],
        )

    def test_cached_old_schema_is_reparsed(self):
        self.assertTrue(is_legacy_parsed_schema({"personal_information": {}}))
        self.assertFalse(is_legacy_parsed_schema(self.parsed))

    def test_legacy_and_rich_contracts_are_both_present(self):
        expected_legacy = {"name", "skills", "education", "experience", "projects"}
        expected_rich = {
            "contact", "summary", "categorized_skills", "project_details",
            "achievements_certifications", "soft_skills", "all_skills_flat",
        }
        self.assertTrue(expected_legacy.issubset(self.parsed))
        self.assertTrue(expected_rich.issubset(self.parsed))
        self.assertEqual(self.parsed["skills"], self.parsed["all_skills_flat"])
        self.assertEqual(self.parsed["project_details"], self.parsed["projects"])
        self.assertEqual(self.parsed["experience"], [])

    def test_matching_flat_skills_supports_both_schemas_and_null(self):
        self.assertEqual(extract_resume_skills(None), [])
        self.assertEqual(
            extract_resume_skills({"skills": ["Python", "FastAPI"]}),
            ["Python", "FastAPI"],
        )
        rich_only = {"categorized_skills": {"languages": ["Python"], "backend": ["FastAPI"]}}
        self.assertEqual(extract_resume_skills(rich_only), ["Python", "FastAPI"])
        self.assertEqual(extract_resume_skills(self.parsed), self.parsed["all_skills_flat"])
        self.assertEqual(calculate_skill_score(self.parsed["all_skills_flat"], ["FastAPI", "React"]), 50)

    def test_parsed_api_response_accepts_compatibility_payload(self):
        response = ParsedResumeResponse(id=1, filename="resume.pdf", parsed_data=self.parsed)
        self.assertEqual(response.parsed_data["name"], "Nitesh Sukhwal")
        self.assertEqual(response.parsed_data["skills"], response.parsed_data["all_skills_flat"])

    def test_pdf_hyperlink_annotations_are_preserved(self):
        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        writer.add_uri(
            0,
            "https://github.com/nitesh-sukhwal/talentsync-ai",
            RectangleObject([0, 0, 10, 10]),
        )
        output = io.BytesIO()
        writer.write(output)
        extracted = extract_text_from_pdf(output.getvalue())
        self.assertIn("RESUME LINKS", extracted)
        self.assertIn("github.com/nitesh-sukhwal/talentsync-ai", extracted)


if __name__ == "__main__":
    unittest.main()
