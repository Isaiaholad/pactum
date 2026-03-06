from .admin_routes import admin_bp
from .auth_routes import auth_bp
from .notifications_routes import notifications_bp
from .pact_routes import pacts_bp
from .profile_routes import profile_bp
from .wallet_routes import wallet_bp

__all__ = ["auth_bp", "pacts_bp", "wallet_bp", "profile_bp", "notifications_bp", "admin_bp"]
