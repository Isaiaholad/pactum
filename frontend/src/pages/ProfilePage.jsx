import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, UserCircle2 } from 'lucide-react';
import { api } from '../utils/api';
import { usePactumStore } from '../store/usePactumStore';

function Stat({ label, value }) {
  return (
    <div className="mvp-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const currentUser = usePactumStore((s) => s.user);
  const target = username === 'me' ? currentUser.username : username;
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.profile(target).then(setProfile).catch(() => setProfile(null));
  }, [target]);

  if (!profile) return <div className="mvp-card p-4">Loading profile...</div>;

  return (
    <div className="space-y-4">
      <div className="mvp-card p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
            <UserCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">@{profile.user.username}</h2>
            <p className="text-sm text-slate-500">{profile.user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Completed Pacts" value={profile.stats.completed_pacts} />
        <Stat label="Wins" value={profile.stats.wins} />
        <Stat label="Losses" value={profile.stats.losses} />
      </div>

      <div className="mvp-card p-5">
        <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-bold"><Trophy className="h-4 w-4 text-amber-500" />Recent Completed</h3>
        <div className="space-y-2">
          {profile.recent_completed_pacts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No completed pacts yet.</p>
          ) : null}
          {profile.recent_completed_pacts.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="font-semibold text-slate-900">{p.title}</p>
              <p className="text-slate-500">{p.stake_amount.toFixed(2)} USDC each</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
