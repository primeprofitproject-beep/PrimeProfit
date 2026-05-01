/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { HelpCircle, MessageCircle, Info, ExternalLink, ShieldQuestion } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 font-inter">
      <div className="text-center md:text-left space-y-2">
        <h1 className="text-3xl font-bold text-[#1A1A1A] font-poppins flex items-center justify-center md:justify-start gap-4">
          <div className="w-12 h-12 bg-[#0A1F44] rounded-2xl flex items-center justify-center text-[#FFD700] shadow-soft">
            <HelpCircle size={24} />
          </div>
          Support Center
        </h1>
        <p className="text-[#6B7280]">We're here to help you with any questions or issues.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[2.5rem] border shadow-soft space-y-8 flex flex-col justify-between"
        >
          <div className="space-y-6">
            <div className="w-16 h-16 bg-[#00C853]/10 rounded-[1.5rem] flex items-center justify-center text-[#00C853]">
              <MessageCircle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] font-poppins mb-4">Official Telegram</h2>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-8">
                Join our Telegram community for real-time announcements, peer support, and to contact administrators directly for manual processes.
              </p>
            </div>
          </div>
          <a
            href="https://t.me/primesprofit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full bg-[#0A1F44] text-white py-5 rounded-2xl font-bold shadow-lg shadow-blue-900/10 hover:bg-[#142B5F] transition-all font-poppins"
          >
            Join Community
            <ExternalLink size={18} />
          </a>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0A1F44] p-10 rounded-[2.5rem] shadow-xl shadow-blue-900/10 text-white border border-white/5"
        >
          <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-[#FFD700]">
            <ShieldQuestion size={32} />
          </div>
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold font-poppins">Password Security</h2>
            <div className="space-y-6">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#FFD700]/20 text-[#FFD700] flex items-center justify-center shrink-0 font-bold text-xs italic">!</div>
                <p className="text-sm text-[#6B7280]">
                  Password recovery is a manual verification process for your security.
                </p>
              </div>
              <div className="p-8 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                <p className="font-bold text-sm text-[#FFD700] uppercase tracking-widest font-poppins">Instruction</p>
                <p className="text-white/80 leading-relaxed text-sm font-inter">
                  Contact an administrator on Telegram to reset your password. You must provide your unique UID and registered Email address for verification.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      <section className="bg-white p-10 rounded-[2.5rem] border shadow-soft">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#F5F7FA] rounded-xl flex items-center justify-center text-[#0A1F44]">
            <Info size={20} />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] font-poppins uppercase tracking-tight">Financial FAQ</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { q: "What is the minimum reserve amount?", a: "The minimum amount to start an earning cycle is $30.00 USDT." },
            { q: "How long is a profit cycle?", a: "Each cycle lasts exactly 24 hours from the moment of activation." },
            { q: "What is the referral profit rate?", a: "Rewards are structured up to 3 levels: A (5%), B (2%), and C (1%) of profits." },
            { q: "What is the withdrawal processing time?", a: "Standard manual audits take up to 72 hours for all withdrawal requests." }
          ].map((faq, i) => (
            <div key={i} className="p-6 bg-[#F5F7FA] rounded-3xl border border-transparent hover:border-[#0A1F44]/5 transition-all group">
              <h4 className="font-bold text-[#0A1F44] mb-3 font-poppins flex items-center gap-2 group-hover:text-[#FFD700] transition-colors">
                <div className="w-1.5 h-1.5 bg-[#00C853] rounded-full"></div>
                {faq.q}
              </h4>
              <p className="text-[#6B7280] text-sm leading-relaxed font-inter">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
