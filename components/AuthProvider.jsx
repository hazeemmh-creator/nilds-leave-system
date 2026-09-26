'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { account, teams } from '../lib/appwrite';
import { getPermissions, resolveRole } from '../lib/roles';

const AuthContext = createContext(null);

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await withTimeout(account.get(), 8000, 'Session check timed out');
      setUser(current);
      setRole(resolveRole(current, []));

      try {
        const teamList = await withTimeout(teams.list(), 4000, 'Team lookup timed out');
        const teamNames = (teamList.teams || []).map((team) => team.name);
        setRole(resolveRole(current, teamNames));
      } catch {
        // Labels on the user object are enough when Teams is unavailable.
      }
    } catch {
      setUser(null);
      setRole('staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    await account.createEmailPasswordSession(email, password);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession('current');
    } finally {
      setUser(null);
      setRole('staff');
    }
  }, []);

  const permissions = useMemo(() => getPermissions(role), [role]);

  const value = useMemo(
    () => ({ user, role, loading, login, logout, refresh, permissions }),
    [user, role, loading, login, logout, refresh, permissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
