from datetime import datetime

from flask import Blueprint, jsonify, request

from backend.models import Deposit, NotificationRead, Pact, Result, db


notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


def _notification_id(kind: str, pact_id: int) -> str:
    return f"{kind}:{pact_id}"


@notifications_bp.get("/")
def get_notifications():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    pacts = Pact.query.filter((Pact.creator_id == user_id) | (Pact.opponent_id == user_id)).all()
    items = []
    read_ids = {r.notification_id for r in NotificationRead.query.filter_by(user_id=user_id).all()}

    for pact in pacts:
        if pact.status == "Pending Acceptance" and pact.opponent_id == user_id:
            nid = _notification_id("invitation", pact.id)
            items.append(
                {
                    "id": nid,
                    "type": "invitation",
                    "message": f"You were invited to '{pact.title}'",
                    "pact_id": pact.id,
                    "is_read": nid in read_ids,
                    "timestamp": pact.created_at.isoformat(),
                }
            )

        if pact.status == "Awaiting Deposit" and user_id in {pact.creator_id, pact.opponent_id}:
            my_deposit = Deposit.query.filter_by(pact_id=pact.id, user_id=user_id, status="locked").first()
            if not my_deposit:
                nid = _notification_id("deposit_required", pact.id)
                items.append(
                    {
                        "id": nid,
                        "type": "deposit_required",
                        "message": f"Deposit required for '{pact.title}' before timer expires",
                        "pact_id": pact.id,
                        "is_read": nid in read_ids,
                        "timestamp": pact.created_at.isoformat(),
                    }
                )

        if pact.status == "Result Submitted" and pact.result:
            result = Result.query.filter_by(pact_id=pact.id).first()
            if result and result.submitted_by != user_id:
                nid = _notification_id("result_confirmation", pact.id)
                items.append({
                    "id": nid,
                    "type": "result_confirmation",
                    "message": f"{result.submitter.username if result.submitter else 'A user'} submitted result for '{pact.title}'",
                    "pact_id": pact.id,
                    "is_read": nid in read_ids,
                    "timestamp": result.submitted_at.isoformat(),
                })

            if result and result.submitted_by != user_id and pact.deadline > datetime.utcnow():
                nid = _notification_id("auto_payout_pending", pact.id)
                items.append(
                    {
                        "id": nid,
                        "type": "auto_payout_pending",
                        "message": f"Auto settlement for '{pact.title}' happens at deadline if no response",
                        "pact_id": pact.id,
                        "is_read": nid in read_ids,
                        "timestamp": result.submitted_at.isoformat(),
                    }
                )

        if pact.status == "Completed":
            nid = _notification_id("payout", pact.id)
            items.append(
                {
                    "id": nid,
                    "type": "payout",
                    "message": f"Payout completed for '{pact.title}'",
                    "pact_id": pact.id,
                    "is_read": nid in read_ids,
                    "timestamp": pact.created_at.isoformat(),
                }
            )

        if pact.status == "Disputed":
            evidence_by_creator = any(e.uploaded_by == pact.creator_id for e in pact.evidence)
            evidence_by_opponent = any(e.uploaded_by == pact.opponent_id for e in pact.evidence)

            if not evidence_by_creator and not evidence_by_opponent:
                nid = _notification_id("dispute_evidence_required", pact.id)
                items.append(
                    {
                        "id": nid,
                        "type": "dispute_evidence_required",
                        "message": f"Dispute started for '{pact.title}'. Both parties should upload evidence.",
                        "pact_id": pact.id,
                        "is_read": nid in read_ids,
                        "timestamp": pact.created_at.isoformat(),
                    }
                )
            else:
                my_uploaded = evidence_by_creator if user_id == pact.creator_id else evidence_by_opponent
                other_uploaded = evidence_by_opponent if user_id == pact.creator_id else evidence_by_creator
                if other_uploaded and not my_uploaded and pact.dispute_evidence_deadline:
                    nid = _notification_id("dispute_evidence_deadline", pact.id)
                    items.append(
                        {
                            "id": nid,
                            "type": "dispute_evidence_deadline",
                            "message": f"Upload your dispute evidence for '{pact.title}' before deadline.",
                            "pact_id": pact.id,
                            "is_read": nid in read_ids,
                            "timestamp": pact.dispute_evidence_deadline.isoformat(),
                        }
                    )

    items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return jsonify({"notifications": items})


@notifications_bp.post("/read")
def mark_read():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    notification_id = (data.get("notification_id") or "").strip()
    if not user_id or not notification_id:
        return jsonify({"error": "user_id and notification_id are required"}), 400

    exists = NotificationRead.query.filter_by(user_id=user_id, notification_id=notification_id).first()
    if not exists:
        db.session.add(NotificationRead(user_id=user_id, notification_id=notification_id))
        db.session.commit()

    return jsonify({"message": "Notification marked as read"})
