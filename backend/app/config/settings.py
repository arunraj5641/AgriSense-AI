from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriSense AI"
    ENVIRONMENT: Literal["development", "production", "testing"] = "development"
    LOG_LEVEL: str = "INFO"
    
    # Database
    DATABASE_URL: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
