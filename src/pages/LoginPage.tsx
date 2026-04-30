/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Key, Mail, TrendingUp } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-blue/5 rounded-full" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-gold/5 rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl soft-shadow border border-slate-100 p-8 lg:p-12 relative z-10"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-14 h-14 bg-brand-gold rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-gold/20 text-brand-blue">
            <TrendingUp size={32} strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-blue">Welcome Back</h1>
          <p className="text-brand-text-muted mt-2 font-medium">Log in to manage your passive portfolio.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue transition-all font-medium text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest px-1">
              <label className="text-slate-700">Password</label>
              <Link to="/support" className="text-brand-blue hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue transition-all font-medium text-sm"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-bold"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-[#142B5F] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-sm text-brand-text-muted font-medium">
            New to PrimeProfit?{' '}
            <Link to="/signup" className="text-brand-blue font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
