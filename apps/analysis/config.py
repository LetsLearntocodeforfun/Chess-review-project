from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://chesslens:chesslens@localhost:5432/chesslens"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Stockfish
    stockfish_path: str = "/usr/games/stockfish"
    stockfish_depth: int = 22
    stockfish_threads: int = 2
    stockfish_hash_mb: int = 256

    # Azure OpenAI
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = "gpt-4o-mini"
    azure_openai_api_version: str = "2024-12-01-preview"

    # Celery
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Syzygy tablebase path (optional — no default)
    syzygy_path: str = ""

    model_config = {"env_file": "../../.env", "extra": "ignore"}


settings = Settings()
