# Use the official uv image with Python 3.10
FROM ghcr.io/astral-sh/uv:python3.10-bookworm-slim

# Install system dependencies including MariaDB development libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    pkg-config \
    git \
    libmariadb-dev \
    libmariadb3 \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./
COPY uv.lock* ./

# Install dependencies
RUN uv sync --frozen

# Copy application code
COPY . .

# Set PATH to include the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Expose FastAPI port
EXPOSE 8000

# Run uvicorn directly (now available in PATH)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]