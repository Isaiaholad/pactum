import { Home, PlusCircle, Search, Wallet, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { name: 'Dashboard', icon: Home, to: '/dashboard' },
  { name: 'Create Pact', icon: PlusCircle, to: '/create' },
  { name: 'Explore', icon: Search, to: '/explore' },
  { name: 'Wallet', icon: Wallet, to: '/wallet' },
  { name: 'Profile', icon: UserRound, to: '/profile/alice' },
];

export default function Sidebar() {
  return (
    <aside className="glass-card sticky top-4 hidden h-[calc(100vh-2rem)] w-64 flex-col p-4 lg:flex">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-white">Pactum</h1>
      <nav className="space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800/70'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
