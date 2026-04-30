/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  HelpCircle, 
  LogOut, 
  User as UserIcon,
  PiggyBank,
  ShieldCheck,
  Menu,
  X,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { cn } from './lib/utils';
import { signOut } from 'firebase/auth';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/Dashboard';
import EarnPage from './pages/Earn';
import AssetsPage from './pages/Assets';
import TeamPage from './pages/Team';
import SupportPage from './pages/Support';
import AdminPage from './pages/Admin';
import ProfilePage from './pages/Profile';
import EarningsHistoryPage from './pages/EarningsHistory';

// Context
const AuthContext = createContext<{
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

function Layout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Earn', path: '/earn', icon: PiggyBank },
    { name: 'Assets', path: '/assets', icon: Wallet },
    { name: 'Team', path: '/team', icon: Users },
    { name: 'Support', path: '/support', icon: MessageSquare },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  if (profile?.isAdmin) {
    navItems.push({ name: 'Admin', path: '/admin', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center text-brand-gold">
            <TrendingUp size={20} strokeWidth={3} />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-brand-blue">Prime<span className="text-brand-gold">Profit</span></span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-0 z-40 bg-brand-blue w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 pt-16 md:pt-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="hidden md:flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center text-brand-blue shadow-lg shadow-brand-gold/20">
              <TrendingUp size={24} strokeWidth={3} />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-white">Prime<span className="text-brand-gold">Profit</span></span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-bold text-sm",
                  location.pathname === item.path 
                    ? "bg-brand-gold text-brand-blue shadow-lg shadow-brand-gold/10" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/5 pt-6">
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-brand-gold font-bold border border-white/5">
                {profile?.username?.charAt(0).toUpperCase() || <UserIcon size={18} />}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-white text-sm truncate">{profile?.username}</span>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Active Partner</span>
              </div>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 w-full font-bold text-sm"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-brand-bg relative">
        <div className="max-w-7xl mx-auto py-8 px-4 md:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (profile?.status === 'blocked') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-red-100 text-red-600 p-4 rounded-full mb-4">
        <X size={48} />
      </div>
      <h1 className="text-2xl font-bold mb-2">Account Blocked</h1>
      <p className="text-slate-500 max-w-md">Your account has been restricted. Please contact support via Telegram for more information.</p>
      <Link to="/support" className="mt-4 text-blue-600 font-semibold hover:underline">Contact Support</Link>
      <button onClick={() => auth.signOut()} className="mt-8 text-slate-400 hover:text-slate-600">Logout</button>
    </div>
  );

  return <Layout>{children}</Layout>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Listen for profile changes
        const profileUnsub = onSnapshot(doc(db, 'users', u.uid), (doc) => {
          if (doc.exists()) {
            setProfile({ uid: doc.id, ...doc.data() } as UserProfile);
          }
          setLoading(false);
        });
        return () => profileUnsub();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/earn" element={<PrivateRoute><EarnPage /></PrivateRoute>} />
          <Route path="/assets" element={<PrivateRoute><AssetsPage /></PrivateRoute>} />
          <Route path="/team" element={<PrivateRoute><TeamPage /></PrivateRoute>} />
          <Route path="/support" element={<PrivateRoute><SupportPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/earnings-history" element={<PrivateRoute><EarningsHistoryPage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

