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
  HelpCircle
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);

  const stats = [
    { 
      label: "Today's Earnings", 
      value: `$${profile?.totalEarnings.toFixed(2) || '0.00'}`, 
      icon: TrendingUp, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50" 
    },
    { 
      label: "Team Earnings", 
      value: `$${profile?.teamEarnings.toFixed(2) || '0.00'}`, 
      icon: Users, 
      color: "text-blue-600", 
      bg: "bg-blue-50" 
    },
    { 
      label: "Rewards", 
      value: `$${profile?.rewards.toFixed(2) || '0.00'}`, 
      icon: Gift, 
      color: "text-purple-600", 
      bg: "bg-purple-50" 
    },
    { 
      label: "Total Balance", 
      value: `$${profile?.balance.toFixed(2) || '0.00'}`, 
      icon: Wallet, 
      color: "text-amber-600", 
      bg: "bg-amber-50" 
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
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Hello, {profile?.username}!</h1>
          <p className="text-slate-500 mt-1">Welcome back to your investment dashboard.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 pl-4 border rounded-2xl">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Referral Code</span>
            <span className="font-mono font-bold text-slate-800">{profile?.referralCode}</span>
          </div>
          <button 
            onClick={handleCopy}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              copied ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <Copy size={18} />
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-sm font-medium">{stat.label}</span>
              <span className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2rem] text-white overflow-hidden relative shadow-xl shadow-blue-200">
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[200px]">
              <div>
                <h2 className="text-2xl font-bold mb-2">Prime Profits await</h2>
                <p className="text-blue-100 max-w-sm">Start your investment cycle today and earn 1.8% daily profit on your reserves.</p>
              </div>
              <div className="mt-8">
                <Link to="/earn" className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 w-fit hover:bg-blue-50 transition-colors shadow-lg">
                  Start Earning
                  <ChevronRight size={20} />
                </Link>
              </div>
            </div>
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          </section>

          {/* UID Info */}
          <section className="bg-white p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <UserIcon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Personal UID</h3>
                <p className="text-slate-500 text-sm font-mono tracking-wider">{profile?.uid}</p>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-50 rounded-full border">
              Verified User
            </div>
          </section>
        </div>

        {/* Recent Activity Sidebar would go here */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/assets" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100 group">
                <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wallet size={20} />
                </div>
                <span className="text-xs font-bold">Deposit</span>
              </Link>
              <Link to="/earn" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 group">
                <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp size={20} />
                </div>
                <span className="text-xs font-bold">Invest</span>
              </Link>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl">
            <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
              <HelpCircle size={16} />
              Need Help?
            </h4>
            <p className="text-amber-700 text-xs leading-relaxed">
              Facing issues with your account or deposits? Contact our admin support on Telegram for quick assistance.
            </p>
            <Link to="/support" className="mt-4 inline-block text-xs font-bold text-amber-900 underline hover:no-underline">
              Visit Support Section
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
