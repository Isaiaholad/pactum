import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shuffle } from 'lucide-react';
import { usePactumStore } from '../store/usePactumStore';

export default function ExplorePage() {
  const explorePacts = usePactumStore((s) => s.explorePacts);
  const refreshAll = usePactumStore((s) => s.refreshAll);
  const acceptInvite = usePactumStore((s) => s.acceptInvite);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  async function joinPact(pactId) {
    setError('');
    setJoiningId(pactId);
    try {
      await acceptInvite(pactId);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="mvp-title">Explore Open Pacts</h2>
        <p className="mvp-subtitle">Join random pacts created without an opponent.</p>
      </header>

      {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {explorePacts.length === 0 ? (
          <div className="mvp-card col-span-full p-8 text-center">
            <p className="text-sm text-slate-500">No open pacts right now. Check back soon.</p>
          </div>
        ) : null}

        {explorePacts.map((pact) => (
          <div key={pact.id} className="mvp-card flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{pact.title}</h3>
              <span className="mvp-badge">Open</span>
            </div>

            <p className="text-sm text-slate-600">{pact.description || 'No description provided.'}</p>

            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p><strong>Stake:</strong> {Number(pact.stake_amount).toFixed(2)} USDC each</p>
              <p><strong>Creator:</strong> @{pact.creator_username}</p>
            </div>

            <div className="mt-auto flex items-center gap-2">
              <button
                onClick={() => joinPact(pact.id)}
                disabled={joiningId === pact.id}
                className="mvp-btn-primary flex-1 inline-flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <Shuffle className="h-4 w-4" />
                {joiningId === pact.id ? 'Joining...' : 'Join Pact'}
              </button>
              <Link to={`/pact/${pact.id}`} className="mvp-btn-ghost">View</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
