'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { Captain, Season } from '@/types';
import { toast } from 'sonner';
import { Plus, Shield } from 'lucide-react';

export default function CaptainsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [password, setPassword] = useState('');

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: captains = [] } = useQuery<Captain[]>({
    queryKey: ['captains', season?.id],
    queryFn: () => api.get(`/captains?seasonId=${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await api.post('/auth/register', {
        name: captainName,
        email,
        password,
        role: 'CAPTAIN',
      });
      await api.post('/captains', {
        userId: user.id,
        teamName,
        seasonId: season!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captains'] });
      setOpen(false);
      setEmail('');
      setTeamName('');
      setCaptainName('');
      setPassword('');
      toast.success('Captain created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <DashboardLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Captains</h1>
            <p className="text-sm text-zinc-400">{captains.length}/3 captains assigned</p>
          </div>
          {captains.length < 3 && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Captain
                  </Button>
                }
              />
              <DialogContent className="border-zinc-800 bg-zinc-900">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Captain</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Captain Name</Label>
                    <Input
                      value={captainName}
                      onChange={(e) => setCaptainName(e.target.value)}
                      required
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Team Name</Label>
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                      placeholder="Blue Warriors"
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Create Captain & Team
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Captain</TableHead>
                  <TableHead className="text-zinc-400">Team</TableHead>
                  <TableHead className="text-zinc-400">Budget</TableHead>
                  <TableHead className="text-zinc-400">Spent</TableHead>
                  <TableHead className="text-zinc-400">Remaining</TableHead>
                  <TableHead className="text-zinc-400">Players</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {captains.map((captain) => (
                  <TableRow key={captain.id} className="border-zinc-800">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20">
                          <Shield className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{captain.user.name}</p>
                          <p className="text-xs text-zinc-500">{captain.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {captain.team?.name || '-'}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {captain.startingBudget.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-red-400">
                      {captain.spentAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-green-400">
                      {captain.remainingBudget.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-white">
                      {captain.team?._count?.players || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
