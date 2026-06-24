# Use a lightweight python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

# Set the working directory
WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy uv lock and pyproject.toml to install dependencies first (caching layer)
COPY pyproject.toml uv.lock ./

# Install the project's dependencies
RUN uv sync --frozen --no-dev --no-install-project

# Copy the rest of the application code
COPY . .

# Sync the project itself (without dev dependencies)
RUN uv sync --frozen --no-dev

# Use a clean, minimal runtime image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy the installed virtualenv and application code from the builder stage
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app /app

# Ensure the app uses the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Create a directory for persistent SQLite data
RUN mkdir -p /data

# Set environment variable to store sqlite DB in /data/med_tracker.db
ENV DB_PATH=/data/med_tracker.db

# Expose the API port
EXPOSE 8000

# Start the application using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
