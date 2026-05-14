import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell } from 'lucide-react';
import { useAuth } from '../App';

interface Announcement {
  id: string;
  message: string;
  active: boolean;
}

export default function AnnouncementPopup() {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAnnouncement(null);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeAnn = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Announcement))
        .find(a => a.active);

      if (activeAnn) {
        setAnnouncement(activeAnn);
        setIsOpen(true);
        setTimeLeft(30);
      } else {
        setAnnouncement(null);
        setIsOpen(false);
      }
      setLoading(false);
    }, (error) => {
      console.error("Announcement listener error:", error);
      setLoading(false);
      if (error.code === 'permission-denied') {
        setIsOpen(false);
      } else {
        try {
          handleFirestoreError(error, OperationType.LIST, 'announcements');
        } catch (e) {}
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, timeLeft]);

  if (loading || !announcement || !isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
        >
          {/* Header */}
          <div className="bg-brand-blue p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center text-brand-blue shadow-lg">
                <Bell size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Official Announcement</h2>
            </div>
            <button
              onClick={() => timeLeft === 0 && setIsOpen(false)}
              disabled={timeLeft > 0}
              className={`p-2 rounded-xl transition-all ${
                timeLeft > 0 
                  ? 'bg-white/10 text-white/30 cursor-not-allowed' 
                  : 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
              }`}
            >
              {timeLeft > 0 ? (
                <span className="text-xs font-bold w-6 h-6 flex items-center justify-center">{timeLeft}</span>
              ) : (
                <X size={20} strokeWidth={2.5} />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                {announcement.message}
              </p>
            </div>
            
            <div className="mt-8">
              <button
                onClick={() => timeLeft === 0 && setIsOpen(false)}
                disabled={timeLeft > 0}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                  timeLeft > 0 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-brand-gold text-brand-blue hover:bg-[#E5B64B] active:scale-[0.98]'
                }`}
              >
                {timeLeft > 0 ? `Please wait ${timeLeft}s...` : 'Understand'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
