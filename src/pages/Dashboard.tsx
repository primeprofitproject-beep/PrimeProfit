/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from '../App';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Gift, 
  Wallet,
  Copy,
  ChevronRight,
  User as UserIcon,
  HelpCircle,
  Check,
  History
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { doc, getDoc, setDoc, Timestamp, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    if (!profile) return;

    // Ensure the user's referral code is in the referralCodes tracking collection
    const syncReferralCode = async () => {
      if (!profile?.referralCode) return;
      
      try {
        const refDocRef = doc(db, 'referralCodes', profile.referralCode.toUpperCase());
        const refDoc = await getDoc(refDocRef);
        
        if (!refDoc.exists()) {
          console.log("Syncing missing referral code mapping...");
          await setDoc(refDocRef, {
            uid: profile.uid,
            createdAt: profile.createdAt || Timestamp.now()
          });
        }
      } catch (err) {
        console.error("Failed to sync referral code:", err);
      }
    };

    syncReferralCode();

    // Fetch today's earnings
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTimestamp = Timestamp.fromDate(startOfToday);

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      where('timestamp', '>=', startTimestamp),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (['cycle_profit', 'cycle_earning', 'reward', 'withdrawal_refund', 'admin_adjustment'].includes(data.type)) {
          // Only add positive adjustments if needed, but primarily cycle_profit and reward
          if (data.amount > 0) total += data.amount;
        }
      });
      setTodayEarnings(total);
    }, (err) => {
      console.error("Dashboard onSnapshot error:", err);
      // We don't want to throw here to avoid crashing the whole dashboard, but we log it.
    });

    return () => unsubscribe();
  }, [profile]);

  const stats = [
    { 
      label: "Total Earnings", 
      value: `$${(profile?.totalEarnings || 0).toFixed(2)}`, 
      icon: TrendingUp, 
      color: "text-[#FFD700]", 
      bg: "bg-[#FFD700]/10",
      border: "border-[#FFD700]/20"
    },
    { 
      label: "Today's Earnings", 
      value: `$${todayEarnings.toFixed(2)}`, 
      icon: TrendingUp, 
      color: "text-brand-green", 
      bg: "bg-brand-green/10",
      border: "border-brand-green/20"
    },
    { 
      label: "Team Earnings", 
      value: `$${profile?.teamEarnings.toFixed(2) || '0.00'}`, 
      icon: Users, 
      color: "text-brand-blue", 
      bg: "bg-brand-blue/10",
      border: "border-brand-blue/20"
    },
    { 
      label: "Rewards", 
      value: `$${profile?.rewards.toFixed(2) || '0.00'}`, 
      icon: Gift, 
      color: "text-brand-gold", 
      bg: "bg-brand-gold/10",
      border: "border-brand-gold/20"
    },
    { 
      label: "Total Balance", 
      value: `$${profile?.balance.toFixed(2) || '0.00'}`, 
      icon: Wallet, 
      color: "text-brand-blue", 
      bg: "bg-slate-900/5",
      border: "border-slate-900/10"
    },
  ];

  const handleCopy = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">
            Welcome back, <span className="text-brand-blue">{profile?.username}</span>
          </h1>
          <p className="text-brand-text-muted mt-1 font-medium italic">Your portfolio is performing with targeted daily ROI.</p>
        </div>
        <Link 
          to="/earnings-history"
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-xl soft-shadow font-bold text-sm text-brand-blue hover:bg-slate-50 transition-all"
        >
          <History size={18} className="text-brand-gold" />
          Earnings History
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "bg-white p-6 rounded-xl border soft-shadow flex flex-col justify-between min-h-[140px]",
              stat.border
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">{stat.label}</span>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={stat.color} size={20} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-display font-bold text-slate-900">{stat.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Banner */}
        <div className="lg:col-span-2 space-y-8">
          <section className="relative overflow-hidden bg-brand-blue rounded-2xl p-8 lg:p-14 text-white shadow-xl shadow-brand-blue/20">
            <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px]" />
            </div>
            
            <div className="relative z-10 max-w-sm">
              <span className="inline-block px-3 py-1 bg-brand-gold text-brand-blue rounded-lg text-[10px] font-bold uppercase tracking-widest mb-4">Prime Opportunity</span>
              <h2 className="text-3xl font-display font-bold mb-4 leading-tight">
                Unlock Daily ROI on All Assets
              </h2>
              <p className="text-slate-300 mb-8 font-medium">
                Our automated cycle works while you sleep. Active management, zero hassle.
              </p>
              <Link 
                to="/earn"
                className="inline-flex items-center gap-2 bg-brand-gold text-brand-blue px-8 py-4 rounded-xl font-bold shadow-lg shadow-brand-gold/20 hover:scale-105 active:scale-95 transition-all text-sm"
              >
                Start Earning Cycle
                <ChevronRight size={18} strokeWidth={3} />
              </Link>
            </div>
          </section>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link to="/assets" className="group p-6 bg-white border border-slate-100 rounded-xl soft-shadow hover:border-brand-blue transition-all text-center">
              <div className="w-12 h-12 bg-brand-blue/5 rounded-xl flex items-center justify-center text-brand-blue mx-auto mb-3 group-hover:bg-brand-blue group-hover:text-white transition-all">
                <Wallet size={24} />
              </div>
              <span className="text-sm font-bold block text-slate-700">Add Deposit</span>
            </Link>
            <Link to="/earn" className="group p-6 bg-white border border-slate-100 rounded-xl soft-shadow hover:border-brand-green transition-all text-center">
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green mx-auto mb-3 group-hover:bg-brand-green group-hover:text-white transition-all">
                <TrendingUp size={24} />
              </div>
              <span className="text-sm font-bold block text-slate-700">View Cycle</span>
            </Link>
            <Link to="/team" className="group p-6 bg-white border border-slate-100 rounded-xl soft-shadow hover:border-brand-gold transition-all text-center">
              <div className="w-12 h-12 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold mx-auto mb-3 group-hover:bg-brand-gold group-hover:text-brand-blue transition-all font-bold">
                <Users size={24} />
              </div>
              <span className="text-sm font-bold block text-slate-700">Team Stats</span>
            </Link>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-xl border border-slate-100 soft-shadow">
            <h3 className="font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Copy size={18} className="text-brand-gold" />
              Refer Your Peers
            </h3>
            
            <div className="relative group">
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Your Unique Code</span>
                <span className="text-xl font-display font-bold text-brand-blue leading-none">{profile?.referralCode}</span>
              </div>
              <button 
                onClick={handleCopy}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all active:scale-95",
                  copied ? "bg-brand-green text-white" : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                )}
              >
                {copied ? <Check size={18} /> : <div className="flex items-center gap-1"><Copy size={14} /><span className="text-[10px] font-bold">Copy</span></div>}
              </button>
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-brand-text-muted uppercase tracking-widest">
                <span>Account Tier</span>
                <span className="text-brand-gold">Titanium</span>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[11px] text-brand-text-muted leading-relaxed font-medium italic">
                  Earn up to 5% instantly on your levels A, B, and C. Every friend you invite brings you closer to VIP rewards.
                </p>
              </div>
            </div>
          </section>

          <div className="bg-slate-900 p-6 rounded-xl text-white shadow-lg shadow-slate-200">
            <h4 className="font-display font-bold text-brand-gold text-sm flex items-center gap-2 mb-3">
              <HelpCircle size={18} />
              Support Portal
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed font-medium mb-5">
              Experiencing delays or need help with withdrawals? Our priority desk is available 18h/7.
            </p>
            <Link to="/support" className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-all border border-white/5">
              Open Support Ticket
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
