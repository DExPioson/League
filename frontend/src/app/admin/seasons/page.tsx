'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import api from '@/lib/api';
import { Season } from '@/types';
import { toast } from 'sonner';
import { Plus, Calendar, Users, Archive } from 'lucide-react';

export default function SeasonsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState(100000);
  const [transferLimit, setTransferLimit] = useState(2);

  const { data: seasons = [] } = useQuery<Season[]>({
    queryKey: ['seasons'],
    queryFn: () => api.get('/seasons').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; budgetPerCaptain: number; transferLimit: number }) =>
      api.post('/seasons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setOpen(false);
      setName('');
      toast.success('Season created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/seasons/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Season activated');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/seasons/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Season archived');
    },
  });

  const statusColor: Record<string, string> = {
    DRAFT: 'bg-zinc-600',
    ACTIVE: 'bg-green-600',
    ARCHIVED: 'bg-zinc-700 text-zinc-400',
  };

  return (
    <DashboardLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Seasons</h1>
            <p className="text-sm text-zinc-400">Manage league seasons</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" /> New Season
                </Button>
              }
            />
            <DialogContent className="border-zinc-800 bg-zinc-900">
              <DialogHeader>
                <DialogTitle className="text-white">Create Season</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({ name, budgetPerCaptain: budget, transferLimit });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-zinc-300">Season Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Friends Football League 2026"
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Budget Per Captain</Label>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    required
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Transfer Limit</Label>
                  <Input
                    type="number"
                    value={transferLimit}
                    onChange={(e) => setTransferLimit(Number(e.target.value))}
                    required
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  Create Season
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => (
            <Card key={season.id} className="border-zinc-800 bg-zinc-900">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white">{season.name}</CardTitle>
                  <Badge className={statusColor[season.status]}>{season.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Users className="h-3.5 w-3.5" />
                    {season._count?.players || 0} Players
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {season._count?.captains || 0} Captains
                  </div>
                </div>
                <div className="text-sm text-zinc-400">
                  Budget: <span className="text-white">{season.budgetPerCaptain.toLocaleString()}</span> per captain
                </div>
                <div className="flex gap-2">
                  {season.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      onClick={() => activateMutation.mutate(season.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Activate
                    </Button>
                  )}
                  {season.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => archiveMutation.mutate(season.id)}
                      className="border-zinc-700 text-zinc-300"
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
