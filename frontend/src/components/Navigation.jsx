import { NavLink } from 'react-router-dom';
import { Bell, Compass, LayoutDashboard, PlusCircle, Shield, User, Wallet } from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/create', label: 'Create Pact', icon: PlusCircle },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile/me', label: 'Profile', icon: User },
];

function LinkItem({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

export function Navigation({ isAdmin = false }) {
  const navLinks = isAdmin ? [...links, { to: '/admin', label: 'Admin', icon: Shield }] : links;
  return (
    <aside className="mvp-card hidden h-screen w-72 shrink-0 rounded-none border-y-0 border-l-0 md:flex md:flex-col md:p-5">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Pactum</h1>
      </div>

      <div className="space-y-1.5">
        {navLinks.map((item) => (
          <LinkItem key={item.to} item={item} />
        ))}
      </div>

      <div className="mt-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        Let make a pact
      </div>
    </aside>
  );
}

export function MobileNav({ isAdmin = false }) {
  const navLinks = isAdmin ? [...links, { to: '/admin', label: 'Admin', icon: Shield }] : links;
  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 grid border-t border-slate-200 bg-white/95 backdrop-blur md:hidden ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
      {navLinks.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center py-2 text-[11px] ${isActive ? 'text-indigo-700' : 'text-slate-500'}`
          }
        >
          <item.icon className="mb-1 h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
