import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AppConfig } from '../types';
import { cn } from '../lib/utils';

interface MaintenancePageProps {
  config: AppConfig | null;
}

export default function MaintenancePage({ config }: MaintenancePageProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!config?.maintenanceEndDate) return;

    const interval = setInterval(() => {
      const difference = +new Date(config.maintenanceEndDate!) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config?.maintenanceEndDate]);

  const endFormatted = config?.maintenanceEndDate
    ? new Date(config.maintenanceEndDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4 sm:p-6 font-inter select-none">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-gold/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl -z-10" />

      {/* Main Logo */}
      <div className="flex items-center gap-2 mb-8 select-none">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-brand-blue rounded-xl flex items-center justify-center text-brand-gold shadow-md">
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
        </div>
        <span className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-brand-blue">
          Prime<span className="text-brand-gold">Profit</span>
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 sm:p-10 max-w-xl w-full text-center space-y-6 sm:space-y-8 relative overflow-hidden"
      >
        {/* Warning Badge Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-brand-gold" />

        {/* Floating animated icon */}
        <div className="flex justify-center select-none pt-2">
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 4, 
              ease: "easeInOut" 
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-gold/10 text-brand-gold rounded-3xl flex items-center justify-center shadow-inner"
          >
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2.2} />
          </motion.div>
        </div>

        {/* Heading & description */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight font-poppins px-1">
            Website Under Maintenance
          </h1>
          <p className="text-[#555] text-sm sm:text-base leading-relaxed font-medium md:px-4">
            {config?.maintenanceMessage || "We are currently performing scheduled maintenance to improve our services. We'll be back online shortly!"}
          </p>
        </div>

        {/* Expected date display card */}
        {endFormatted && (
          <div className="bg-[#F5F7FA] border border-slate-100 rounded-2xl py-3 px-4 sm:px-6 inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 mx-auto sm:max-w-md w-full">
            <Clock className="text-brand-blue w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm text-[#555] font-bold">
              Expected Return: <span className="text-brand-blue font-extrabold">{endFormatted}</span>
            </span>
          </div>
        )}

        {/* Live dynamic Countdown Grid */}
        {timeLeft && (
          <div className="space-y-4 pt-1 sm:pt-2 border-t border-slate-100">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-extrabold">
              Maintenance Ends In
            </h3>
            
            <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm sm:max-w-md mx-auto">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-[#0A1F44] text-white rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center shadow-lg"
                >
                  <span className="text-lg sm:text-3xl font-black font-poppins leading-none">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-xs text-brand-gold font-bold uppercase tracking-wider mt-1 sm:mt-1.5">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Floating actions (Sign out for Users) */}
      {auth.currentUser && (
        <div className="mt-8 flex items-center justify-center text-xs sm:text-sm font-bold text-slate-400 select-none">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/50 border border-transparent hover:border-slate-200/60 font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out User</span>
          </button>
        </div>
      )}
    </div>
  );
}
