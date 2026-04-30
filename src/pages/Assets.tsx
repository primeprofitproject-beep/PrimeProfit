/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
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

type Tab = 'deposit' | 'withdraw' | 'history';

export default function AssetsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const [proof, setProof] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const WALLET_ADDRESS = "0xD0F01a65C4dE886D333536241b2415a43289Bf7c";

  useEffect(() => {
    if (!profile) return;

    // Fetch both deposits and withdrawals for history
    const dQuery = query(collection(db, 'deposits'), where('userId', '==', profile.uid), orderBy('timestamp', 'desc'));
    const wQuery = query(collection(db, 'withdrawals'), where('userId', '==', profile.uid), orderBy('timestamp', 'desc'));

    const unsubscribeD = onSnapshot(dQuery, (dSnap) => {
      const deposits = dSnap.docs.map(doc => ({ id: doc.id, type: 'deposit', ...doc.data() }));
      
      const unsubscribeW = onSnapshot(wQuery, (wSnap) => {
        const withdrawals = wSnap.docs.map(doc => ({ id: doc.id, type: 'withdraw', ...doc.data() }));
        const combined = [...deposits, ...withdrawals].sort((a: any, b: any) => b.timestamp.toMillis() - a.timestamp.toMillis());
        setHistory(combined);
      });
      return () => unsubscribeW();
    });

    return () => unsubscribeD();
  }, [profile]);

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

    if (withdrawAmount > profile.balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: profile.uid,
        amount: withdrawAmount,
        status: 'pending',
        timestamp: Timestamp.now()
      });
      setSuccess('Withdrawal request submitted! Processing time is 72 hours.');
      setAmount('');
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
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Wallet className="text-blue-600" size={32} />
            My Assets
          </h1>
          <p className="text-slate-500 mt-1">Manage your deposits, withdrawals and history.</p>
        </div>
        <div className="bg-white p-4 px-6 border rounded-3xl flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total Balance</span>
          <span className="text-2xl font-bold text-slate-800">${profile?.balance.toFixed(2)}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('deposit')}
          className={cn(
            "flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'deposit' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <ArrowUpCircle size={18} />
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={cn(
            "flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'withdraw' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <ArrowDownCircle size={18} />
          Withdraw
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'history' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <History size={18} />
          History
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
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-8">
              <div className="flex items-start gap-4 p-5 bg-amber-50 rounded-3xl border border-amber-100">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-amber-800 text-sm leading-relaxed">
                  <p className="font-bold mb-1">Important Deposit Instructions</p>
                  <p>Send only <span className="underline decoration-amber-300 decoration-2">USDT (BEP-20)</span> to the address below. Deposits on other networks will be permanently lost.</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase text-slate-400 ml-1 tracking-widest">Deposit Address (BEP-20)</label>
                <div className="p-5 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-4">
                  <div className="bg-white p-2 rounded-2xl border shadow-sm">
                    <QrCode size={180} className="text-slate-800" />
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 bg-white p-3.5 rounded-2xl border font-mono text-xs text-slate-500 truncate">
                      {WALLET_ADDRESS}
                    </div>
                    <button 
                      onClick={copyAddress}
                      className={cn(
                        "p-3.5 rounded-2xl transition-all shadow-sm",
                        copied ? "bg-emerald-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Submit Deposit Request</h2>
              <form onSubmit={handleDeposit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Deposit Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Transaction Proof (Optional)</label>
                  <textarea
                    rows={3}
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder="Enter transaction hash or any info for verification"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                  />
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100">{error}</div>}
                {success && <div className="p-4 bg-emerald-50 text-emerald-600 text-sm rounded-2xl border border-emerald-100">{success}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
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
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Withdraw Funds</h2>
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Amount ($)</label>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Min $30.00</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Processing Time</span>
                    <span className="text-slate-800 font-bold">72 Hours</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Fee</span>
                    <span className="text-slate-800 font-bold">$0.00</span>
                  </div>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100">{error}</div>}
                {success && <div className="p-4 bg-emerald-50 text-emerald-600 text-sm rounded-2xl border border-emerald-100">{success}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : 'Request Withdrawal'}
                </button>
              </form>
            </div>

            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl shadow-blue-200">
              <h3 className="text-xl font-bold">Withdrawal Policy</h3>
              <ul className="space-y-4 text-sm text-blue-100">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">1</div>
                  <span>Withdrawals are processed manually by our finance team to ensure security.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">2</div>
                  <span>Standard processing time is up to 72 hours from the moment of request.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">3</div>
                  <span>Minimum withdrawal amount is strictly set to $30 per transaction.</span>
                </li>
              </ul>
              <div className="pt-6 border-t border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-200 uppercase tracking-widest">Cycle Limit</p>
                  <p className="font-bold">No Daily Limit</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        <History size={40} className="mx-auto mb-3 opacity-20" />
                        No transactions found yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {format(item.timestamp.toMillis(), 'MMM dd, HH:mm')}
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "flex items-center gap-2 text-sm font-bold capitalize",
                            item.type === 'deposit' ? "text-emerald-600" : "text-amber-600"
                          )}>
                            {item.type === 'deposit' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                            {item.type}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">
                          ${item.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                            item.status === 'pending' ? "bg-amber-100 text-amber-600" :
                            item.status === 'approved' ? "bg-emerald-100 text-emerald-600" :
                            "bg-red-100 text-red-600"
                          )}>
                            {item.status === 'pending' && <Clock size={12} />}
                            {item.status === 'approved' && <CheckCircle2 size={12} />}
                            {item.status === 'rejected' && <XCircle size={12} />}
                            {item.status}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
