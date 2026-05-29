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
import { Plus, Shield, UserCheck, Eye, EyeOff } from 'lucide-react';

interface PreviousCaptain {
  userId: string;
  name: string;
  email: string;
  previousTeams: Array<{ teamName: string; seasonName: string; seasonId: string }>;
}

export default function CaptainsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // When picking a previous captain, store their userId (skip registration)
  const [selectedPreviousUserId, setSelectedPreviousUserId] = useState<string | null>(null);

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: captains = [] } = useQuery<Captain[]>({
    queryKey: ['captains', season?.id],
    queryFn: () => api.get(`/captains?seasonId=${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const { data: previousCaptains = [] } = useQuery<PreviousCaptain[]>({
    queryKey: ['previous-captains', season?.id],
    queryFn: () => api.get(`/captains/previous/suggestions?seasonId=${season!.id}`).then((r) => r.data),
    enabled: !!season?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedPreviousUserId) {
        // Re-use existing user — just create captain + team
        await api.post('/captains', {
          userId: selectedPreviousUserId,
          teamName,
          seasonId: season!.id,
        });
      } else {
        // New user — register then create captain
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captains'] });
      queryClient.invalidateQueries({ queryKey: ['previous-captains'] });
      resetForm();
      toast.success('Captain created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const resetForm = () => {
    setOpen(false);
    setEmail('');
    setTeamName('');
    setCaptainName('');
    setPassword('');
    setShowPassword(false);
    setSelectedPreviousUserId(null);
  };

  const selectPreviousCaptain = (prev: PreviousCaptain) => {
    setSelectedPreviousUserId(prev.userId);
    setCaptainName(prev.name);
    setEmail(prev.email);
    setPassword('');
    // Suggest previous team name
    if (prev.previousTeams.length > 0) {
      setTeamName(prev.previousTeams[0].teamName);
    }
  };

  const clearSelection = () => {
    setSelectedPreviousUserId(null);
    setCaptainName('');
    setEmail('');
    setTeamName('');
    setPassword('');
  };

  return (
    <DashboardLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Captains</h1>
            <p className="text-sm text-zinc-400">{captains.length}/3 captains assigned</p>
          </div>
          {captains.length < 3 && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger
                render={
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Captain
                  </Button>
                }
              />
              <DialogContent className="border-zinc-800 bg-zinc-900 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Captain</DialogTitle>
                </DialogHeader>

                {/* Previous Captains Recommendations */}
                {previousCaptains.length > 0 && !selectedPreviousUserId && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Previous Captains
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border border-zinc-800 p-2">
                      {previousCaptains.map((prev) => (
                        <button
                          key={prev.userId}
                          type="button"
                          onClick={() => selectPreviousCaptain(prev)}
                          className="flex w-full items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-left transition-colors hover:bg-zinc-700/50 hover:border-green-600/50"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20">
                            <UserCheck className="h-4 w-4 text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{prev.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{prev.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-400">
                              {prev.previousTeams[0]?.teamName}
                            </p>
                            <p className="text-xs text-zinc-600">
                              {prev.previousTeams[0]?.seasonName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-zinc-900 px-2 text-zinc-500">or create new</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected previous captain banner */}
                {selectedPreviousUserId && (
                  <div className="flex items-center justify-between rounded-lg border border-green-600/30 bg-green-600/10 p-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-300">
                        Using existing captain: <strong>{captainName}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs text-zinc-400 hover:text-white underline"
                    >
                      Change
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  {!selectedPreviousUserId && (
                    <>
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
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="border-zinc-700 bg-zinc-800 pr-10 text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
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
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {createMutation.isPending
                      ? 'Creating...'
                      : selectedPreviousUserId
                        ? 'Add to Season'
                        : 'Create Captain & Team'}
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
                      ₹{captain.startingBudget.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-red-400">
                      ₹{captain.spentAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-green-400">
                      ₹{captain.remainingBudget.toLocaleString()}
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
