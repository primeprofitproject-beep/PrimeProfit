/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, Timestamp, updateDoc, doc, increment, limit, orderBy, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { PiggyBank, Clock, CheckCircle2, AlertCircle, TrendingUp, Zap, Timer, Coins } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { EarningsCycle, UserProfile } from '../types';

export default function EarnPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeCycle, setActiveCycle] = useState<EarningsCycle | null>(null);

  const distributeTeamRewards = async (userUid: string, profitAmount: number) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUid));
      if (!userDoc.exists()) return;
      const userData = userDoc.data() as UserProfile;
      
      let uplinePath = userData.uplinePath || [];
      
      // Fallback for old users: recursively fetch 3 levels of referrers
      if (uplinePath.length === 0 && userData.referredBy) {
        let currentReferrerId = userData.referredBy;
        for (let i = 0; i < 3; i++) {
          if (!currentReferrerId) break;
          uplinePath.push(currentReferrerId);
          const refDoc = await getDoc(doc(db, 'users', currentReferrerId));
          if (!refDoc.exists()) break;
          currentReferrerId = refDoc.data().referredBy;
        }
      }

      // Rates: A (0) -> 5%, B (1) -> 2%, C (2) -> 1%
      const rates = [0.05, 0.02, 0.01];

      for (let i = 0; i < uplinePath.length; i++) {
        const uplineUid = uplinePath[i];
        if (!uplineUid) continue;

        const uplineDoc = await getDoc(doc(db, 'users', uplineUid));
        if (!uplineDoc.exists()) continue;
        const uplineData = uplineDoc.data() as UserProfile;

        // Eligibility Check
        const levelA = uplineData.teamStats?.levelA || 0;
        const levelB = uplineData.teamStats?.levelB || 0;
        const levelC = uplineData.teamStats?.levelC || 0;

        const isEligible = 
          uplineData.balance >= 500 && 
          levelA >= 3 && 
          (levelB + levelC) >= 5;

        if (isEligible) {
          const rewardAmount = profitAmount * rates[i];
          if (rewardAmount > 0) {
            await updateDoc(doc(db, 'users', uplineUid), {
              balance: increment(rewardAmount),
              totalEarnings: increment(rewardAmount),
              teamEarnings: increment(rewardAmount),
              todayEarnings: increment(rewardAmount)
            });

            await addDoc(collection(db, 'transactions'), {
              userId: uplineUid,
              amount: rewardAmount,
              type: 'team_reward',
              source: 'cycle_profit',
              fromUserId: userUid,
              level: i === 0 ? 'A' : (i === 1 ? 'B' : 'C'),
              status: 'completed',
              timestamp: Timestamp.now()
            });
          }
        }
      }
    } catch (err) {
      console.error("Team Reward Error:", err);
    }
  };

  useEffect(() => {
    // We don't need active cycle polling anymore as everything is instant
    // We rely on profile.lastCycleAt for interval logic
  }, [profile]);

  const handleStartCycle = async () => {
    if (!profile) return;

    if (profile.balance < 15) {
      setError('Minimum $15 required to start cycle');
      return;
    }

    // Check 24h interval
    if (isLocked) {
      setError('Cycle is currently in cooldown. Please wait.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const now = Timestamp.now();
      let profitAmount = 0;
      let profitPercentage = 0;

      if (profile.balance >= 15 && profile.balance < 30) {
        profitAmount = 0.30;
        profitPercentage = (0.30 / profile.balance) * 100;
      } else {
        profitAmount = profile.balance * 0.018;
        profitPercentage = 1.8;
      }

      // 1. Create completed cycle record
      await addDoc(collection(db, 'cycles'), {
        userId: profile.uid,
        balanceAtStart: profile.balance,
        profitPercentage: profitPercentage,
        profitAmount: profitAmount,
        startTime: now,
        endTime: now,
        status: 'completed',
        completedAt: now
      });

      // 2. Update user balance, total earnings and lastCycleAt
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(profitAmount),
        totalEarnings: increment(profitAmount),
        todayEarnings: increment(profitAmount),
        lastCycleAt: now
      });

      // 3. Log transaction
      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        amount: profitAmount,
        type: 'cycle_earning',
        status: 'completed',
        timestamp: now
      });

      // 4. Distribute Team Rewards
      distributeTeamRewards(profile.uid, profitAmount);

      setSuccess('Cycle started successfully. Next cycle available after 24 hours.');
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, 'cycles');
      }
      setError(err.message || 'Failed to start cycle');
    } finally {
      // Small artificial delay to prevent rapid double clicks
      setTimeout(() => setLoading(false), 2000);
    }
  };

  const isLocked = profile?.lastCycleAt ? (Date.now() - profile.lastCycleAt.toMillis()) < (24 * 60 * 60 * 1000) : false;
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!profile?.lastCycleAt) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const lastAt = profile.lastCycleAt!.toMillis();
      const now = Date.now();
      const diff = (lastAt + 24 * 60 * 60 * 1000) - now;

      if (diff <= 0) {
        setTimeLeft('');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    const timer = setInterval(updateTimer, 1000);
    updateTimer();

    return () => clearInterval(timer);
  }, [profile?.lastCycleAt]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-display font-bold text-brand-blue flex items-center justify-center gap-3">
          <TrendingUp className="text-brand-gold" size={40} strokeWidth={3} />
          Profit Center
        </h1>
        <p className="text-brand-text-muted font-medium">Earn fixed daily profits and grow your portfolio passively.</p>
      </div>

      <div className="bg-white p-8 lg:p-12 rounded-2xl border soft-shadow relative overflow-hidden flex flex-col items-center">
        {/* Modern Accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-gold" />
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-blue/5 rounded-full" />
        
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="bg-brand-blue/5 px-4 py-1.5 rounded-lg mb-8 flex items-center gap-2">
            <Zap size={14} className="text-brand-gold fill-brand-gold" />
            <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest leading-none">Automated Interval Cycle</span>
          </div>

          <div className="text-center mb-10">
            <span className="text-xs text-brand-text-muted font-bold block mb-1 uppercase tracking-widest">Daily ROI</span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-display font-black text-brand-blue tracking-tighter">
                {profile && profile.balance < 30 ? '$0.30' : '1.8%'}
              </span>
              <span className="text-xl font-bold text-brand-green">LIVE</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 mb-10">
            <div className="p-5 bg-brand-bg rounded-xl border border-slate-100 flex flex-col items-center">
              <Zap size={20} className="text-brand-gold mb-2" />
              <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider block mb-1">Profit Growth</span>
              <span className="text-slate-900 font-bold text-center text-[11px] leading-tight">Daily Returns</span>
            </div>
            <div className="p-5 bg-brand-bg rounded-xl border border-slate-100 flex flex-col items-center">
              <Clock size={20} className="text-brand-blue mb-2" />
              <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider block mb-1">Frequency</span>
              <span className="text-slate-900 font-bold">Every 24H</span>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="p-6 bg-brand-blue text-white rounded-xl flex items-center justify-between shadow-lg shadow-brand-blue/10">
              <div>
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest block">Trading Balance</span>
                <span className="text-2xl font-display font-bold leading-none">${profile?.balance.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest block">Instant Est. Yield</span>
                <span className="text-2xl font-display font-bold text-brand-gold leading-none">
                  +${(profile && profile.balance >= 15 && profile.balance < 30 ? 0.30 : (profile?.balance || 0) * 0.018).toFixed(2)}
                </span>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2 font-bold"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-brand-green/10 border border-brand-green/20 text-brand-green text-xs rounded-xl flex items-center gap-2 font-bold"
              >
                <CheckCircle2 size={16} />
                {success}
              </motion.div>
            )}

            {!isLocked ? (
              <button
                onClick={handleStartCycle}
                disabled={loading || (profile?.balance || 0) < 15}
                className="w-full group relative overflow-hidden bg-brand-blue text-white py-5 rounded-xl font-bold text-xl shadow-xl shadow-brand-blue/20 hover:bg-[#142B5F] disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {loading ? 'Confirming...' : (
                  <>
                    <Zap size={22} className="text-brand-gold fill-brand-gold" />
                    Start Cycle Now
                  </>
                )}
              </button>
            ) : (
              <div className="w-full p-6 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-gold">
                    <Clock size={24} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Cycle Executed</span>
                    <span className="text-xs text-brand-text-muted font-medium">Resetting in {timeLeft || '00:00:00'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest block">Next Round</span>
                  <span className="text-xs font-bold text-brand-gold">{timeLeft || 'READY'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="bg-brand-bg p-8 rounded-2xl border border-slate-100 flex flex-col items-center">
        <h3 className="font-display font-bold text-brand-blue mb-6">Cycle Protocol</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-lg">
          <div className="space-y-1">
            <span className="text-brand-gold font-bold text-lg block">01. Entry</span>
            <p className="text-[11px] text-brand-text-muted leading-relaxed font-medium">Balance above $15 automatically qualifies for daily automated trading.</p>
          </div>
          <div className="space-y-1">
            <span className="text-brand-gold font-bold text-lg block">02. Trade</span>
            <p className="text-[11px] text-brand-text-muted leading-relaxed font-medium">Bot trades your capital across top-tier crypto markets for 24h.</p>
          </div>
          <div className="space-y-1">
            <span className="text-brand-gold font-bold text-lg block">03. Yield</span>
            <p className="text-[11px] text-brand-text-muted leading-relaxed font-medium">Fixed profit is instantly claimed and credited back to your reserve.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
