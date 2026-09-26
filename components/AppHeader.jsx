'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const ROLE_STYLES = {
  admin: 'bg-slate-800 text-white',
  hr: 'bg-emerald-100 text-emerald-800',
  supervisor: 'bg-amber-100 text-amber-800',
  staff: 'bg-slate-200 text-slate-700'
};

export default function AppHeader() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-slate-50 border border-slate-200/60 rounded-xl shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">National Institute for Legislative and Democratic Studies</p>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">NILDS HR Portal</h1>
        <p className="text-sm text-slate-500 mt-0.5">Leave management and staff records</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">{user?.name || 'Staff member'}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${ROLE_STYLES[role] || ROLE_STYLES.staff}`}>
          {role}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors border border-slate-300 shadow-sm disabled:opacity-50"
        >
          <LogOut size={16} />
          <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
}
