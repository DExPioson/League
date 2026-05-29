'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { AuctionState, Player, Season } from '@/types';
import { toast } from 'sonner';
import { Play, Pause, Square, SkipForward, Gavel, DollarSign, Users } from 'lucide-react';

export default function AuctionControlPage() {
  const queryClient = useQueryClient();

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: auctionState } = useQuery<AuctionState>({
    queryKey: ['auction-state', season?.id],
    queryFn: () => api.get(`/auction/state/${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
    refetchInterval: 2000,
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['auction-players', season?.id],
    queryFn: () => api.get(`/players?seasonId=${season!.id}&status=REGISTERED`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['auction-state'] });
    queryClient.invalidateQueries({ queryKey: ['auction-players'] });
    queryClient.invalidateQueries({ queryKey: ['active-season'] });
  };

  const startAuction = useMutation({
    mutationFn: () => api.post('/auction/start', { seasonId: season!.id }),
    onSuccess: () => { invalidateAll(); toast.success('Auction started!'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const pauseAuction = useMutation({
    mutationFn: () => api.post('/auction/pause', { seasonId: season!.id }),
    onSuccess: () => { invalidateAll(); toast.success('Auction paused'); },
  });

  const resumeAuction = useMutation({
    mutationFn: () => api.post('/auction/resume', { seasonId: season!.id }),
    onSuccess: () => { invalidateAll(); toast.success('Auction resumed'); },
  });

  const endAuction = useMutation({
    mutationFn: () => api.post('/auction/end', { seasonId: season!.id }),
    onSuccess: () => { invalidateAll(); toast.success('Auction ended'); },
  });

  const openPlayer = useMutation({
    mutationFn: (playerId: string) =>
      api.post('/auction/open-player', { seasonId: season!.id, playerId, timerSeconds: 60 }),
    onSuccess: () => { invalidateAll(); toast.success('Player opened for bidding'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const closePlayer = useMutation({
    mutationFn: () =>
      api.post('/auction/close-player', {
        seasonId: season!.id,
        playerId: auctionState!.currentPlayer!.id,
      }),
    onSuccess: (res: any) => {
      invalidateAll();
      if (res.data.resultType === 'SOLD') {
        toast.success(`Player sold to ${res.data.winnerName} for ${res.data.amount}`);
      } else {
        toast.info('Player unsold');
      }
    },
  });

  const statusColor: Record<string, string> = {
    NOT_STARTED: 'bg-zinc-600',
    LIVE: 'bg-green-600',
    PAUSED: 'bg-yellow-600',
    COMPLETED: 'bg-blue-600',
  };

  return (
    <DashboardLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Auction Control</h1>
            <p className="text-sm text-zinc-400">{season?.name}</p>
          </div>
          <Badge className={statusColor[auctionState?.auctionStatus || 'NOT_STARTED']}>
            {auctionState?.auctionStatus || 'NOT_STARTED'}
          </Badge>
        </div>

        {/* Auction Controls */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base text-white">Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(!auctionState?.auctionStatus || auctionState.auctionStatus === 'NOT_STARTED') && (
                <Button onClick={() => startAuction.mutate()} className="bg-green-600 hover:bg-green-700">
                  <Play className="mr-2 h-4 w-4" /> Start Auction
                </Button>
              )}
              {auctionState?.auctionStatus === 'LIVE' && (
                <Button onClick={() => pauseAuction.mutate()} className="bg-yellow-600 hover:bg-yellow-700">
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
              )}
              {auctionState?.auctionStatus === 'PAUSED' && (
                <Button onClick={() => resumeAuction.mutate()} className="bg-green-600 hover:bg-green-700">
                  <Play className="mr-2 h-4 w-4" /> Resume
                </Button>
              )}
              {(auctionState?.auctionStatus === 'LIVE' || auctionState?.auctionStatus === 'PAUSED') && (
                <Button onClick={() => endAuction.mutate()} variant="destructive">
                  <Square className="mr-2 h-4 w-4" /> End Auction
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Player Being Auctioned */}
        {auctionState?.currentPlayer && (
          <Card className="border-yellow-600/30 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-yellow-400">
                <Gavel className="h-5 w-5" /> Currently Auctioning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {auctionState.currentPlayer.name}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {auctionState.currentPlayer.position} &middot; Base: {auctionState.currentPlayer.basePrice.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  {auctionState.highestBid ? (
                    <>
                      <p className="text-2xl font-bold text-green-400">
                        {auctionState.highestBid.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-zinc-400">
                        by {auctionState.highestBid.captainName}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">No bids yet</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={() => closePlayer.mutate()} variant="destructive">
                  Close Bidding
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Captain Budget Cards */}
        {auctionState?.captains && (
          <div className="grid gap-4 lg:grid-cols-3">
            {auctionState.captains.map((c) => (
              <Card key={c.id} className="border-zinc-800 bg-zinc-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{c.name}</p>
                      <p className="text-xs text-zinc-500">{c.teamName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">
                        {c.remainingBudget.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">remaining</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Player Queue */}
        {auctionState?.auctionStatus === 'LIVE' && players.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Users className="h-5 w-5" /> Player Queue ({players.length} remaining)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {players.slice(0, 12).map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{player.name}</p>
                      <p className="text-xs text-zinc-500">
                        {player.position} &middot; {player.basePrice.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openPlayer.mutate(player.id)}
                      disabled={!!auctionState.currentPlayer}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
