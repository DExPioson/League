'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { AuctionState, Player, Season } from '@/types';
import { toast } from 'sonner';
import { Play, Pause, Square, SkipForward, Gavel, Users, Timer } from 'lucide-react';

export default function AuctionControlPage() {
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const timerEndsAtRef = useRef<number | null>(null);

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: state, refetch: refetchState } = useQuery<AuctionState>({
    queryKey: ['auction-state', season?.id],
    queryFn: () => api.get(`/auction/state/${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
    refetchInterval: 2000,
  });

  const { data: players = [], refetch: refetchPlayers } = useQuery<Player[]>({
    queryKey: ['auction-players', season?.id],
    queryFn: () => api.get(`/players?seasonId=${season!.id}&status=REGISTERED`).then((r) => r.data),
    enabled: !!season?.id,
    refetchInterval: 5000,
  });

  // Countdown ticker
  const startCountdown = useCallback((endsAt: number) => {
    timerEndsAtRef.current = endsAt;
    if (countdownRef.current) clearInterval(countdownRef.current);
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        // Refetch state when timer expires (player was auto-closed)
        refetchState();
        refetchPlayers();
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 200);
  }, [refetchState, refetchPlayers]);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
    timerEndsAtRef.current = null;
  }, []);

  // Watch for timer info from polled auction state
  useEffect(() => {
    if (state?.timerEndsAt && state.timerEndsAt > Date.now()) {
      startCountdown(state.timerEndsAt);
    } else if (!state?.currentPlayer) {
      clearCountdown();
    }
  }, [state?.timerEndsAt, state?.currentPlayer, startCountdown, clearCountdown]);

  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['auction-state'] });
    queryClient.invalidateQueries({ queryKey: ['auction-players'] });
    queryClient.invalidateQueries({ queryKey: ['active-season'] });
  }, [queryClient]);

  const startAuction = useMutation({
    mutationFn: () => api.post('/auction/start', { seasonId: season!.id }),
    onSuccess: () => { toast.success('Auction started!'); invalidateAll(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const pauseAuction = useMutation({
    mutationFn: () => api.post('/auction/pause', { seasonId: season!.id }),
    onSuccess: () => { clearCountdown(); toast.success('Auction paused'); invalidateAll(); },
  });

  const resumeAuction = useMutation({
    mutationFn: () => api.post('/auction/resume', { seasonId: season!.id }),
    onSuccess: () => { toast.success('Auction resumed'); invalidateAll(); },
  });

  const endAuction = useMutation({
    mutationFn: () => api.post('/auction/end', { seasonId: season!.id }),
    onSuccess: () => { clearCountdown(); toast.success('Auction ended'); invalidateAll(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openPlayer = useMutation({
    mutationFn: (playerId: string) =>
      api.post('/auction/open-player', { seasonId: season!.id, playerId }),
    onSuccess: () => { toast.success('Player opened for bidding'); invalidateAll(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const closePlayer = useMutation({
    mutationFn: () =>
      api.post('/auction/close-player', {
        seasonId: season!.id,
        playerId: state!.currentPlayer!.id,
      }),
    onSuccess: (res: any) => {
      clearCountdown();
      if (res.data.resultType === 'SOLD') {
        toast.success(`Player sold to ${res.data.winnerName} for ₹${res.data.amount?.toLocaleString()}`);
      } else {
        toast.info('Player unsold');
      }
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to close bidding'),
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
          <Badge className={statusColor[state?.auctionStatus || 'NOT_STARTED']}>
            {state?.auctionStatus || 'NOT_STARTED'}
          </Badge>
        </div>

        {/* Auction Controls */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base text-white">Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(!state?.auctionStatus || state.auctionStatus === 'NOT_STARTED') && (
                <Button
                  onClick={() => startAuction.mutate()}
                  disabled={startAuction.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="mr-2 h-4 w-4" /> {startAuction.isPending ? 'Starting...' : 'Start Auction'}
                </Button>
              )}
              {state?.auctionStatus === 'LIVE' && (
                <Button onClick={() => pauseAuction.mutate()} className="bg-yellow-600 hover:bg-yellow-700">
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
              )}
              {state?.auctionStatus === 'PAUSED' && (
                <Button onClick={() => resumeAuction.mutate()} className="bg-green-600 hover:bg-green-700">
                  <Play className="mr-2 h-4 w-4" /> Resume
                </Button>
              )}
              {(state?.auctionStatus === 'LIVE' || state?.auctionStatus === 'PAUSED') && (
                <Button onClick={() => endAuction.mutate()} variant="destructive">
                  <Square className="mr-2 h-4 w-4" /> End Auction
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Player Being Auctioned */}
        {state?.currentPlayer && state.currentPlayer.status === 'IN_AUCTION' && (
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
                    {state.currentPlayer.name}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {state.currentPlayer.position} &middot; Base: ₹{state.currentPlayer.basePrice.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  {state.highestBid ? (
                    <>
                      <p className="text-2xl font-bold text-green-400">
                        ₹{state.highestBid.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-zinc-400">
                        by {state.highestBid.captainName}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">No bids yet</p>
                  )}
                </div>
              </div>

              {/* Countdown Timer */}
              {countdown !== null && countdown > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <Timer className={cn('h-5 w-5', countdown <= 3 ? 'text-red-400 animate-pulse' : 'text-yellow-400')} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-sm font-semibold', countdown <= 3 ? 'text-red-400' : 'text-yellow-400')}>
                        {countdown}s remaining
                      </span>
                      <span className="text-xs text-zinc-500">Auto-close timer</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-200',
                          countdown <= 3 ? 'bg-red-500' : 'bg-yellow-500',
                        )}
                        style={{ width: `${(countdown / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => closePlayer.mutate()}
                  variant="destructive"
                  disabled={closePlayer.isPending}
                >
                  {closePlayer.isPending ? 'Closing...' : 'Close Bidding'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Captain Budget Cards */}
        {state?.captains && (
          <div className="grid gap-4 lg:grid-cols-3">
            {state.captains.map((c) => {
              const minReq = state.minPlayersPerCaptain || 6;
              const count = c.playerCount || 0;
              const needsMore = count < minReq;
              return (
                <Card key={c.id} className={cn('bg-zinc-900', needsMore ? 'border-yellow-600/40' : 'border-zinc-800')}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{c.name}</p>
                        <p className="text-xs text-zinc-500">{c.teamName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">
                          ₹{c.remainingBudget.toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          spent: ₹{c.spentAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={cn('text-xs font-medium', needsMore ? 'text-yellow-400' : 'text-green-400')}>
                        {count}/{minReq} players
                      </span>
                      {needsMore && (
                        <span className="text-xs text-yellow-500">needs {minReq - count} more</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Player Queue */}
        {state?.auctionStatus === 'LIVE' && players.length > 0 && (
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
                        {player.position} &middot; ₹{player.basePrice.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openPlayer.mutate(player.id)}
                      disabled={!!(state.currentPlayer && state.currentPlayer.status === 'IN_AUCTION') || openPlayer.isPending}
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
