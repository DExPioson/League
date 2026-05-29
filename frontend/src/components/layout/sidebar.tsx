'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Season } from '@/types';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Gavel,
  ArrowLeftRight,
  Calendar,
  User,
  LogOut,
  Shield,
} from 'lucide-react';

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  auctionLink?: boolean;
}

const adminLinks: SidebarLink[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/seasons', label: 'Seasons', icon: Calendar },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/captains', label: 'Captains', icon: Shield },
  { href: '/admin/auction', label: 'Auction', icon: Gavel, auctionLink: true },
  { href: '/admin/transfers', label: 'Transfers', icon: ArrowLeftRight },
];

const captainLinks: SidebarLink[] = [
  { href: '/captain/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/captain/auction', label: 'Auction Room', icon: Gavel, auctionLink: true },
  { href: '/captain/team', label: 'My Team', icon: Trophy },
  { href: '/captain/transfers', label: 'Transfers', icon: ArrowLeftRight },
];

const playerLinks: SidebarLink[] = [
  { href: '/player/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/player/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  // Query active season to check auction status for LIVE indicator
  const { data: season } = useQuery<Season>({
    queryKey: ['active-season'],
    queryFn: () => api.get('/seasons/active').then((r) => r.data),
    refetchInterval: 5000,
    retry: false,
  });

  const isAuctionLive = season?.auctionStatus === 'LIVE';

  const links =
    user?.role === 'ADMIN'
      ? adminLinks
      : user?.role === 'CAPTAIN'
        ? captainLinks
        : playerLinks;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-3 border-b border-zinc-800 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 font-bold text-white">
          FL
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">Football League</h1>
          <p className="text-xs text-zinc-400">Auction Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          const showLive = 'auctionLink' in link && link.auctionLink && isAuctionLive;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-green-600/20 text-green-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
              {showLive && (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                  <span className="text-xs font-semibold text-green-400">LIVE</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-zinc-500">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            window.location.href = '/auth/login';
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
