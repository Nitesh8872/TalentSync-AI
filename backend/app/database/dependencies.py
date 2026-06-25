"""
# WORKFLOW NUMBER
# Shared Route Dependencies
#
# PURPOSE
# Keep reusable FastAPI dependencies out of individual route modules.
#
# INPUT
# HTTP headers and request-scoped values.
#
# OUTPUT
# Validated dependency values for workflow routes.
#
# FLOW DESCRIPTION
# Route -> Dependency -> Workflow Service.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.database import get_db
from backend.app.database.models import Recruiter, User


bearer_scheme = HTTPBearer(auto_error=False)


def _credentials_or_401(credentials: HTTPAuthorizationCredentials | None):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        return decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def get_authenticated_candidate_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> int:
    principal = _credentials_or_401(credentials)
    if principal.role != "candidate":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate access required")
    candidate = db.query(User).filter(User.id == principal.account_id, User.role == "candidate").first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Candidate account no longer exists")
    return candidate.id


def get_optional_candidate_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> int | None:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    try:
        principal = decode_access_token(credentials.credentials)
        if principal.role != "candidate":
            return None
        candidate = db.query(User).filter(User.id == principal.account_id, User.role == "candidate").first()
        if not candidate:
            return None
        return candidate.id
    except Exception:
        return None


def get_authenticated_recruiter_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> int:
    principal = _credentials_or_401(credentials)
    if principal.role != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required")
    recruiter = db.query(Recruiter).filter(Recruiter.id == principal.account_id).first()
    if not recruiter:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Recruiter account no longer exists")
    return recruiter.id
