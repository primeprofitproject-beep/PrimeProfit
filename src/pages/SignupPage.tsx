/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit, Timestamp, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserPlus, Mail, Lock, User, Ticket, KeyRound } from 'lucide-react';
import { UserProfile } from '../types';

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

      let uplinePath: string[] = [];
      if (isFirstUser) {
        if (referralCode !== 'FIRSTU') {
          throw new Error('First user must enter Manager Code: FIRSTU');
        }
      } else if (referralCode) {
        // Find user with this referral code using the new mapping collection
        try {
          const refDocRef = doc(db, 'referralCodes', referralCode.toUpperCase());
          const refDoc = await getDoc(refDocRef);
          
          if (refDoc.exists()) {
            referrerUid = refDoc.data().uid;
          } else {
            // FALLBACK: Search users collection directly
            const q = query(
              collection(db, 'users'), 
              where('referralCode', '==', referralCode.toUpperCase()),
              limit(1)
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              throw new Error('Invalid referral code');
            }
            
            referrerUid = querySnapshot.docs[0].id;
          }

          if (referrerUid) {
            const referrerDoc = await getDoc(doc(db, 'users', referrerUid));
            if (referrerDoc.exists()) {
              const referrerData = referrerDoc.data() as UserProfile;
              // Upline path: [LevelA, LevelB, LevelC]
              uplinePath = [referrerUid];
              if (referrerData.uplinePath) {
                // If the referrer has an upline path: 
                // referrer's Level A becomes new user's Level B
                // referrer's Level B becomes new user's Level C
                uplinePath.push(...referrerData.uplinePath.slice(0, 2));
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('permission')) {
            handleFirestoreError(err, OperationType.GET, `referralCodes/${referralCode.toUpperCase()}`);
          }
          throw err;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const newReferralCode = generateReferralCode();

      // Create referral code mapping first
      try {
        await setDoc(doc(db, 'referralCodes', newReferralCode), {
          uid: user.uid,
          createdAt: Timestamp.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `referralCodes/${newReferralCode}`);
      }

      // Create user profile
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          username,
          email,
          referralCode: newReferralCode,
          referredBy: referrerUid || null,
          uplinePath: uplinePath,
          teamStats: { levelA: 0, levelB: 0, levelC: 0 },
          balance: 0,
          totalEarnings: 0,
          teamEarnings: 0,
          rewards: 0,
          todayEarnings: 0,
          status: 'active',
          isAdmin: email === 'primeprofitproject@gmail.com', // Bootstrap admin
          createdAt: Timestamp.now(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      // Update team stats for uplines
      try {
        if (uplinePath[0]) {
          await updateDoc(doc(db, 'users', uplinePath[0]), { 'teamStats.levelA': increment(1) });
        }
        if (uplinePath[1]) {
          await updateDoc(doc(db, 'users', uplinePath[1]), { 'teamStats.levelB': increment(1) });
        }
        if (uplinePath[2]) {
          await updateDoc(doc(db, 'users', uplinePath[2]), { 'teamStats.levelC': increment(1) });
        }
      } catch (err) {
        console.error("Failed to update upline team stats:", err);
      }

      // Update config if first user
      if (isFirstUser) {
        try {
          await setDoc(doc(db, 'config', 'global'), { firstUserCreated: true }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'config/global');
        }
      }

      // Handle referral levels (bonus) - we'll just store the link
      if (referrerUid) {
        try {
          await setDoc(doc(db, 'referrals', `${referrerUid}_${user.uid}`), {
            userId: referrerUid,
            referredUserId: user.uid,
            level: 'A', // For now just track direct
            timestamp: Timestamp.now()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `referrals/${referrerUid}_${user.uid}`);
        }
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2rem] shadow-soft border p-8"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-[#0A1F44] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
            <div className="relative">
              <span className="text-[#FFD700] font-bold text-4xl font-poppins">P</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00C853] rounded-full border-2 border-[#0A1F44]"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] font-poppins">Join PrimeProfit</h1>
          <p className="text-[#6B7280] mt-2">Start your journey to premium profits</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A1A1A] ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Pick a username"
                className="w-full pl-12 pr-4 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A1A1A] ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-12 pr-4 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A1A1A] ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full pl-12 pr-4 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A1A1A] ml-1">
              {isFirstUser ? 'Manager Code' : 'Referral Code'}
            </label>
            <div className="relative">
              {isFirstUser ? (
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} />
              ) : (
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} />
              )}
              <input
                type="text"
                required
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder={isFirstUser ? 'Enter FIRSTU' : 'Enter referral code'}
                className="w-full pl-12 pr-4 py-4 bg-[#F5F7FA] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/10 focus:border-[#0A1F44] transition-all uppercase"
              />
            </div>
            {isFirstUser && (
              <p className="text-xs text-[#0A1F44] font-medium ml-1">You are the first user. Use code: FIRSTU</p>
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
            className="w-full bg-[#0A1F44] text-white py-4 rounded-2xl font-bold hover:bg-[#142B5F] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10"
          >
            {loading ? 'Creating account...' : (
              <>
                <UserPlus size={20} />
                Create Account
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-[#6B7280]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#0A1F44] font-bold hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
