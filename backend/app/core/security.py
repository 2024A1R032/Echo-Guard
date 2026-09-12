from typing import Optional
import secrets
import hashlib

def generate_sensor_token() -> str:
    """Generate a high-entropy secret token for C++ Edge Nodes."""
    return secrets.token_hex(32)

def hash_token(token: str) -> str:
    """Hash tokens for safe database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def verify_token(plain_token: str, hashed_token: str) -> bool:
    """Constant-time token verification to prevent timing attacks."""
    return secrets.compare_digest(hash_token(plain_token), hashed_token)
