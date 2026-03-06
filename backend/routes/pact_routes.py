from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from pathlib import Path
import uuid
from werkzeug.utils import secure_filename
import os

from backend.models import Deposit, Evidence, Pact, PactComment, Result, Transaction, User, db


pacts_bp = Blueprint("pacts", __name__, url_prefix="/api/pacts")


VALID_STATUSES = {
    "Draft",
    "Pending Acceptance",
    "Awaiting Deposit",
    "Active",
    "Result Submitted",
    "Confirmed",
    "Completed",
    "Disputed",
    "Cancelled",
}

MIN_EVENT_DURATION_MINUTES = 5
# Interpreting your request as max 6 months converted to minutes.
MAX_EVENT_DURATION_MINUTES = 6 * 30 * 24 * 60
DEADLINE_BUFFER_MINUTES = 120
DISPUTE_COUNTER_EVIDENCE_HOURS = 24
ALLOWED_EVIDENCE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".mov", ".webm", ".mkv", ".avi"}


def _upload_to_cloudinary(uploaded_file, filename: str) -> str:
    try:
        import cloudinary
        import cloudinary.uploader
    except Exception as exc:
        raise RuntimeError("Cloudinary SDK is not installed. Add 'cloudinary' to requirements.") from exc

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    if not all([cloud_name, api_key, api_secret]):
        raise RuntimeError("Cloudinary env vars are missing (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).")

    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)
    uploaded_file.stream.seek(0)
    result = cloudinary.uploader.upload(
        uploaded_file,
        public_id=f"pactum/disputes/{filename.rsplit('.', 1)[0]}",
        resource_type="auto",
        overwrite=False,
    )
    url = result.get("secure_url") or result.get("url")
    if not url:
        raise RuntimeError("Cloudinary upload did not return a URL.")
    return url


def _upload_to_s3(uploaded_file, filename: str) -> str:
    try:
        import boto3
    except Exception as exc:
        raise RuntimeError("boto3 is not installed. Add 'boto3' to requirements.") from exc

    bucket = os.getenv("AWS_S3_BUCKET")
    region = os.getenv("AWS_REGION")
    if not bucket:
        raise RuntimeError("AWS_S3_BUCKET is required for S3 uploads.")

    key = f"pactum/disputes/{filename}"
    content_type = uploaded_file.mimetype or "application/octet-stream"

    client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )

    uploaded_file.stream.seek(0)
    client.upload_fileobj(
        uploaded_file.stream,
        bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )

    custom_base = os.getenv("AWS_S3_PUBLIC_BASE_URL")
    if custom_base:
        return f"{custom_base.rstrip('/')}/{key}"
    if region:
        return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    return f"https://{bucket}.s3.amazonaws.com/{key}"


def _upload_evidence_file(uploaded_file, original_filename: str) -> str:
    ext = secure_filename(original_filename)
    suffix = ext.rsplit(".", 1)[-1].lower() if "." in ext else ""
    filename = f"{uuid.uuid4().hex}.{suffix}" if suffix else f"{uuid.uuid4().hex}"

    provider = (os.getenv("EVIDENCE_STORAGE_PROVIDER") or "cloudinary").strip().lower()
    if provider == "s3":
        return _upload_to_s3(uploaded_file, filename)
    return _upload_to_cloudinary(uploaded_file, filename)


def _get_user(user_id):
    if not user_id:
        return None
    return User.query.get(user_id)


def _parse_deadline(value: str):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def _finalize_pact(pact: Pact, winner: User, reason: str):
    if pact.status == "Completed":
        return

    pool_amount = pact.stake_amount * 2
    winner.wallet_balance += pool_amount
    pact.status = "Completed"

    db.session.add(
        Transaction(
            user_id=winner.id,
            amount=pool_amount,
            type="payout",
            reference=f"pact:{pact.id}:{reason}",
        )
    )


def _refund_all_locked_deposits(pact: Pact, reason: str):
    locked = Deposit.query.filter_by(pact_id=pact.id, status="locked").all()
    for dep in locked:
        user = User.query.get(dep.user_id)
        if not user:
            continue
        user.wallet_balance += dep.amount
        db.session.add(
            Transaction(
                user_id=user.id,
                amount=dep.amount,
                type="refund",
                reference=f"pact:{pact.id}:{reason}",
            )
        )
        dep.status = "refunded"


def _auto_settle_if_needed(pact: Pact):
    if pact.status in {"Completed", "Cancelled"}:
        return False
    now = datetime.utcnow()

    # Pending Acceptance expires by accept_expires_at (1h private / 24h public)
    if pact.status == "Pending Acceptance" and pact.accept_expires_at and now >= pact.accept_expires_at:
        _refund_all_locked_deposits(pact, "accept_timeout")
        pact.status = "Cancelled"
        db.session.commit()
        return True

    # Awaiting Deposit expires after 10 minutes from acceptance
    if pact.status == "Awaiting Deposit" and pact.deposit_expires_at and now >= pact.deposit_expires_at:
        _refund_all_locked_deposits(pact, "deposit_timeout")
        pact.status = "Cancelled"
        db.session.commit()
        return True

    # Active must have result submitted before pact deadline
    if pact.status == "Active" and now >= pact.deadline:
        _refund_all_locked_deposits(pact, "active_deadline_expired")
        pact.status = "Cancelled"
        db.session.commit()
        return True

    # Result Submitted confirmation window is 1 hour max
    if pact.status == "Result Submitted" and pact.result:
        result = pact.result
        if result.confirm_expires_at and now >= result.confirm_expires_at:
            winner = User.query.get(result.winner_id)
            if winner:
                result.status = "auto_confirmed_1h"
                result.confirmed_at = now
                _finalize_pact(pact, winner, "auto_confirm_1h")
                db.session.commit()
                return True

        # Hard stop at pact deadline: finalize if result exists, otherwise cancel/refund.
        if now >= pact.deadline:
            winner = User.query.get(result.winner_id)
            if winner:
                result.status = "auto_confirmed_deadline"
                result.confirmed_at = now
                _finalize_pact(pact, winner, "auto_deadline")
            else:
                _refund_all_locked_deposits(pact, "deadline_expired")
                pact.status = "Cancelled"
            db.session.commit()
            return True

    # Disputed pact is force-closed by deadline with refunds
    if pact.status == "Disputed" and now >= pact.deadline:
        _refund_all_locked_deposits(pact, "dispute_deadline_expired")
        pact.status = "Cancelled"
        db.session.commit()
        return True

    return False


@pacts_bp.post("/create")
def create_pact():
    data = request.get_json(silent=True) or {}

    creator = _get_user(data.get("creator_id"))
    opponent_username = (data.get("opponent_username") or "").strip()
    opponent = User.query.filter_by(username=opponent_username).first() if opponent_username else None
    deadline = _parse_deadline(data.get("deadline"))

    title = (data.get("title") or "").strip()
    amount = float(data.get("stake_amount") or 0)
    event_duration_minutes = int(data.get("event_duration_minutes") or 60)

    if not creator:
        return jsonify({"error": "Valid creator is required"}), 400
    if opponent and creator.id == opponent.id:
        return jsonify({"error": "Opponent must be a different user"}), 400
    if opponent_username and not opponent:
        return jsonify({"error": "Opponent username was not found"}), 404
    if not title or amount <= 0 or not deadline:
        return jsonify({"error": "title, stake_amount (>0) and valid deadline are required"}), 400
    if event_duration_minutes < MIN_EVENT_DURATION_MINUTES:
        return jsonify({"error": f"event_duration_minutes must be at least {MIN_EVENT_DURATION_MINUTES}"}), 400
    if event_duration_minutes > MAX_EVENT_DURATION_MINUTES:
        return jsonify({"error": f"event_duration_minutes must be at most {MAX_EVENT_DURATION_MINUTES}"}), 400
    minutes_to_deadline = int((deadline - datetime.utcnow()).total_seconds() // 60)
    if minutes_to_deadline < (event_duration_minutes + DEADLINE_BUFFER_MINUTES):
        return jsonify(
            {
                "error": "event_duration_minutes must be at least 2 hours less than deadline",
                "required_min_deadline_minutes_from_now": event_duration_minutes + DEADLINE_BUFFER_MINUTES,
            }
        ), 400
    if creator.wallet_balance < amount:
        return jsonify({"error": "Insufficient wallet balance for immediate creator deposit"}), 400

    now = datetime.utcnow()
    accept_expires_at = now + timedelta(hours=1 if opponent else 24)

    pact = Pact(
        title=title,
        description=(data.get("description") or "").strip(),
        stake_amount=amount,
        event_duration_minutes=event_duration_minutes,
        creator_id=creator.id,
        opponent_id=opponent.id if opponent else None,
        deadline=deadline,
        status="Pending Acceptance",
        accept_expires_at=accept_expires_at,
    )

    db.session.add(pact)
    db.session.flush()

    # Creator stake is locked immediately on pact creation.
    creator.wallet_balance -= amount
    db.session.add(Deposit(user_id=creator.id, pact_id=pact.id, amount=amount, status="locked"))
    db.session.add(Transaction(user_id=creator.id, amount=-amount, type="pact_deposit", reference=f"pact:{pact.id}:creator_initial"))
    db.session.commit()

    return jsonify({"message": "Pact created and creator stake locked", "pact": pact.to_dict(), "creator_balance": creator.wallet_balance}), 201


@pacts_bp.get("/explore")
def explore_pacts():
    user_id = request.args.get("user_id", type=int)
    query = Pact.query.filter(Pact.opponent_id.is_(None), Pact.status == "Pending Acceptance")
    if user_id:
        query = query.filter(Pact.creator_id != user_id)
    pacts = query.order_by(Pact.created_at.desc()).all()
    return jsonify({"pacts": [p.to_dict() for p in pacts]})


@pacts_bp.get("/")
def list_pacts():
    user_id = request.args.get("user_id", type=int)
    status = request.args.get("status")

    query = Pact.query
    if user_id:
        query = query.filter((Pact.creator_id == user_id) | (Pact.opponent_id == user_id))
    if status and status in VALID_STATUSES:
        query = query.filter_by(status=status)

    pacts = query.order_by(Pact.created_at.desc()).all()

    changed = False
    for pact in pacts:
        changed = _auto_settle_if_needed(pact) or changed

    if changed:
        pacts = query.order_by(Pact.created_at.desc()).all()

    return jsonify({"pacts": [p.to_dict() for p in pacts]})


@pacts_bp.get("/<int:pact_id>")
def get_pact(pact_id: int):
    pact = Pact.query.get(pact_id)
    if not pact:
        return jsonify({"error": "Pact not found"}), 404

    _auto_settle_if_needed(pact)

    deposits = Deposit.query.filter_by(pact_id=pact.id).all()
    evidence = Evidence.query.filter_by(pact_id=pact.id).order_by(Evidence.created_at.desc()).all()
    result = Result.query.filter_by(pact_id=pact.id).first()
    comments = PactComment.query.filter_by(pact_id=pact.id).order_by(PactComment.created_at.asc()).all()

    return jsonify(
        {
            "pact": pact.to_dict(),
            "deposits": [d.to_dict() for d in deposits],
            "evidence": [e.to_dict() for e in evidence],
            "result": result.to_dict() if result else None,
            "comments": [c.to_dict() for c in comments],
        }
    )


@pacts_bp.post("/<int:pact_id>/accept")
def accept_pact(pact_id: int):
    data = request.get_json(silent=True) or {}
    pact = Pact.query.get(pact_id)
    user = _get_user(data.get("user_id"))

    if not pact or not user:
        return jsonify({"error": "Invalid pact or user"}), 400
    _auto_settle_if_needed(pact)
    if pact.status in {"Completed", "Cancelled"}:
        return jsonify({"error": f"Pact is closed with status '{pact.status}'"}), 400
    minutes_to_deadline = int((pact.deadline - datetime.utcnow()).total_seconds() // 60)
    if minutes_to_deadline < (pact.event_duration_minutes + DEADLINE_BUFFER_MINUTES):
        return jsonify({"error": "Not enough time left before deadline to accept this pact"}), 400
    if pact.status != "Pending Acceptance":
        return jsonify({"error": f"Pact cannot be accepted from status '{pact.status}'"}), 400
    if user.id == pact.creator_id:
        return jsonify({"error": "Creator cannot accept their own pact"}), 403

    if pact.opponent_id is None:
        pact.opponent_id = user.id
    elif user.id != pact.opponent_id:
        return jsonify({"error": "Only the invited opponent can accept"}), 403

    pact.status = "Awaiting Deposit"
    pact.deposit_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.session.commit()

    return jsonify({"message": "Pact accepted", "pact": pact.to_dict()})


@pacts_bp.post("/<int:pact_id>/reject")
def reject_pact(pact_id: int):
    data = request.get_json(silent=True) or {}
    pact = Pact.query.get(pact_id)
    user = _get_user(data.get("user_id"))

    if not pact or not user:
        return jsonify({"error": "Invalid pact or user"}), 400
    _auto_settle_if_needed(pact)
    if pact.status in {"Completed", "Cancelled"}:
        return jsonify({"error": f"Pact is closed with status '{pact.status}'"}), 400
    if pact.status != "Pending Acceptance":
        return jsonify({"error": f"Pact cannot be rejected from status '{pact.status}'"}), 400
    if pact.opponent_id is None:
        return jsonify({"error": "Open pacts cannot be rejected by non-participants"}), 400
    if user.id != pact.opponent_id:
        return jsonify({"error": "Only the opponent can reject"}), 403

    _refund_all_locked_deposits(pact, "opponent_rejected")
    pact.status = "Cancelled"
    db.session.commit()

    return jsonify({"message": "Pact rejected", "pact": pact.to_dict()})


@pacts_bp.post("/<int:pact_id>/deposit")
def deposit_to_pact(pact_id: int):
    data = request.get_json(silent=True) or {}
    pact = Pact.query.get(pact_id)
    user = _get_user(data.get("user_id"))

    if not pact or not user:
        return jsonify({"error": "Invalid pact or user"}), 400
    _auto_settle_if_needed(pact)
    if pact.status in {"Completed", "Cancelled"}:
        return jsonify({"error": f"Pact is closed with status '{pact.status}'"}), 400
    if pact.opponent_id is None:
        return jsonify({"error": "Pact has no opponent yet"}), 400
    if pact.status not in {"Awaiting Deposit", "Active"}:
        return jsonify({"error": f"Deposits not allowed from status '{pact.status}'"}), 400
    if user.id not in {pact.creator_id, pact.opponent_id}:
        return jsonify({"error": "Only pact participants can deposit"}), 403

    existing = Deposit.query.filter_by(pact_id=pact.id, user_id=user.id, status="locked").first()
    if existing:
        return jsonify({"message": "Deposit already locked", "deposit": existing.to_dict(), "pact": pact.to_dict()})

    amount = float(data.get("amount") or pact.stake_amount)
    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400
    if abs(amount - pact.stake_amount) > 0.00001:
        return jsonify({"error": "Deposit amount must match pact stake"}), 400
    if user.wallet_balance < amount:
        return jsonify({"error": "Insufficient wallet balance"}), 400

    user.wallet_balance -= amount
    deposit = Deposit(user_id=user.id, pact_id=pact.id, amount=amount, status="locked")

    db.session.add(deposit)
    db.session.add(Transaction(user_id=user.id, amount=-amount, type="pact_deposit", reference=f"pact:{pact.id}"))
    db.session.flush()

    creator_deposit = Deposit.query.filter_by(pact_id=pact.id, user_id=pact.creator_id, status="locked").first()
    opponent_deposit = Deposit.query.filter_by(pact_id=pact.id, user_id=pact.opponent_id, status="locked").first()

    pact.status = "Active" if creator_deposit and opponent_deposit else "Awaiting Deposit"
    if pact.status == "Active":
        pact.deposit_expires_at = None
        if not pact.active_started_at:
            pact.active_started_at = datetime.utcnow()

    db.session.commit()

    return jsonify(
        {
            "message": "Deposit locked",
            "balance": user.wallet_balance,
            "deposit": deposit.to_dict(),
            "pact": pact.to_dict(),
        }
    )


@pacts_bp.post("/<int:pact_id>/submit-result")
def submit_result(pact_id: int):
    data = request.get_json(silent=True) or {}
    pact = Pact.query.get(pact_id)
    submitter = _get_user(data.get("user_id"))
    winner = _get_user(data.get("winner_id"))

    if not pact or not submitter or not winner:
        return jsonify({"error": "Invalid pact, submitter, or winner"}), 400
    _auto_settle_if_needed(pact)
    if pact.status in {"Completed", "Cancelled"}:
        return jsonify({"error": f"Pact is closed with status '{pact.status}'"}), 400
    if datetime.utcnow() > pact.deadline:
        return jsonify({"error": "Result must be submitted on or before deadline"}), 400
    if not pact.active_started_at:
        return jsonify({"error": "Pact active start time is missing"}), 400

    result_open_time = pact.active_started_at + timedelta(minutes=pact.event_duration_minutes)
    if datetime.utcnow() < result_open_time:
        return jsonify(
            {
                "error": "Result submission is not open yet. Wait until event duration completes.",
                "result_submission_opens_at": result_open_time.isoformat(),
            }
        ), 400
    if pact.opponent_id is None:
        return jsonify({"error": "Cannot submit result before opponent joins"}), 400
    if pact.status != "Active":
        return jsonify({"error": f"Result cannot be submitted from status '{pact.status}'"}), 400
    if submitter.id not in {pact.creator_id, pact.opponent_id} or winner.id not in {pact.creator_id, pact.opponent_id}:
        return jsonify({"error": "Submitter and winner must be pact participants"}), 403

    existing_result = Result.query.filter_by(pact_id=pact.id).first()
    if existing_result:
        return jsonify({"error": "Result already submitted"}), 409

    result = Result(
        pact_id=pact.id,
        winner_id=winner.id,
        submitted_by=submitter.id,
        status="pending_confirmation",
        submitted_at=datetime.utcnow(),
        confirm_expires_at=datetime.utcnow() + timedelta(hours=1),
    )

    proof_url = (data.get("evidence_url") or "").strip()
    if proof_url:
        db.session.add(Evidence(pact_id=pact.id, uploaded_by=submitter.id, file_url=proof_url))

    pact.status = "Result Submitted"
    db.session.add(result)
    db.session.commit()

    return jsonify({"message": "Result submitted", "pact": pact.to_dict(), "result": result.to_dict()})


@pacts_bp.post("/<int:pact_id>/confirm")
def confirm_result(pact_id: int):
    data = request.get_json(silent=True) or {}
    pact = Pact.query.get(pact_id)
    confirmer = _get_user(data.get("user_id"))

    if not pact or not confirmer:
        return jsonify({"error": "Invalid pact or user"}), 400
    _auto_settle_if_needed(pact)
    if pact.status in {"Completed", "Cancelled"}:
        return jsonify({"error": f"Pact is closed with status '{pact.status}'"}), 400
    if pact.opponent_id is None:
        return jsonify({"error": "Pact has no opponent yet"}), 400

    result = Result.query.filter_by(pact_id=pact.id).first()
    if not result:
        return jsonify({"error": "No submitted result to confirm"}), 400
    if pact.status != "Result Submitted":
        return jsonify({"error": f"Result cannot be confirmed from status '{pact.status}'"}), 400

    other_party = pact.opponent_id if result.submitted_by == pact.creator_id else pact.creator_id
    if confirmer.id != other_party:
        return jsonify({"error": "Only the other participant can confirm"}), 403

    winner = User.query.get(result.winner_id)
    if not winner:
        return jsonify({"error": "Winner not found"}), 404

    result.status = "confirmed"
    result.confirmed_at = datetime.utcnow()
    pact.status = "Confirmed"
    _finalize_pact(pact, winner, "confirmed")

    db.session.commit()

    return jsonify({"message": "Result confirmed and payout released", "pact": pact.to_dict(), "result": result.to_dict()})


@pacts_bp.post("/<int:pact_id>/dispute")
def dispute_result(pact_id: int):
    data = request.get_json(silent=True) or {}
    pact = Pact.query.get(pact_id)
    disputer = _get_user(data.get("user_id"))

    if not pact or not disputer:
        return jsonify({"error": "Invalid pact or user"}), 400
    _auto_settle_if_needed(pact)
    if pact.status in {"Completed", "Cancelled"}:
        return jsonify({"error": f"Pact is closed with status '{pact.status}'"}), 400
    if pact.opponent_id is None:
        return jsonify({"error": "Pact has no opponent yet"}), 400
    if pact.status != "Result Submitted":
        return jsonify({"error": f"Pact cannot be disputed from status '{pact.status}'"}), 400
    if disputer.id not in {pact.creator_id, pact.opponent_id}:
        return jsonify({"error": "Only participants can dispute"}), 403

    result = Result.query.filter_by(pact_id=pact.id).first()
    if not result:
        return jsonify({"error": "No submitted result to dispute"}), 400

    result.status = "disputed"
    pact.status = "Disputed"
    db.session.commit()

    return jsonify({"message": "Result disputed", "pact": pact.to_dict(), "result": result.to_dict()})


@pacts_bp.post("/<int:pact_id>/evidence")
def upload_evidence(pact_id: int):
    is_multipart = request.content_type and "multipart/form-data" in request.content_type
    data = request.form.to_dict() if is_multipart else (request.get_json(silent=True) or {})
    pact = Pact.query.get(pact_id)
    user = _get_user(int(data.get("user_id")) if data.get("user_id") else None)
    file_url = (data.get("file_url") or "").strip()

    if not pact or not user:
        return jsonify({"error": "Invalid pact or user"}), 400
    _auto_settle_if_needed(pact)
    if pact.status in {"Completed", "Cancelled"}:
        return jsonify({"error": f"Pact is closed with status '{pact.status}'"}), 400
    if user.id not in {pact.creator_id, pact.opponent_id}:
        return jsonify({"error": "Only pact participants can upload evidence"}), 403

    uploaded_file = request.files.get("file") if is_multipart else None
    if uploaded_file and uploaded_file.filename:
        original = secure_filename(uploaded_file.filename)
        ext = Path(original).suffix.lower()
        if ext not in ALLOWED_EVIDENCE_EXTENSIONS:
            return jsonify({"error": "Unsupported file type for evidence"}), 400

        try:
            file_url = _upload_evidence_file(uploaded_file, original)
        except Exception as exc:
            return jsonify({"error": f"Evidence upload failed: {str(exc)}"}), 500
    else:
        if not file_url:
            return jsonify({"error": "file or file_url is required"}), 400
        lower = file_url.lower()
        if not (lower.startswith("http://") or lower.startswith("https://")):
            return jsonify({"error": "file_url must be an http(s) URL"}), 400

    # Dispute evidence workflow:
    # - no deadline initially (both should upload)
    # - first evidence upload sets deadline for the other participant
    if pact.status == "Disputed":
        now = datetime.utcnow()
        all_evidence = Evidence.query.filter_by(pact_id=pact.id).all()
        creator_has = any(e.uploaded_by == pact.creator_id for e in all_evidence)
        opponent_has = any(e.uploaded_by == pact.opponent_id for e in all_evidence)

        uploader_has = creator_has if user.id == pact.creator_id else opponent_has
        other_has = opponent_has if user.id == pact.creator_id else creator_has

        if pact.dispute_evidence_deadline and now > pact.dispute_evidence_deadline and not uploader_has and other_has:
            return jsonify({"error": "Dispute evidence deadline has passed for your side"}), 400

    evidence = Evidence(pact_id=pact.id, uploaded_by=user.id, file_url=file_url)
    db.session.add(evidence)
    db.session.flush()

    if pact.status == "Disputed":
        all_evidence = Evidence.query.filter_by(pact_id=pact.id).all()
        creator_has = any(e.uploaded_by == pact.creator_id for e in all_evidence)
        opponent_has = any(e.uploaded_by == pact.opponent_id for e in all_evidence)
        if creator_has != opponent_has and not pact.dispute_evidence_deadline:
            pact.dispute_evidence_deadline = datetime.utcnow() + timedelta(hours=DISPUTE_COUNTER_EVIDENCE_HOURS)
        if creator_has and opponent_has:
            pact.dispute_evidence_deadline = None
    db.session.commit()

    evidence_items = Evidence.query.filter_by(pact_id=pact.id).order_by(Evidence.created_at.desc()).all()
    return jsonify(
        {
            "message": "Evidence uploaded",
            "evidence": evidence.to_dict(),
            "all_evidence": [e.to_dict() for e in evidence_items],
            "dispute_evidence_deadline": pact.dispute_evidence_deadline.isoformat() if pact.dispute_evidence_deadline else None,
        }
    )


@pacts_bp.post("/<int:pact_id>/comments")
def add_comment(pact_id: int):
    data = request.get_json(silent=True) or {}
    pact = Pact.query.get(pact_id)
    user = _get_user(data.get("user_id"))
    message = (data.get("message") or "").strip()

    if not pact or not user:
        return jsonify({"error": "Invalid pact or user"}), 400
    _auto_settle_if_needed(pact)
    if pact.status != "Active":
        return jsonify({"error": "Comments are only enabled while pact is Active"}), 400
    if user.id not in {pact.creator_id, pact.opponent_id}:
        return jsonify({"error": "Only pact participants can comment"}), 403
    if not message:
        return jsonify({"error": "message is required"}), 400
    if len(message) > 1000:
        return jsonify({"error": "message is too long"}), 400

    comment = PactComment(pact_id=pact.id, user_id=user.id, message=message)
    db.session.add(comment)
    db.session.commit()

    comments = PactComment.query.filter_by(pact_id=pact.id).order_by(PactComment.created_at.asc()).all()
    return jsonify({"message": "Comment posted", "comment": comment.to_dict(), "comments": [c.to_dict() for c in comments]})
