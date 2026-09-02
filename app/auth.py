import hmac
import hashlib
import base64
import json
import time
from typing import Optional

SECRET_KEY = "FITBAT_SUPER_SECRET_KEY_2026_PRODUCTION"
SESSION_DURATION_SECONDS = 30 * 24 * 3600  # 30 days

def hash_password(password: str) -> str:
    salt = "FITBAT_SUPER_SALT_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_session_token(user_id: int, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "expires_at": time.time() + SESSION_DURATION_SECONDS
    }
    raw = json.dumps(payload)
    b64_data = base64.urlsafe_b64encode(raw.encode('utf-8')).decode('utf-8')
    sig = hmac.new(SECRET_KEY.encode('utf-8'), b64_data.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{b64_data}.{sig}"

def get_current_user_from_token(token: Optional[str]) -> Optional[dict]:
    if not token or not isinstance(token, str) or "." not in token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        b64_data, sig = parts[0], parts[1]
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), b64_data.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        raw = base64.urlsafe_b64decode(b64_data.encode('utf-8')).decode('utf-8')
        payload = json.loads(raw)
        if time.time() > payload.get("expires_at", 0):
            return None
        return payload
    except Exception:
        return None
