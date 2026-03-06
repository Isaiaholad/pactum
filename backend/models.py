from datetime import datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash


db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    wallet_balance = db.Column(db.Float, nullable=False, default=0.0)
    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "wallet_balance": self.wallet_balance,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat(),
        }


class Pact(db.Model):
    __tablename__ = "pacts"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    stake_amount = db.Column(db.Float, nullable=False)
    event_duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    creator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    opponent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    deadline = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(40), nullable=False, default="Draft")
    accept_expires_at = db.Column(db.DateTime, nullable=True)
    deposit_expires_at = db.Column(db.DateTime, nullable=True)
    active_started_at = db.Column(db.DateTime, nullable=True)
    dispute_evidence_deadline = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    creator = db.relationship("User", foreign_keys=[creator_id], backref="created_pacts")
    opponent = db.relationship("User", foreign_keys=[opponent_id], backref="opponent_pacts")

    deposits = db.relationship("Deposit", backref="pact", lazy=True, cascade="all, delete-orphan")
    evidence = db.relationship("Evidence", backref="pact", lazy=True, cascade="all, delete-orphan")
    result = db.relationship("Result", backref="pact", uselist=False, lazy=True, cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "stake_amount": self.stake_amount,
            "event_duration_minutes": self.event_duration_minutes,
            "creator_id": self.creator_id,
            "creator_username": self.creator.username if self.creator else None,
            "opponent_id": self.opponent_id,
            "opponent_username": self.opponent.username if self.opponent else None,
            "deadline": self.deadline.isoformat(),
            "status": self.status,
            "accept_expires_at": self.accept_expires_at.isoformat() if self.accept_expires_at else None,
            "deposit_expires_at": self.deposit_expires_at.isoformat() if self.deposit_expires_at else None,
            "active_started_at": self.active_started_at.isoformat() if self.active_started_at else None,
            "dispute_evidence_deadline": self.dispute_evidence_deadline.isoformat() if self.dispute_evidence_deadline else None,
            "created_at": self.created_at.isoformat(),
        }


class Deposit(db.Model):
    __tablename__ = "deposits"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    pact_id = db.Column(db.Integer, db.ForeignKey("pacts.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship("User", backref="deposits")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "pact_id": self.pact_id,
            "amount": self.amount,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class Evidence(db.Model):
    __tablename__ = "evidence"

    id = db.Column(db.Integer, primary_key=True)
    pact_id = db.Column(db.Integer, db.ForeignKey("pacts.id"), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    file_url = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    uploader = db.relationship("User", backref="uploaded_evidence")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "pact_id": self.pact_id,
            "uploaded_by": self.uploaded_by,
            "uploaded_by_username": self.uploader.username if self.uploader else None,
            "file_url": self.file_url,
            "created_at": self.created_at.isoformat(),
        }


class Result(db.Model):
    __tablename__ = "results"

    id = db.Column(db.Integer, primary_key=True)
    pact_id = db.Column(db.Integer, db.ForeignKey("pacts.id"), unique=True, nullable=False)
    winner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    submitted_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="pending_confirmation")
    submitted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    confirm_expires_at = db.Column(db.DateTime, nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    winner = db.relationship("User", foreign_keys=[winner_id], backref="won_results")
    submitter = db.relationship("User", foreign_keys=[submitted_by], backref="submitted_results")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "pact_id": self.pact_id,
            "winner_id": self.winner_id,
            "winner_username": self.winner.username if self.winner else None,
            "submitted_by": self.submitted_by,
            "submitted_by_username": self.submitter.username if self.submitter else None,
            "status": self.status,
            "submitted_at": self.submitted_at.isoformat(),
            "confirm_expires_at": self.confirm_expires_at.isoformat() if self.confirm_expires_at else None,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
        }


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(40), nullable=False)
    reference = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship("User", backref="transactions")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": self.amount,
            "type": self.type,
            "reference": self.reference,
            "created_at": self.created_at.isoformat(),
        }


class NotificationRead(db.Model):
    __tablename__ = "notification_reads"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    notification_id = db.Column(db.String(255), nullable=False)
    read_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship("User", backref="notification_reads")

    __table_args__ = (
        db.UniqueConstraint("user_id", "notification_id", name="uq_notification_user_read"),
    )


class PactComment(db.Model):
    __tablename__ = "pact_comments"

    id = db.Column(db.Integer, primary_key=True)
    pact_id = db.Column(db.Integer, db.ForeignKey("pacts.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship("User", backref="pact_comments")
    pact = db.relationship("Pact", backref="comments")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "pact_id": self.pact_id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else None,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
        }
