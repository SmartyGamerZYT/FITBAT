import hashlib
import secrets
import time
from typing import Optional, Dict

# In-memory active tokens store (token -> {user_id, username, expires_at})
ACTIVE_SESSIONS: Dict[str, dict] = {}
SESSION_DURATION_SECONDS = 7 * 24 * 3600  # 7 days

def hash_password(password: str) -> str:
    # SHA-256 with consistent salt
    salt = "FITBAT_SUPER_SALT_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_session_token(user_id: int, username: str) -> str:
    token = secrets.token_hex(32)
    ACTIVE_SESSIONS[token] = {
        "user_id": user_id,
        "username": username,
        "expires_at": time.time() + SESSION_DURATION_SECONDS
    }
    return token

def get_current_user_from_token(token: Optional[str]) -> Optional[dict]:
    if not token or token not in ACTIVE_SESSIONS:
        return None
    session = ACTIVE_SESSIONS[token]
    if time.time() > session["expires_at"]:
        del ACTIVE_SESSIONS[token]
        return None
    return session
