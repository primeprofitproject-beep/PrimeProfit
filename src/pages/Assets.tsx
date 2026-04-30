/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp, increment, updateDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Copy, 
  CheckCircle2, 
  Clock, 
  XCircle,
  AlertCircle,
  History,
  QrCode
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

type Tab = 'deposit' | 'withdraw';

export default function AssetsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [proof, setProof] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyItems, setHistoryItems] = useState<{ deposits: any[], withdrawals: any[] }>({ deposits: [], withdrawals: [] });
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const WALLET_ADDRESS = "0xD0F01a65C4dE886D333536241b2415a43289Bf7c";

  useEffect(() => {
    if (!profile) return;

    setIsHistoryLoading(true);

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const filterTimestamp = Timestamp.fromDate(fourDaysAgo);

    // Fetch both deposits and withdrawals for history - limited to last 4 days
    const dQuery = query(
      collection(db, 'deposits'), 
      where('userId', '==', profile.uid), 
      where('timestamp', '>=', filterTimestamp),
      orderBy('timestamp', 'desc')
    );
    const wQuery = query(
      collection(db, 'withdrawals'), 
      where('userId', '==', profile.uid), 
      where('timestamp', '>=', filterTimestamp),
      orderBy('timestamp', 'desc')
    );

    const unsubD = onSnapshot(dQuery, (dSnap) => {
      const deposits = dSnap.docs.map(doc => ({ id: doc.id, type: 'deposit', ...doc.data() }));
      setHistoryItems(prev => ({ ...prev, deposits }));
      setIsHistoryLoading(false);
    }, (err) => {
      console.error("Deposits history error:", err);
      setIsHistoryLoading(false);
    });

    const unsubW = onSnapshot(wQuery, (wSnap) => {
      const withdrawals = wSnap.docs.map(doc => ({ id: doc.id, type: 'withdraw', ...doc.data() }));
      setHistoryItems(prev => ({ ...prev, withdrawals }));
      setIsHistoryLoading(false);
    }, (err) => {
      console.error("Withdrawals history error:", err);
      setIsHistoryLoading(false);
    });

    return () => {
      unsubD();
      unsubW();
    };
  }, [profile]);

  const history = React.useMemo(() => {
    const combined = [...historyItems.deposits, ...historyItems.withdrawals];
    return combined.sort((a: any, b: any) => {
      const tA = a.timestamp?.toMillis() || 0;
      const tB = b.timestamp?.toMillis() || 0;
      return tB - tA;
    });
  }, [historyItems]);

  const handleDeposit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await addDoc(collection(db, 'deposits'), {
        userId: profile.uid,
        amount: parseFloat(amount),
        proof: proof,
        status: 'pending',
        timestamp: Timestamp.now()
      });
      setSuccess('Deposit request submitted! Please wait for admin approval.');
      setAmount('');
      setProof('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount < 30) {
      setError('Minimum withdrawal is $30');
      return;
    }

    if (!walletAddress || walletAddress.trim().length < 10) {
      setError('Please enter a valid USDT BEP-20 wallet address');
      return;
    }

    if (withdrawAmount > profile.balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Deduct balance immediately (lock funds)
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(-withdrawAmount)
      });

      await addDoc(collection(db, 'withdrawals'), {
        userId: profile.uid,
        amount: withdrawAmount,
        walletAddress: walletAddress.trim(),
        status: 'pending',
        timestamp: Timestamp.now()
      });

      // Log transaction
      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        amount: -withdrawAmount,
        type: 'withdrawal_request',
        status: 'pending',
        walletAddress: walletAddress.trim(),
        timestamp: Timestamp.now()
      });

      setSuccess('Withdrawal request submitted! Processing time is 72 hours.');
      setAmount('');
      setWalletAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 font-inter">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] font-poppins flex items-center gap-3">
            <Wallet className="text-[#0A1F44]" size={32} />
            My Assets
          </h1>
          <p className="text-[#6B7280] mt-1">Manage your deposits, withdrawals and history.</p>
        </div>
        <div className="bg-white p-4 px-8 border rounded-[2rem] shadow-soft flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-[#6B7280] tracking-widest mb-1">Total Balance</span>
          <span className="text-2xl font-bold text-[#0A1F44] font-poppins">${profile?.balance.toFixed(2)}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border shadow-soft w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('deposit')}
          className={cn(
            "flex-1 sm:flex-none px-10 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 font-poppins text-sm",
            activeTab === 'deposit' ? "bg-[#0A1F44] text-white shadow-lg shadow-blue-900/10" : "text-[#6B7280] hover:bg-[#F5F7FA]"
          )}
        >
          <ArrowUpCircle size={16} />
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={cn(
            "flex-1 sm:flex-none px-10 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 font-poppins text-sm",
            activeTab === 'withdraw' ? "bg-[#0A1F44] text-white shadow-lg shadow-blue-900/10" : "text-[#6B7280] hover:bg-[#F5F7FA]"
          )}
        >
          <ArrowDownCircle size={16} />
          Withdraw
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'deposit' && (
          <motion.div
            key="deposit"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-soft space-y-8">
              <div className="flex items-start gap-4 p-6 bg-[#FFD700]/10 rounded-3xl border border-[#FFD700]/20">
                <AlertCircle className="text-[#FFD700] shrink-0 mt-0.5" size={20} />
                <div className="text-[#1A1A1A] text-sm leading-relaxed">
                  <p className="font-bold mb-1 font-poppins uppercase tracking-wide text-xs">Security Notice</p>
                  <p>Send only <span className="font-bold text-[#0A1F44] underline decoration-[#FFD700] decoration-2">USDT (BEP-20)</span> to the address below. Funds sent on other networks cannot be recovered.</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase text-[#6B7280] ml-1 tracking-widest font-inter">Deposit Address (BEP-20)</label>
                <div className="p-8 bg-[#F5F7FA] rounded-3xl border border-dashed border-[#0A1F44]/10 flex flex-col items-center gap-6">
                  <div className="bg-white p-4 rounded-3xl shadow-soft border border-[#0A1F44]/5">
                    <QrCode size={160} className="text-[#0A1F44]" />
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 bg-white p-4 rounded-2xl border font-mono text-xs text-[#6B7280] truncate shadow-sm">
                      {WALLET_ADDRESS}
                    </div>
                    <button 
                      onClick={copyAddress}
                      className={cn(
                        "p-4 rounded-2xl transition-all shadow-sm border",
                        copied ? "bg-[#00C853] text-white border-transparent" : "bg-white text-[#0A1F44] hover:bg-[#F5F7FA]"
                      )}
                    >
                      {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border shadow-soft">
              <h2 className="text-xl font-bold text-[#1A1A1A] font-poppins mb-8">Submit Deposit Request</h2>
              <form onSubmit={handleDeposit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1A1A1A] ml-1">Deposit Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all font-bold font-poppins text-lg text-[#0A1F44]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1A1A1A] ml-1">Transaction Proof (Optional)</label>
                  <textarea
                    rows={4}
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder="Enter transaction hash or relevant info for verification"
                    className="w-full px-5 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all text-sm h-32"
                  />
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100">{error}</div>}
                {success && <div className="p-4 bg-[#00C853]/10 text-[#00C853] text-sm rounded-2xl border border-[#00C853]/20 font-bold">{success}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0A1F44] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/10 hover:bg-[#142B5F] disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-poppins"
                >
                  {loading ? 'Submitting...' : 'Submit Deposit Request'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'withdraw' && (
          <motion.div
            key="withdraw"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-soft">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#F5F7FA] rounded-xl flex items-center justify-center text-[#0A1F44]">
                  <ArrowDownCircle size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#1A1A1A] font-poppins">Withdraw Funds</h2>
              </div>
              
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-[#1A1A1A] ml-1">Amount ($)</label>
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Min $30.00</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all font-bold font-poppins text-lg text-[#0A1F44]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1A1A1A] ml-1">USDT BEP-20 Wallet Address</label>
                  <input
                    type="text"
                    required
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-5 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all text-sm font-mono"
                  />
                </div>

                <div className="p-6 bg-[#F5F7FA] rounded-3xl space-y-4 border border-[#0A1F44]/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6B7280] font-medium font-inter">Processing Time</span>
                    <span className="text-[#1A1A1A] font-bold font-poppins">72 Hours</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6B7280] font-medium font-inter">Service Fee</span>
                    <span className="text-[#00C853] font-bold font-poppins">$0.00 FREE</span>
                  </div>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100">{error}</div>}
                {success && <div className="p-4 bg-[#00C853]/10 text-[#00C853] text-sm rounded-2xl border border-[#00C853]/20 font-bold">{success}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0A1F44] text-white py-5 rounded-2xl font-bold shadow-lg shadow-blue-900/10 hover:bg-[#142B5F] disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-poppins"
                >
                  {loading ? 'Processing...' : 'Request Withdrawal'}
                </button>
              </form>
            </div>

            <div className="bg-[#0A1F44] p-8 rounded-[2.5rem] text-white space-y-8 shadow-xl shadow-blue-900/10 border border-white/5">
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-poppins text-[#FFD700]">Withdrawal Policy</h3>
                <p className="text-[#6B7280] text-sm font-inter">Please read carefully before requesting.</p>
              </div>
              
              <ul className="space-y-6 text-sm">
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#FFD700] font-bold text-[10px]">01</div>
                  <span className="text-white/80 leading-relaxed">Withdrawals are processed manually by our finance team to maintain network security.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#FFD700] font-bold text-[10px]">02</div>
                  <span className="text-white/80 leading-relaxed">Standard processing time is up to 72 business hours after approval.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#FFD700] font-bold text-[10px]">03</div>
                  <span className="text-white/80 leading-relaxed">The minimum threshold for any withdrawal is strictly $30.00 USDT.</span>
                </li>
              </ul>

              <div className="pt-8 border-t border-white/10 flex items-center gap-5">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-[#FFD700]">
                  <Clock size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Availability</p>
                  <p className="font-bold font-poppins text-lg">24/7 Service</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Unified History Section - Compact & Mobile Optimized */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-[#0A1F44]/5 flex items-center justify-center text-[#0A1F44]/40">
            <History size={16} />
          </div>
          <h2 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-[0.2em]">Transaction History</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-[#0A1F44]/10 to-transparent" />
        </div>

        <div className="bg-white rounded-[2rem] border border-[#0A1F44]/10 shadow-soft overflow-hidden min-h-[160px]">
          {isHistoryLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-8 h-8 border-3 border-[#0A1F44]/5 border-t-[#0A1F44] rounded-full"
              />
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Updating...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center gap-3 opacity-20">
                <History size={32} className="text-[#0A1F44]" />
                <span className="text-xs font-medium text-[#0A1F44]">No activity yet.</span>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Tabled View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-[#0A1F44]/5">
                      <th className="px-8 py-4 text-left text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-left text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">Type</th>
                      <th className="px-8 py-4 text-left text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-4 text-left text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0A1F44]/5">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F5F7FA]/30 transition-colors">
                        <td className="px-8 py-4 text-xs text-[#1A1A1A] font-medium">
                          {format(item.timestamp.toMillis(), 'MMM dd, HH:mm')}
                        </td>
                        <td className="px-8 py-4">
                          <div className={cn(
                            "flex items-center gap-1.5 text-[11px] font-bold capitalize",
                            item.type === 'deposit' ? "text-[#00C853]" : "text-[#FFD700]"
                          )}>
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              item.type === 'deposit' ? "bg-[#00C853]" : "bg-[#FFD700]"
                            )}></div>
                            {item.type}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-xs font-bold text-[#0A1F44]">
                          ${item.amount.toFixed(2)}
                        </td>
                        <td className="px-8 py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight font-poppins",
                            item.status === 'pending' ? "bg-[#FFD700]/10 text-[#FFD700]" :
                            item.status === 'approved' ? "bg-[#00C853]/10 text-[#00C853]" :
                            "bg-red-50 text-red-600"
                          )}>
                            {item.status === 'pending' && <Clock size={8} />}
                            {item.status === 'approved' && <CheckCircle2 size={8} />}
                            {item.status === 'rejected' && <XCircle size={8} />}
                            {item.status}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-List View - Ultra Compact */}
              <div className="md:hidden divide-y divide-[#0A1F44]/5">
                {history.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-[#F5F7FA]/30 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-current opacity-20",
                        item.type === 'deposit' ? "text-[#00C853]" : "text-[#FFD700]"
                      )}>
                        {item.type === 'deposit' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                      </div>
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#1A1A1A] capitalize">{item.type}</span>
                          <span className="text-[9px] text-[#6B7280] font-medium truncate">
                            {format(item.timestamp.toMillis(), 'HH:mm • MMM dd')}
                          </span>
                        </div>
                        <div className={cn(
                          "inline-flex items-baseline gap-1 text-[8px] font-bold uppercase tracking-widest",
                          item.status === 'pending' ? "text-[#FFD700]" :
                          item.status === 'approved' ? "text-[#00C853]" :
                          "text-red-500"
                        )}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {item.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#0A1F44] tracking-tight">${item.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
