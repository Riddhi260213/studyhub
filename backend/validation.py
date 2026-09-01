"""Shared input-validation helpers.

Both the subject and task endpoints rely on these so validation logic is
defined once and applied consistently. Every validator either returns a
clean, typed value or raises ApiError with a 400 status.
"""

from datetime import date
from typing import Any

from backend.errors import ApiError

VALID_PRIORITIES = ("Low", "Medium", "High")
VALID_COLORS = {
    "#6366f1", "#ef4444", "#f59e0b", "#10b981",
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
    "#f97316", "#84cc16",
}
MAX_NAME_LEN = 120
MAX_DESC_LEN = 1000
MAX_TITLE_LEN = 200


def require_str(value: Any, field: str, max_len: int) -> str:
    if not isinstance(value, str):
        raise ApiError(f"'{field}' must be a string.", 400)
    cleaned = value.strip()
    if not cleaned:
        raise ApiError(f"'{field}' cannot be empty.", 400)
    if len(cleaned) > max_len:
        raise ApiError(f"'{field}' is too long (max {max_len} characters).", 400)
    return cleaned


def optional_str(value: Any, field: str, max_len: int, default: str = "") -> str:
    if value is None:
        return default
    if not isinstance(value, str):
        raise ApiError(f"'{field}' must be a string.", 400)
    cleaned = value.strip()
    if len(cleaned) > max_len:
        raise ApiError(f"'{field}' is too long (max {max_len} characters).", 400)
    return cleaned


def validate_color(value: Any) -> str:
    if value is None or value == "":
        return "#6366f1"
    if not isinstance(value, str) or value.lower() not in VALID_COLORS:
        raise ApiError("Invalid color value.", 400)
    return value.lower()


def validate_priority(value: Any) -> str:
    if value is None or value == "":
        return "Medium"
    if not isinstance(value, str) or value not in VALID_PRIORITIES:
        raise ApiError(f"Invalid priority. Must be one of: {', '.join(VALID_PRIORITIES)}.", 400)
    return value


def validate_due_date(value: Any) -> str | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ApiError("'due_date' must be a string in YYYY-MM-DD format.", 400)
    try:
        parsed = date.fromisoformat(value.strip())
    except ValueError:
        raise ApiError("'due_date' must be a valid date in YYYY-MM-DD format.", 400)
    return parsed.isoformat()


def validate_int_id(value: Any, field: str) -> int:
    if value is None or value == "":
        return 0
    try:
        as_int = int(value)
    except (TypeError, ValueError):
        raise ApiError(f"'{field}' must be an integer.", 400)
    if as_int < 0:
        raise ApiError(f"'{field}' must be a positive integer.", 400)
    return as_int


def validate_bool(value: Any, field: str) -> int:
    if value is None:
        return 0
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        if value in (0, 1):
            return int(value)
        raise ApiError(f"'{field}' must be true or false.", 400)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in ("true", "1", "yes"):
            return 1
        if lowered in ("false", "0", "no", ""):
            return 0
    raise ApiError(f"'{field}' must be true or false.", 400)
