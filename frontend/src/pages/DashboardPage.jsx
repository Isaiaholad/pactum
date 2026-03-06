import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Activity, BellDot, Wallet2 } from 'lucide-react';
import { usePactumStore } from '../store/usePactumStore';

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="mvp-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-indigo-600" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function StatusTone({ status }) {
  if (status === 'Active') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'Result Submitted') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'Disputed') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function DashboardPage() {
  const refreshAll = usePactumStore((s) => s.refreshAll);
  const activePacts = usePactumStore((s) => s.activePacts);
  const pendingInvites = usePactumStore((s) => s.pendingInvites);
  const walletBalance = usePactumStore((s) => s.walletBalance);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const livePacts = activePacts.filter((p) => ['Active', 'Result Submitted', 'Awaiting Deposit'].includes(p.status));

  return (
    <div className="space-y-5">
      <header>
        <h2 className="mvp-title">Dashboard</h2>
        <p className="mvp-subtitle">Track your pacts from locked funds to payout.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <Stat icon={Wallet2} label="Wallet" value={`${walletBalance.toFixed(2)} USDC`} sub={`≈ $${walletBalance.toFixed(2)} USD`} />
        <Stat icon={Activity} label="Active Pacts" value={livePacts.length} sub="In progress" />
        <Stat icon={BellDot} label="Pending Invites" value={pendingInvites.length} sub="Need your response" />
      </section>

      <section className="mvp-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Current Pacts</h3>
          <Link to="/create" className="mvp-btn-primary">Create</Link>
        </div>

        <div className="space-y-2">
          {activePacts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No pacts yet.</p>
          ) : null}
          {activePacts.map((pact) => (
            <Link key={pact.id} to={`/pact/${pact.id}`} className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-300 hover:shadow-sm">
              <div className="mb-1 flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">{pact.title}</p>
                <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${StatusTone({ status: pact.status })}`}>{pact.status}</span>
              </div>
              <p className="text-sm text-slate-600">
                {pact.stake_amount.toFixed(2)} USDC each •{' '}
                {pact.opponent_username ? `vs @${pact.opponent_username}` : 'Open pact (no opponent yet)'}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
