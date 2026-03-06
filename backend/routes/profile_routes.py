from flask import Blueprint, jsonify

from backend.models import Pact, Result, User


profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@profile_bp.get("/<string:username>")
def profile(username: str):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user_pacts = Pact.query.filter((Pact.creator_id == user.id) | (Pact.opponent_id == user.id)).all()
    completed = [p for p in user_pacts if p.status == "Completed"]

    wins = Result.query.filter_by(winner_id=user.id).count()
    losses = max(0, len(completed) - wins)

    return jsonify(
        {
            "user": user.to_dict(),
            "stats": {
                "completed_pacts": len(completed),
                "wins": wins,
                "losses": losses,
            },
            "recent_completed_pacts": [p.to_dict() for p in completed[-10:]],
        }
    )
