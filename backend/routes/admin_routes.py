from flask import Blueprint, jsonify, request

from backend.models import Deposit, Pact, Result, Transaction, User, db


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _get_admin(user_id):
    admin = User.query.get(user_id) if user_id else None
    if not admin or not admin.is_admin:
        return None
    return admin


def _refund_locked(pact: Pact, reason: str):
    locked = Deposit.query.filter_by(pact_id=pact.id, status="locked").all()
    for dep in locked:
        user = User.query.get(dep.user_id)
        if not user:
            continue
        user.wallet_balance += dep.amount
        dep.status = "refunded"
        db.session.add(
            Transaction(
                user_id=user.id,
                amount=dep.amount,
                type="refund",
                reference=f"pact:{pact.id}:{reason}",
            )
        )


@admin_bp.get("/disputes")
def list_disputes():
    admin_id = request.args.get("admin_user_id", type=int)
    if not _get_admin(admin_id):
        return jsonify({"error": "Admin access required"}), 403

    disputes = Pact.query.filter_by(status="Disputed").order_by(Pact.created_at.desc()).all()
    return jsonify({"pacts": [p.to_dict() for p in disputes]})


@admin_bp.post("/disputes/<int:pact_id>/resolve")
def resolve_dispute(pact_id: int):
    data = request.get_json(silent=True) or {}
    admin_id = data.get("admin_user_id")
    admin = _get_admin(admin_id)
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    pact = Pact.query.get(pact_id)
    if not pact:
        return jsonify({"error": "Pact not found"}), 404
    if pact.status != "Disputed":
        return jsonify({"error": "Only disputed pacts can be resolved here"}), 400

    resolution = (data.get("resolution") or "winner").strip()

    if resolution == "refund":
        _refund_locked(pact, "admin_refund")
        if pact.result:
            pact.result.status = "admin_refund"
        pact.status = "Cancelled"
        db.session.commit()
        return jsonify({"message": "Dispute resolved: refunded both parties", "pact": pact.to_dict()})

    winner_id = data.get("winner_id")
    winner = User.query.get(winner_id) if winner_id else None
    if not winner or winner.id not in {pact.creator_id, pact.opponent_id}:
        return jsonify({"error": "winner_id must be one of the pact participants"}), 400

    pool = sum(d.amount for d in Deposit.query.filter_by(pact_id=pact.id, status="locked").all())
    winner.wallet_balance += pool

    locked = Deposit.query.filter_by(pact_id=pact.id, status="locked").all()
    for dep in locked:
        dep.status = "released"

    result = Result.query.filter_by(pact_id=pact.id).first()
    if not result:
        result = Result(
            pact_id=pact.id,
            winner_id=winner.id,
            submitted_by=winner.id,
            status="admin_confirmed",
        )
        db.session.add(result)
    else:
        result.winner_id = winner.id
        result.status = "admin_confirmed"

    db.session.add(
        Transaction(
            user_id=winner.id,
            amount=pool,
            type="payout",
            reference=f"pact:{pact.id}:admin_resolve",
        )
    )

    pact.status = "Completed"
    db.session.commit()

    return jsonify({"message": "Dispute resolved by admin", "pact": pact.to_dict(), "winner": winner.to_dict()})
