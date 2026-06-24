# MedTracker Server - API Documentation

This document describes the REST API endpoints provided by the `med_tracker` server. You can use this specification to build desktop applications, client wrappers, or custom scripts that interact with your tracker database.

## General Information
* **Base URL**: `http://127.0.0.1:8000`
* **Content-Type**: `application/json` for all requests and responses.
* **Authentication**: None (Designed for local single-user deployment).
* **Interactive Docs**: When the server is running, you can visit:
  * Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
  * ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Endpoints

### 1. Get Day Status
Retrieves the checklist completion status and a list of all logged mealtime injections for a specific date.

* **Method**: `GET`
* **Path**: `/api/status`
* **Query Parameters**:
  * `date` (string, required): The target date in `YYYY-MM-DD` format (e.g., `2026-06-23`).
* **Response (200 OK)**:
  ```json
  {
    "checklist": {
      "date": "2026-06-23",
      "morning_meds": true,
      "morning_meds_taken_at": "2026-06-23T10:07:45.123456",
      "evening_meds": false,
      "evening_meds_taken_at": null,
      "morning_inject": true,
      "morning_inject_taken_at": "2026-06-23T08:12:02.987654"
    },
    "meal_injections": [
      {
        "id": 1,
        "date": "2026-06-23",
        "timestamp": "2026-06-23T08:30:00.000000",
        "note": "Breakfast"
      },
      {
        "id": 2,
        "date": "2026-06-23",
        "timestamp": "2026-06-23T12:15:30.000000",
        "note": "Lunch"
      }
    ]
  }
  ```

---

### 2. Toggle Checklist Item
Toggles the checked state (`true`/`false`) of a checklist item. If toggled to `true`, the `_taken_at` timestamp is set to the current server local time. If toggled to `false`, the timestamp is reset to `null`.

* **Method**: `POST`
* **Path**: `/api/checklist/toggle`
* **Request Body**:
  ```json
  {
    "date": "2026-06-23",
    "item": "morning_meds"
  }
  ```
  * `item` must be one of: `"morning_meds"`, `"evening_meds"`, or `"morning_inject"`.
* **Response (200 OK)**: Returns the updated checklist record.
  ```json
  {
    "date": "2026-06-23",
    "morning_meds": true,
    "morning_meds_taken_at": "2026-06-23T15:08:05.876543",
    "evening_meds": false,
    "evening_meds_taken_at": null,
    "morning_inject": false,
    "morning_inject_taken_at": null
  }
  ```
* **Error Response (400 Bad Request)**: Returned if the `item` value is invalid.
  ```json
  {
    "detail": "Invalid checklist item: 'afternoon_meds'. Must be morning_meds, evening_meds, or morning_inject."
  }
  ```

---

### 3. Add Meal Injection
Logs a new mealtime injection with the current timestamp and an optional note.

* **Method**: `POST`
* **Path**: `/api/meal-injections`
* **Request Body**:
  ```json
  {
    "date": "2026-06-23",
    "note": "Snack"
  }
  ```
  * `note` (string, optional): A tag describing the context (e.g. `"Breakfast"`, `"Lunch"`, `"Dinner"`, `"Snack"` or custom text).
* **Response (200 OK)**: Returns the created log entry.
  ```json
  {
    "id": 3,
    "date": "2026-06-23",
    "timestamp": "2026-06-23T15:08:05.123456",
    "note": "Snack"
  }
  ```

---

### 4. Delete Meal Injection
Deletes a logged mealtime injection by its unique database ID.

* **Method**: `DELETE`
* **Path**: `/api/meal-injections/{id}`
  * `{id}` (integer, required): The ID of the log entry to remove.
* **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```
* **Error Response (404 Not Found)**: Returned if the ID doesn't exist.
  ```json
  {
    "detail": "Meal injection log with ID 999 not found."
  }
  ```

---

### 5. Get History Range
Retrieves checklist status and aggregated counts of meal injections for a date range (inclusive), sorted chronologically. Useful for rendering calendars, compliance lists, or plotting analytics.

* **Method**: `GET`
* **Path**: `/api/history`
* **Query Parameters**:
  * `start_date` (string, required): Format `YYYY-MM-DD`.
  * `end_date` (string, required): Format `YYYY-MM-DD`.
* **Response (200 OK)**:
  ```json
  [
    {
      "date": "2026-06-22",
      "checklist": {
        "morning_meds": true,
        "morning_meds_taken_at": "2026-06-22T08:05:00",
        "evening_meds": true,
        "evening_meds_taken_at": "2026-06-22T20:10:00",
        "morning_inject": true,
        "morning_inject_taken_at": "2026-06-22T08:06:00"
      },
      "meal_injections_count": 3,
      "meal_injections": [
        { "id": 10, "timestamp": "2026-06-22T08:15:00", "note": "Breakfast" },
        { "id": 11, "timestamp": "2026-06-22T13:00:00", "note": "Lunch" },
        { "id": 12, "timestamp": "2026-06-22T18:45:00", "note": "Dinner" }
      ]
    },
    {
      "date": "2026-06-23",
      "checklist": {
        "morning_meds": true,
        "morning_meds_taken_at": "2026-06-23T08:12:00",
        "evening_meds": false,
        "evening_meds_taken_at": null,
        "morning_inject": false,
        "morning_inject_taken_at": null
      },
      "meal_injections_count": 1,
      "meal_injections": [
        { "id": 13, "timestamp": "2026-06-23T08:20:00", "note": "Breakfast" }
      ]
    }
  ]
  ```
