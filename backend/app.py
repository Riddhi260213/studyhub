"""StudyHub — Flask application factory."""

import os
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

from backend.db import close_db, init_db, DEFAULT_DB_PATH
from backend.errors import ApiError
from backend.routes import api

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")


def create_app(test_config=None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config["DATABASE"] = DEFAULT_DB_PATH
    if test_config:
        app.config.update(test_config)

    init_db(app.config["DATABASE"])
    app.register_blueprint(api)
    app.teardown_appcontext(close_db)

    @app.errorhandler(ApiError)
    def handle_api_error(e: ApiError):
        return jsonify({"error": e.message}), e.status

    @app.errorhandler(404)
    def handle_404(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Resource not found."}), 404
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.errorhandler(405)
    def handle_405(e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        if isinstance(e, HTTPException):
            if request.path.startswith("/api/"):
                return jsonify({"error": e.description}), e.code
            return e
        app.logger.exception("Unhandled error: %s", e)
        return jsonify({"error": "An internal server error occurred."}), 500

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path: str):
        if path.startswith("api/"):
            return jsonify({"error": "Resource not found."}), 404
        full = os.path.join(FRONTEND_DIR, path)
        if path and os.path.isfile(full):
            return send_from_directory(FRONTEND_DIR, path)
        return send_from_directory(FRONTEND_DIR, "index.html")

    return app
