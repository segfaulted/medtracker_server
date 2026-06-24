from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlmodel import Session, select
import os

from database import init_db, get_session
from models import DailyChecklist, MealInjectionLog

# Create the FastAPI app
app = FastAPI(
    title="Medication Tracker API",
    description="Backend API for tracking daily medications and mealtime injections.",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Pydantic schemas for request validation
class ChecklistToggleRequest(BaseModel):
    date: str  # Format: YYYY-MM-DD
    item: str  # Must be "morning_meds", "evening_meds", or "morning_inject"

class MealInjectionRequest(BaseModel):
    date: str  # Format: YYYY-MM-DD
    note: Optional[str] = None  # e.g., "Breakfast", "Lunch", "Dinner", "Snack", etc.

# API Endpoints

@app.get("/api/status")
def get_status(date: str = Query(..., description="Date in YYYY-MM-DD format"), session: Session = Depends(get_session)):
    """Retrieve checklist and meal injection log status for a specific date."""
    # 1. Fetch or initialize DailyChecklist for the given date
    checklist = session.get(DailyChecklist, date)
    if not checklist:
        checklist = DailyChecklist(date=date)
        session.add(checklist)
        session.commit()
        session.refresh(checklist)
    
    # 2. Fetch MealInjectionLog items for the given date
    statement = select(MealInjectionLog).where(MealInjectionLog.date == date).order_by(MealInjectionLog.timestamp)
    meal_injections = session.exec(statement).all()
    
    return {
        "checklist": checklist,
        "meal_injections": meal_injections
    }

@app.post("/api/checklist/toggle", response_model=DailyChecklist)
def toggle_checklist_item(payload: ChecklistToggleRequest, session: Session = Depends(get_session)):
    """Toggle the check status of morning_meds, evening_meds, or morning_inject."""
    checklist = session.get(DailyChecklist, payload.date)
    if not checklist:
        checklist = DailyChecklist(date=payload.date)
        session.add(checklist)
    
    item = payload.item
    current_time_iso = datetime.now().isoformat()
    
    if item == "morning_meds":
        checklist.morning_meds = not checklist.morning_meds
        checklist.morning_meds_taken_at = current_time_iso if checklist.morning_meds else None
    elif item == "evening_meds":
        checklist.evening_meds = not checklist.evening_meds
        checklist.evening_meds_taken_at = current_time_iso if checklist.evening_meds else None
    elif item == "morning_inject":
        checklist.morning_inject = not checklist.morning_inject
        checklist.morning_inject_taken_at = current_time_iso if checklist.morning_inject else None
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid checklist item: '{item}'. Must be morning_meds, evening_meds, or morning_inject."
        )
    
    session.add(checklist)
    session.commit()
    session.refresh(checklist)
    return checklist

@app.post("/api/meal-injections", response_model=MealInjectionLog)
def add_meal_injection(payload: MealInjectionRequest, session: Session = Depends(get_session)):
    """Log a new mealtime injection with an optional note."""
    current_time_iso = datetime.now().isoformat()
    log_entry = MealInjectionLog(
        date=payload.date,
        timestamp=current_time_iso,
        note=payload.note
    )
    session.add(log_entry)
    session.commit()
    session.refresh(log_entry)
    return log_entry

@app.delete("/api/meal-injections/{id}")
def delete_meal_injection(id: int, session: Session = Depends(get_session)):
    """Delete a logged mealtime injection by its ID."""
    log_entry = session.get(MealInjectionLog, id)
    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meal injection log with ID {id} not found."
        )
    session.delete(log_entry)
    session.commit()
    return {"success": True}

@app.get("/api/history")
def get_history(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    session: Session = Depends(get_session)
):
    """Retrieve historical logs aggregated by date for compliance view."""
    # Query checklists in date range
    checklist_statement = select(DailyChecklist).where(
        DailyChecklist.date >= start_date,
        DailyChecklist.date <= end_date
    )
    checklists = session.exec(checklist_statement).all()
    
    # Query meal injections in date range
    meals_statement = select(MealInjectionLog).where(
        MealInjectionLog.date >= start_date,
        MealInjectionLog.date <= end_date
    )
    meals = session.exec(meals_statement).all()
    
    # Organize checklists by date for fast lookup
    checklists_by_date = {c.date: c for c in checklists}
    
    # Group meal injections by date
    meals_by_date = {}
    for m in meals:
        meals_by_date.setdefault(m.date, []).append({
            "id": m.id,
            "timestamp": m.timestamp,
            "note": m.note
        })
    
    # Build complete chronological history list
    history = []
    
    # Loop from start_date to end_date
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    delta = timedelta(days=1)
    
    current = start
    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        
        checklist_item = checklists_by_date.get(date_str)
        meal_items = meals_by_date.get(date_str, [])
        
        history.append({
            "date": date_str,
            "checklist": {
                "morning_meds": checklist_item.morning_meds if checklist_item else False,
                "morning_meds_taken_at": checklist_item.morning_meds_taken_at if checklist_item else None,
                "evening_meds": checklist_item.evening_meds if checklist_item else False,
                "evening_meds_taken_at": checklist_item.evening_meds_taken_at if checklist_item else None,
                "morning_inject": checklist_item.morning_inject if checklist_item else False,
                "morning_inject_taken_at": checklist_item.morning_inject_taken_at if checklist_item else None,
            },
            "meal_injections_count": len(meal_items),
            "meal_injections": meal_items
        })
        current += delta
        
    return history

# Serve Frontend SPA Static Files

# Ensure static directory exists
os.makedirs("static", exist_ok=True)

@app.get("/")
def read_root():
    """Serve the index.html page as the main dashboard entry point."""
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h2>Frontend static files not found. Please create static/index.html</h2>")

# Mount static folder for CSS and JS assets
app.mount("/static", StaticFiles(directory="static"), name="static")
