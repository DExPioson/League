'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { Season } from '@/types';
import { Star, Users } from 'lucide-react';

export default function CaptainTeamPage() {
  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: dashboard } = useQuery<any>({
    queryKey: ['captain-dashboard', season?.id],
    queryFn: () => api.get(`/dashboard/captain/${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const players = dashboard?.players || [];
  const positionGroups: Record<string, any[]> = {};
  players.forEach((p: any) => {
    if (!positionGroups[p.position]) positionGroups[p.position] = [];
    positionGroups[p.position].push(p);
  });

  return (
    <DashboardLayout requiredRole="CAPTAIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Team</h1>
          <p className="text-sm text-zinc-400">
            {dashboard?.team?.name || 'Loading...'} &middot; {players.length} players
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{players.length}</p>
              <p className="text-xs text-zinc-500">Squad Size</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">
                {players.reduce((s: number, p: any) => s + (p.soldPrice || p.basePrice), 0).toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">Total Value</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {players.length > 0
                  ? (players.reduce((s: number, p: any) => s + (p.rating || 0), 0) / players.length).toFixed(1)
                  : '-'}
              </p>
              <p className="text-xs text-zinc-500">Avg Rating</p>
            </CardContent>
          </Card>
        </div>

        {Object.entries(positionGroups).map(([position, posPlayers]) => (
          <Card key={position} className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Users className="h-4 w-4 text-green-400" />
                {position}s ({posPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {posPlayers.map((player: any) => (
                  <div
                    key={player.id}
                    className="rounded-lg border border-zinc-800 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white">{player.name}</p>
                        <p className="text-xs text-zinc-500">
                          Age {player.age || 'N/A'} &middot; {player.preferredFoot || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">{player.rating || '-'}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                        {player.status}
                      </Badge>
                      <span className="text-sm font-medium text-green-400">
                        {(player.soldPrice || player.basePrice).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
