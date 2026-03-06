# Pactum MVP (Phase 1)

This repository is reduced to the most basic Pactum flow:

`Lock funds -> Define condition -> Submit result -> Release funds`

## MVP Scope

Supported use cases:
- Friendly bets
- Gaming wagers
- Freelance micro-escrow

Removed for now:
- referee marketplace
- prediction markets
- multi-party bets
- oracles
- DAO arbitration
- advanced reputation/tokenomics

## Core Lifecycle

Pact statuses:
- `Draft`
- `Pending Acceptance`
- `Awaiting Deposit`
- `Active`
- `Result Submitted`
- `Confirmed`
- `Completed`
- `Disputed`
- `Cancelled`

Auto payout:
- Private pact acceptance window: 1 hour.
- Public/open pact acceptance window: 24 hours.
- Deposit window after acceptance: 10 minutes.
- Event duration is specified per pact; result submission opens only after event duration completes.
- Event duration constraints:
  - minimum: 5 minutes
  - maximum: 259200 minutes (6 months)
  - must be at least 120 minutes less than deadline
- Result confirmation window after submission: 1 hour.
- Entire pact must close by deadline; if unresolved by then, automatic closure applies.
- Creator deposit is locked immediately at pact creation.
- When opponent accepts, they receive a deposit-required notification until they lock stake.

## Backend

- Flask + SQLAlchemy + JWT
- Default DB: SQLite (`pactum_mvp.db`)

Evidence storage (for dispute uploads):
- Set `EVIDENCE_STORAGE_PROVIDER=cloudinary` (default) or `s3`
- Cloudinary env vars:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- S3 env vars:
  - `AWS_S3_BUCKET`
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - optional `AWS_S3_PUBLIC_BASE_URL`

Core tables:
- `users`
- `pacts`
- `deposits`
- `evidence`
- `results`
- `transactions`

Key API routes:
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/google`, `/api/auth/me`
- Pacts:
  - `/api/pacts/create`
  - `/api/pacts/`
  - `/api/pacts/<id>`
  - `/api/pacts/<id>/accept`
  - `/api/pacts/<id>/reject`
  - `/api/pacts/<id>/deposit`
  - `/api/pacts/<id>/submit-result`
  - `/api/pacts/<id>/confirm`
  - `/api/pacts/<id>/dispute`
- Wallet: `/api/wallet/balance`, `/api/wallet/deposit`, `/api/wallet/withdraw`, `/api/wallet/transactions`
- Profile: `/api/profile/<username>`
- Notifications: `/api/notifications/`

## Frontend (React + Tailwind)

MVP pages:
- Dashboard
- Create Pact
- Explore (open pacts feed)
- Pact Detail
- Wallet
- Profile
- Notifications
- Login/Signup (plus Google mock login)

## Run

Backend:

```bash
pip install -r requirements.txt
python app.py
```

Frontend (dev):

```bash
cd frontend
npm install
npm run dev
```

## Seed Users

- `alice@pactum.app` / `password123`
- `bob@pactum.app` / `password123`
- `jane@pactum.app` / `password123`

Open pact support:
- Create a pact with `open_to_public` (leave opponent empty in UI).
- Other users can discover and join from the Explore tab.
