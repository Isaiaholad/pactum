import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, CircleDollarSign, Clock3 } from 'lucide-react';
import { api } from '../utils/api';
import { usePactumStore } from '../store/usePactumStore';

function countdownLabel(targetIso) {
  if (!targetIso) return 'No timer';
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(targetIso) ? targetIso : `${targetIso}Z`;
  const target = new Date(normalized).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return 'Expired';

  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

function asDate(targetIso) {
  if (!targetIso) return null;
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(targetIso) ? targetIso : `${targetIso}Z`;
  return new Date(normalized);
}

function statusTone(status) {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'Disputed') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (status === 'Result Submitted') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'Active') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function PactDetailPage() {
  const { id } = useParams();
  const user = usePactumStore((s) => s.user);
  const refreshAll = usePactumStore((s) => s.refreshAll);

  const acceptInvite = usePactumStore((s) => s.acceptInvite);
  const rejectInvite = usePactumStore((s) => s.rejectInvite);
  const depositStake = usePactumStore((s) => s.depositStake);
  const submitResult = usePactumStore((s) => s.submitResult);
  const resolvePact = usePactumStore((s) => s.resolvePact);
  const disputePact = usePactumStore((s) => s.disputePact);

  const [data, setData] = useState(null);
  const [winnerId, setWinnerId] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [disputeEvidenceFile, setDisputeEvidenceFile] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');
  const [, setTick] = useState(0);

  async function load() {
    const detail = await api.getPact(id);
    setData(detail);
    setWinnerId(String(detail.pact.creator_id));
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const pact = data?.pact;
  const myDepositLocked = useMemo(
    () => (data?.deposits || []).some((d) => d.user_id === user.id && d.status === 'locked'),
    [data, user.id]
  );

  if (!pact) return <div className="mvp-card p-4">Loading pact...</div>;

  async function run(action) {
    setError('');
    try {
      await action();
      await Promise.all([load(), refreshAll()]);
    } catch (err) {
      setError(err.message);
    }
  }

  const creatorEvidence = (data?.evidence || []).filter((e) => e.uploaded_by === pact.creator_id);
  const opponentEvidence = (data?.evidence || []).filter((e) => e.uploaded_by === pact.opponent_id);

  const isCreator = user.id === pact.creator_id;
  const isOpponent = user.id === pact.opponent_id;
  const isParticipant = isCreator || isOpponent;
  const canReviewSubmittedResult =
    pact.status === 'Result Submitted' &&
    isParticipant &&
    data.result &&
    user.id !== data.result.submitted_by;
  const resultSubmissionOpensAt =
    pact.active_started_at && pact.event_duration_minutes
      ? new Date(
          new Date(
            /Z|[+-]\d{2}:\d{2}$/.test(pact.active_started_at) ? pact.active_started_at : `${pact.active_started_at}Z`
          ).getTime() +
            Number(pact.event_duration_minutes) * 60 * 1000
        ).toISOString()
      : null;
  const activeTimer = pact.status === 'Active' ? countdownLabel(pact.deadline) : null;
  const acceptTimer = pact.status === 'Pending Acceptance' ? countdownLabel(pact.accept_expires_at) : null;
  const depositTimer = pact.status === 'Awaiting Deposit' ? countdownLabel(pact.deposit_expires_at) : null;
  const confirmTimer = pact.status === 'Result Submitted' && data.result?.confirm_expires_at ? countdownLabel(data.result.confirm_expires_at) : null;
  const disputeEvidenceTimer = pact.status === 'Disputed' && pact.dispute_evidence_deadline ? countdownLabel(pact.dispute_evidence_deadline) : null;
  const submitUnlockTimer = pact.status === 'Active' && resultSubmissionOpensAt ? countdownLabel(resultSubmissionOpensAt) : null;
  const canSubmitResultNow = pact.status === 'Active' && (!submitUnlockTimer || submitUnlockTimer === 'Expired');

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <section className="space-y-4">
        <div className="mvp-card p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">{pact.title}</h2>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(pact.status)}`}>{pact.status}</span>
          </div>
          <p className="text-sm text-slate-600">{pact.description || 'No description'}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Stake</p>
              <p className="inline-flex items-center gap-1 font-semibold"><CircleDollarSign className="h-4 w-4" />{Number(pact.stake_amount).toFixed(2)} USDC each</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Creator</p>
              <p className="font-semibold">@{pact.creator_username}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Opponent</p>
              <p className="font-semibold">{pact.opponent_username ? `@${pact.opponent_username}` : 'Open (not joined yet)'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Event Duration</p>
              <p className="font-semibold">{pact.event_duration_minutes} minutes</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Deadline</p>
              <p className="font-semibold">{asDate(pact.deadline)?.toLocaleString() || '-'}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
            {acceptTimer ? <p><strong>Acceptance window:</strong> {acceptTimer}</p> : null}
            {depositTimer ? <p><strong>Deposit window:</strong> {depositTimer}</p> : null}
            {activeTimer ? <p><strong>Resolution deadline countdown:</strong> {activeTimer}</p> : null}
            {submitUnlockTimer && submitUnlockTimer !== 'Expired' ? <p><strong>Result submission opens in:</strong> {submitUnlockTimer}</p> : null}
            {confirmTimer ? <p><strong>Confirmation window:</strong> {confirmTimer}</p> : null}
            {disputeEvidenceTimer ? <p><strong>Dispute evidence deadline:</strong> {disputeEvidenceTimer}</p> : null}
          </div>
        </div>

        <div className="mvp-card p-5">
          <h3 className="mb-3 text-lg font-bold">Evidence</h3>
          {(data.evidence || []).length === 0 ? <p className="text-sm text-slate-500">No evidence uploaded yet.</p> : null}
          <div className="space-y-2">
            {(data.evidence || []).map((ev) => (
              <a key={ev.id} className="block rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-indigo-700 hover:underline" href={ev.file_url} target="_blank" rel="noreferrer">
                {ev.file_url}
              </a>
            ))}
          </div>
        </div>

        {pact.status === 'Disputed' ? (
          <div className="mvp-card p-5">
            <h3 className="mb-3 text-lg font-bold">Dispute Evidence Room</h3>
            <p className="mb-3 text-sm text-slate-600">Both participants should upload image/video evidence for review.</p>
            {pact.dispute_evidence_deadline ? (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                Counter evidence deadline: {asDate(pact.dispute_evidence_deadline)?.toLocaleString() || '-'}
              </p>
            ) : (
              <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                No deadline yet. Once one side uploads first evidence, the other side gets a deadline to respond.
              </p>
            )}

            {(isCreator || isOpponent) ? (
              <div className="mb-4 flex flex-wrap gap-2">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="mvp-input min-w-[260px] flex-1"
                  onChange={(e) => setDisputeEvidenceFile(e.target.files?.[0] || null)}
                />
                <button
                  className="mvp-btn-primary"
                  onClick={() =>
                    run(async () => {
                      if (!disputeEvidenceFile) {
                        throw new Error('Please select an image or video file');
                      }
                      await api.uploadEvidenceFile(pact.id, { user_id: user.id, file: disputeEvidenceFile });
                      setDisputeEvidenceFile(null);
                    })
                  }
                >
                  Upload Image/Video Evidence
                </button>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold">Creator (@{pact.creator_username})</p>
                <div className="space-y-2">
                  {creatorEvidence.length === 0 ? <p className="text-xs text-slate-500">No image evidence yet.</p> : null}
                  {creatorEvidence.map((ev) => (
                    <a key={ev.id} href={ev.file_url} target="_blank" rel="noreferrer" className="block rounded border border-slate-200 p-2 text-xs text-indigo-700 hover:underline">
                      {ev.file_url}
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold">Opponent ({pact.opponent_username ? `@${pact.opponent_username}` : 'Open'})</p>
                <div className="space-y-2">
                  {opponentEvidence.length === 0 ? <p className="text-xs text-slate-500">No image evidence yet.</p> : null}
                  {opponentEvidence.map((ev) => (
                    <a key={ev.id} href={ev.file_url} target="_blank" rel="noreferrer" className="block rounded border border-slate-200 p-2 text-xs text-indigo-700 hover:underline">
                      {ev.file_url}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {pact.status === 'Active' ? (
          <div className="mvp-card p-5">
            <h3 className="mb-3 text-lg font-bold">Pact Comments</h3>
            <p className="mb-3 text-sm text-slate-600">Both parties can communicate here while pact is active.</p>

            <div className="mb-3 max-h-64 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {(data.comments || []).length === 0 ? <p className="text-xs text-slate-500">No comments yet.</p> : null}
              {(data.comments || []).map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-2 text-sm">
                  <p className="text-xs font-semibold text-slate-600">@{c.username} • {new Date(`${c.created_at}Z`).toLocaleString()}</p>
                  <p className="mt-1 text-slate-900">{c.message}</p>
                </div>
              ))}
            </div>

            {(isCreator || isOpponent) ? (
              <div className="flex flex-wrap gap-2">
                <input
                  className="mvp-input min-w-[260px] flex-1"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button
                  className="mvp-btn-primary"
                  onClick={() =>
                    run(async () => {
                      await api.addPactComment(pact.id, { user_id: user.id, message: commentText });
                      setCommentText('');
                    })
                  }
                >
                  Send
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="mvp-card p-5">
          <h3 className="mb-3 text-lg font-bold">Actions</h3>
          <div className="space-y-3">
            {pact.status === 'Pending Acceptance' && isOpponent ? (
              <>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
                  Accept before deadline: <strong>{asDate(pact.deadline)?.toLocaleString() || '-'}</strong>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => run(() => acceptInvite(pact.id))} className="mvp-btn-success flex-1">Accept</button>
                  <button onClick={() => run(() => rejectInvite(pact.id))} className="mvp-btn-danger flex-1">Reject</button>
                </div>
              </>
            ) : null}

            {(pact.status === 'Awaiting Deposit' || pact.status === 'Active') && (isCreator || isOpponent) && !myDepositLocked ? (
              <button onClick={() => run(() => depositStake(pact.id))} className="mvp-btn-primary w-full">Deposit Stake</button>
            ) : null}

            {pact.status === 'Active' && (isCreator || isOpponent) ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold">Submit Result</p>
                <select className="mvp-input" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                  <option value={pact.creator_id}>{pact.creator_username} wins</option>
                  <option value={pact.opponent_id}>{pact.opponent_username} wins</option>
                </select>
                <input className="mvp-input" placeholder="Evidence URL (optional)" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} />
                <button
                  onClick={() => run(() => submitResult(pact.id, Number(winnerId), evidenceUrl))}
                  disabled={!canSubmitResultNow}
                  className="mvp-btn-dark w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {canSubmitResultNow ? 'Submit Result' : 'Wait for Event Duration'}
                </button>
              </div>
            ) : null}

            {canReviewSubmittedResult ? (
              <div className="flex gap-2">
                <button onClick={() => run(() => resolvePact(pact.id))} className="mvp-btn-success flex-1">Confirm</button>
                <button onClick={() => run(() => disputePact(pact.id))} className="mvp-btn-danger flex-1">Dispute</button>
              </div>
            ) : null}

            {data.result ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="inline-flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Winner Claimed: {data.result.winner_username}</p>
                <p className="mt-1 text-slate-600">Result status: {data.result.status}</p>
              </div>
            ) : null}

            {error ? <p className="rounded-lg bg-rose-50 p-2 text-sm font-medium text-rose-700">{error}</p> : null}
          </div>
        </div>

        <div className="mvp-card p-4 text-sm text-slate-600">
          <p className="mb-1 inline-flex items-center gap-1 font-semibold"><Clock3 className="h-4 w-4" />Auto Resolution Rule</p>
          <p>Submitted result auto-confirms in 1 hour. Entire pact must close by deadline.</p>
        </div>

      </section>
    </div>
  );
}
