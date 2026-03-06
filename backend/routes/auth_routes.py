from flask import Blueprint, jsonify, request
from flask_login import login_user, logout_user
from sqlalchemy import or_
import re

from backend.auth import decode_token, generate_token
from backend.models import User, db


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def _is_valid_email(email: str) -> bool:
    if not email or len(email) > 254:
        return False
    return EMAIL_REGEX.fullmatch(email) is not None


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not email or not username or not password:
        return jsonify({"error": "email, username and password are required"}), 400
    if not _is_valid_email(email):
        return jsonify({"error": "Please provide a valid email address"}), 400

    exists = User.query.filter(or_(User.email == email, User.username == username)).first()
    if exists:
        return jsonify({"error": "User already exists"}), 409

    user = User(email=email, username=username, wallet_balance=100.0)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({"message": "Account created", "token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    identity = (data.get("email") or data.get("username") or "").strip()
    password = data.get("password") or ""

    if not identity or not password:
        return jsonify({"error": "Credentials are required"}), 400

    user = User.query.filter(or_(User.email == identity.lower(), User.username == identity)).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    login_user(user)
    token = generate_token(user.id)
    return jsonify({"message": "Login successful", "token": token, "user": user.to_dict()})


@auth_bp.post("/google")
def google_login_mock():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "email is required for Google mock login"}), 400
    if not _is_valid_email(email):
        return jsonify({"error": "Please provide a valid email address"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        base = email.split("@")[0][:24]
        username = base
        suffix = 1
        while User.query.filter_by(username=username).first():
            suffix += 1
            username = f"{base}{suffix}"
        user = User(email=email, username=username, wallet_balance=100.0)
        user.set_password("google-auth")
        db.session.add(user)
        db.session.commit()

    token = generate_token(user.id)
    return jsonify({"message": "Google login successful", "token": token, "user": user.to_dict()})


@auth_bp.get("/me")
def me():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401

    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    user = User.query.get(payload.get("sub"))
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict()})


@auth_bp.post("/logout")
def logout():
    logout_user()
    return jsonify({"message": "Logged out"})
