/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, Timestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { PiggyBank, Clock, CheckCircle2, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Reserve } from '../types';

export default function EarnPage() {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeReserves, setActiveReserves] = useState<Reserve[]>([]);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'reserves'),
      where('userId', '==', profile.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reserves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reserve));
      setActiveReserves(reserves);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleStartReserve = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const reserveAmount = parseFloat(amount);
    if (isNaN(reserveAmount) || reserveAmount < 30) {
      setError('Minimum reserve amount is $30');
      return;
    }

    if (reserveAmount > profile.balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const startTime = Timestamp.now();
      const endTime = new Timestamp(startTime.seconds + 24 * 60 * 60, startTime.nanoseconds);
      const profit = reserveAmount * 0.018;

      // 1. Create reserve record
      await addDoc(collection(db, 'reserves'), {
        userId: profile.uid,
        amount: reserveAmount,
        profit: profit,
        startTime: startTime,
        endTime: endTime,
        status: 'active'
      });

      // 2. Deduct from balance
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(-reserveAmount)
      });

      setSuccess('Reserve cycle started successfully!');
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to start reserve');
    } finally {
      setLoading(false);
    }
  };

  const isCycleCompleted = (endTime: Timestamp) => {
    return endTime.toMillis() <= Date.now();
  };

  const handleClaim = async (reserve: Reserve) => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Update reserve status
      await updateDoc(doc(db, 'reserves', reserve.id), {
        status: 'completed'
      });

      // 2. Return principal + profit
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(reserve.amount + reserve.profit),
        totalEarnings: increment(reserve.profit)
      });
      
      setSuccess('Earnings claimed successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to claim earnings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <PiggyBank className="text-blue-600" size={32} />
          Earn Reserve
        </h1>
        <p className="text-slate-500 mt-1">Lock your assets for 24 hours and earn 1.8% fixed profit.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form */}
        <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm h-fit">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800">Start New Cycle</h2>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">Available Balance</span>
              <span className="text-blue-700 font-bold">${profile?.balance.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handleStartReserve} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 ml-1">Lock Amount</label>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Min $30.00</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold text-lg"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-dashed">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Daily Profit</span>
                <span className="text-emerald-600 font-bold">1.8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Estimated Returns</span>
                <span className="text-slate-800 font-bold">
                  ${(parseFloat(amount) ? parseFloat(amount) * 0.018 : 0).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t flex justify-between text-sm font-bold">
                <span className="text-slate-800">Total after 24h</span>
                <span className="text-blue-600">
                  ${(parseFloat(amount) ? parseFloat(amount) * 1.018 : 0).toFixed(2)}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-2xl flex items-center gap-2">
                <CheckCircle2 size={18} />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : (
                <>
                  Start Cycle
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </section>

        {/* Active Cycles */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 px-2 flex items-center gap-2">
            Active Cycles
            <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full">
              {activeReserves.length}
            </span>
          </h2>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {activeReserves.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] border border-dashed flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <Clock size={32} />
                </div>
                <p className="text-slate-400 font-medium">No active cycles found.</p>
                <p className="text-slate-300 text-xs mt-1">Start one to see it here.</p>
              </div>
            ) : (
              activeReserves.map((reserve) => (
                <motion.div
                  key={reserve.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Invested Amount</span>
                      <h3 className="text-xl font-bold text-slate-800">${reserve.amount.toFixed(2)}</h3>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                      isCycleCompleted(reserve.endTime) ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {isCycleCompleted(reserve.endTime) ? 'Completed' : 'Running'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 text-xs block mb-1">Total Profit</span>
                      <span className="text-emerald-600 font-bold">+${reserve.profit.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 text-xs block mb-1">Time Left</span>
                      <span className="text-slate-800 font-bold truncate">
                        {isCycleCompleted(reserve.endTime) 
                          ? 'Matured' 
                          : formatDistanceToNow(reserve.endTime.toMillis(), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {isCycleCompleted(reserve.endTime) ? (
                    <button 
                      onClick={() => handleClaim(reserve)}
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      Claim Earnings
                      <TrendingUp size={18} />
                    </button>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-sm shadow-amber-200" />
                      <span className="text-amber-800 text-xs font-medium">Funds locked until maturity</span>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
