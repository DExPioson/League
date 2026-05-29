export type UserRole = 'ADMIN' | 'CAPTAIN' | 'PLAYER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Season {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  budgetPerCaptain: number;
  transferLimit: number;
  auctionStatus: 'NOT_STARTED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
  transferWindowStatus: 'CLOSED' | 'OPEN';
  createdAt: string;
  _count?: { players: number; captains: number };
}

export interface Player {
  id: string;
  seasonId: string;
  name: string;
  age?: number;
  position: string;
  preferredFoot?: string;
  rating?: number;
  basePrice: number;
  soldPrice?: number;
  photo?: string;
  notes?: string;
  status: 'REGISTERED' | 'IN_AUCTION' | 'SOLD' | 'UNSOLD' | 'TRANSFERRED' | 'UNAVAILABLE';
  currentTeamId?: string;
  currentTeam?: { id: string; name: string };
}

export interface Captain {
  id: string;
  userId: string;
  seasonId: string;
  teamId?: string;
  startingBudget: number;
  spentAmount: number;
  remainingBudget: number;
  transfersUsed: number;
  user: { id: string; name: string; email: string };
  team?: Team & { _count?: { players: number } };
}

export interface Team {
  id: string;
  seasonId: string;
  captainId: string;
  name: string;
  players?: Player[];
}

export interface Bid {
  id: string;
  seasonId: string;
  playerId: string;
  captainId: string;
  amount: number;
  createdAt: string;
}

export interface TransferRequest {
  id: string;
  seasonId: string;
  playerId: string;
  fromCaptainId: string;
  toCaptainId: string;
  requestedById: string;
  reason?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
}

export interface AuctionState {
  auctionStatus: string;
  currentPlayer: Player | null;
  highestBid: { amount: number; captainId: string; captainName: string } | null;
  captains: Array<{
    id: string;
    name: string;
    teamName?: string;
    remainingBudget: number;
    spentAmount: number;
  }>;
  timerSeconds?: number;
}

export interface AdminDashboard {
  totalPlayers: number;
  soldPlayers: number;
  unsoldPlayers: number;
  totalSpent: number;
  pendingTransfers: number;
  captains: Array<{
    captainId: string;
    name: string;
    teamName?: string;
    spent: number;
    remaining: number;
    players: number;
  }>;
}
