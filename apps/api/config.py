from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Use a local SQLite file by default so the app boots with zero infra.
    # Docker compose / production overrides DATABASE_URL to Postgres.
    database_url: str = "sqlite:///./sentinel.db"
    redis_url: str = "redis://localhost:6379/0"

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""


settings = Settings()
