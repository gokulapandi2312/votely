import os
from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv

# Load from root .env and backend .env
# __file__ is d:\voting_system\backend\app\config.py -> ../.. is d:\voting_system
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
root_env = os.path.join(workspace_root, ".env")
backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.env"))

# Load backend_env first, then root_env with override=True so root_env takes precedence
if os.path.exists(backend_env):
    load_dotenv(backend_env)
if os.path.exists(root_env):
    load_dotenv(root_env, override=True)

def get_database_url() -> str:
    # 1. MySQL credentials from .env
    db_user = os.getenv("DB_USER", "root")
    db_pass = os.getenv("DB_PASSWORD", "gokul123")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "3306")
    db_name = os.getenv("DB_NAME", "voting_system_db")

    if db_user and db_name:
        return f"mysql+pymysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"

    # 2. Fallback to DATABASE_URL if explicitly set
    if os.getenv("DATABASE_URL") and not os.getenv("DATABASE_URL").startswith("sqlite"):
        return os.getenv("DATABASE_URL")

    return "sqlite:///./learntogether.db"

class Settings(BaseSettings):
    APP_NAME: str = "LearnTogether"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = get_database_url()

    # Security
    SECRET_KEY: str = "learntogether-super-secret-jwt-key-2026-secure-token"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()
