"""API route handlers for subjects, tasks, and dashboard statistics."""

from flask import Blueprint, jsonify, request

from backend.db import get_db
from backend.errors import ApiError
from backend.validation import (
    optional_str, require_str, validate_bool, validate_color,
    validate_due_date, validate_int_id, validate_priority,
    MAX_DESC_LEN, MAX_NAME_LEN, MAX_TITLE_LEN,
)

api = Blueprint("api", __name__, url_prefix="/api")


# --- Subjects ---

def _subject_row_to_dict(row):
    return {
        "id": row["id"], "name": row["name"], "description": row["description"],
        "color": row["color"], "created_at": row["created_at"],
    }

def _get_subject_or_404(db, subject_id):
    row = db.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
    if row is None:
        raise ApiError("Subject not found.", 404)
    return row

@api.get("/subjects")
def list_subjects():
    db = get_db()
    rows = db.execute("SELECT * FROM subjects ORDER BY created_at ASC, id ASC").fetchall()
    return jsonify([_subject_row_to_dict(r) for r in rows])

@api.post("/subjects")
def create_subject():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400)
    name = require_str(data.get("name"), "name", MAX_NAME_LEN)
    description = optional_str(data.get("description"), "description", MAX_DESC_LEN)
    color = validate_color(data.get("color"))
    db = get_db()
    cur = db.execute("INSERT INTO subjects (name, description, color) VALUES (?, ?, ?)", (name, description, color))
    db.commit()
    row = db.execute("SELECT * FROM subjects WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(_subject_row_to_dict(row)), 201

@api.get("/subjects/<int:subject_id>")
def get_subject(subject_id):
    db = get_db()
    return jsonify(_subject_row_to_dict(_get_subject_or_404(db, subject_id)))

@api.put("/subjects/<int:subject_id>")
def update_subject(subject_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400)
    db = get_db()
    _get_subject_or_404(db, subject_id)
    name = require_str(data.get("name"), "name", MAX_NAME_LEN)
    description = optional_str(data.get("description"), "description", MAX_DESC_LEN)
    color = validate_color(data.get("color"))
    db.execute("UPDATE subjects SET name = ?, description = ?, color = ? WHERE id = ?", (name, description, color, subject_id))
    db.commit()
    row = db.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
    return jsonify(_subject_row_to_dict(row))

@api.delete("/subjects/<int:subject_id>")
def delete_subject(subject_id):
    db = get_db()
    _get_subject_or_404(db, subject_id)
    db.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    db.commit()
    return jsonify({"message": "Subject deleted."})


# --- Tasks ---

def _task_row_to_dict(row):
    return {
        "id": row["id"], "title": row["title"], "description": row["description"],
        "subject_id": row["subject_id"], "subject_name": row["subject_name"],
        "subject_color": row["subject_color"], "due_date": row["due_date"],
        "priority": row["priority"], "completed": bool(row["completed"]),
        "created_at": row["created_at"],
    }

_TASK_SELECT_SQL = """
    SELECT t.*, s.name AS subject_name, s.color AS subject_color
    FROM tasks t
    LEFT JOIN subjects s ON t.subject_id = s.id
"""

def _get_task_or_404(db, task_id):
    row = db.execute(_TASK_SELECT_SQL + " WHERE t.id = ?", (task_id,)).fetchone()
    if row is None:
        raise ApiError("Task not found.", 404)
    return row

def _validate_subject_exists(db, subject_id):
    if subject_id == 0:
        return None
    if db.execute("SELECT 1 FROM subjects WHERE id = ?", (subject_id,)).fetchone() is None:
        raise ApiError("Referenced subject does not exist.", 400)
    return subject_id

@api.get("/tasks")
def list_tasks():
    db = get_db()
    rows = db.execute(_TASK_SELECT_SQL + " ORDER BY t.completed ASC, t.due_date IS NULL, t.due_date ASC, t.id ASC").fetchall()
    return jsonify([_task_row_to_dict(r) for r in rows])

@api.post("/tasks")
def create_task():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400)
    title = require_str(data.get("title"), "title", MAX_TITLE_LEN)
    description = optional_str(data.get("description"), "description", MAX_DESC_LEN)
    subject_id = validate_int_id(data.get("subject_id"), "subject_id")
    due_date = validate_due_date(data.get("due_date"))
    priority = validate_priority(data.get("priority"))
    completed = validate_bool(data.get("completed"), "completed")
    db = get_db()
    subject_id = _validate_subject_exists(db, subject_id)
    cur = db.execute(
        "INSERT INTO tasks (title, description, subject_id, due_date, priority, completed) VALUES (?, ?, ?, ?, ?, ?)",
        (title, description, subject_id, due_date, priority, completed),
    )
    db.commit()
    return jsonify(_task_row_to_dict(_get_task_or_404(db, cur.lastrowid))), 201

@api.get("/tasks/<int:task_id>")
def get_task(task_id):
    db = get_db()
    return jsonify(_task_row_to_dict(_get_task_or_404(db, task_id)))

@api.put("/tasks/<int:task_id>")
def update_task(task_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400)
    db = get_db()
    _get_task_or_404(db, task_id)
    title = require_str(data.get("title"), "title", MAX_TITLE_LEN)
    description = optional_str(data.get("description"), "description", MAX_DESC_LEN)
    subject_id = validate_int_id(data.get("subject_id"), "subject_id")
    due_date = validate_due_date(data.get("due_date"))
    priority = validate_priority(data.get("priority"))
    completed = validate_bool(data.get("completed"), "completed")
    subject_id = _validate_subject_exists(db, subject_id)
    db.execute(
        "UPDATE tasks SET title = ?, description = ?, subject_id = ?, due_date = ?, priority = ?, completed = ? WHERE id = ?",
        (title, description, subject_id, due_date, priority, completed, task_id),
    )
    db.commit()
    return jsonify(_task_row_to_dict(_get_task_or_404(db, task_id)))

@api.patch("/tasks/<int:task_id>")
def patch_task(task_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.", 400)
    db = get_db()
    _get_task_or_404(db, task_id)
    fields, values = [], []
    validators = {
        "completed": lambda v: validate_bool(v, "completed"),
        "title": lambda v: require_str(v, "title", MAX_TITLE_LEN),
        "description": lambda v: optional_str(v, "description", MAX_DESC_LEN),
        "due_date": validate_due_date,
        "priority": validate_priority,
    }
    for key, validator in validators.items():
        if key in data:
            val = validator(data.get(key))
            fields.append(f"{key} = ?")
            values.append(val)
    if "subject_id" in data:
        sid = _validate_subject_exists(db, validate_int_id(data.get("subject_id"), "subject_id"))
        fields.append("subject_id = ?")
        values.append(sid)
    if not fields:
        raise ApiError("No valid fields to update.", 400)
    values.append(task_id)
    db.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()
    return jsonify(_task_row_to_dict(_get_task_or_404(db, task_id)))

@api.delete("/tasks/<int:task_id>")
def delete_task(task_id):
    db = get_db()
    _get_task_or_404(db, task_id)
    db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    db.commit()
    return jsonify({"message": "Task deleted."})


# --- Dashboard stats ---

@api.get("/stats")
def get_stats():
    db = get_db()
    total_subjects = db.execute("SELECT COUNT(*) AS c FROM subjects").fetchone()["c"]
    total_tasks = db.execute("SELECT COUNT(*) AS c FROM tasks").fetchone()["c"]
    completed_tasks = db.execute("SELECT COUNT(*) AS c FROM tasks WHERE completed = 1").fetchone()["c"]
    pending_tasks = total_tasks - completed_tasks
    completion_pct = round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0
    subject_rows = db.execute(
        """SELECT s.id, s.name, s.color, COUNT(t.id) AS task_count,
                  SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) AS done
           FROM subjects s LEFT JOIN tasks t ON t.subject_id = s.id
           GROUP BY s.id ORDER BY s.name ASC"""
    ).fetchall()
    subjects_progress = []
    for r in subject_rows:
        total = r["task_count"]; done = r["done"] or 0
        subjects_progress.append({
            "id": r["id"], "name": r["name"], "color": r["color"],
            "total": total, "completed": done, "pending": total - done,
            "completion_pct": round((done / total) * 100, 1) if total else 0.0,
        })
    return jsonify({
        "total_subjects": total_subjects, "total_tasks": total_tasks,
        "completed_tasks": completed_tasks, "pending_tasks": pending_tasks,
        "completion_pct": completion_pct, "subjects_progress": subjects_progress,
    })
