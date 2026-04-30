/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../App';
import { motion } from 'motion/react';
import { 
  User as UserIcon, 
  Mail, 
  Fingerprint, 
  Edit3, 
  Check, 
  X,
  Shield,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newUsername || newUsername === profile.username) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        username: newUsername
      });
      setMessage({ type: 'success', text: 'Username updated successfully!' });
      setIsEditing(false);
    } catch (err) {
      console.error("Update username error:", err);
      setMessage({ type: 'error', text: 'Failed to update username. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 font-inter">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] font-poppins flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-brand-gold shadow-lg shadow-brand-blue/10">
              <UserIcon size={24} />
            </div>
            My Profile
          </h1>
          <p className="text-[#6B7280] mt-1">Manage your account identity and security settings.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-[2.5rem] border border-slate-100 soft-shadow overflow-hidden">
            <div className="h-24 bg-brand-blue relative">
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div className="w-20 h-20 rounded-3xl bg-white p-1 shadow-md">
                   <div className="w-full h-full rounded-2xl bg-brand-gold flex items-center justify-center text-brand-blue text-3xl font-bold font-poppins">
                    {profile?.username?.charAt(0).toUpperCase()}
                   </div>
                </div>
              </div>
            </div>
            <div className="pt-14 pb-8 px-6 text-center">
              <h2 className="text-xl font-bold text-slate-900 font-poppins mb-1">{profile?.username}</h2>
              <p className="text-xs font-bold text-brand-gold uppercase tracking-[0.2em] mb-4">Prime Partner</p>
              
              <div className="flex flex-col gap-2 mt-6">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UID</span>
                  <span className="text-xs font-mono font-bold text-brand-blue">{profile?.uid.slice(0, 12)}...</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joined</span>
                  <span className="text-xs font-bold text-slate-600">
                    {profile?.createdAt ? format(profile.createdAt.toMillis(), 'MMM yyyy') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form Container */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-8"
        >
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 soft-shadow">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-[#F5F7FA] rounded-xl flex items-center justify-center text-brand-blue">
                <Edit3 size={20} />
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] font-poppins">Account Details</h2>
            </div>

            <form onSubmit={handleUpdateUsername} className="space-y-8">
              {/* Username Field */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">User Identity</label>
                  {!isEditing && (
                    <button 
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-brand-blue hover:text-brand-gold transition-colors flex items-center gap-1"
                    >
                      <Edit3 size={14} />
                      Modify
                    </button>
                  )}
                </div>
                
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors">
                    <UserIcon size={20} />
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                       <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="flex-1 pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue transition-all font-bold text-brand-blue"
                        placeholder="Enter new username"
                        autoFocus
                      />
                      <button 
                        type="submit"
                        disabled={loading}
                        className="p-4 bg-brand-blue text-white rounded-2xl hover:bg-brand-blue/90 disabled:opacity-50 transition-all shadow-lg shadow-brand-blue/10"
                      >
                        <Check size={20} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setNewUsername(profile?.username || '');
                        }}
                        className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 transition-all font-bold"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="pl-14 pr-4 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl font-bold text-slate-900 cursor-not-allowed">
                      {profile?.username}
                    </div>
                  )}
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-3 opacity-80">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Registered Email (Verified)</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail size={20} />
                  </div>
                  <div className="pl-14 pr-4 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl font-bold text-slate-400 truncate">
                    {profile?.email}
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Shield size={16} className="text-brand-green" />
                  </div>
                </div>
              </div>

              {/* Unique ID */}
              <div className="space-y-3 opacity-60">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Internal Reference (UID)</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Fingerprint size={20} />
                  </div>
                  <div className="pl-14 pr-4 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl font-mono text-xs text-slate-400 truncate">
                    {profile?.uid}
                  </div>
                </div>
              </div>

              {message.text && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "p-4 rounded-2xl text-sm font-bold flex items-center gap-3",
                    message.type === 'success' ? "bg-brand-green/10 text-brand-green border border-brand-green/20" : "bg-red-50 text-red-600 border border-red-100"
                  )}
                >
                  <AlertCircle size={18} />
                  {message.text}
                </motion.div>
              )}
            </form>
          </div>

          <div className="bg-brand-blue p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-brand-blue/10 border border-white/5">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-brand-gold">
              <Calendar size={32} />
            </div>
            <div className="text-center md:text-left space-y-1">
              <h4 className="text-xl font-bold font-poppins">Secure Verification</h4>
              <p className="text-slate-300 text-sm font-medium">To change your registered email, please contact our administrative support for manual KYC verification.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
