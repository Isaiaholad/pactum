import { Home, PlusCircle, Search, Wallet, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/dashboard', icon: Home },
  { to: '/create', icon: PlusCircle },
  { to: '/explore', icon: Search },
  { to: '/wallet', icon: Wallet },
  { to: '/profile/alice', icon: UserRound },
];

export default function BottomTabs() {
  return (
    <div className="glass-card fixed bottom-3 left-3 right-3 z-40 grid grid-cols-5 gap-1 p-2 lg:hidden">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `grid place-items-center rounded-md py-2 ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300'}`
          }
        >
          <tab.icon className="h-5 w-5" />
        </NavLink>
      ))}
    </div>
  );
}
