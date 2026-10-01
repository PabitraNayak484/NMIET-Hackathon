"""
config.py — pydantic-settings loader for SATHI backend.
All settings are read from environment variables / .env file.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # LLM
    anthropic_api_key: str = ""

    # Database
    database_url: str = "sqlite:///./sathi.db"

    # Content
    content_packs_dir: str = "../content/packs"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4173"]

    # Rate limiting
    rate_limit_per_minute: int = 60

    # Environment
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
