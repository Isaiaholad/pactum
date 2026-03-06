import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleDollarSign, Flag, UserRound } from 'lucide-react';
import { usePactumStore } from '../store/usePactumStore';

const PRESET_TITLES = [
  'Chess Match Bet',
  'Football Match Bet',
  'Call Of Duty Battle Bet',
  'Social Event Challenge',
  'FIFA Match Bet',
  'Coding Accountability Bet',
  'Freelance Micro-Escrow',
];

export default function CreatePactPage() {
  const user = usePactumStore((s) => s.user);
  const createPact = usePactumStore((s) => s.createPact);
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title_mode: 'preset',
    preset_title: PRESET_TITLES[0],
    custom_title: '',
    description: '',
    stake_amount: 20,
    event_duration_minutes: 60,
    opponent_username: '',
    open_to_public: false,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await createPact({
        creator_id: user.id,
        title: form.title_mode === 'preset' ? form.preset_title : form.custom_title,
        description: form.description,
        stake_amount: Number(form.stake_amount),
        event_duration_minutes: Number(form.event_duration_minutes),
        opponent_username: form.open_to_public ? '' : form.opponent_username,
        deadline: new Date(form.deadline).toISOString(),
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h2 className="mvp-title">Create Pact</h2>
        <p className="mvp-subtitle">Define the condition, lock equal stakes, and settle by mutual confirmation.</p>
      </header>

      <form onSubmit={submit} className="mvp-card space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Title Type
            <select className="mvp-input mt-1" value={form.title_mode} onChange={(e) => setForm({ ...form, title_mode: e.target.value })}>
              <option value="preset">Preset Title</option>
              <option value="custom">Custom Title</option>
            </select>
          </label>

          {form.title_mode === 'preset' ? (
            <label className="block text-sm font-medium text-slate-700">
              Preset Title
              <select className="mvp-input mt-1" value={form.preset_title} onChange={(e) => setForm({ ...form, preset_title: e.target.value })}>
                {PRESET_TITLES.map((title) => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm font-medium text-slate-700">
              Custom Title
              <input className="mvp-input mt-1" placeholder="Enter pact title" value={form.custom_title} onChange={(e) => setForm({ ...form, custom_title: e.target.value })} />
            </label>
          )}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea className="mvp-input mt-1 min-h-[120px]" placeholder="Winner of tonight's match receives the full pool." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-1"><CircleDollarSign className="h-4 w-4" />Stake Amount</span>
            <input type="number" className="mvp-input mt-1" placeholder="20" value={form.stake_amount} onChange={(e) => setForm({ ...form, stake_amount: e.target.value })} />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4" />Opponent Username</span>
            <input
              className="mvp-input mt-1 disabled:bg-slate-100"
              autoComplete="off"
              value={form.opponent_username}
              disabled={form.open_to_public}
              onChange={(e) => setForm({ ...form, opponent_username: e.target.value })}
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Event Duration (minutes)
          <input
            type="number"
            min="5"
            max={6 * 30 * 24 * 60}
            className="mvp-input mt-1"
            value={form.event_duration_minutes}
            onChange={(e) => setForm({ ...form, event_duration_minutes: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">
            Min 5 minutes, max 259200 minutes (6 months). Must be at least 120 minutes less than deadline.
          </p>
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.open_to_public}
            onChange={(e) => setForm({ ...form, open_to_public: e.target.checked })}
          />
          Publish as open pact (anyone can join from Explore)
        </label>

        <label className="block text-sm font-medium text-slate-700">
          <span className="inline-flex items-center gap-1"><Flag className="h-4 w-4" />Deadline</span>
          <input type="datetime-local" className="mvp-input mt-1" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </label>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          <p className="font-semibold">Resolution mode: Mutual confirmation</p>
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

        <button className="mvp-btn-primary w-full">Create Pact</button>
      </form>
    </div>
  );
}
