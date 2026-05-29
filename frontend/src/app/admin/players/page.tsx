'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { Player, Season } from '@/types';
import { toast } from 'sonner';
import { Plus, Search, Star } from 'lucide-react';

const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

const statusColors: Record<string, string> = {
  REGISTERED: 'bg-blue-600',
  IN_AUCTION: 'bg-yellow-600',
  SOLD: 'bg-green-600',
  UNSOLD: 'bg-red-600',
  TRANSFERRED: 'bg-purple-600',
  UNAVAILABLE: 'bg-zinc-600',
};

export default function PlayersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [form, setForm] = useState({
    name: '',
    position: 'Forward',
    basePrice: 5000,
    age: 22,
    preferredFoot: 'Right',
    rating: 7,
  });

  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['players', season?.id, search, filterPosition, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (season?.id) params.set('seasonId', season.id);
      if (search) params.set('search', search);
      if (filterPosition !== 'all') params.set('position', filterPosition);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      return api.get(`/players?${params}`).then((r) => r.data);
    },
    enabled: !!season?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/players', { ...data, seasonId: season!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setOpen(false);
      toast.success('Player added');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/players/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player deleted');
    },
  });

  return (
    <DashboardLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Players</h1>
            <p className="text-sm text-zinc-400">{players.length} players in pool</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Player
                </Button>
              }
            />
            <DialogContent className="border-zinc-800 bg-zinc-900">
              <DialogHeader>
                <DialogTitle className="text-white">Add Player</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate(form);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Position</Label>
                    <Select value={form.position} onValueChange={(v) => v && setForm({ ...form, position: v })}>
                      <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-800">
                        {positions.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Base Price</Label>
                    <Input
                      type="number"
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Age</Label>
                    <Input
                      type="number"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Preferred Foot</Label>
                    <Select value={form.preferredFoot} onValueChange={(v) => v && setForm({ ...form, preferredFoot: v })}>
                      <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-800">
                        <SelectItem value="Right">Right</SelectItem>
                        <SelectItem value="Left">Left</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Rating</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={form.rating}
                      onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                      className="border-zinc-700 bg-zinc-800 text-white"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  Add Player
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border-zinc-700 bg-zinc-800 pl-10 text-white"
            />
          </div>
          <Select value={filterPosition} onValueChange={(v) => v && setFilterPosition(v)}>
            <SelectTrigger className="w-40 border-zinc-700 bg-zinc-800 text-white">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-800">
              <SelectItem value="all">All Positions</SelectItem>
              {positions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
            <SelectTrigger className="w-40 border-zinc-700 bg-zinc-800 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-800">
              <SelectItem value="all">All Status</SelectItem>
              {['REGISTERED', 'IN_AUCTION', 'SOLD', 'UNSOLD'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Player</TableHead>
                  <TableHead className="text-zinc-400">Position</TableHead>
                  <TableHead className="text-zinc-400">Rating</TableHead>
                  <TableHead className="text-zinc-400">Base Price</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Team</TableHead>
                  <TableHead className="text-zinc-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id} className="border-zinc-800">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{player.name}</p>
                        <p className="text-xs text-zinc-500">
                          Age {player.age} &middot; {player.preferredFoot || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300">{player.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-sm">{player.rating || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300">{player.basePrice.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[player.status] || 'bg-zinc-600'} variant="secondary">
                        {player.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {player.currentTeam?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {player.status === 'REGISTERED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteMutation.mutate(player.id)}
                        >
                          Delete
                        </Button>
                      )}
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
