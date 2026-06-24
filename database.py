from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path
import os

# Use SQLite database. Allow override via DB_PATH environment variable (e.g. /data/med_tracker.db)
DB_PATH_ENV = os.getenv("DB_PATH")
if DB_PATH_ENV:
    DB_FILE = Path(DB_PATH_ENV)
else:
    DB_FILE = Path(__file__).parent / "med_tracker.db"

# Ensure the parent directory of the database file exists
try:
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
except Exception as e:
    import sys
    print(f"Warning: Could not create directory {DB_FILE.parent} due to {e}. Falling back to current directory.", file=sys.stderr)
    DB_FILE = Path(__file__).parent / "med_tracker.db"

sqlite_url = f"sqlite:///{DB_FILE}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def init_db():
    """Create all tables in the database if they don't exist."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency for API endpoints to get a DB session."""
    with Session(engine) as session:
        yield session
