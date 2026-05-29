import Link from 'next/link';
import { Trophy, Gavel, ArrowLeftRight, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-600 text-2xl font-bold text-white">
            FL
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white">
          Football League
          <span className="block text-green-400">Auction Platform</span>
        </h1>
        <p className="mb-10 text-lg text-zinc-400">
          Live player auctions, real-time bidding, team management, and transfers
          — all in one place.
        </p>

        <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Users, label: 'Player Pool', desc: 'Register & manage' },
            { icon: Gavel, label: 'Live Auction', desc: 'Real-time bidding' },
            { icon: Trophy, label: 'Team Builder', desc: 'Build your squad' },
            { icon: ArrowLeftRight, label: 'Transfers', desc: 'Trade players' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center"
            >
              <item.icon className="mx-auto mb-2 h-8 w-8 text-green-400" />
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-lg bg-green-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-green-700"
        >
          Login to Dashboard
        </Link>
      </div>
    </div>
  );
}
