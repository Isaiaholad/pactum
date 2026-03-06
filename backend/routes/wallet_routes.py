from flask import Blueprint, jsonify, request

from backend.models import Transaction, User, db


wallet_bp = Blueprint("wallet", __name__, url_prefix="/api/wallet")


@wallet_bp.get("/balance")
def balance():
    user_id = request.args.get("user_id", type=int)
    user = User.query.get(user_id) if user_id else None
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"balance": user.wallet_balance})


@wallet_bp.get("/transactions")
def transactions():
    user_id = request.args.get("user_id", type=int)
    user = User.query.get(user_id) if user_id else None
    if not user:
        return jsonify({"error": "User not found"}), 404

    txs = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.created_at.desc()).all()
    return jsonify({"transactions": [tx.to_dict() for tx in txs]})


@wallet_bp.post("/deposit")
def deposit():
    data = request.get_json(silent=True) or {}
    user = User.query.get(data.get("user_id"))
    amount = float(data.get("amount") or 0)

    if not user or amount <= 0:
        return jsonify({"error": "Invalid user or amount"}), 400

    user.wallet_balance += amount
    tx = Transaction(user_id=user.id, amount=amount, type="wallet_deposit", reference="wallet")

    db.session.add(tx)
    db.session.commit()

    return jsonify({"message": "Deposit successful", "balance": user.wallet_balance, "transaction": tx.to_dict()})


@wallet_bp.post("/withdraw")
def withdraw():
    data = request.get_json(silent=True) or {}
    user = User.query.get(data.get("user_id"))
    amount = float(data.get("amount") or 0)

    if not user or amount <= 0:
        return jsonify({"error": "Invalid user or amount"}), 400
    if user.wallet_balance < amount:
        return jsonify({"error": "Insufficient wallet balance"}), 400

    user.wallet_balance -= amount
    tx = Transaction(user_id=user.id, amount=-amount, type="wallet_withdraw", reference="wallet")

    db.session.add(tx)
    db.session.commit()

    return jsonify({"message": "Withdrawal successful", "balance": user.wallet_balance, "transaction": tx.to_dict()})
