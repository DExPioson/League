'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { AuctionState, Season } from '@/types';
import { toast } from 'sonner';
import { Gavel, DollarSign, TrendingUp, Timer } from 'lucide-react';

export default function CaptainAuctionPage() {
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState('');
  const [liveState, setLiveState] = useState<AuctionState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: auctionState } = useQuery<AuctionState>({
    queryKey: ['auction-state', season?.id],
    queryFn: () => api.get(`/auction/state/${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const state = liveState || auctionState;

  const startCountdown = useCallback((endsAt: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 200);
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  }, []);

  useEffect(() => {
    if (!season?.id) return;

    const socket = getSocket();
    socket.connect();
    socket.emit('auction:join', { seasonId: season.id });

    socket.on('auction:state', (data: AuctionState) => {
      setLiveState(data);
      if (data.timerEndsAt) {
        startCountdown(data.timerEndsAt);
      } else {
        clearCountdown();
      }
    });

    socket.on('auction:bid-placed', (data: any) => {
      setLiveState((prev) =>
        prev
          ? {
              ...prev,
              highestBid: {
                amount: data.amount,
                captainId: data.captainId,
                captainName: data.captainName,
              },
            }
          : null,
      );
      if (data.timerEndsAt) {
        startCountdown(data.timerEndsAt);
      }
    });

    socket.on('auction:bid-rejected', (data: any) => {
      toast.error(data.message);
    });

    socket.on('auction:player-closed', (data: any) => {
      clearCountdown();
      if (data.resultType === 'SOLD') {
        toast.success(`${data.autoClose ? '⏱ Auto-sold' : 'Sold'}: Player to ${data.winnerName} for ₹${data.amount?.toLocaleString()}`);
      } else {
        toast.info(data.autoClose ? '⏱ Timer expired — Player unsold' : 'Player unsold');
      }
      queryClient.invalidateQueries({ queryKey: ['auction-state'] });
    });

    return () => {
      socket.emit('auction:leave', { seasonId: season.id });
      disconnectSocket();
      clearCountdown();
    };
  }, [season?.id, startCountdown, clearCountdown, queryClient]);

  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  const placeBid = useCallback(() => {
    if (!season?.id || !state?.currentPlayer || !bidAmount) return;
    const socket = getSocket();
    socket.emit('auction:place-bid', {
      seasonId: season.id,
      playerId: state.currentPlayer.id,
      amount: Number(bidAmount),
    });
    setBidAmount('');
  }, [season?.id, state?.currentPlayer, bidAmount]);

  const quickBid = useCallback(
    (increment: number) => {
      const base = state?.highestBid?.amount || state?.currentPlayer?.basePrice || 0;
      const amount = base + increment;
      if (!season?.id || !state?.currentPlayer) return;
      const socket = getSocket();
      socket.emit('auction:place-bid', {
        seasonId: season.id,
        playerId: state.currentPlayer.id,
        amount,
      });
    },
    [season?.id, state],
  );

  return (
    <DashboardLayout requiredRole="CAPTAIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Auction Room</h1>
            <p className="text-sm text-zinc-400">{season?.name}</p>
          </div>
          <Badge
            className={
              state?.auctionStatus === 'LIVE'
                ? 'bg-green-600'
                : state?.auctionStatus === 'PAUSED'
                  ? 'bg-yellow-600'
                  : 'bg-zinc-600'
            }
          >
            {state?.auctionStatus || 'NOT STARTED'}
          </Badge>
        </div>

        {state?.currentPlayer && state.currentPlayer.status === 'IN_AUCTION' ? (
          <Card className="border-green-600/30 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <Gavel className="h-5 w-5" /> Now Bidding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {state.currentPlayer.name}
                  </h2>
                  <p className="text-zinc-400">
                    {state.currentPlayer.position} &middot; Rating: {state.currentPlayer.rating || 'N/A'} &middot;
                    Base: ₹{state.currentPlayer.basePrice.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-400">Highest Bid</p>
                  <p className="text-4xl font-bold text-green-400">
                    {state.highestBid ? `₹${state.highestBid.amount.toLocaleString()}` : '-'}
                  </p>
                  {state.highestBid && (
                    <p className="text-sm text-zinc-400">by {state.highestBid.captainName}</p>
                  )}
                </div>
              </div>

              {/* Countdown Timer */}
              {countdown !== null && countdown > 0 && (
                <div className="flex items-center gap-3">
                  <Timer className={cn('h-5 w-5', countdown <= 3 ? 'text-red-400 animate-pulse' : 'text-yellow-400')} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-sm font-semibold', countdown <= 3 ? 'text-red-400' : 'text-yellow-400')}>
                        {countdown}s remaining
                      </span>
                      <span className="text-xs text-zinc-500">Bid now or lose out!</span>
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

              {state.auctionStatus === 'LIVE' && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      placeholder="Enter bid amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                    <Button onClick={placeBid} className="bg-green-600 hover:bg-green-700">
                      <DollarSign className="mr-2 h-4 w-4" /> Place Bid
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {[500, 1000, 2000, 5000].map((inc) => (
                      <Button
                        key={inc}
                        variant="outline"
                        size="sm"
                        onClick={() => quickBid(inc)}
                        className="border-zinc-700 text-zinc-300"
                      >
                        <TrendingUp className="mr-1 h-3 w-3" /> +{inc.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Gavel className="mb-4 h-12 w-12 text-zinc-600" />
              <p className="text-lg font-medium text-zinc-400">
                {state?.auctionStatus === 'LIVE'
                  ? 'Waiting for next player...'
                  : 'Auction not active'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Captain Budgets */}
        {state?.captains && (
          <div className="grid gap-4 lg:grid-cols-3">
            {state.captains.map((c) => (
              <Card key={c.id} className="border-zinc-800 bg-zinc-900">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
