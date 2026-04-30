/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Share2, 
  Copy, 
  CheckCircle2,
  Trophy,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function TeamPage() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [teamStats, setTeamStats] = useState({
    total: 0,
    levelA: 0,
    levelB: 0,
    levelC: 0
  });

  useEffect(() => {
    if (!profile) return;

    // We'll just fetch Level A for now as Level B/C require recursive fetching or deeper structure
    // To properly show B/C we'd need a collection that tracks these relationships
    const unsubscribe = onSnapshot(query(collection(db, 'referrals'), where('userId', '==', profile.uid)), (snap) => {
      setTeamStats(prev => ({
        ...prev,
        levelA: snap.size,
        total: snap.size // simplified for now
      }));
    });

    return () => unsubscribe();
  }, [profile]);

  const referralLink = `${window.location.origin}/signup?ref=${profile?.referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Users className="text-blue-600" size={32} />
          My Team
        </h1>
        <p className="text-slate-500 mt-1">Grow your network and earn multi-level rewards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[2.5rem] shadow-xl shadow-blue-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Share2 size={24} />
              </div>
              <h2 className="text-xl font-bold">Invite Friends</h2>
            </div>
            <p className="text-blue-100 mb-8 max-w-sm leading-relaxed">
              Share your unique referral link and earn commissions from your team's activities up to 3 levels deep.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 ml-1">Your Referral Link</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/10 p-3.5 rounded-2xl border border-white/10 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                  {referralLink}
                </div>
                <button 
                  onClick={copyLink}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all shadow-sm shrink-0",
                    copied ? "bg-white text-blue-600" : "bg-blue-500 text-white hover:bg-blue-400"
                  )}
                >
                  {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-500">
                <Trophy size={24} />
              </div>
              <h2 className="text-xl font-bold">Team Overview</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
              <span className="text-slate-400 text-xs block mb-1">Total Members</span>
              <span className="text-2xl font-bold text-white">{teamStats.total}</span>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
              <span className="text-slate-400 text-xs block mb-1">Level A</span>
              <span className="text-2xl font-bold text-white">{teamStats.levelA}</span>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
              <span className="text-slate-400 text-xs block mb-1">Level B</span>
              <span className="text-2xl font-bold text-white uppercase text-xs opacity-50">Coming Soon</span>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
              <span className="text-slate-400 text-xs block mb-1">Level C</span>
              <span className="text-2xl font-bold text-white uppercase text-xs opacity-50">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm border-dashed">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="text-blue-600" size={24} />
              Claiming Referral Rewards
            </h3>
            <p className="text-slate-500 text-sm max-w-xl">
              Referral rewards are not automated. To claim your earnings from team activities, please apply in our official Telegram group.
            </p>
          </div>
          <a
            href="https://t.me/+N5eqijhuij03NDI0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 justify-center"
          >
            Apply Rewards
          </a>
        </div>
      </div>
    </div>
  );
}
