import { usePactumStore } from '../../store/usePactumStore';

const states = ['Pending', 'Active', 'Disputed', 'Completed'];

export default function DevPanel() {
  const devState = usePactumStore((s) => s.devState);
  const setDevState = usePactumStore((s) => s.setDevState);

  return (
    <div className="glass-card mb-6 p-4">
      <p className="mb-2 text-xs font-semibold uppercase text-slate-300">Developer State Toggle</p>
      <div className="flex flex-wrap gap-2">
        {states.map((state) => (
          <button
            key={state}
            onClick={() => setDevState(state)}
            className={`rounded-md px-3 py-1 text-xs ${
              devState === state ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {state}
          </button>
        ))}
      </div>
    </div>
  );
}
