/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  updateDoc, 
  doc, 
  increment, 
  getDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ShieldCheck, 
  MoreVertical,
  Check,
  X,
  UserX,
  UserCheck,
  Edit,
  Gift,
  RefreshCcw,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { UserProfile, Deposit, Withdrawal } from '../types';

type AdminTab = 'users' | 'deposits' | 'withdrawals';

export default function AdminPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.isAdmin) return;

    // Listen to users
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
    });

    // Listen to deposits
    const unsubDeposits = onSnapshot(query(collection(db, 'deposits'), orderBy('timestamp', 'desc')), (snap) => {
      setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() } as Deposit)));
    });

    // Listen to withdrawals
    const unsubWithdrawals = onSnapshot(query(collection(db, 'withdrawals'), orderBy('timestamp', 'desc')), (snap) => {
      setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal)));
    });

    return () => {
      unsubUsers();
      unsubDeposits();
      unsubWithdrawals();
    };
  }, [profile]);

  if (!profile?.isAdmin) return <div className="text-center p-20">Access Denied</div>;

  const handleUpdateStatus = async (userId: string, status: 'active' | 'blocked') => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { status });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBalance = async (userId: string, amount: string) => {
    const val = parseFloat(amount);
    if (isNaN(val)) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { balance: increment(val) });
      alert('Balance updated successfully');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReward = async (userId: string, amount: string) => {
    const val = parseFloat(amount);
    if (isNaN(val)) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { 
        rewards: increment(val),
        balance: increment(val)
      });
      alert('Reward added successfully');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeposit = async (dep: Deposit) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'deposits', dep.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', dep.userId), { balance: increment(dep.amount) });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'deposits', id), { status: 'rejected' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWithdraw = async (withd: Withdrawal) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'withdrawals', withd.id), { status: 'approved' });
      // Balance is already checked at request time, but we don't deduct until approved?
      // Actually usually you lock/deduct at request time.
      // For this app, let's deduct at request time in the Assets page (handled there).
      // Wait, let's check Assets logic. I didn't deduct.
      // I should deduct at request time OR at approval.
      // The prompt says "Approve / Reject withdrawals".
      // Let's deduct at approval for simplicity in this demo, but typically it's locked.
      // Re-reading Assets: I didn't deduct. So I MUST deduct now.
      await updateDoc(doc(db, 'users', withd.userId), { balance: increment(-withd.amount) });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithdraw = async (id: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'withdrawals', id), { status: 'rejected' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck className="text-purple-600" size={32} />
            Admin Panel
          </h1>
          <p className="text-slate-500 mt-1">Global system management and financial controls.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['users', 'deposits', 'withdrawals'] as AdminTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold capitalize transition-all",
              activeTab === tab ? "bg-slate-900 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'users' && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="font-bold text-slate-800">User Management</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Balance</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{u.username}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{u.uid}</span>
                          <span className="text-xs text-slate-400">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">${u.balance.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                         <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                            u.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                          )}>
                            {u.status}
                          </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            title={u.status === 'active' ? "Block" : "Unblock"}
                            onClick={() => handleUpdateStatus(u.uid, u.status === 'active' ? 'blocked' : 'active')}
                            className={cn(
                              "p-2 rounded-lg transition-colors border",
                              u.status === 'active' ? "text-red-600 hover:bg-red-50 border-red-100" : "text-emerald-600 hover:bg-emerald-50 border-emerald-100"
                            )}
                          >
                            {u.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                          <button 
                            title="Edit Balance"
                            onClick={() => {
                              const amt = prompt('Enter amount to add (negative to subtract):');
                              if (amt) handleEditBalance(u.uid, amt);
                            }}
                            className="p-2 rounded-lg border text-blue-600 hover:bg-blue-50 border-blue-100 transition-colors"
                          >
                            <Wallet size={16} />
                          </button>
                          <button 
                            title="Add Reward"
                            onClick={() => {
                                const amt = prompt('Enter reward amount to add:');
                                if (amt) handleAddReward(u.uid, amt);
                              }}
                            className="p-2 rounded-lg border text-amber-600 hover:bg-amber-50 border-amber-100 transition-colors"
                          >
                            <Gift size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'deposits' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">User ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Proof</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{dep.userId}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">${dep.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{dep.proof || 'No proof'}</td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                        dep.status === 'pending' ? "bg-amber-100 text-amber-600" :
                        dep.status === 'approved' ? "bg-emerald-100 text-emerald-600" :
                        "bg-red-100 text-red-600"
                      )}>
                        {dep.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {dep.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApproveDeposit(dep)}
                            className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => handleRejectDeposit(dep.id)}
                            className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">User ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {withdrawals.map((withd) => (
                  <tr key={withd.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{withd.userId}</td>
                    <td className="px-6 py-4 font-bold text-amber-600">${withd.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                        withd.status === 'pending' ? "bg-amber-100 text-amber-600" :
                        withd.status === 'approved' ? "bg-emerald-100 text-emerald-600" :
                        "bg-red-100 text-red-600"
                      )}>
                        {withd.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {withd.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApproveWithdraw(withd)}
                            className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => handleRejectWithdraw(withd.id)}
                            className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
