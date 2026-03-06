import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///pactum_mvp_phase1.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_EXPIRES_IN = timedelta(days=7)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
