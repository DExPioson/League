'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { User, Mail } from 'lucide-react';

export default function PlayerProfilePage() {
  const { user } = useAuthStore();

  return (
    <DashboardLayout requiredRole="PLAYER">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Profile</h1>

        <Card className="max-w-md border-zinc-800 bg-zinc-900">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-2xl font-bold text-green-400">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                <p className="flex items-center gap-1 text-sm text-zinc-400">
                  <Mail className="h-3.5 w-3.5" /> {user?.email}
                </p>
                <p className="text-xs text-zinc-500">Role: {user?.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
