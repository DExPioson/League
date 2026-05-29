'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { TransferRequest, Season } from '@/types';
import { toast } from 'sonner';
import { Check, X, ArrowLeftRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-600',
  ACCEPTED: 'bg-blue-600',
  REJECTED: 'bg-red-600',
  APPROVED: 'bg-green-600',
  CANCELLED: 'bg-zinc-600',
  COMPLETED: 'bg-green-700',
};

export default function AdminTransfersPage() {
  const queryClient = useQueryClient();

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: transfers = [] } = useQuery<TransferRequest[]>({
    queryKey: ['transfers', season?.id],
    queryFn: () => api.get(`/transfers?seasonId=${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/transfers/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfer approved and completed');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/transfers/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfer cancelled');
    },
  });

  const toggleWindow = useMutation({
    mutationFn: () => {
      const endpoint = season?.transferWindowStatus === 'OPEN' ? 'close' : 'open';
      return api.patch(`/seasons/${season!.id}/transfer-window/${endpoint}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-season'] });
      toast.success('Transfer window updated');
    },
  });

  return (
    <DashboardLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Transfers</h1>
            <p className="text-sm text-zinc-400">
              Window: {season?.transferWindowStatus || 'CLOSED'}
            </p>
          </div>
          <Button
            onClick={() => toggleWindow.mutate()}
            className={
              season?.transferWindowStatus === 'OPEN'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            {season?.transferWindowStatus === 'OPEN' ? 'Close Window' : 'Open Window'}
          </Button>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Player</TableHead>
                  <TableHead className="text-zinc-400">From</TableHead>
                  <TableHead className="text-zinc-400">To</TableHead>
                  <TableHead className="text-zinc-400">Reason</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id} className="border-zinc-800">
                    <TableCell className="text-white">{t.playerId.slice(0, 8)}...</TableCell>
                    <TableCell className="text-zinc-300">{t.fromCaptainId.slice(0, 8)}...</TableCell>
                    <TableCell className="text-zinc-300">{t.toCaptainId.slice(0, 8)}...</TableCell>
                    <TableCell className="text-zinc-400">{t.reason || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[t.status]}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {t.status === 'ACCEPTED' && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(t.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {['PENDING', 'ACCEPTED'].includes(t.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelMutation.mutate(t.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {transfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-zinc-500">
                      No transfer requests yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
