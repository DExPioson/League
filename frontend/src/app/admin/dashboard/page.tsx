'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { AdminDashboard, Season } from '@/types';
import { Users, Trophy, DollarSign, ArrowLeftRight, Gavel, UserX } from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: dashboard } = useQuery<AdminDashboard>({
    queryKey: ['admin-dashboard', season?.id],
    queryFn: () => api.get(`/dashboard/admin/${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  return (
    <DashboardLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-zinc-400">
            {season ? season.name : 'No active season'}
          </p>
        </div>

        {dashboard && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: 'Total Players', value: dashboard.totalPlayers, icon: Users, color: 'text-blue-400' },
                { label: 'Sold', value: dashboard.soldPlayers, icon: Trophy, color: 'text-green-400' },
                { label: 'Unsold', value: dashboard.unsoldPlayers, icon: UserX, color: 'text-red-400' },
                { label: 'Total Spent', value: `${dashboard.totalSpent.toLocaleString()}`, icon: DollarSign, color: 'text-yellow-400' },
                { label: 'Pending Transfers', value: dashboard.pendingTransfers, icon: ArrowLeftRight, color: 'text-purple-400' },
                { label: 'Auction', value: season?.auctionStatus || 'N/A', icon: Gavel, color: 'text-orange-400' },
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

            <div className="grid gap-4 lg:grid-cols-3">
              {dashboard.captains.map((captain) => (
                <Card key={captain.captainId} className="border-zinc-800 bg-zinc-900">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white">
                      {captain.teamName || captain.name}
                    </CardTitle>
                    <p className="text-xs text-zinc-400">Captain: {captain.name}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Spent</span>
                        <span className="font-medium text-red-400">
                          {captain.spent.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Remaining</span>
                        <span className="font-medium text-green-400">
                          {captain.remaining.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Players</span>
                        <span className="font-medium text-white">{captain.players}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{
                            width: `${season ? ((captain.spent / season.budgetPerCaptain) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!season && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Gavel className="mb-4 h-12 w-12 text-zinc-600" />
              <p className="text-lg font-medium text-zinc-400">No Active Season</p>
              <p className="text-sm text-zinc-500">
                Create and activate a season to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
