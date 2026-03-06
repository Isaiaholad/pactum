export default function StakeInput({ register }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-200">Stake Amount</label>
      <input
        type="number"
        step="0.01"
        className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-slate-100"
        placeholder="50.00"
        {...register('stake_amount', { required: true, min: 1 })}
      />
    </div>
  );
}
