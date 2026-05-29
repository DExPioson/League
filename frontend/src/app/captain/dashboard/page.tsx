'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { Season } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { DollarSign, Users, ArrowLeftRight, Wallet, Star } from 'lucide-react';

export default function CaptainDashboardPage() {
  const { user } = useAuthStore();

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: dashboard } = useQuery<any>({
    queryKey: ['captain-dashboard', season?.id],
    queryFn: () => api.get(`/dashboard/captain/${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  return (
    <DashboardLayout requiredRole="CAPTAIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Captain Dashboard</h1>
          <p className="text-sm text-zinc-400">{season?.name || 'No active season'}</p>
        </div>

        {dashboard && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[
                { label: 'Remaining Budget', value: dashboard.remainingBudget?.toLocaleString(), icon: Wallet, color: 'text-green-400' },
                { label: 'Total Spent', value: dashboard.totalSpent?.toLocaleString(), icon: DollarSign, color: 'text-red-400' },
                { label: 'Squad Size', value: dashboard.squadSize, icon: Users, color: 'text-blue-400' },
                { label: 'Transfers Used', value: `${dashboard.transfersUsed}/${dashboard.transfersUsed + dashboard.transfersRemaining}`, icon: ArrowLeftRight, color: 'text-purple-400' },
                { label: 'Incoming Transfers', value: dashboard.incomingTransfers, icon: ArrowLeftRight, color: 'text-yellow-400' },
              ].map((stat) => (
                <Card key={stat.label} className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      <div>
                        <p className="text-xs text-zinc-500">{stat.label}</p>
                        <p className="text-lg font-bold text-white">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {dashboard.players?.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    My Squad — {dashboard.team?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {dashboard.players.map((player: any) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 p-3"
                      >
                        <div>
                          <p className="font-medium text-white">{player.name}</p>
                          <p className="text-xs text-zinc-500">
                            {player.position} &middot; {player.soldPrice?.toLocaleString() || player.basePrice.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="text-sm">{player.rating || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
