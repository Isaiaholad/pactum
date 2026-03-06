from pathlib import Path
import os

from flask import Flask, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager
from sqlalchemy import inspect, text

from backend.config import Config
from backend.models import User, db
from backend.routes import admin_bp, auth_bp, notifications_bp, pacts_bp, profile_bp, wallet_bp
from backend.seed import seed_data


BASE_DIR = Path(__file__).resolve().parents[1]
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"


def patch_legacy_schema() -> None:
    """
    Lightweight migration for local MVP iteration.
    Adds newly introduced columns to existing SQLite tables when missing.
    """
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())

    if "pacts" in table_names:
        pact_cols = {c["name"] for c in inspector.get_columns("pacts")}
        with db.engine.begin() as conn:
            if "accept_expires_at" not in pact_cols:
                conn.execute(text("ALTER TABLE pacts ADD COLUMN accept_expires_at DATETIME"))
            if "deposit_expires_at" not in pact_cols:
                conn.execute(text("ALTER TABLE pacts ADD COLUMN deposit_expires_at DATETIME"))
            if "event_duration_minutes" not in pact_cols:
                conn.execute(text("ALTER TABLE pacts ADD COLUMN event_duration_minutes INTEGER DEFAULT 60"))
            if "active_started_at" not in pact_cols:
                conn.execute(text("ALTER TABLE pacts ADD COLUMN active_started_at DATETIME"))
            if "dispute_evidence_deadline" not in pact_cols:
                conn.execute(text("ALTER TABLE pacts ADD COLUMN dispute_evidence_deadline DATETIME"))

    if "users" in table_names:
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        with db.engine.begin() as conn:
            if "is_admin" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))

    if "results" in table_names:
        result_cols = {c["name"] for c in inspector.get_columns("results")}
        with db.engine.begin() as conn:
            if "confirm_expires_at" not in result_cols:
                conn.execute(text("ALTER TABLE results ADD COLUMN confirm_expires_at DATETIME"))


def create_app() -> Flask:
    app = Flask(__name__, template_folder=str(TEMPLATES_DIR), static_folder=str(STATIC_DIR))
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id: str):
        return User.query.get(int(user_id))

    app.register_blueprint(auth_bp)
    app.register_blueprint(pacts_bp)
    app.register_blueprint(wallet_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(admin_bp)

    with app.app_context():
        db.create_all()
        patch_legacy_schema()
        seed_data()

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path: str):
        if path.startswith("api/"):
            return jsonify({"error": "Endpoint not found"}), 404

        static_file = STATIC_DIR / path
        if path and static_file.exists() and static_file.is_file():
            return send_from_directory(app.static_folder, path)
        return render_template("index.html")

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
