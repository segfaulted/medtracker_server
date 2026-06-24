# MedTracker Server

> [!WARNING]
> **Disclaimer**: This is a quick and dirty personal application built with AI. It is provided "as-is" without any warranty of any kind. Use at your own risk.

MedTracker is a simple, lightweight full-stack web application designed for tracking daily medications and mealtime injections. It includes a fast FastAPI backend and a clean, responsive Single-Page Application (SPA) frontend served directly by the server.

---

## Features

- **Daily Checklist**: Track morning medications, evening medications, and morning injections.
- **Mealtime Injection Logs**: Log mealtime injections with timestamp and notes (e.g. Breakfast, Lunch, Dinner, Snack).
- **History View**: Search compliance history and meal logs across date ranges.
- **Responsive Dashboard**: Built-in simple UI served statically from the backend.
- **Docker Ready**: Pre-configured Docker Compose with volume persistency.
- **Modern Python Tooling**: Uses `uv` for ultra-fast package management and `sqlmodel` (SQLAlchemy + Pydantic) for database operations.

---

## Tech Stack

- **Backend**: Python 3.12, [FastAPI](https://fastapi.tiangolo.com/), [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
- **Database**: SQLite
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (served statically)
- **Deployment**: Docker, Docker Compose

---

## Getting Started

### Option 1: Running with Docker (Recommended)

Docker is the easiest way to run the application with a persistent database.

1. **Start the application:**
   ```bash
   docker compose up -d
   ```

2. **Access the application:**
   - Open your browser to `http://localhost:8000` to see the frontend dashboard.
   - Access the interactive API docs (Swagger UI) at `http://localhost:8000/docs`.

3. **Database Volume Info:**
   - The SQLite database file will be created locally in the `./data` directory (`./data/med_tracker.db`) on your host machine. This directory is bound to `/data` in the container.
   - To stop the server:
     ```bash
     docker compose down
     ```

---

### Option 2: Running Locally (Development)

This project uses [uv](https://github.com/astral-sh/uv) for dependency management.

1. **Install dependencies:**
   Make sure you have `uv` installed. Then run:
   ```bash
   uv sync
   ```

2. **Run the server:**
   Start the FastAPI development server:
   ```bash
   uv run uvicorn main:app --reload
   ```

3. **Access the app:**
   - Frontend Dashboard: `http://127.0.0.1:8000`
   - Swagger UI docs: `http://127.0.0.1:8000/docs`

4. **Local Database:**
   - A local SQLite database file `med_tracker.db` will be created automatically in the root of the project directory.

---

## Directory Structure

```text
├── .github/workflows/
│   └── ci.yml            # GitHub Actions CI workflow (Docker build check)
├── static/               # Frontend SPA assets (served by FastAPI)
│   ├── index.html        # HTML layout
│   ├── style.css         # Styling
│   └── app.js            # Frontend JavaScript logic
├── database.py           # Database connection and session management
├── models.py             # SQLModel schemas & database tables
├── main.py               # FastAPI application endpoints & routes
├── pyproject.toml        # Project configuration & dependencies
├── uv.lock               # Lockfile for reproducible builds
├── Dockerfile            # Container build specification
├── docker-compose.yml    # Docker Compose orchestration
└── API_DOCUMENTATION.md  # Detailed API endpoint reference
```

---

## API Reference

The server exposes REST endpoints to manage checklists and logs:
- `GET /api/status`: Get the completion status and logs for a specific date.
- `POST /api/checklist/toggle`: Toggle checked states of meds or injections.
- `POST /api/meal-injections`: Log a new mealtime injection.
- `DELETE /api/meal-injections/{id}`: Delete a logged injection.
- `GET /api/history`: Get checklist compliance and injection logs across a date range.

For request/response schemas and example payloads, please refer to the detailed [API_DOCUMENTATION.md](file:///E:/repos/med_tracker/server/API_DOCUMENTATION.md).
