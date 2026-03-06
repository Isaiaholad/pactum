import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';
import CountdownTimer from './CountdownTimer';
import { formatFinancial } from '../utils/format';

export default function PactCard({ pact }) {
  const money = formatFinancial(pact.stake_amount, pact.token);

  return (
    <motion.div whileHover={{ scale: 1.01 }} className="glass-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-300">{pact.category}</p>
          <h3 className="text-lg font-bold text-white">{pact.title}</h3>
        </div>
        <StatusBadge status={pact.status} />
      </div>
      <div className="mt-3 text-sm text-slate-300">
        <p className="font-mono">{money.tokenLine}</p>
        <p className="text-xs text-slate-400">{money.usdLine}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <CountdownTimer deadline={pact.deadline} />
        <Link className="text-sm text-indigo-300 hover:text-indigo-200" to={`/pact/${pact.id}`}>
          Open
        </Link>
      </div>
    </motion.div>
  );
}
