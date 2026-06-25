"""
# WORKFLOW NUMBER
# WORKFLOW 4 — RESUME PARSING
#
# PURPOSE
# Parse resume text and retrieve parsed resume data.
#
# INPUT
# Resume database rows and extracted resume text.
#
# OUTPUT
# Structured parsed resume JSON.
#
# FLOW DESCRIPTION
# Resume Text -> Parser Engine -> Parsed JSON -> Resume Details API.
"""

import json
import logging
import re
from typing import Any

from sqlalchemy.orm import Session

from backend.app.database.models import Resume

logger = logging.getLogger(__name__)

EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b"
)
URL_PATTERN = re.compile(r"https?://[^\s<>\"']+|(?:www\.)?[a-z0-9-]+\.(?:com|io|dev|me|org|net)[^\s]*", re.I)
LINKEDIN_PATTERN = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[^\s]+", re.I)
GITHUB_PATTERN = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[^\s]+", re.I)
LEETCODE_PATTERN = re.compile(r"(?:https?://)?(?:www\.)?leetcode\.com/(?:u/)?[^\s]+", re.I)
CODECHEF_PATTERN = re.compile(r"(?:https?://)?(?:www\.)?codechef\.com/users/[^\s]+", re.I)
YEAR_PATTERN = re.compile(r"\b(19|20)\d{2}\b")
PARSER_SCHEMA_VERSION = 3
COMPATIBILITY_FIELDS = {
    "name", "skills", "education", "experience", "projects",
    "contact", "summary", "categorized_skills", "project_details",
    "achievements_certifications", "soft_skills", "all_skills_flat",
}

# Major resume sections — order matters (more specific patterns first)
SECTION_HEADERS: list[tuple[str, re.Pattern[str]]] = [
    ("link_metadata", re.compile(r"(?:^|\n)\s*resume\s+links\s*:?[ \t]*$", re.I | re.M)),
    ("achievements_and_certifications", re.compile(
        r"(?:^|\n)\s*achievements?\s*(?:&|and)\s*certifications?\s*:?\s*$", re.I | re.M
    )),
    ("achievements", re.compile(r"(?:^|\n)\s*achievements?\s*:?\s*$", re.I | re.M)),
    ("certifications", re.compile(r"(?:^|\n)\s*certifications?\s*:?\s*$", re.I | re.M)),
    ("technical_skills", re.compile(
        r"(?:^|\n)\s*(?:technical\s+skills?|skills?|core\s+competencies)\s*:?\s*$", re.I | re.M
    )),
    ("soft_skills", re.compile(r"(?:^|\n)\s*soft\s+skills?\s*:?\s*$", re.I | re.M)),
    ("languages", re.compile(r"(?:^|\n)\s*languages?\s*:?\s*$", re.I | re.M)),
    ("interests", re.compile(r"(?:^|\n)\s*interests?\s*:?\s*$", re.I | re.M)),
    ("projects", re.compile(r"(?:^|\n)\s*projects?\s*:?\s*$", re.I | re.M)),
    ("work_experience", re.compile(
        r"(?:^|\n)\s*(?:(?:work\s+)?experience|employment\s+history|professional\s+experience)\s*:?\s*$",
        re.I | re.M,
    )),
    ("education", re.compile(r"(?:^|\n)\s*education\s*:?\s*$", re.I | re.M)),
    ("professional_summary", re.compile(
        r"(?:^|\n)\s*(?:professional\s+summary|summary|objective|profile)\s*:?\s*$", re.I | re.M
    )),
    ("personal_information", re.compile(
        r"(?:^|\n)\s*(?:personal\s+information|contact\s+information?|contact)\s*:?\s*$", re.I | re.M
    )),
]

# Maps sub-labels inside Technical Skills section to JSON keys
SKILL_SUBCATEGORY_MAP: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"programming\s+languages?", re.I), "languages"),
    (re.compile(r"^languages?\b", re.I), "languages"),
    (re.compile(r"backend(\s+technologies?)?", re.I), "backend"),
    (re.compile(r"frontend(\s+technologies?)?", re.I), "web_technologies"),
    (re.compile(r"web\s+technologies?", re.I), "web_technologies"),
    (re.compile(r"databases?", re.I), "databases"),
    (re.compile(r"tools?", re.I), "tools"),
    (re.compile(r"core\s+concepts?", re.I), "core_concepts"),
]

# Lines that are section headers — never treat as skill values
_SECTION_NOISE = re.compile(
    r"^(achievements?|certifications?|soft\s+skills?|languages?|projects?|"
    r"experience|education|summary|contact|interests?|technical\s+skills?)\s*:?\s*$",
    re.I,
)


# ==================================================
# Function: parse_resume_for_storage()
#
# Purpose:
# Parse extracted resume text for Workflow 4 and convert it to database JSON.
#
# Steps:
# 1. Receive plain text from Workflow 3.
# 2. Parse text into structured resume data.
# 3. Convert parsed data to JSON.
# 4. Return both parsed dictionary and JSON string.
# ==================================================
def parse_resume_for_storage(extracted_text: str) -> tuple[dict[str, Any], str]:
    parsed = parse_resume_text(extracted_text)
    parsed_json = parsed_data_to_json(parsed)
    return parsed, parsed_json


# ==================================================
# Function: ensure_parsed_resume_data()
#
# Purpose:
# Ensure one resume row has current structured parsed data.
# IMPORTANT: This function COMMITS to the database when it parses or re-parses
# the resume. Call get_parsed_resume_data_readonly() from GET endpoints that
# must remain side-effect-free.
#
# Steps:
# 1. Read existing parsed_data JSON.
# 2. Return it when it already uses the current schema.
# 3. Re-parse extracted text when missing or legacy.
# 4. Save refreshed parsed JSON to the database.
# ==================================================
def ensure_parsed_resume_data(resume: Resume, db: Session) -> dict[str, Any]:
    parsed = parsed_data_from_json(resume.parsed_data)
    if parsed and not is_legacy_parsed_schema(parsed):
        return parsed

    logger.info("Parsing/re-parsing structured data for resume id=%s", resume.id)
    parsed, parsed_json = parse_resume_for_storage(resume.extracted_text)
    resume.parsed_data = parsed_json
    db.commit()
    db.refresh(resume)
    return _with_compatibility_fields(parsed)


# ==================================================
# Function: get_parsed_resume_data_readonly()
#
# Purpose:
# Return structured parsed data for a resume without writing to the database.
# Use this from GET endpoints (e.g. GET /parsed-resume) to guarantee
# read-only semantics and avoid unexpected write side-effects.
#
# Steps:
# 1. Read existing parsed_data JSON.
# 2. Return it when it already uses the current schema.
# 3. Re-parse in memory when missing or legacy — does NOT commit.
# ==================================================
def get_parsed_resume_data_readonly(resume: Resume) -> dict[str, Any]:
    parsed = parsed_data_from_json(resume.parsed_data)
    if parsed and not is_legacy_parsed_schema(parsed):
        return parsed

    logger.info("Parsing in-memory (read-only) for resume id=%s", resume.id)
    parsed, _ = parse_resume_for_storage(resume.extracted_text)
    return _with_compatibility_fields(parsed)


# ==================================================
# Function: get_resume_parsed_payload()
#
# Purpose:
# Build the parsed-data API response for Workflow 4.
# Uses the read-only parser to avoid committing on GET.
#
# Steps:
# 1. Find the resume by id.
# 2. Raise a not-found error if it does not exist.
# 3. Parse in-memory (no DB write).
# 4. Return id, filename, and parsed data.
# ==================================================
def get_resume_parsed_payload(resume_id: int, db: Session, candidate_id: int) -> dict[str, Any]:
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.candidate_id == candidate_id).first()
    if not resume:
        raise ValueError("Resume not found")

    # Use read-only variant so GET /parsed-resume does not write to the DB.
    parsed = get_parsed_resume_data_readonly(resume)
    return {
        "id": resume.id,
        "filename": resume.filename,
        "parsed_data": parsed,
    }


# ==================================================
# Function: get_resume_display_name()
#
# Purpose:
# Return a parsed candidate name for resume history display.
#
# Steps:
# 1. Decode parsed resume JSON.
# 2. Extract the candidate full name.
# 3. Return None when no parsed name exists.
# ==================================================
def get_resume_display_name(parsed_json: str | None) -> str | None:
    return get_parsed_full_name(parsed_data_from_json(parsed_json))


# ==================================================
# Function: decode_parsed_resume_json()
#
# Purpose:
# Decode parsed resume JSON for Workflow 4 response composition.
#
# Steps:
# 1. Receive JSON string from the resume row.
# 2. Decode the string through the parser engine.
# 3. Return dictionary data or None.
# ==================================================
def decode_parsed_resume_json(parsed_json: str | None) -> dict[str, Any] | None:
    return parsed_data_from_json(parsed_json)


# ==================================================
# PARSER FUNCTIONS
# ==================================================

def parse_resume_text(text: str) -> dict[str, Any]:
    """Convert raw resume text into the standard structured JSON template."""
    if not text or text.startswith("[No text could be extracted"):
        return _empty_parsed_data()

    normalized = _normalize_text(text)
    sections = _split_into_sections(normalized)
    urls = [_clean_url(url) for url in URL_PATTERN.findall(normalized)]
    urls = _dedupe_list([url for url in urls if url])

    personal = _extract_personal_information(normalized, sections)
    technical_skills = _extract_technical_skills(sections.get("technical_skills", ""))
    profile_github = personal.get("github", "").lower()
    project_links = [
        url for url in urls
        if "github.com/" in url.lower() and url.lower() != profile_github
    ]

    parsed = {
        "schema_version": PARSER_SCHEMA_VERSION,
        "personal_information": personal,
        "professional_summary": _extract_summary(normalized, sections),
        "technical_skills": technical_skills,
        "education": _extract_education(sections.get("education", "")),
        "work_experience": _extract_work_experience(sections.get("work_experience", "")),
        "projects": _extract_projects(sections.get("projects", ""), project_links),
        "certifications": _extract_certifications(sections),
        "achievements": _extract_achievements(sections),
        "languages": _extract_languages(sections.get("languages", "")),
        "soft_skills": _extract_list_items(sections.get("soft_skills", "")),
        "interests": _extract_list_items(sections.get("interests", "")),
    }

    logger.info(
        "Parsed resume: name=%r, skill_categories=%d, education=%d, projects=%d",
        personal.get("full_name"),
        sum(1 for v in technical_skills.values() if v),
        len(parsed["education"]),
        len(parsed["projects"]),
    )
    return _with_compatibility_fields(parsed)


def parsed_data_to_json(parsed: dict[str, Any]) -> str:
    return json.dumps(parsed, ensure_ascii=False)


def parsed_data_from_json(json_str: str | None) -> dict[str, Any] | None:
    if not json_str:
        return None
    try:
        value = json.loads(json_str)
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        logger.warning("Invalid parsed_data JSON in database")
        return None


def is_legacy_parsed_schema(parsed: dict[str, Any] | None) -> bool:
    """Detect old flat schema (name/skills list) so we can re-parse."""
    if not parsed:
        return True
    version = parsed.get("schema_version", 0)
    return (
        "personal_information" not in parsed
        or not isinstance(version, int)
        or version < PARSER_SCHEMA_VERSION
        or not COMPATIBILITY_FIELDS.issubset(parsed)
    )


def get_parsed_full_name(parsed: dict[str, Any] | None) -> str | None:
    if not parsed:
        return None
    personal = parsed.get("personal_information")
    if isinstance(personal, dict):
        name = personal.get("full_name", "")
        return name or None
    contact = parsed.get("contact") if isinstance(parsed.get("contact"), dict) else {}
    return parsed.get("name") or contact.get("full_name") or None


def _empty_parsed_data() -> dict[str, Any]:
    parsed = {
        "schema_version": PARSER_SCHEMA_VERSION,
        "personal_information": {
            "full_name": "",
            "email": "",
            "phone": "",
            "location": "",
            "linkedin": "",
            "github": "",
            "portfolio": "",
            "portfolio_website": "",
            "leetcode": "",
            "codechef": "",
        },
        "professional_summary": "",
        "technical_skills": {
            "languages": [],
            "backend": [],
            "web_technologies": [],
            "databases": [],
            "core_concepts": [],
            "tools": [],
        },
        "education": [],
        "work_experience": [],
        "projects": [],
        "certifications": [],
        "achievements": [],
        "languages": [],
        "soft_skills": [],
        "interests": [],
    }
    return _with_compatibility_fields(parsed)


def _with_compatibility_fields(parsed: dict[str, Any]) -> dict[str, Any]:
    """Expose stable legacy aliases and the richer Resume Intelligence contract."""
    personal = parsed.get("personal_information")
    if not isinstance(personal, dict):
        personal = {}
    categorized = parsed.get("technical_skills")
    if not isinstance(categorized, dict):
        categorized = {}
    experience = parsed.get("work_experience")
    if not isinstance(experience, list):
        experience = []
    education = parsed.get("education")
    if not isinstance(education, list):
        education = []
    projects = parsed.get("projects")
    if not isinstance(projects, list):
        projects = []
    achievements = parsed.get("achievements")
    if not isinstance(achievements, list):
        achievements = []
    certifications = parsed.get("certifications")
    if not isinstance(certifications, list):
        certifications = []
    soft_skills = parsed.get("soft_skills")
    if not isinstance(soft_skills, list):
        soft_skills = []

    all_skills = _dedupe_list([
        str(skill).strip()
        for values in categorized.values()
        for skill in (values if isinstance(values, list) else [values])
        if skill is not None and str(skill).strip()
    ])
    summary = str(parsed.get("professional_summary") or "").strip()

    parsed.update({
        # Legacy contract.
        "name": str(personal.get("full_name") or "").strip(),
        "skills": all_skills,
        "education": education,
        "experience": experience,
        "projects": projects,
        # Rich contract.
        "contact": dict(personal),
        "summary": summary,
        "categorized_skills": {key: list(value) if isinstance(value, list) else [] for key, value in categorized.items()},
        "project_details": projects,
        "achievements_certifications": {
            "achievements": achievements,
            "certifications": certifications,
        },
        "soft_skills": soft_skills,
        # Canonical matching/recommendation contract.
        "all_skills_flat": all_skills,
    })
    return parsed


def _normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split_into_sections(text: str) -> dict[str, str]:
    """Find section headers and slice text between them."""
    matches: list[tuple[int, int, str]] = []
    for key, pattern in SECTION_HEADERS:
        for match in pattern.finditer(text):
            matches.append((match.start(), match.end(), key))

    if not matches:
        return {}

    matches.sort(key=lambda item: item[0])
    sections: dict[str, str] = {}

    for index, (start, end, key) in enumerate(matches):
        next_start = matches[index + 1][0] if index + 1 < len(matches) else len(text)
        content = text[end:next_start].strip()
        if key not in sections or len(content) > len(sections[key]):
            sections[key] = content

    return sections


def _extract_personal_information(text: str, sections: dict[str, str]) -> dict[str, str]:
    contact_block = sections.get("personal_information", "")
    search_text = contact_block or "\n".join(text.split("\n")[:8])

    linkedin = _clean_url(_first_match(LINKEDIN_PATTERN, text) or _first_match(LINKEDIN_PATTERN, search_text))
    github_urls = [_clean_url(item) for item in GITHUB_PATTERN.findall(text)]
    github = github_urls[0] if github_urls else ""
    leetcode = _clean_url(_first_match(LEETCODE_PATTERN, text))
    codechef = _clean_url(_first_match(CODECHEF_PATTERN, text))

    portfolio = ""
    for url in URL_PATTERN.findall(text):
        lower = url.lower()
        if "linkedin" in lower or "github" in lower or "gmail" in lower or "email" in lower:
            continue
        if "leetcode" in lower or "codechef" in lower:
            continue
        portfolio = _clean_url(url)
        break

    location = _extract_location(search_text)

    return {
        "full_name": _extract_name(text),
        "email": _first_match(EMAIL_PATTERN, text) or "",
        "phone": _extract_phone(text),
        "location": location,
        "linkedin": linkedin,
        "github": github,
        "portfolio": portfolio,
        "portfolio_website": portfolio,
        "leetcode": leetcode,
        "codechef": codechef,
    }


def _extract_name(text: str) -> str:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    skip_words = ("resume", "curriculum vitae", "cv", "summary", "profile", "contact")

    for line in lines[:6]:
        lower = line.lower()
        if any(word in lower for word in skip_words):
            continue
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if _SECTION_NOISE.match(line):
            continue
        if re.match(r"^[A-Za-z][A-Za-z\s.'-]{1,58}[A-Za-z.]$", line):
            words = line.split()
            if 1 <= len(words) <= 5:
                return line.title() if line.isupper() else line

    return lines[0] if lines else ""


def _extract_phone(text: str) -> str:
    for match in PHONE_PATTERN.finditer(text):
        candidate = match.group(0).strip()
        digits = re.sub(r"\D", "", candidate)
        if 7 <= len(digits) <= 15:
            return candidate
    return ""


def _extract_location(text: str) -> str:
    lines = [line.strip() for line in text.split("\n")[:12] if line.strip()]
    for line in lines:
        if ":" in line and _map_skill_category(line.split(":", 1)[0]):
            continue
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if re.search(r"\b(?:india|gujarat|rajasthan|kota|udaipur|vadodara|delhi|mumbai|bangalore)\b", line, re.I):
            return line.strip("|, ")
        if re.search(r"\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b", line) and len(line) < 80:
            return line
    return ""


def _extract_summary(text: str, sections: dict[str, str]) -> str:
    if sections.get("professional_summary"):
        return _clean_summary_section(sections["professional_summary"])

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    summary_lines: list[str] = []
    started = False

    for line in lines[1:12]:
        lower = line.lower()
        if _SECTION_NOISE.match(line) or SECTION_HEADERS[0][1].search("\n" + line):
            break
        if any(k in lower for k in ("developer", "engineer", "student", "passionate", "experience in")):
            started = True
        if started:
            if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
                continue
            summary_lines.append(line)
            if len(summary_lines) >= 4:
                break

    return _clean_block("\n".join(summary_lines))


def _extract_technical_skills(section_text: str) -> dict[str, list[str]]:
    """Parse categorized skills — only from Technical Skills section, no full-resume scan."""
    result = {
        "languages": [],
        "backend": [],
        "web_technologies": [],
        "databases": [],
        "core_concepts": [],
        "tools": [],
    }

    if not section_text:
        return result

    for line in section_text.split("\n"):
        line = re.sub(r"^[-–—•*]\s*", "", line.strip())
        if not line or _SECTION_NOISE.match(line):
            continue

        if ":" in line:
            label, values = line.split(":", 1)
            category = _map_skill_category(label.strip())
            items = _split_list_values(values)
            if category and items:
                result[category].extend(items)
            continue

        # Unlabelled skill lines cannot be assigned safely without inventing a category.

    for key in result:
        result[key] = _dedupe_list(result[key])

    return result


def _map_skill_category(label: str) -> str | None:
    for pattern, key in SKILL_SUBCATEGORY_MAP:
        if pattern.search(label):
            return key
    return None


def _split_list_values(raw: str) -> list[str]:
    cleaned = re.sub(r"\[view\]", "", raw, flags=re.I)
    parts = re.split(r"[,|•/]", cleaned)
    items: list[str] = []
    for part in parts:
        value = part.strip(" -•\t.")
        if not value or len(value) > 60:
            continue
        if _SECTION_NOISE.match(value):
            continue
        if value.lower() in ("view", "n/a", "none"):
            continue
        items.append(value)
    return items


def _extract_education(section_text: str) -> list[dict[str, str]]:
    if not section_text:
        return []

    entries: list[dict[str, str]] = []
    blocks = re.split(r"\n(?=[A-Z][^\n]{0,80}(?:University|College|School|Institute|Academy))", section_text)

    if len(blocks) <= 1:
        blocks = [b.strip() for b in re.split(r"\n{2,}", section_text) if b.strip()]

    for block in blocks:
        entry = _parse_education_block(block)
        if entry.get("institution") or entry.get("degree"):
            entries.append(entry)

    return entries


def _parse_education_block(block: str) -> dict[str, str]:
    lines = [line.strip() for line in block.split("\n") if line.strip()]
    text = " ".join(lines)

    institution_line = lines[0] if lines else ""
    institution = institution_line.split("|")[0].strip()

    degree = ""
    specialization = ""
    for line in lines:
        if re.search(r"\b(B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|MBA|BCA|MCA|12th|10th|Diploma)\b", line, re.I):
            degree = line
            break

    if degree:
        spec_match = re.search(
            r"(?:Computer Science|CSE|Artificial Intelligence|AI|Information Technology|IT|Engineering)[^,\n]*",
            degree,
            re.I,
        )
        if spec_match:
            specialization = re.sub(
                r"\s+Expected\s+20\d{2}.*$", "", spec_match.group(0), flags=re.I
            ).strip()

    degree_match = re.search(r"\b(B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|MBA|BCA|MCA|Diploma)\b", degree, re.I)
    degree_name = degree_match.group(0) if degree_match else degree

    cgpa_match = re.search(r"(?:CGPA|GPA)[:\s]*([\d.]+)|([\d.]+)\s*(?:CGPA|GPA)", text, re.I)
    pct_match = re.search(r"(?:Percentage|Percent)[:\s]*([\d.]+%?)", text, re.I)
    cgpa_or_percentage = ""
    if cgpa_match:
        cgpa_or_percentage = cgpa_match.group(1) or cgpa_match.group(2) or ""
    elif pct_match:
        cgpa_or_percentage = pct_match.group(1)

    year_strings = [match.group(0) for match in YEAR_PATTERN.finditer(text)]
    start_year = year_strings[0] if len(year_strings) >= 2 else ""
    end_year = year_strings[-1] if year_strings else ""

    location_match = re.search(
        r"\b([A-Z][A-Za-z .'-]+,\s*[A-Z][A-Za-z .'-]+)\b", institution_line
    )
    location = location_match.group(1).strip() if location_match else ""
    expected_match = re.search(r"expected\s+(20\d{2})", text, re.I)
    expected_year = expected_match.group(1) if expected_match else end_year

    return {
        "university": institution,
        "institution": institution,
        "degree": degree_name,
        "branch": specialization,
        "specialization": specialization,
        "cgpa": cgpa_or_percentage,
        "cgpa_or_percentage": cgpa_or_percentage,
        "location": location,
        "expected_year": expected_year,
        "start_year": start_year,
        "end_year": end_year,
    }


def _extract_work_experience(section_text: str) -> list[dict[str, Any]]:
    if not section_text:
        return []

    entries: list[dict[str, Any]] = []
    blocks = re.split(r"\n(?=[A-Z][^\n]{0,60}(?:Pvt|Ltd|Inc|Corp|Company|Technologies|Solutions))\b", section_text)

    if len(blocks) <= 1:
        blocks = [b.strip() for b in re.split(r"\n{2,}", section_text) if b.strip()]

    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue

        responsibilities = [
            re.sub(r"^[-•*]\s*", "", line)
            for line in lines[1:]
            if line.startswith(("-", "•", "*")) or line.lower().startswith("responsibilit")
        ]

        entries.append({
            "company_name": lines[0],
            "job_title": lines[1] if len(lines) > 1 else "",
            "start_date": "",
            "end_date": "",
            "responsibilities": responsibilities,
            "technologies_used": _split_list_values(
                next((line.split(":", 1)[1] for line in lines if "technolog" in line.lower() and ":" in line), "")
            ),
        })

    return entries


def _extract_projects(section_text: str, project_links: list[str] | None = None) -> list[dict[str, Any]]:
    if not section_text:
        return []

    blocks: list[str] = []
    current: list[str] = []
    for raw_line in section_text.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        is_bullet = bool(re.match(r"^[-–—•*]\s*", line))
        is_header = not is_bullet and ("|" in line or bool(re.search(r"\bgithub\b", line, re.I)))
        if is_header and current:
            blocks.append("\n".join(current))
            current = []
        current.append(line)
    if current:
        blocks.append("\n".join(current))

    projects: list[dict[str, Any]] = []
    project_links = project_links or []
    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue

        header_parts = [part.strip() for part in lines[0].split("|") if part.strip()]
        metadata = header_parts[1:]
        github_link = _clean_url(_first_match(GITHUB_PATTERN, lines[0]))
        if not github_link and len(projects) < len(project_links):
            github_link = project_links[len(projects)]
        status_parts = [
            re.sub(r"\bgithub\b", "", re.sub(r"[\[\]]", "", part), flags=re.I).strip()
            for part in metadata
            if re.search(r"\b(?:in progress|completed|group project|personal project|academic project)\b", part, re.I)
        ]
        technology_parts = [
            part for part in metadata
            if not re.search(r"\b(?:github|in progress|completed|group project|personal project|academic project)\b", part, re.I)
        ]
        bullet_descriptions = [
            re.sub(r"^[-–—•*]\s*", "", line).strip()
            for line in lines[1:]
            if re.sub(r"^[-–—•*]\s*", "", line).strip()
        ]

        project: dict[str, Any] = {
            "project_name": header_parts[0],
            "technologies": _dedupe_list(
                [item for part in technology_parts for item in _split_list_values(part)]
            ),
            "status_type": " / ".join(status_parts),
            "github_link": github_link,
            "bullet_descriptions": bullet_descriptions,
            "description": bullet_descriptions[0] if bullet_descriptions else "",
            "key_features": bullet_descriptions,
        }

        projects.append(project)

    return projects


def _extract_certifications(sections: dict[str, str]) -> list[dict[str, str]]:
    certs: list[dict[str, str]] = []

    for key in ("certifications", "achievements_and_certifications"):
        block = sections.get(key, "")
        if not block:
            continue
        for line in _lines_as_bullets(block):
            if _looks_like_certification(line):
                certs.append(_parse_certification_line(line))

    return _dedupe_dict_list(certs, "certification_name")


def _extract_achievements(sections: dict[str, str]) -> list[str]:
    achievements: list[str] = []

    for key in ("achievements", "achievements_and_certifications"):
        block = sections.get(key, "")
        if not block:
            continue
        for line in _lines_as_bullets(block):
            if not _looks_like_certification(line):
                achievements.append(re.sub(r"Leet\s+Code", "LeetCode", line, flags=re.I))

    return _dedupe_list(achievements)


def _extract_languages(section_text: str) -> list[str]:
    if not section_text:
        return []
    return _dedupe_list(_split_list_values(section_text.replace("\n", ", ")))


def _extract_list_items(section_text: str) -> list[str]:
    if not section_text:
        return []
    bullet_items = _lines_as_bullets(section_text)
    if bullet_items:
        result: list[str] = []
        for item in bullet_items:
            result.extend(_split_list_values(item))
        return _dedupe_list(result)
    return _dedupe_list(_split_list_values(section_text.replace("\n", ", ")))


def _lines_as_bullets(block: str) -> list[str]:
    items: list[str] = []
    for line in block.split("\n"):
        line = re.sub(r"^[-•*]\s*", "", line.strip())
        line = re.sub(r"\[view\]", "", line, flags=re.I).strip(" .")
        if line and not _SECTION_NOISE.match(line):
            items.append(line)
    return items


def _looks_like_certification(line: str) -> bool:
    lower = line.lower()
    cert_keywords = (
        "certification", "certificate", "nptel", "coursera", "udemy", "ibm",
        "hackerrank", "hacker rank", "google", "microsoft", "aws", "view]",
    )
    return any(k in lower for k in cert_keywords)


def _parse_certification_line(line: str) -> dict[str, str]:
    year_match = YEAR_PATTERN.search(line)
    parts = re.split(r"[-–|]", line, maxsplit=1)
    name = re.sub(r"Hacker\s+Rank", "HackerRank", parts[0], flags=re.I).strip(" .")
    org = parts[1].strip() if len(parts) > 1 else ""
    return {
        "certification_name": name,
        "organization": org,
        "year": year_match.group(0) if year_match else "",
    }


def _first_match(pattern: re.Pattern[str], text: str) -> str:
    match = pattern.search(text)
    return match.group(0).strip() if match else ""


def _clean_url(value: str) -> str:
    return value.strip().rstrip(".,;:|)]}") if value else ""


def _clean_summary_section(section_text: str) -> str:
    """Remove header/contact material that PDF extraction may place under SUMMARY."""
    name = _extract_name(section_text).lower()
    result: list[str] = []
    started = False
    for raw_line in section_text.split("\n"):
        line = raw_line.strip(" |")
        lower = line.lower()
        if not line or lower == name:
            continue
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line) or URL_PATTERN.search(line):
            continue
        if re.search(r"\b(portfolio|linkedin|github|leetcode|leet\s*code|codechef)\b", lower):
            continue
        if not started and not re.search(
            r"\b(aspiring|developer|engineer|student|professional|passionate|experienced|focused)\b",
            lower,
        ):
            continue
        started = True
        result.append(line)
    return _clean_block(" ".join(result))


def _clean_block(text: str) -> str:
    text = re.sub(r"\s*\n\s*", "\n", text)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


def _dedupe_list(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


def _dedupe_dict_list(items: list[dict[str, str]], key: str) -> list[dict[str, str]]:
    seen: set[str] = set()
    result: list[dict[str, str]] = []
    for item in items:
        value = item.get(key, "").lower()
        if value and value not in seen:
            seen.add(value)
            result.append(item)
    return result
