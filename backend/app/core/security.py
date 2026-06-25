"""Signed, expiring access tokens for TalentSync API authentication."""

import base64
import datetime
import hashlib
import hmac
import importlib
import json
import logging
import os
import secrets
import warnings
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_DEFAULT_SECRET = "talentsync-local-development-secret-change-before-deployment"

_raw_secret = os.getenv("TALENTSYNC_TOKEN_SECRET", _DEFAULT_SECRET)

# Security guard: warn loudly if the default insecure secret is in use.
# In production (TALENTSYNC_ENV=production), refuse to start.
if _raw_secret == _DEFAULT_SECRET:
    _env = os.getenv("TALENTSYNC_ENV", "development").lower()
    if _env == "production":
        raise RuntimeError(
            "SECURITY ERROR: TALENTSYNC_TOKEN_SECRET is not set or uses the insecure default. "
            "Set a strong, random secret before deploying to production. "
            "Example: export TALENTSYNC_TOKEN_SECRET=$(python -c 'import secrets; print(secrets.token_hex(32))')"
        )
    else:
        warnings.warn(
            "TALENTSYNC_TOKEN_SECRET is using the insecure development default. "
            "Set TALENTSYNC_TOKEN_SECRET before deploying to production.",
            stacklevel=1,
        )
        logger.warning(
            "⚠️  TALENTSYNC_TOKEN_SECRET is using the insecure development default. "
            "Set TALENTSYNC_TOKEN_SECRET before deploying to production."
        )

TOKEN_SECRET = _raw_secret.encode("utf-8")
TOKEN_TTL_SECONDS = int(os.getenv("TALENTSYNC_TOKEN_TTL_SECONDS", "28800"))
PASSWORD_ITERATIONS = 260_000


@dataclass(frozen=True)
class TokenPrincipal:
    account_id: int
    role: str


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations, salt, expected = stored_hash.split("$", 3)
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                base64.b64decode(salt),
                int(iterations),
            )
            return hmac.compare_digest(base64.b64encode(digest).decode(), expected)
        except (TypeError, ValueError):
            return False
    if stored_hash.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            bcrypt_module = importlib.import_module("bcrypt")
            return bcrypt_module.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
        except (ImportError, ValueError):
            return False
    return False


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_access_token(account_id: int, role: str) -> str:
    now = int(datetime.datetime.now(datetime.UTC).timestamp())
    header = _encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _encode(
        json.dumps(
            {"sub": str(account_id), "role": role, "iat": now, "exp": now + TOKEN_TTL_SECONDS},
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = _encode(hmac.new(TOKEN_SECRET, signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def decode_access_token(token: str) -> TokenPrincipal:
    try:
        header, payload, signature = token.split(".")
        signing_input = f"{header}.{payload}".encode("ascii")
        expected = _encode(hmac.new(TOKEN_SECRET, signing_input, hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid token signature")
        data = json.loads(_decode(payload))
        if int(data["exp"]) <= int(datetime.datetime.now(datetime.UTC).timestamp()):
            raise ValueError("Token expired")
        account_id = int(data["sub"])
        role = str(data["role"])
        if account_id <= 0 or role not in {"candidate", "recruiter"}:
            raise ValueError("Invalid token claims")
        return TokenPrincipal(account_id=account_id, role=role)
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid or expired authentication token") from exc
