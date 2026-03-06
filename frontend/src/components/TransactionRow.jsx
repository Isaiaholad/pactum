import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

export default function TransactionRow({ tx }) {
  return (
    <div className="grid grid-cols-4 gap-3 border-b border-slate-700/60 py-3 text-sm">
      <div className="font-mono text-white">{Number(tx.amount).toFixed(2)} {tx.token}</div>
      <div className="capitalize text-slate-300">{tx.type}</div>
      <div className="text-slate-400">{dayjs(tx.created_at).format('MMM D, YYYY h:mm A')}</div>
      <div>{tx.pact_id ? <Link className="text-indigo-300 hover:text-indigo-200" to={`/pact/${tx.pact_id}`}>View Pact</Link> : '-'}</div>
    </div>
  );
}
