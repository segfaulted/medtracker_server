from typing import Optional
from sqlmodel import Field, SQLModel

class DailyChecklist(SQLModel, table=True):
    date: str = Field(primary_key=True)  # Format: YYYY-MM-DD
    morning_meds: bool = Field(default=False)
    morning_meds_taken_at: Optional[str] = Field(default=None)  # ISO timestamp
    evening_meds: bool = Field(default=False)
    evening_meds_taken_at: Optional[str] = Field(default=None)  # ISO timestamp
    morning_inject: bool = Field(default=False)
    morning_inject_taken_at: Optional[str] = Field(default=None)  # ISO timestamp

class MealInjectionLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str = Field(index=True)  # Format: YYYY-MM-DD
    timestamp: str = Field(...)   # ISO timestamp
    note: Optional[str] = Field(default=None)  # e.g., "Breakfast", "Lunch", "Dinner", "Snack", etc.
