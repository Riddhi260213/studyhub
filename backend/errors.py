"""Custom exception + shared JSON helpers for the StudyHub API."""


class ApiError(Exception):
    """An expected, user-facing error carrying an HTTP status code."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status
