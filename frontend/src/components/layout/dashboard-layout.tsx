'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
      }
    }
    if (user && requiredRole && user.role !== requiredRole) {
      router.push(`/${user.role.toLowerCase()}/dashboard`);
    }
  }, [user, requiredRole, router]);

  if (!user) {
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
