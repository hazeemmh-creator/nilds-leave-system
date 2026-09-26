'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const PUBLIC_PATHS = ['/login', '/signup'];

export default function SessionGate({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && !isPublicPath) {
      router.replace('/login');
      return;
    }

    if (user && isPublicPath) {
      router.replace('/');
    }
  }, [loading, user, isPublicPath, router]);

  if (loading || (!user && !isPublicPath) || (user && isPublicPath)) {
    return (
      <div className="min-h-screen bg-slate-200/60 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-600">
          <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Checking session...</span>
        </div>
      </div>
    );
  }

  return children;
}
