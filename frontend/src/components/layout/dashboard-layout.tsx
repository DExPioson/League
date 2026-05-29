'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from './sidebar';
import { UserRole } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const { user, hydrate } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/auth/login');
      }
    } else if (requiredRole && user.role !== requiredRole) {
      router.push(`/${user.role.toLowerCase()}/dashboard`);
    }
  }, [hydrated, user, requiredRole, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
