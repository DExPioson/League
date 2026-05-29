'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { Season } from '@/types';
import { Trophy, DollarSign, Users, Star, Calendar } from 'lucide-react';

export default function PlayerDashboardPage() {
  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: player } = useQuery<any>({
    queryKey: ['player-dashboard', season?.id],
    queryFn: () => api.get(`/dashboard/player/${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const statusColors: Record<string, string> = {
    REGISTERED: 'bg-blue-600',
    IN_AUCTION: 'bg-yellow-600',
    SOLD: 'bg-green-600',
    UNSOLD: 'bg-red-600',
  };

  return (
    <DashboardLayout requiredRole="PLAYER">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Player Dashboard</h1>
          <p className="text-sm text-zinc-400">{season?.name || 'No active season'}</p>
        </div>

        {player ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-base text-white">My Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-2xl font-bold text-green-400">
                    {player.name?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{player.name}</h2>
                    <p className="text-sm text-zinc-400">{player.position}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs">Rating</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-white">{player.rating || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <DollarSign className="h-4 w-4 text-green-400" />
                      <span className="text-xs">Base Price</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-white">
                      {player.basePrice?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <span className="text-xs">Age</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-white">{player.age || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="text-xs">Preferred Foot</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-white">{player.preferredFoot || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-base text-white">Auction Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400">Status:</span>
                  <Badge className={statusColors[player.status] || 'bg-zinc-600'}>
                    {player.status}
                  </Badge>
                </div>

                {player.soldPrice && (
                  <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-4">
                    <p className="text-sm text-zinc-400">Sold For</p>
                    <p className="text-3xl font-bold text-green-400">
                      {player.soldPrice.toLocaleString()}
                    </p>
                  </div>
                )}

                {player.currentTeam && (
                  <div className="rounded-lg bg-zinc-800 p-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      <div>
                        <p className="text-sm text-zinc-400">Team</p>
                        <p className="text-lg font-bold text-white">{player.currentTeam.name}</p>
                      </div>
                    </div>
                    {player.currentTeam.captain && (
                      <p className="mt-1 text-sm text-zinc-500">
                        Captain: {player.currentTeam.captain.user.name}
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-lg bg-zinc-800 p-3">
                  <p className="text-xs text-zinc-500">Season</p>
                  <p className="font-medium text-white">{player.season?.name}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="mb-4 h-12 w-12 text-zinc-600" />
              <p className="text-lg font-medium text-zinc-400">No player profile found</p>
              <p className="text-sm text-zinc-500">
                Your profile will appear here once assigned to a season.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
