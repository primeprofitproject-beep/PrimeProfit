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
  setDoc,
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
  Search,
  Wrench,
  Clock,
  Settings,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { UserProfile, Deposit, Withdrawal, AppConfig } from '../types';

interface Announcement {
  id: string;
  message: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type AdminTab = 'users' | 'deposits' | 'withdrawals' | 'announcements' | 'maintenance';

export default function AdminPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Global Config / Maintenance Mode Form states
  const [globalConfig, setGlobalConfig] = useState<AppConfig | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowUsersDuringMaintenance, setAllowUsersDuringMaintenance] = useState(false);
  const [maintenanceEndDate, setMaintenanceEndDate] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [daysHelper, setDaysHelper] = useState('');
  const [hoursHelper, setHoursHelper] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync form states with database when config is loaded
  useEffect(() => {
    if (globalConfig) {
      setMaintenanceMode(globalConfig.maintenanceMode || false);
      setAllowUsersDuringMaintenance(globalConfig.allowUsersDuringMaintenance || false);
      setMaintenanceEndDate(globalConfig.maintenanceEndDate || '');
      setMaintenanceMessage(globalConfig.maintenanceMessage || '');
    }
  }, [globalConfig]);

  // Announcement state
  const [newMsg, setNewMsg] = useState('');
  const [isEditingAnn, setIsEditingAnn] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.isAdmin) return;

    // Listen to global config
    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) {
        setGlobalConfig(snap.data() as AppConfig);
      }
    }, (err) => {
      console.error("Admin unsubConfig error:", err);
      // Fallback or silent exit if not setup yet
    });

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

    // Listen to announcements
    const unsubAnnouncements = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    }, (err) => {
      console.error("Admin unsubAnnouncements error:", err);
      handleFirestoreError(err, OperationType.GET, 'announcements');
    });

    return () => {
      unsubConfig();
      unsubUsers();
      unsubDeposits();
      unsubWithdrawals();
      unsubAnnouncements();
    };
  }, [profile]);

  if (!profile?.isAdmin) return <div className="text-center p-20">Access Denied</div>;

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editType, setEditType] = useState<'balance' | 'reward' | null>(null);

  const handleUpdateStatus = async (userId: string, status: 'active' | 'blocked') => {
    // Prevent blocking admins
    const targetUser = users.find(u => u.uid === userId);
    if (targetUser?.role === 'admin' && status === 'blocked') {
      alert("Admin accounts cannot be blocked.");
      return;
    }

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

  const handleCreateAnnouncement = async () => {
    if (!newMsg.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        message: newMsg,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setNewMsg('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAnnouncement = async (id: string, current: boolean) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'announcements', id), { 
        active: !current,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `announcements/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAnnouncement = async (id: string, msg: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'announcements', id), { 
        message: msg,
        updatedAt: Timestamp.now()
      });
      setIsEditingAnn(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `announcements/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaintenance = async () => {
    setSaveLoading(true);
    try {
      await setDoc(doc(db, 'config', 'global'), {
        maintenanceMode,
        allowUsersDuringMaintenance,
        maintenanceEndDate,
        maintenanceMessage
      }, { merge: true });
      alert("Maintenance mode settings saved successfully!");
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, 'config/global');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApplyDuration = () => {
    const days = parseInt(daysHelper) || 0;
    const hours = parseInt(hoursHelper) || 0;
    if (days === 0 && hours === 0) {
      alert("Please enter a valid number of days or hours first.");
      return;
    }
    const current = new Date();
    current.setDate(current.getDate() + days);
    current.setHours(current.getHours() + hours);
    
    // Format to yyyy-MM-ddThh:mm for datetime-local
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const date = String(current.getDate()).padStart(2, '0');
    const hour = String(current.getHours()).padStart(2, '0');
    const min = String(current.getMinutes()).padStart(2, '0');
    
    setMaintenanceEndDate(`${year}-${month}-${date}T${hour}:${min}`);
    setDaysHelper('');
    setHoursHelper('');
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

      <div className="flex bg-white p-1.5 rounded-2xl border shadow-soft w-full sm:w-fit overflow-hidden overflow-x-auto shrink-0 gap-1">
        {(['users', 'deposits', 'withdrawals', 'announcements', 'maintenance'] as AdminTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold capitalize transition-all font-poppins text-sm white-space-nowrap shrink-0",
              activeTab === tab ? "bg-[#0A1F44] text-white shadow-lg shadow-blue-900/10" : "text-[#6B7280] hover:bg-[#F5F7FA]"
            )}
          >
            {tab === 'maintenance' ? 'Maintenance' : tab}
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

        {activeTab === 'announcements' && (
          <div className="p-8 space-y-8">
            <div className="bg-[#F5F7FA]/30 p-6 rounded-3xl border border-[#0A1F44]/5">
              <h2 className="font-bold text-[#1A1A1A] font-poppins text-lg mb-4">Create Announcement</h2>
              <div className="space-y-4">
                <textarea
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Enter announcement message..."
                  className="w-full p-4 bg-white border border-[#0A1F44]/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all font-inter min-h-[120px]"
                />
                <button
                  onClick={handleCreateAnnouncement}
                  disabled={loading || !newMsg.trim()}
                  className="bg-[#0A1F44] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#142B5F] transition-all disabled:opacity-50"
                >
                  Post Announcement
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-bold text-[#1A1A1A] font-poppins text-lg">History</h2>
              <div className="grid grid-cols-1 gap-4">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        {isEditingAnn === ann.id ? (
                          <div className="space-y-3">
                            <textarea
                              defaultValue={ann.message}
                              id={`edit-${ann.id}`}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const el = document.getElementById(`edit-${ann.id}`) as HTMLTextAreaElement;
                                  handleUpdateAnnouncement(ann.id, el.value);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setIsEditingAnn(null)}
                                className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-700 text-sm whitespace-pre-wrap font-medium">{ann.message}</p>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold block mt-2 uppercase tracking-widest">
                          Created {format(ann.createdAt.toMillis(), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingAnn(ann.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleAnnouncement(ann.id, ann.active)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                            ann.active 
                              ? "bg-green-50 text-green-600 border-green-100" 
                              : "bg-slate-50 text-slate-400 border-slate-100"
                          )}
                        >
                          {ann.active ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed text-slate-400">
                    No announcements found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 font-inter">
            <div className="bg-[#F5F7FA]/30 p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-[#0A1F44]/5">
              <div className="mb-6 sm:mb-8">
                <h2 className="font-bold text-[#1A1A1A] font-poppins text-lg sm:text-xl flex items-center gap-2 mb-1.5">
                  <Settings className="text-brand-blue" size={20} />
                  Global Maintenance Console
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">Configure scheduled app upgrades, customize messages, and define block behavior.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Form column */}
                <div className="space-y-6">
                  {/* Toggle 1: Enable Maintenance */}
                  <div className="flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm">
                    <div className="pr-4">
                      <h4 className="font-bold text-[#1A1A1A] text-sm">Enable Maintenance Mode</h4>
                      <p className="text-[11px] sm:text-xs text-slate-400">Puts the system offline and displays lock screen to users.</p>
                    </div>
                    <button
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0",
                        maintenanceMode ? "bg-[#0A1F44]" : "bg-slate-200"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200",
                          maintenanceMode ? "translate-x-6" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Toggle 2: Allow Users During Maintenance */}
                  <div className="flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm">
                    <div className="pr-4">
                      <h4 className="font-bold text-[#1A1A1A] text-sm">Allow Users During Maintenance</h4>
                      <p className="text-[11px] sm:text-xs text-slate-400">If ON, users can access normal features even under maintenance mode.</p>
                    </div>
                    <button
                      onClick={() => setAllowUsersDuringMaintenance(!allowUsersDuringMaintenance)}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0",
                        allowUsersDuringMaintenance ? "bg-green-600" : "bg-slate-200"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200",
                          allowUsersDuringMaintenance ? "translate-x-6" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Custom Message */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Custom Maintenance Message</label>
                    <textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="e.g. Website is currently under maintenance. Please stay patient while we improve our services. We will be back soon."
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all font-inter min-h-[100px]"
                    />
                  </div>

                  {/* End Date Pickers */}
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Maintenance End Date & Time</label>
                    
                    <input
                      type="datetime-local"
                      value={maintenanceEndDate}
                      onChange={(e) => setMaintenanceEndDate(e.target.value)}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all font-mono"
                    />

                    {/* Quick Duration Builder */}
                    <div className="bg-[#F5F7FA] p-4 sm:p-5 rounded-2xl border border-dashed space-y-3">
                      <span className="text-xs font-bold text-slate-500 block">Or Quick-Set Remaining Duration:</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Days</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={daysHelper}
                            onChange={(e) => setDaysHelper(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Hours</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={hoursHelper}
                            onChange={(e) => setHoursHelper(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyDuration}
                        className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-xs text-slate-700 transition"
                      >
                        Calculate & Apply End Date
                      </button>
                    </div>
                  </div>

                  {/* Save Settings */}
                  <button
                    onClick={handleSaveMaintenance}
                    disabled={saveLoading}
                    className="w-full bg-[#0A1F44] text-white py-3.5 rounded-xl font-bold hover:bg-[#152D5E] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-950/10 text-xs sm:text-sm"
                  >
                    {saveLoading ? "Saving Settings..." : "Save Maintenance Settings"}
                  </button>
                </div>

                {/* Live Preview column */}
                <div className="bg-slate-50 border rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-2">
                      <Wrench size={14} className="animate-spin text-brand-gold shrink-0" />
                      Live Preview (Mock)
                    </span>
                    <div className="bg-[#0A1F44] text-white rounded-2xl p-4 sm:p-6 text-center space-y-4 shadow-xl border border-white/5">
                      <div className="flex items-center justify-center gap-1.5 select-none">
                        <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center text-brand-gold">
                          <TrendingUp size={14} strokeWidth={3} />
                        </div>
                        <span className="font-display font-bold text-sm sm:text-base tracking-tight">PrimeProfit</span>
                      </div>

                      <div className="flex justify-center select-none pb-1">
                        <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center">
                          <AlertTriangle size={20} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-sm sm:text-base font-extrabold text-[#FFF] tracking-tight">Website Under Maintenance</h4>
                        <p className="text-slate-300 text-[11px] leading-relaxed max-w-xs mx-auto">
                          {maintenanceMessage || "We are currently performing scheduled maintenance to improve our services. We'll be back online shortly!"}
                        </p>
                      </div>

                      {maintenanceEndDate && (
                        <div className="bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 inline-flex items-center gap-1.5 justify-center text-[10px] text-slate-300">
                          <Clock size={11} className="text-brand-gold" />
                          <span>Expected Return: {new Date(maintenanceEndDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-2.5">
                    <ShieldCheck className="text-[#0A1F44] shrink-0 mt-0.5" size={16} />
                    <div className="text-[11px] sm:text-xs text-slate-600 space-y-1">
                      <span className="font-bold text-[#0A1F44] block">How this works</span>
                      <p className="leading-relaxed">When Maintenance mode is Enabled, visiting any page besides Admin or Login will securely render the Maintenance page instead of the app's components, effectively locking down the site for regular users.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
