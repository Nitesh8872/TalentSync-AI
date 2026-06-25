"""
# WORKFLOW NUMBER
# WORKFLOW 4 — RESUME PARSING
#
# PURPOSE
# Define API data contracts for parsed resume responses.
#
# INPUT
# Parsed resume payload returned by Workflow 4 parsing services.
#
# OUTPUT
# Pydantic response schema used by the centralized routes layer.
#
# FLOW DESCRIPTION
# Route -> Workflow 4 Schema -> Workflow 4 Service -> Database -> Parsed Resume Response.
"""

from typing import Any

from pydantic import BaseModel


# ==================================================
# WORKFLOW 4 — RESUME PARSING
# Purpose:
# Describe the structured parsed-resume response.
#
# Flow:
# GET /api/resumes/{resume_id}/parsed
# -> Workflow 4 Service
# -> ParsedResumeResponse
# ==================================================
class ParsedResumeResponse(BaseModel):
    id: int
    filename: str
    parsed_data: dict[str, Any]
