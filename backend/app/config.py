import os

DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./str.db")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def get_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
