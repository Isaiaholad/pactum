import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Landmark } from 'lucide-react';
import { api } from '../utils/api';
import { usePactumStore } from '../store/usePactumStore';

export default function WalletPage() {
  const user = usePactumStore((s) => s.user);
  const walletBalance = usePactumStore((s) => s.walletBalance);
  const refreshAll = usePactumStore((s) => s.refreshAll);

  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('20');
  const [error, setError] = useState('');

  async function load() {
    const tx = await api.walletTransactions(user.id);
    setTransactions(tx.transactions || []);
  }

  useEffect(() => {
    load();
  }, [user.id]);

  async function walletAction(fn) {
    setError('');
    try {
      await fn({ user_id: user.id, amount: Number(amount) });
      await Promise.all([refreshAll(), load()]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="mvp-title">Wallet</h2>
        <p className="mvp-subtitle">Manage funding for pacts and payouts.</p>
      </header>

      <div className="mvp-card overflow-hidden">
        <div className="bg-slate-900 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Available Balance</p>
          <p className="mt-1 font-mono text-4xl font-black">{walletBalance.toFixed(2)} USDC</p>
          <p className="text-sm text-slate-300">≈ ${walletBalance.toFixed(2)} USD</p>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Amount</label>
            <input className="mvp-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button onClick={() => walletAction(api.walletDeposit)} className="mvp-btn-success w-full inline-flex items-center justify-center gap-2"><ArrowDownCircle className="h-4 w-4" />Deposit</button>
            <button onClick={() => walletAction(api.walletWithdraw)} className="mvp-btn-dark w-full inline-flex items-center justify-center gap-2"><ArrowUpCircle className="h-4 w-4" />Withdraw</button>
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-indigo-600" />
              <h3 className="text-lg font-bold">Transaction History</h3>
            </div>
            <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
              {transactions.length === 0 ? <p className="text-sm text-slate-500">No transactions yet.</p> : null}
              {transactions.map((tx) => (
                <div key={tx.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{tx.type}</p>
                    <p className={`font-mono font-semibold ${tx.amount >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{tx.amount.toFixed(2)} USDC</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{tx.reference || '-'} • {new Date(tx.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
