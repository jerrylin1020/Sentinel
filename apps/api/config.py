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

    # LINE Notify — https://notify-bot.line.me (per-user/group access token).
    line_notify_token: str = ""

    # Email via Resend (https://resend.com) REST API — no SMTP server needed.
    resend_api_key: str = ""
    email_from: str = "signals@sentinel.local"
    email_to: str = ""

    # Seed rules + watchlist on startup. Keep True for local/dev; set False on
    # serverless (Vercel) where the DB is already seeded and cold starts are hot.
    autoseed: bool = True

    # Shared secret required by an external cron service (e.g. cron-job.org) to
    # hit POST /cron/scan. Empty string means the endpoint is disabled (404).
    cron_secret: str = ""


settings = Settings()
