FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends stockfish && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies from pyproject.toml without building a package
COPY pyproject.toml ./
RUN pip install --no-cache-dir \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.34.0" \
    "chess>=1.10.0" \
    "openai>=1.60.0" \
    "asyncpg>=0.30.0" \
    "sqlalchemy[asyncio]>=2.0.36" \
    "celery[redis]>=5.4.0" \
    "redis>=5.2.0" \
    "httpx>=0.28.0" \
    "pydantic>=2.10.0" \
    "pydantic-settings>=2.7.0" \
    "python-multipart>=0.0.9"

# Copy application code
COPY . ./

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
