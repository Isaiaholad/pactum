const tone = {
  Pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  Active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Disputed: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  Completed: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
};

export default function StatusBadge({ status }) {
  return <span className={`rounded-full border px-2 py-1 text-xs ${tone[status] || tone.Pending}`}>{status}</span>;
}
