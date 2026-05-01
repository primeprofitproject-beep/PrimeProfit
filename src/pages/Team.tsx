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

    // We can now use teamStats from the profile for real-time overview
    if (profile.teamStats) {
      setTeamStats({
        total: profile.teamStats.levelA + profile.teamStats.levelB + profile.teamStats.levelC,
        levelA: profile.teamStats.levelA,
        levelB: profile.teamStats.levelB,
        levelC: profile.teamStats.levelC
      });
    }

    // Keep the level A snapshot for list of direct referrals if needed (though not implemented in UI yet)
    const unsubscribe = onSnapshot(query(collection(db, 'referrals'), where('userId', '==', profile.uid)), (snap) => {
      // If teamStats is missing in profile (old user), compute levelA at least
      if (!profile.teamStats) {
        setTeamStats(prev => ({
          ...prev,
          levelA: snap.size,
          total: snap.size
        }));
      }
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
        <h1 className="text-3xl font-bold text-[#1A1A1A] font-poppins flex items-center gap-3">
          <Users className="text-[#0A1F44]" size={32} />
          My Team
        </h1>
        <p className="text-[#6B7280] mt-1 font-inter">Grow your network and earn multi-level rewards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
        <div className="bg-[#0A1F44] p-8 rounded-[2.5rem] shadow-soft flex flex-col justify-between border border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#FFD700]">
                <Share2 size={24} />
              </div>
              <h2 className="text-xl font-bold font-poppins">Invite Friends</h2>
            </div>
            <p className="text-[#6B7280] text-sm mb-8 max-w-sm leading-relaxed font-inter">
              Share your unique referral link and earn commissions from your team's activities up to 3 levels deep.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] ml-1 font-inter">Your Referral Link</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 p-3.5 rounded-2xl border border-white/10 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap text-white/70">
                  {referralLink}
                </div>
                <button 
                  onClick={copyLink}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all shadow-sm shrink-0",
                    copied ? "bg-[#00C853] text-white" : "bg-[#FFD700] text-[#0A1F44] hover:scale-105"
                  )}
                >
                  {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-12 h-12 bg-[#F5F7FA] rounded-2xl flex items-center justify-center text-[#FFD700]">
                <Trophy size={24} />
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] font-poppins">Team Overview</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-[#F5F7FA] rounded-3xl border border-transparent hover:border-[#0A1F44]/10 transition-all">
              <span className="text-[#6B7280] text-xs font-bold uppercase tracking-widest block mb-1 font-inter">Total Members</span>
              <span className="text-2xl font-bold text-[#1A1A1A] font-poppins">{teamStats.total}</span>
            </div>
            <div className="p-6 bg-[#F5F7FA] rounded-3xl border border-transparent hover:border-[#0A1F44]/10 transition-all">
              <span className="text-[#6B7280] text-xs font-bold uppercase tracking-widest block mb-1 font-inter">Level A</span>
              <span className="text-2xl font-bold text-[#1A1A1A] font-poppins">{teamStats.levelA}</span>
            </div>
            <div className="p-6 bg-[#F5F7FA] rounded-3xl border border-transparent hover:border-[#0A1F44]/10 transition-all">
              <span className="text-[#6B7280] text-xs font-bold uppercase tracking-widest block mb-1 font-inter">Level B</span>
              <span className="text-2xl font-bold text-[#1A1A1A] font-poppins">{teamStats.levelB}</span>
            </div>
            <div className="p-6 bg-[#F5F7FA] rounded-3xl border border-transparent hover:border-[#0A1F44]/10 transition-all">
              <span className="text-[#6B7280] text-xs font-bold uppercase tracking-widest block mb-1 font-inter">Level C</span>
              <span className="text-2xl font-bold text-[#1A1A1A] font-poppins">{teamStats.levelC}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-soft border-dashed border-[#0A1F44]/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[#1A1A1A] font-poppins flex items-center gap-2">
              <MessageSquare className="text-[#00C853]" size={24} />
              Claiming Referral Rewards
            </h3>
            <p className="text-[#6B7280] text-sm max-w-xl font-inter">
              Referral rewards are not automated. To claim your earnings from team activities, please apply in our official Telegram group.
            </p>
          </div>
          <a
            href="https://t.me/primesprofit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 bg-[#0A1F44] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/10 hover:bg-[#142B5F] transition-all flex items-center gap-2 justify-center font-poppins"
          >
            Apply Rewards
          </a>
        </div>
      </div>
    </div>
  );
}
