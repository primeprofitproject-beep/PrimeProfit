/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  ChevronLeft,
  ArrowRight,
  History,
  Gift,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  query, 
  collection, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subDays } from 'date-fns';
import { cn } from '../lib/utils';

interface EarningsTransaction {
  id: string;
  amount: number;
  type: string;
  timestamp: Timestamp;
}

export default function EarningsHistoryPage() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<EarningsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // Filter for last 4 days
    const fourDaysAgo = subDays(new Date(), 4);
    fourDaysAgo.setHours(0, 0, 0, 0);
    const startTimestamp = Timestamp.fromDate(fourDaysAgo);

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      where('timestamp', '>=', startTimestamp),
      where('status', '==', 'completed'),
      where('type', 'in', ['cycle_profit', 'cycle_earning', 'reward']),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EarningsTransaction[];
      setHistory(data);
      setLoading(false);
    }, (err) => {
      console.error("Earnings history error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const getLabelByType = (type: string) => {
    switch (type) {
      case 'cycle_profit':
      case 'cycle_earning': return 'Cycle Earning';
      case 'reward': return 'Reward';
      default: return 'Bonus';
    }
  };

  const getIconByType = (type: string) => {
    switch (type) {
      case 'cycle_profit':
      case 'cycle_earning': return <TrendingUp size={16} className="text-[#00C853]" />;
      case 'reward': return <Gift size={16} className="text-[#FFD700]" />;
      default: return <History size={16} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 font-inter">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:text-brand-blue hover:bg-slate-50 transition-all soft-shadow"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] font-poppins flex items-center gap-3">
              Earnings History
            </h1>
            <p className="text-[#6B7280] mt-1 text-sm font-medium">Detailed log of your recent performance.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {/* Notice Card */}
        <div className="bg-[#0A1F44] p-8 rounded-[2.5rem] text-white flex items-center gap-6 shadow-xl shadow-blue-900/10 border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-[#FFD700] shrink-0 border border-white/10">
            <Calendar size={28} />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold font-poppins text-white">Focus Period</h4>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              We preserve high-density data for the most recent profit cycles and manual rewards for clarity.
            </p>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 soft-shadow overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between bg-[#F5F7FA]/30">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">Recent Activity Log</span>
             </div>
             <Search size={16} className="text-slate-300" />
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-slate-200 border-t-brand-blue rounded-full"
                />
                <span className="text-xs font-bold uppercase tracking-widest">Synchronizing...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="p-24 flex flex-col items-center justify-center gap-4 text-slate-300 opacity-40">
                <History size={64} strokeWidth={1} />
                <div className="text-center">
                  <p className="font-bold font-poppins text-slate-900 mb-1">No Recent Earnings</p>
                  <p className="text-xs">Your recent earnings will appear here.</p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {history.map((tx, i) => (
                  <motion.div 
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-6 md:p-8 hover:bg-[#F5F7FA]/50 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                        tx.type === 'cycle_profit' ? "bg-[#00C853]/5 text-[#00C853]" : "bg-[#FFD700]/10 text-[#FFD700]"
                      )}>
                        {tx.type === 'cycle_profit' ? <TrendingUp size={20} /> : <Gift size={20} />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[#00C853] font-poppins">+${tx.amount.toFixed(2)}</span>
                          <div className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-sm font-bold text-slate-700 font-poppins">{getLabelByType(tx.type)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {format(tx.timestamp.toMillis(), 'dd MMM yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {format(tx.timestamp.toMillis(), 'h:mm a')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-3 pr-2">
                       <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Financial record verified</span>
                       <ArrowRight size={16} className="text-slate-200 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    {/* Mobile Format (As per example) */}
                    <div className="md:hidden pt-2 border-t border-slate-50 mt-2">
                      <div className="p-3 bg-slate-50 rounded-xl text-[10px] font-mono text-slate-500 italic">
                        “+${tx.amount.toFixed(2)} - {getLabelByType(tx.type)} - {format(tx.timestamp.toMillis(), 'dd MMM yyyy, h:mm a')}”
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer Card */}
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-3 text-slate-400">
                <History size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Auto-archived performance history</span>
             </div>
             <Link 
              to="/earn"
              className="text-xs font-bold text-brand-blue hover:text-brand-gold transition-colors flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200"
             >
               Start New Cycle
               <ArrowRight size={14} />
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
