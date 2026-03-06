import { useNavigate } from 'react-router-dom';
import { Navigation, MobileNav } from './Navigation';
import { usePactumStore } from '../store/usePactumStore';

export function Layout({ children }) {
  const logout = usePactumStore((s) => s.logout);
  const user = usePactumStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <Navigation isAdmin={Boolean(user?.is_admin)} />
      <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8">
        <div className="mvp-card mb-4 flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</p>
            <p className="text-sm text-slate-700">
              Signed in as <span className="font-semibold">{user?.username}</span>
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mvp-btn-dark"
          >
            Logout
          </button>
        </div>
        {children}
      </main>
      <MobileNav isAdmin={Boolean(user?.is_admin)} />
    </div>
  );
}
