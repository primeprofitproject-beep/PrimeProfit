/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  referralCode: string;
  referredBy?: string;
  balance: number;
  totalEarnings: number;
  teamEarnings: number;
  rewards: number;
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
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Timestamp;
}

export interface Referral {
  id: string;
  userId: string;
  referredUserId: string;
  level: 'A' | 'B' | 'C';
}

export interface AppConfig {
  firstUserCreated: boolean;
}
