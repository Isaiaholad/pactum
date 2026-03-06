import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { usePactumStore } from '../store/usePactumStore';

export default function AdminPage() {
  const user = usePactumStore((s) => s.user);
  const [pacts, setPacts] = useState([]);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState(null);

  async function load() {
    if (!user?.is_admin) return;
    const res = await api.adminDisputes(user.id);
    setPacts(res.pacts || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [user?.id]);

  if (!user?.is_admin) {
    return <div className="mvp-card p-4">Admin access required.</div>;
  }

  async function resolve(pact, resolution, winnerId = null) {
    setError('');
    setWorkingId(pact.id);
    try {
      await api.adminResolveDispute(pact.id, {
        admin_user_id: user.id,
        resolution,
        winner_id: winnerId,
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="mvp-title">Admin Dispute Resolution</h2>
        <p className="mvp-subtitle">Resolve disputed pacts by selecting winner or refunding both parties.</p>
      </header>

      {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        {pacts.length === 0 ? <div className="mvp-card p-4 text-sm text-slate-600">No disputed pacts right now.</div> : null}
        {pacts.map((pact) => (
          <div key={pact.id} className="mvp-card p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{pact.title}</p>
                <p className="text-sm text-slate-600">Stake: {Number(pact.stake_amount).toFixed(2)} USDC</p>
                <p className="text-xs text-slate-500">@{pact.creator_username} vs @{pact.opponent_username}</p>
              </div>
              <Link className="mvp-btn-ghost" to={`/pact/${pact.id}`}>Open Pact</Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => resolve(pact, 'winner', pact.creator_id)}
                disabled={workingId === pact.id}
                className="mvp-btn-success disabled:opacity-50"
              >
                Creator Wins
              </button>
              <button
                onClick={() => resolve(pact, 'winner', pact.opponent_id)}
                disabled={workingId === pact.id}
                className="mvp-btn-primary disabled:opacity-50"
              >
                Opponent Wins
              </button>
              <button
                onClick={() => resolve(pact, 'refund')}
                disabled={workingId === pact.id}
                className="mvp-btn-danger disabled:opacity-50"
              >
                Refund Both
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
