from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "ClinicFlow"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./clinicflow.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    class Config:
        env_file = ".env"


settings = Settings()
