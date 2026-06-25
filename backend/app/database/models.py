"""
# WORKFLOW NUMBER
# Shared Infrastructure
#
# PURPOSE
# Define database tables used by the TalentSync AI workflows.
#
# INPUT
# SQLAlchemy metadata declarations.
#
# OUTPUT
# ORM models for users, resumes, and job descriptions.
#
# FLOW DESCRIPTION
# Workflow services import these models through the database session layer.
# The models contain table shape only; workflow business logic belongs in the
# workflow-specific service modules.
"""

import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped

from backend.app.core.constants import DEFAULT_APPLICATION_STATUS

# ==================================================
# SHARED DATABASE MODEL BASE
# Purpose:
# Provide one SQLAlchemy declarative base for all workflow tables.
#
# Flow:
# Model Class
# -> SQLAlchemy Metadata
# -> Database Table Creation
# ==================================================
class Base(DeclarativeBase):
    pass


# ==================================================
# WORKFLOW 1 / WORKFLOW 2 — USER TABLE
# Purpose:
# Store candidate or recruiter accounts created by registration and read by login.
#
# Flow:
# Registration Workflow
# -> Save User Row
# -> Login Workflow
# -> Read User Row
# ==================================================
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)  # type: ignore
    full_name: Mapped[str] = Column(String, nullable=False)  # type: ignore
    email: Mapped[str] = Column(String, nullable=False, unique=True, index=True)  # type: ignore
    password_hash: Mapped[str] = Column(String, nullable=False)  # type: ignore
    role: Mapped[str] = Column(String, nullable=False, default="candidate")  # type: ignore
    profile_image_url: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    created_at: Mapped[datetime.datetime] = Column(DateTime, default=datetime.datetime.utcnow)  # type: ignore


# ==================================================
# WORKFLOW 8 / WORKFLOW 9 - RECRUITER TABLE
# Purpose:
# Store recruiter accounts separately from candidate users.
#
# Flow:
# Recruiter Registration Workflow
# -> Save Recruiter Row
# -> Recruiter Login Workflow
# -> Read Recruiter Row
# ==================================================
class Recruiter(Base):
    __tablename__ = "recruiters"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)  # type: ignore
    company_name: Mapped[str] = Column(String, nullable=False)  # type: ignore
    recruiter_name: Mapped[str] = Column(String, nullable=False)  # type: ignore
    email: Mapped[str] = Column(String, nullable=False, unique=True, index=True)  # type: ignore
    password_hash: Mapped[str] = Column(String, nullable=False)  # type: ignore
    created_at: Mapped[datetime.datetime] = Column(DateTime, default=datetime.datetime.utcnow)  # type: ignore


# ==================================================
# WORKFLOW 3 / WORKFLOW 4 — RESUME TABLE
# Purpose:
# Store uploaded resume metadata, extracted text, and parsed resume JSON.
#
# Flow:
# Resume Upload Workflow
# -> Save PDF Metadata + Extracted Text
# -> Resume Parsing Workflow
# -> Save Parsed JSON
# ==================================================
class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)  # type: ignore
    candidate_id: Mapped[int | None] = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # type: ignore
    filename: Mapped[str] = Column(String, nullable=False)  # type: ignore
    file_size: Mapped[int] = Column(Integer, nullable=False)  # type: ignore
    upload_time: Mapped[datetime.datetime] = Column(DateTime, default=datetime.datetime.utcnow)  # type: ignore
    extracted_text: Mapped[str] = Column(Text, nullable=False)  # type: ignore
    parsed_data: Mapped[str | None] = Column(Text, nullable=True)  # type: ignore


# ==================================================
# WORKFLOW 5 — JOB DESCRIPTION TABLE
# Purpose:
# Store candidate submitted job descriptions.
#
# Flow:
# Job Description Form
# -> POST /job-description
# -> Save JobDescription Row
# -> Return Success Response
# ==================================================
class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)  # type: ignore
    candidate_id: Mapped[int | None] = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # type: ignore
    recruiter_id: Mapped[int | None] = Column(Integer, ForeignKey("recruiters.id"), nullable=True)  # type: ignore
    title: Mapped[str] = Column(String, nullable=False)  # type: ignore
    description: Mapped[str] = Column(Text, nullable=False)  # type: ignore
    created_at: Mapped[datetime.datetime] = Column(DateTime, default=datetime.datetime.utcnow)  # type: ignore
    job_title: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    required_skills: Mapped[str | None] = Column(Text, nullable=True)  # type: ignore
    preferred_skills: Mapped[str | None] = Column(Text, nullable=True)  # type: ignore
    experience_required: Mapped[int | None] = Column(Integer, nullable=True)  # type: ignore
    education_required: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    parsed_job_data: Mapped[str | None] = Column(Text, nullable=True)  # type: ignore
    skills_version: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    # NOTE: recruiter_id is intentionally nullable. Workflow 5 (Job Description)
    # is a candidate-only feature for pasting a job description to score against
    # a resume. It does not involve a recruiter account and therefore never
    # populates this field. The column exists for potential future recruiter-facing
    # job-description analysis but is NOT set by any current workflow.


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)  # type: ignore
    recruiter_id: Mapped[int] = Column(Integer, ForeignKey("recruiters.id"), nullable=False, index=True)  # type: ignore
    title: Mapped[str] = Column(String, nullable=False, index=True)  # type: ignore
    skills: Mapped[str] = Column(Text, nullable=False)  # type: ignore
    experience: Mapped[str] = Column(String, nullable=False, index=True)  # type: ignore
    description: Mapped[str] = Column(Text, nullable=False)  # type: ignore
    company_name: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    employment_type: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    location: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    salary_range: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    application_deadline: Mapped[datetime.date | None] = Column(Date, nullable=True)  # type: ignore
    status: Mapped[str] = Column(String, nullable=False, default="ACTIVE", index=True)  # type: ignore
    created_at: Mapped[datetime.datetime] = Column(DateTime, default=datetime.datetime.utcnow, index=True)  # type: ignore


# ==================================================
# WORKFLOW 13 — JOB APPLICATIONS TABLE
# Purpose:
# Store candidate job applications linking a candidate user, job description,
# resume upload, match score, status, and application timestamp.
#
# Flow:
# Candidate Job Apply -> Save Row -> Recruiter Dashboard reads and screens.
# ==================================================
class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("candidate_id", "job_id", name="uq_application_candidate_job"),)

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)  # type: ignore
    candidate_id: Mapped[int] = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # type: ignore
    recruiter_id: Mapped[int] = Column(Integer, ForeignKey("recruiters.id"), nullable=False, index=True)  # type: ignore
    job_id: Mapped[int] = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)  # type: ignore
    resume_id: Mapped[int | None] = Column(Integer, ForeignKey("resumes.id"), nullable=True, index=True)  # type: ignore
    match_score: Mapped[int | None] = Column(Integer, nullable=True)  # type: ignore
    matched_skills: Mapped[str | None] = Column(Text, nullable=True)  # type: ignore
    missing_skills: Mapped[str | None] = Column(Text, nullable=True)  # type: ignore
    application_status: Mapped[str] = Column(String, nullable=False, default=DEFAULT_APPLICATION_STATUS)  # type: ignore
    applied_at: Mapped[datetime.datetime] = Column(DateTime, default=datetime.datetime.utcnow, index=True)  # type: ignore


# ==================================================
# LEGACY TABLE — NOT USED BY ANY ACTIVE WORKFLOW
# WORKFLOW 10 - RECRUITER JOB POSTING TABLE (OBSOLETE)
# Purpose:
# This table was an early draft for recruiter job postings. All active workflows
# (WF10, WF11, WF12, WF13, WF14) use the Job table instead. JobPosting is
# retained to avoid data loss on existing databases; no code reads or writes it.
# Do NOT add new columns or references here. Migrate to Job if needed.
# ==================================================
class JobPosting(Base):
    __tablename__ = "job_postings"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)  # type: ignore
    recruiter_id: Mapped[int] = Column(Integer, ForeignKey("recruiters.id"), nullable=False, index=True)  # type: ignore
    job_title: Mapped[str] = Column(String, nullable=False)  # type: ignore
    company_name: Mapped[str] = Column(String, nullable=False)  # type: ignore
    job_description: Mapped[str] = Column(Text, nullable=False)  # type: ignore
    required_skills: Mapped[str] = Column(Text, nullable=False)  # type: ignore
    experience_required: Mapped[str] = Column(String, nullable=False)  # type: ignore
    employment_type: Mapped[str] = Column(String, nullable=False)  # type: ignore
    location: Mapped[str] = Column(String, nullable=False)  # type: ignore
    salary_range: Mapped[str | None] = Column(String, nullable=True)  # type: ignore
    application_deadline: Mapped[datetime.date | None] = Column(Date, nullable=True)  # type: ignore
    status: Mapped[str] = Column(String, nullable=False, default="published")  # type: ignore
    created_at: Mapped[datetime.datetime] = Column(DateTime, default=datetime.datetime.utcnow)  # type: ignore
    updated_at: Mapped[datetime.datetime] = Column(  # type: ignore
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )
