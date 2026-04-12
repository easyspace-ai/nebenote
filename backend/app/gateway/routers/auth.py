"""Authentication API endpoints."""

import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# Constants
AUTH_TOKEN_EXPIRE_DAYS = 30
DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / ".deer-flow"
USERS_FILE = DATA_DIR / "users.json"
TOKENS_FILE = DATA_DIR / "tokens.json"


# == Models ==

class User(BaseModel):
    id: str
    email: str
    password_hash: str
    created_at: str
    updated_at: str


class AuthToken(BaseModel):
    token: str
    user_id: str
    expires_at: str
    created_at: str


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str


# == Storage ==

import json
import os


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_json(path: Path, default: dict | list) -> dict | list:
    _ensure_data_dir()
    if not path.exists():
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return default


def _save_json(path: Path, data: dict | list):
    _ensure_data_dir()
    tmp_path = path.with_suffix(".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp_path.replace(path)


def _hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt."""
    salt = secrets.token_hex(16)
    hash_value = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hash_value}"


def _verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    try:
        salt, hash_value = password_hash.split("$")
        computed = hashlib.sha256((password + salt).encode()).hexdigest()
        return computed == hash_value
    except ValueError:
        return False


def _generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


def _get_user_by_email(email: str) -> User | None:
    """Get user by email."""
    users = _load_json(USERS_FILE, [])
    for u in users:
        if u.get("email") == email:
            return User(**u)
    return None


def _get_user_by_id(user_id: str) -> User | None:
    """Get user by ID."""
    users = _load_json(USERS_FILE, [])
    for u in users:
        if u.get("id") == user_id:
            return User(**u)
    return None


def _get_token_data(token: str) -> dict | None:
    """Get token data if valid."""
    tokens = _load_json(TOKENS_FILE, [])
    for t in tokens:
        if t.get("token") == token:
            # Check expiry
            expires_at = datetime.fromisoformat(t["expires_at"])
            if datetime.now(timezone.utc) > expires_at:
                return None
            return t
    return None


# == Dependencies ==

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token_data = _get_token_data(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = _get_user_by_id(token_data["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# == Endpoints ==

@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user."""
    # Check if email already exists
    existing = _get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user_id = secrets.token_urlsafe(16)
    now = datetime.now(timezone.utc).isoformat()

    user = User(
        id=user_id,
        email=request.email,
        password_hash=_hash_password(request.password),
        created_at=now,
        updated_at=now,
    )

    # Save user
    users = _load_json(USERS_FILE, [])
    users.append(user.model_dump())
    _save_json(USERS_FILE, users)

    # Create token
    token = _generate_token()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=AUTH_TOKEN_EXPIRE_DAYS)).isoformat()

    token_data = AuthToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        created_at=now,
    )

    tokens = _load_json(TOKENS_FILE, [])
    tokens.append(token_data.model_dump())
    _save_json(TOKENS_FILE, tokens)

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            created_at=user.created_at,
        ).model_dump(),
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login a user."""
    # Find user
    user = _get_user_by_email(request.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    if not _verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create token
    token = _generate_token()
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=AUTH_TOKEN_EXPIRE_DAYS)).isoformat()

    token_data = AuthToken(
        token=token,
        user_id=user.id,
        expires_at=expires_at,
        created_at=now.isoformat(),
    )

    tokens = _load_json(TOKENS_FILE, [])
    tokens.append(token_data.model_dump())
    _save_json(TOKENS_FILE, tokens)

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            created_at=user.created_at,
        ).model_dump(),
    )


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout a user (invalidate token)."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Remove token
    tokens = _load_json(TOKENS_FILE, [])
    tokens = [t for t in tokens if t.get("token") != credentials.credentials]
    _save_json(TOKENS_FILE, tokens)

    return {"success": True}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
    )
