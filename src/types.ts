/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Timestamp } from 'firebase/firestore';

export interface TeamStats {
  levelA: number;
  levelB: number;
  levelC: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  referralCode: string;
  referredBy?: string;
  uplinePath?: string[]; // [LevelA_UID, LevelB_UID, LevelC_UID]
  teamStats?: TeamStats;
  balance: number;
  totalEarnings: number;
  teamEarnings: number;
  rewards: number;
  todayEarnings?: number;
  lastCycleAt?: Timestamp;
  status: 'active' | 'blocked';
  isAdmin: boolean;
  createdAt: Timestamp;
}

export interface Reserve {
  id: string;
  userId: string;
  amount: number;
  profit: number;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'active' | 'completed';
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  proof?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Timestamp;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Timestamp;
}

export interface Referral {
  id: string;
  userId: string;
  referredUserId: string;
  level: 'A' | 'B' | 'C';
}

export interface EarningsCycle {
  id: string;
  userId: string;
  balanceAtStart: number;
  profitPercentage: number;
  profitAmount: number;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'active' | 'completed';
  completedAt?: Timestamp;
}
