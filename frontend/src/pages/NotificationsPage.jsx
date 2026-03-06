import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { usePactumStore } from '../store/usePactumStore';

function formatTs(ts) {
  if (!ts) return '';
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(ts) ? ts : `${ts}Z`;
  return new Date(normalized).toLocaleString();
}

export default function NotificationsPage() {
  const notifications = usePactumStore((s) => s.notifications);
  const refreshAll = usePactumStore((s) => s.refreshAll);
  const markNotificationRead = usePactumStore((s) => s.markNotificationRead);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="mvp-title">Notifications</h2>
        <p className="mvp-subtitle">Invites, confirmations, and payout alerts.</p>
      </header>

      <div className="mvp-card p-4">
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No notifications right now.</p>
          ) : null}
          {notifications.map((n, idx) => (
            <div
              key={`${n.id || n.pact_id}-${idx}`}
              className={`flex items-center justify-between rounded-xl border p-3 text-sm ${n.is_read ? 'border-slate-200 bg-white' : 'border-indigo-300 bg-indigo-50/60'}`}
            >
              <div className="pr-3">
                <p className="font-semibold text-slate-900 inline-flex items-center gap-1"><BellRing className="h-4 w-4 text-indigo-600" />{n.message}</p>
                <p className="text-xs text-slate-500">{n.type} • {formatTs(n.timestamp)}</p>
              </div>
              <div className="flex items-center gap-2">
                {!n.is_read ? (
                  <button
                    onClick={() => markNotificationRead(n.id)}
                    className="mvp-btn-ghost"
                  >
                    Mark Read
                  </button>
                ) : null}
                <Link
                  className="mvp-btn-primary"
                  to={`/pact/${n.pact_id}`}
                  onClick={() => {
                    if (!n.is_read) {
                      markNotificationRead(n.id);
                    }
                  }}
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
