'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import api from '@/lib/api';
import { TransferRequest, Season, Captain } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Plus, Check, X, ArrowLeftRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-600',
  ACCEPTED: 'bg-blue-600',
  REJECTED: 'bg-red-600',
  COMPLETED: 'bg-green-700',
  CANCELLED: 'bg-zinc-600',
};

export default function CaptainTransfersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [targetCaptain, setTargetCaptain] = useState('');
  const [reason, setReason] = useState('');

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: dashboard } = useQuery<any>({
    queryKey: ['captain-dashboard', season?.id],
    queryFn: () => api.get(`/dashboard/captain/${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const { data: captains = [] } = useQuery<Captain[]>({
    queryKey: ['captains', season?.id],
    queryFn: () => api.get(`/captains?seasonId=${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const myCaptain = captains.find((c) => c.userId === user?.id);
  const otherCaptains = captains.filter((c) => c.userId !== user?.id);

  const { data: transfers = [] } = useQuery<TransferRequest[]>({
    queryKey: ['transfers', season?.id, myCaptain?.id],
    queryFn: () =>
      api.get(`/transfers?seasonId=${season!.id}&captainId=${myCaptain!.id}`).then((r) => r.data),
    enabled: !!season?.id && !!myCaptain?.id,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/transfers', {
        seasonId: season!.id,
        playerId: selectedPlayer,
        fromCaptainId: myCaptain!.id,
        toCaptainId: targetCaptain,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setOpen(false);
      setSelectedPlayer('');
      setTargetCaptain('');
      setReason('');
      toast.success('Transfer request created');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/transfers/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfer accepted');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/transfers/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfer rejected');
    },
  });

  const incoming = transfers.filter((t) => t.toCaptainId === myCaptain?.id);
  const outgoing = transfers.filter((t) => t.fromCaptainId === myCaptain?.id);

  return (
    <DashboardLayout requiredRole="CAPTAIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Transfers</h1>
            <p className="text-sm text-zinc-400">
              {dashboard?.transfersUsed || 0}/{season?.transferLimit || 2} transfers used
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" /> New Transfer
                </Button>
              }
            />
            <DialogContent className="border-zinc-800 bg-zinc-900">
              <DialogHeader>
                <DialogTitle className="text-white">Create Transfer Request</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-zinc-300">Player to Transfer</Label>
                  <Select value={selectedPlayer} onValueChange={(v) => v && setSelectedPlayer(v)}>
                    <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-800">
                      {(dashboard?.players || []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.position})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">To Captain</Label>
                  <Select value={targetCaptain} onValueChange={(v) => v && setTargetCaptain(v)}>
                    <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                      <SelectValue placeholder="Select captain" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-800">
                      {otherCaptains.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.user.name} ({c.team?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Reason</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for transfer"
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {incoming.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-base text-white">Incoming Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {incoming.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 p-4"
                >
                  <div>
                    <p className="text-sm text-zinc-400">Player: {t.playerId.slice(0, 8)}...</p>
                    <p className="text-xs text-zinc-500">{t.reason || 'No reason'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[t.status]}>{t.status}</Badge>
                    {t.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => acceptMutation.mutate(t.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(t.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base text-white">Outgoing Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outgoing.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">No outgoing requests</p>
            )}
            {outgoing.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 p-4"
              >
                <div>
                  <p className="text-sm text-zinc-400">Player: {t.playerId.slice(0, 8)}...</p>
                  <p className="text-xs text-zinc-500">{t.reason || 'No reason'}</p>
                </div>
                <Badge className={statusColors[t.status]}>{t.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
