/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserPlus, Mail, Lock, User, Ticket, KeyRound } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if any user exists
    const checkFirstUser = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', 'global'));
        if (!configDoc.exists()) {
          // If doc doesn't exist, it's the first user
          setIsFirstUser(true);
        } else {
          setIsFirstUser(!configDoc.data().firstUserCreated);
        }
      } catch (err) {
        console.error("Error checking first user:", err);
        // Fallback to true if we can't read config (likely doesn't exist yet)
        setIsFirstUser(true);
      }
    };
    checkFirstUser();
  }, []);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let referrerUid = '';

      if (isFirstUser) {
        if (referralCode !== 'FIRSTU') {
          throw new Error('First user must enter Manager Code: FIRSTU');
        }
      } else {
        // Find user with this referral code
        const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.toUpperCase()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Invalid referral code');
        }
        referrerUid = querySnapshot.docs[0].id;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const newReferralCode = generateReferralCode();

      // Create user profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username,
        email,
        referralCode: newReferralCode,
        referredBy: referrerUid || null,
        balance: 0,
        totalEarnings: 0,
        teamEarnings: 0,
        rewards: 0,
        status: 'active',
        isAdmin: email === 'primeprofitproject@gmail.com', // Bootstrap admin
        createdAt: Timestamp.now(),
      });

      // Update config if first user
      if (isFirstUser) {
        await setDoc(doc(db, 'config', 'global'), { firstUserCreated: true }, { merge: true });
      }

      // Handle referral levels (bonus) - we'll just store the link
      if (referrerUid) {
        await setDoc(doc(db, 'referrals', `${referrerUid}_${user.uid}`), {
          userId: referrerUid,
          referredUserId: user.uid,
          level: 'A', // For now just track direct
          timestamp: Timestamp.now()
        });
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200 border p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
            <span className="text-white font-bold text-3xl">P</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Join PrimeProfit</h1>
          <p className="text-slate-400 mt-2">Start your journey to premium profits</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Pick a username"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">
              {isFirstUser ? 'Manager Code' : 'Referral Code'}
            </label>
            <div className="relative">
              {isFirstUser ? (
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              ) : (
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              )}
              <input
                type="text"
                required
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder={isFirstUser ? 'Enter FIRSTU' : 'Enter referral code'}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all uppercase"
              />
            </div>
            {isFirstUser && (
              <p className="text-xs text-blue-600 ml-1">You are the first user. Use code: FIRSTU</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isFirstUser === null}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Creating account...' : (
              <>
                <UserPlus size={20} />
                Create Account
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
