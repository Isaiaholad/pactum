import random
from datetime import datetime, timedelta

from backend.models import Deposit, Pact, Result, Transaction, User, db


def seed_data() -> None:
    if User.query.first():
        admin = User.query.filter_by(username="admin").first()
        if not admin:
            admin = User(username="admin", email="admin@pactum.app", wallet_balance=0.0, is_admin=True)
            admin.set_password("admin")
            db.session.add(admin)
            db.session.commit()
        elif not admin.is_admin:
            admin.is_admin = True
            admin.set_password("admin")
            db.session.commit()
        return

    alice = User(username="alice", email="alice@pactum.app", wallet_balance=2400.0)
    alice.set_password("password123")
    bob = User(username="bob", email="bob@pactum.app", wallet_balance=2400.0)
    bob.set_password("password123")
    client = User(username="client_jane", email="jane@pactum.app", wallet_balance=5000.0)
    client.set_password("password123")

    db.session.add_all([alice, bob, client])
    db.session.flush()

    # Additional beta users to create volume in public feeds.
    extra_users = []
    for i in range(1, 18):
        u = User(
            username=f"beta_user_{i}",
            email=f"beta{i}@pactum.app",
            wallet_balance=random.uniform(500, 3000),
        )
        u.set_password("password123")
        extra_users.append(u)
    db.session.add_all(extra_users)
    db.session.flush()

    admin = User(username="admin", email="admin@pactum.app", wallet_balance=0.0, is_admin=True)
    admin.set_password("admin")
    db.session.add(admin)
    db.session.flush()

    pending_acceptance = Pact(
        title="FIFA Match Tonight",
        description="Winner takes the full pool.",
        stake_amount=20.0,
        event_duration_minutes=60,
        creator_id=alice.id,
        opponent_id=bob.id,
        deadline=datetime.utcnow() + timedelta(days=1),
        status="Pending Acceptance",
        accept_expires_at=datetime.utcnow() + timedelta(hours=1),
    )

    active_pact = Pact(
        title="Chess Blitz Wager",
        description="10 games blitz set, highest wins.",
        stake_amount=15.0,
        event_duration_minutes=30,
        creator_id=alice.id,
        opponent_id=bob.id,
        deadline=datetime.utcnow() + timedelta(days=2),
        status="Active",
        active_started_at=datetime.utcnow() - timedelta(minutes=40),
    )

    escrow_pact = Pact(
        title="Fix Login Bug",
        description="Client escrow for auth bug fix.",
        stake_amount=60.0,
        event_duration_minutes=90,
        creator_id=client.id,
        opponent_id=alice.id,
        deadline=datetime.utcnow() + timedelta(days=3),
        status="Result Submitted",
        active_started_at=datetime.utcnow() - timedelta(hours=2),
    )

    db.session.add_all([pending_acceptance, active_pact, escrow_pact])
    db.session.flush()

    db.session.add_all(
        [
            Deposit(user_id=alice.id, pact_id=active_pact.id, amount=15.0, status="locked"),
            Deposit(user_id=bob.id, pact_id=active_pact.id, amount=15.0, status="locked"),
            Deposit(user_id=client.id, pact_id=escrow_pact.id, amount=60.0, status="locked"),
            Deposit(user_id=alice.id, pact_id=escrow_pact.id, amount=60.0, status="locked"),
            # Creator immediate deposits for pending pacts
            Deposit(user_id=alice.id, pact_id=pending_acceptance.id, amount=20.0, status="locked"),
        ]
    )

    result = Result(
        pact_id=escrow_pact.id,
        winner_id=alice.id,
        submitted_by=alice.id,
        status="pending_confirmation",
        submitted_at=datetime.utcnow() - timedelta(minutes=15),
        confirm_expires_at=datetime.utcnow() + timedelta(minutes=45),
    )
    db.session.add(result)

    db.session.add_all(
        [
            Transaction(user_id=alice.id, amount=-15.0, type="pact_deposit", reference=f"pact:{active_pact.id}"),
            Transaction(user_id=bob.id, amount=-15.0, type="pact_deposit", reference=f"pact:{active_pact.id}"),
            Transaction(user_id=client.id, amount=-60.0, type="pact_deposit", reference=f"pact:{escrow_pact.id}"),
            Transaction(user_id=alice.id, amount=-60.0, type="pact_deposit", reference=f"pact:{escrow_pact.id}"),
            Transaction(user_id=alice.id, amount=-20.0, type="pact_deposit", reference=f"pact:{pending_acceptance.id}:creator_initial"),
        ]
    )

    # Flood explore feed with random open pacts.
    open_titles = [
        "Chess Match Bet",
        "Football Match Bet",
        "Call Of Duty Battle Bet",
        "Social Event Challenge",
        "FIFA Match Bet",
        "Coding Accountability Bet",
        "Freelance Micro-Escrow",
    ]
    open_descriptions = [
        "Open challenge. First to join locks equal stake.",
        "Need one opponent. Winner takes pooled funds.",
        "Quick wager for tonight's event.",
        "Join and settle by mutual confirmation.",
        "Proof upload accepted for result submission.",
    ]

    for _ in range(70):
        creator = random.choice(extra_users)
        stake = random.choice([10, 15, 20, 25, 30, 40, 50, 75])
        if creator.wallet_balance < stake:
            continue
        duration = random.choice([10, 20, 30, 45, 60, 90, 120])
        deadline_hours = random.randint(4, 96)
        pact = Pact(
            title=random.choice(open_titles),
            description=random.choice(open_descriptions),
            stake_amount=stake,
            event_duration_minutes=duration,
            creator_id=creator.id,
            opponent_id=None,
            deadline=datetime.utcnow() + timedelta(hours=deadline_hours),
            status="Pending Acceptance",
            accept_expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        db.session.add(pact)
        db.session.flush()

        # Creator immediate lock to mirror runtime behavior.
        creator.wallet_balance -= stake
        db.session.add(Deposit(user_id=creator.id, pact_id=pact.id, amount=stake, status="locked"))
        db.session.add(Transaction(user_id=creator.id, amount=-stake, type="pact_deposit", reference=f"pact:{pact.id}:creator_initial"))

    db.session.commit()
