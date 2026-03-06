export default function PactTimeline({ events }) {
  return (
    <div className="glass-card p-4">
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-300">Pact Timeline</h4>
      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={`${event.title}-${i}`} className="flex items-start gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-400" />
            <div>
              <p className="text-sm font-medium text-white">{event.title}</p>
              <p className="text-xs text-slate-400">{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
