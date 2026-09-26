'use client';

import { AuthProvider } from '../components/AuthProvider';
import SessionGate from '../components/SessionGate';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <SessionGate>{children}</SessionGate>
    </AuthProvider>
  );
}
