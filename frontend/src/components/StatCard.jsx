import { motion } from 'framer-motion';

export default function StatCard({ label, value, sub }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="glass-card p-4">
      <p className="text-xs text-slate-300">{label}</p>
      <h3 className="mt-1 text-2xl font-bold text-white">{value}</h3>
      {sub ? <p className="text-xs text-slate-400">{sub}</p> : null}
    </motion.div>
  );
}
