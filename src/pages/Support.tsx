/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { HelpCircle, MessageCircle, Info, ExternalLink, ShieldQuestion } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center md:justify-start gap-3">
          <HelpCircle className="text-blue-600" size={32} />
          Support Center
        </h1>
        <p className="text-slate-500 mt-2">We're here to help you with any questions or issues.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-8"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <MessageCircle size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Official Telegram</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Join our Telegram community for real-time announcements, peer support, and to contact administrators directly for manual processes.
            </p>
            <a
              href="https://t.me/+N5eqijhuij03NDI0"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Join Telegram Community
              <ExternalLink size={18} />
            </a>
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 text-white"
        >
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-amber-500">
            <ShieldQuestion size={32} />
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6">Password Reset</h2>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 font-bold text-xs italic">!</div>
                <p className="text-sm text-slate-300">
                  Password reset is a manual process for enhanced security.
                </p>
              </div>
              <div className="p-6 bg-blue-600 rounded-3xl border border-blue-500 space-y-4">
                <p className="font-bold text-sm">Instruction:</p>
                <p className="text-blue-50 leading-relaxed text-sm">
                  👉 Contact admin on Telegram to reset your password. You will need to provide your UID or registered Email address.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <Info className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {[
            { q: "What is the minimum reserve amount?", a: "The minimum amount to start an earning cycle is $30." },
            { q: "How long is a profit cycle?", a: "Each cycle lasts 24 hours from the moment you start it." },
            { q: "What is the referral profit rate?", a: "Referral rewards are determined manually by administrators based on your team activity." },
            { q: "What is the withdrawal processing time?", a: "Withdrawals take up to 72 hours to process after manual approval." }
          ].map((faq, i) => (
            <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
              <h4 className="font-bold text-slate-800 mb-2">{faq.q}</h4>
              <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
