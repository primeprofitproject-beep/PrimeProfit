/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../App';
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
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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
    }, (err) => {
      console.error("Admin unsubUsers error:", err);
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    // Listen to deposits
    const unsubDeposits = onSnapshot(query(collection(db, 'deposits'), orderBy('timestamp', 'desc')), (snap) => {
      setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() } as Deposit)));
    }, (err) => {
      console.error("Admin unsubDeposits error:", err);
      handleFirestoreError(err, OperationType.GET, 'deposits');
    });

    // Listen to withdrawals
    const unsubWithdrawals = onSnapshot(query(collection(db, 'withdrawals'), orderBy('timestamp', 'desc')), (snap) => {
      setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal)));
    }, (err) => {
      console.error("Admin unsubWithdrawals error:", err);
      handleFirestoreError(err, OperationType.GET, 'withdrawals');
    });

    return () => {
      unsubUsers();
      unsubDeposits();
      unsubWithdrawals();
    };
  }, [profile]);

  if (!profile?.isAdmin) return <div className="text-center p-20">Access Denied</div>;

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editType, setEditType] = useState<'balance' | 'reward' | null>(null);

  const handleUpdateStatus = async (userId: string, status: 'active' | 'blocked') => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { status });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEdit = async () => {
    if (!editingUserId || !editingValue || !editType) return;
    const val = parseFloat(editingValue);
    if (isNaN(val)) {
      alert("Please enter a valid number");
      return;
    }
    
    setLoading(true);
    try {
      if (editType === 'balance') {
        await updateDoc(doc(db, 'users', editingUserId), { balance: increment(val) });
        await addDoc(collection(db, 'transactions'), {
          userId: editingUserId,
          amount: val,
          type: 'admin_adjustment',
          status: 'completed',
          timestamp: Timestamp.now(),
          adminId: profile?.uid
        });
      } else {
        await updateDoc(doc(db, 'users', editingUserId), { 
          rewards: increment(val),
          balance: increment(val),
          totalEarnings: increment(val),
          todayEarnings: increment(val)
        });
        await addDoc(collection(db, 'transactions'), {
          userId: editingUserId,
          amount: val,
          type: 'reward',
          status: 'completed',
          timestamp: Timestamp.now(),
          adminId: profile?.uid
        });
      }
      setEditingUserId(null);
      setEditingValue('');
      setEditType(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${editingUserId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeposit = async (dep: Deposit) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'deposits', dep.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', dep.userId), { balance: increment(dep.amount) });
      await addDoc(collection(db, 'transactions'), {
        userId: dep.userId,
        amount: dep.amount,
        type: 'deposit',
        status: 'approved',
        depositId: dep.id,
        timestamp: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deposits/${dep.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'deposits', id), { status: 'rejected' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deposits/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWithdraw = async (withd: Withdrawal) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'withdrawals', withd.id), { status: 'approved' });
      // Balance was already deducted at request time in Assets.tsx
      await addDoc(collection(db, 'transactions'), {
        userId: withd.userId,
        amount: -withd.amount,
        type: 'withdrawal',
        status: 'approved',
        withdrawalId: withd.id,
        timestamp: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withd.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithdraw = async (withd: Withdrawal) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'withdrawals', withd.id), { status: 'rejected' });
      // Refund balance
      await updateDoc(doc(db, 'users', withd.userId), { balance: increment(withd.amount) });
      await addDoc(collection(db, 'transactions'), {
        userId: withd.userId,
        amount: withd.amount,
        type: 'withdrawal_refund',
        status: 'completed',
        withdrawalId: withd.id,
        timestamp: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withd.id}`);
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
    <div className="space-y-8 pb-20 font-inter">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] font-poppins flex items-center gap-3">
            <ShieldCheck className="text-[#0A1F44]" size={32} />
            Admin Control
          </h1>
          <p className="text-[#6B7280] mt-1 tracking-tight">Global system management and financial orchestration.</p>
        </div>
      </header>

      <div className="flex bg-white p-1.5 rounded-2xl border shadow-soft w-full sm:w-fit overflow-hidden">
        {(['users', 'deposits', 'withdrawals'] as AdminTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold capitalize transition-all font-poppins text-sm",
              activeTab === tab ? "bg-[#0A1F44] text-white shadow-lg shadow-blue-900/10" : "text-[#6B7280] hover:bg-[#F5F7FA]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-soft overflow-hidden min-h-[400px]">
        {activeTab === 'users' && (
          <div className="flex flex-col h-full">
            <div className="p-8 border-b flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#F5F7FA]/30">
              <h2 className="font-bold text-[#1A1A1A] font-poppins text-lg">User Registry</h2>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                <input 
                  type="text"
                  placeholder="Search by UID, Email or Username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 bg-white border border-[#0A1F44]/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all font-inter"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b">
                    <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">User Information</th>
                    <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Financials</th>
                    <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Status</th>
                    <th className="px-8 py-5 text-right text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-[#F5F7FA]/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-[#1A1A1A] font-poppins">{u.username}</span>
                          <span className="text-[10px] text-[#6B7280] font-mono bg-[#F5F7FA] w-fit px-2 py-0.5 rounded border border-[#0A1F44]/5 uppercase tracking-tighter">ID: {u.uid}</span>
                          <span className="text-xs text-[#6B7280] font-inter italic">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest mb-1">Balance</span>
                          <span className="font-bold text-[#0A1F44] font-poppins text-lg">${u.balance.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className={cn(
                            "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight font-poppins border",
                            u.status === 'active' ? "bg-[#00C853]/10 text-[#00C853] border-[#00C853]/20" : "bg-red-50 text-red-600 border-red-100"
                          )}>
                             <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", u.status === 'active' ? "bg-[#00C853]" : "bg-red-600")} />
                            {u.status}
                          </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {editingUserId === u.uid ? (
                          <div className="flex items-center justify-end gap-3 p-2 bg-[#F5F7FA] rounded-2xl border border-[#0A1F44]/5">
                             <input 
                               type="number"
                               value={editingValue}
                               onChange={(e) => setEditingValue(e.target.value)}
                               className="w-24 px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#0A1F44] font-bold text-[#0A1F44]"
                               placeholder={editType === 'balance' ? "+ / -" : "Reward"}
                               autoFocus
                             />
                             <div className="flex gap-1">
                               <button 
                                 onClick={handleConfirmEdit}
                                 disabled={loading}
                                 className="p-2 rounded-lg bg-[#00C853] text-white hover:bg-[#00A843] disabled:opacity-50 shadow-sm"
                               >
                                 <Check size={14} />
                               </button>
                               <button 
                                 onClick={() => setEditingUserId(null)}
                                 disabled={loading}
                                 className="p-2 rounded-lg bg-white border text-[#6B7280] hover:bg-slate-50 disabled:opacity-50 shadow-sm"
                               >
                                 <X size={14} />
                               </button>
                             </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              disabled={loading}
                              title={u.status === 'active' ? "Restrict User" : "Reactivate User"}
                              onClick={() => handleUpdateStatus(u.uid, u.status === 'active' ? 'blocked' : 'active')}
                              className={cn(
                                "p-3 rounded-2xl transition-all border shadow-sm",
                                u.status === 'active' ? "text-red-500 bg-white hover:bg-red-50 border-red-100" : "text-[#00C853] bg-white hover:bg-[#00C853]/10 border-[#00C853]/20",
                                loading && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {u.status === 'active' ? <UserX size={18} /> : <UserCheck size={18} />}
                            </button>
                            <button 
                              disabled={loading}
                              title="Direct Adjustment"
                              onClick={() => {
                                setEditingUserId(u.uid);
                                setEditType('balance');
                                setEditingValue('');
                              }}
                              className={cn(
                                "p-3 rounded-2xl border bg-white text-[#0A1F44] hover:bg-[#0A1F44]/5 border-[#0A1F44]/10 transition-all shadow-sm",
                                loading && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Wallet size={18} />
                            </button>
                            <button 
                              disabled={loading}
                              title="Award Reward"
                              onClick={() => {
                                  setEditingUserId(u.uid);
                                  setEditType('reward');
                                  setEditingValue('');
                                }}
                              className={cn(
                                "p-3 rounded-2xl border bg-white text-[#FFD700] hover:bg-[#FFD700]/10 border-[#FFD700]/20 transition-all shadow-sm",
                                loading && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Gift size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'deposits' && (
          <div className="overflow-x-auto h-full">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F5F7FA] border-b">
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Account Link</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Volume</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Audit Trail</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-[#F5F7FA]/50 transition-colors">
                    <td className="px-8 py-6 font-mono text-[10px] text-[#6B7280]">
                      <div className="bg-[#F5F7FA] px-3 py-1.5 rounded-lg border w-fit font-bold uppercase">{dep.userId}</div>
                    </td>
                    <td className="px-8 py-6 font-bold text-[#00C853] font-poppins text-lg tracking-tight">${dep.amount.toFixed(2)}</td>
                    <td className="px-8 py-6 text-[10px] text-[#6B7280] max-w-xs break-all font-mono">
                      <div className="opacity-70 leading-relaxed italic">{dep.proof || 'N/A Verification Proof'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight font-poppins border",
                        dep.status === 'pending' ? "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20" :
                        dep.status === 'approved' ? "bg-[#00C853]/10 text-[#00C853] border-[#00C853]/20" :
                        "bg-red-50 text-red-600 border-red-100"
                      )}>
                        {dep.status}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {dep.status === 'pending' && (
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            disabled={loading}
                            onClick={() => handleApproveDeposit(dep)}
                            className="p-3 rounded-2xl bg-[#00C853] text-white hover:bg-[#00A843] shadow-lg shadow-green-900/10 disabled:opacity-50 transition-transform active:scale-95"
                          >
                            <Check size={20} />
                          </button>
                          <button 
                            disabled={loading}
                            onClick={() => handleRejectDeposit(dep.id)}
                            className="p-3 rounded-2xl bg-white border border-red-100 text-red-600 hover:bg-red-50 shadow-sm disabled:opacity-50 transition-transform active:scale-95"
                          >
                            <X size={20} />
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
          <div className="overflow-x-auto h-full">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F5F7FA] border-b">
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Account Link</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Volume</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Wallet Address</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-bold text-[#6B7280] uppercase tracking-widest font-inter">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.map((withd) => (
                  <tr key={withd.id} className="hover:bg-[#F5F7FA]/50 transition-colors">
                    <td className="px-8 py-6 font-mono text-[10px] text-[#6B7280]">
                       <div className="bg-[#F5F7FA] px-3 py-1.5 rounded-lg border w-fit font-bold uppercase">{withd.userId}</div>
                    </td>
                    <td className="px-8 py-6 font-bold text-[#FFD700] font-poppins text-lg tracking-tight">${withd.amount.toFixed(2)}</td>
                    <td className="px-8 py-6 text-[10px] text-[#6B7280] font-mono break-all max-w-[200px]">
                      {withd.walletAddress || "N/A"}
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight font-poppins border",
                        withd.status === 'pending' ? "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20" :
                        withd.status === 'approved' ? "bg-[#00C853]/10 text-[#00C853] border-[#00C853]/20" :
                        "bg-red-50 text-red-600 border-red-100"
                      )}>
                        {withd.status}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {withd.status === 'pending' && (
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            disabled={loading}
                            onClick={() => handleApproveWithdraw(withd)}
                            className="p-3 rounded-2xl bg-[#00C853] text-white hover:bg-[#00A843] shadow-lg shadow-green-900/10 disabled:opacity-50 transition-transform active:scale-95"
                          >
                            <Check size={20} />
                          </button>
                          <button 
                            disabled={loading}
                            onClick={() => handleRejectWithdraw(withd)}
                            className="p-3 rounded-2xl bg-white border border-red-100 text-red-600 hover:bg-red-50 shadow-sm disabled:opacity-50 transition-transform active:scale-95"
                          >
                            <X size={20} />
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
