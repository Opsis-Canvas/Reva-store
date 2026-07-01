/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Heart, 
  Compass, 
  Search, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Lock, 
  Mail,
  ChevronDown,
  Activity,
  UserCheck,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from '../lib/firebase';

interface HeaderProps {
  activeView: 'landing' | 'catalog' | 'favorites' | 'lookup' | 'profile' | 'refund';
  setActiveView: (view: 'landing' | 'catalog' | 'favorites' | 'lookup' | 'profile' | 'refund') => void;
  currency: 'NGN' | 'USD';
  setCurrency: (currency: 'NGN' | 'USD') => void;
  cartCount: number;
  favoritesCount: number;
  setIsCartOpen: (isOpen: boolean) => void;
}

export default function Header({
  activeView,
  setActiveView,
  currency,
  setCurrency,
  cartCount,
  favoritesCount,
  setIsCartOpen
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Auth States for Form
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Track scroll position for header fade effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen to active user state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Handle Firebase Login / Sign-up
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please fill in all credentials.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    setIsLoading(true);

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setAuthSuccess('Successfully logged in!');
        setTimeout(() => {
          setAuthMode(null);
          setAuthSuccess('');
        }, 2000);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        setAuthSuccess('Account created successfully!');
        setTimeout(() => {
          setAuthMode(null);
          setAuthSuccess('');
        }, 2000);
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      console.error(err);
      let msg = 'Authentication failed. Please verify credentials.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered.';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Incorrect password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address syntax.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account associated with this email.';
      }
      setAuthError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAuthSuccess('Logged out successfully.');
      setTimeout(() => setAuthSuccess(''), 2000);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Dynamic header styles based on scroll position for a Google/YouTube lyric-style dissolve
  const bgGradient = `linear-gradient(to bottom, rgba(245, 245, 244, 1) 0%, rgba(245, 245, 244, 0.92) 50%, rgba(245, 245, 244, 0) 100%)`;

  return (
    <>
      <header 
        className="sticky top-0 z-40 w-full transition-all duration-300 py-2 pb-8"
        style={{
          background: bgGradient,
          pointerEvents: 'none', // Allows clicking through the bottom transparent part of the header container
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 pointer-events-auto">
          
          {/* Left: Hamburger menu for mobile & Brand Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Mobile Trigger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl text-stone-700 hover:text-stone-900 hover:bg-stone-100 active:scale-95 transition-all focus:outline-none"
              title="Open Navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo - Luxury Minimalist */}
            <div 
              onClick={() => setActiveView('landing')}
              className="cursor-pointer select-none hidden sm:block"
            >
              <span className="font-sans text-[10px] tracking-[0.3em] text-stone-400 uppercase block mb-0.5 font-medium">Curated Studio</span>
              <span className="font-serif text-lg tracking-tight text-stone-900 font-semibold">R E V A</span>
            </div>
          </div>

          {/* Logo on extreme left for small mobile */}
          <div 
            onClick={() => setActiveView('landing')}
            className="cursor-pointer select-none block sm:hidden"
          >
            <span className="font-serif text-base tracking-widest text-stone-900 font-bold">REVA</span>
          </div>

          {/* Mid Navigation Links (Desktop only) */}
          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => setActiveView('landing')}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all py-1.5 px-3 rounded-lg ${
                activeView === 'landing' 
                  ? 'text-amber-700 bg-amber-50/60 border border-amber-200' 
                  : 'text-stone-500 hover:text-stone-900 border border-transparent'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />
              Home
            </button>

            <button
              id="nav-catalog-btn"
              onClick={() => setActiveView('catalog')}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all py-1.5 px-3 rounded-lg ${
                activeView === 'catalog' 
                  ? 'text-amber-700 bg-amber-50/60 border border-amber-200' 
                  : 'text-stone-500 hover:text-stone-900 border border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Catalog
            </button>
            
            <button
              id="nav-wishlist-btn"
              onClick={() => setActiveView('favorites')}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all py-1.5 px-3 rounded-lg ${
                activeView === 'favorites' 
                  ? 'text-amber-700 bg-amber-50/60 border border-amber-200' 
                  : 'text-stone-500 hover:text-stone-900 border border-transparent'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Wishlist
              {favoritesCount > 0 && (
                <span className="ml-1 rounded-full bg-stone-900 px-1.5 py-0.5 text-[9px] text-stone-100 font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>

            <button
              id="nav-lookup-btn"
              onClick={() => setActiveView('lookup')}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all py-1.5 px-3 rounded-lg ${
                activeView === 'lookup' 
                  ? 'text-amber-700 bg-amber-50/60 border border-amber-200' 
                  : 'text-stone-500 hover:text-stone-900 border border-transparent'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Track
            </button>
          </nav>

          {/* Right Interactions */}
          <div className="flex items-center space-x-3">
            
            {/* Currency Switcher (Desktop only) */}
            <div className="relative hidden sm:flex items-center bg-stone-200 p-1 rounded-full w-24 h-8 select-none border border-stone-300">
              <div 
                className={`absolute top-0.5 bottom-0.5 left-0.5 right-0.5 w-[50%] bg-white rounded-full shadow-xs transition-transform duration-300 ease-out ${
                  currency === 'USD' ? 'translate-x-full' : ''
                }`}
              />
              <button
                onClick={() => setCurrency('NGN')}
                className={`relative z-10 w-1/2 text-center text-[10px] font-black transition-colors ${
                  currency === 'NGN' ? 'text-stone-950' : 'text-stone-500'
                }`}
              >
                ₦
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`relative z-10 w-1/2 text-center text-[10px] font-black transition-colors ${
                  currency === 'USD' ? 'text-stone-950' : 'text-stone-500'
                }`}
              >
                $
              </button>
            </div>

            {/* Desktop Account Shortcut */}
            <button
              onClick={() => setActiveView('profile')}
              className={`p-2.5 rounded-xl border transition-all shadow-xs ${
                activeView === 'profile'
                  ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-inner'
                  : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-950'
              }`}
              title="Artisan Profile Screen"
            >
              <User className="w-4 h-4" />
            </button>

            {/* Pre-Order Bag (Cart) Button */}
            <button
              id="header-cart-btn"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 bg-stone-950 hover:bg-stone-850 text-white px-3.5 py-2 rounded-xl transition-all duration-200 shadow-sm active:scale-95"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-stone-300 animate-bounce" />
              <span className="hidden lg:inline text-xs font-bold tracking-wider uppercase">Bag</span>
              <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] text-stone-950 font-black">
                {cartCount}
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* Slide-out Mobile & Desktop Unified Navigation Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50"
            />

            {/* Sidebar drawer panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="fixed top-0 bottom-0 left-0 w-full max-w-sm bg-stone-50 border-r border-stone-200 z-55 shadow-2xl flex flex-col overflow-y-auto"
            >
              {/* Sidebar Header */}
              <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-100">
                <div>
                  <span className="font-sans text-[10px] tracking-widest text-stone-400 uppercase font-black">Menu Navigation</span>
                  <h3 className="font-serif text-lg font-bold text-stone-900">Curated Workspace</h3>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-xl bg-white hover:bg-stone-200 border border-stone-300 text-stone-700 hover:text-stone-900 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 p-5 space-y-6">
                
                {/* Auth Section / User Space */}
                <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                      {currentUser && !currentUser.isAnonymous ? <UserCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-black uppercase text-stone-400 tracking-wider">Account Profile</span>
                      <span className="block text-xs font-bold text-stone-850 truncate">
                        {currentUser && !currentUser.isAnonymous ? currentUser.email : 'Anonymous Guest User'}
                      </span>
                    </div>
                  </div>

                  {/* Auth Actions / Form Accordion */}
                  {currentUser && !currentUser.isAnonymous ? (
                    <button
                      onClick={handleSignOut}
                      className="w-full py-2 bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 text-xs font-bold uppercase tracking-wider rounded-xl border border-stone-200 transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out Account
                    </button>
                  ) : (
                    <div className="pt-2 border-t border-stone-100">
                      {authMode === null ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAuthMode('login');
                              setAuthError('');
                              setAuthSuccess('');
                            }}
                            className="flex-1 py-2 bg-stone-950 hover:bg-stone-850 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all text-center"
                          >
                            Sign In
                          </button>
                          <button
                            onClick={() => {
                              setAuthMode('signup');
                              setAuthError('');
                              setAuthSuccess('');
                            }}
                            className="flex-1 py-2 bg-white hover:bg-stone-50 text-stone-800 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-stone-300 transition-all text-center"
                          >
                            Sign Up
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleAuthSubmit} className="space-y-3.5 animate-fade-in">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-black text-amber-800 uppercase tracking-widest">
                              {authMode === 'login' ? 'Secure Sign In' : 'Register Account'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAuthMode(null)}
                              className="text-[10px] text-stone-400 hover:text-stone-600 font-bold uppercase underline"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Email input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Email Address</label>
                            <div className="relative">
                              <input
                                type="email"
                                value={authEmail}
                                onChange={(e) => setAuthEmail(e.target.value)}
                                placeholder="name@domain.com"
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-stone-400"
                                required
                              />
                              <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
                            </div>
                          </div>

                          {/* Password input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Password</label>
                            <div className="relative">
                              <input
                                type="password"
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-stone-400"
                                required
                              />
                              <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
                            </div>
                          </div>

                          {authError && (
                            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-[10px] rounded-lg font-bold">
                              {authError}
                            </div>
                          )}

                          {authSuccess && (
                            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] rounded-lg font-bold">
                              {authSuccess}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-400 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
                          >
                            {isLoading ? 'Processing...' : authMode === 'login' ? 'Sign In Now' : 'Create My Account'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Navigation list */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1 pl-1">Store Sections</span>
                  
                  {/* Home Landing page */}
                  <button
                    onClick={() => {
                      setActiveView('landing');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      activeView === 'landing' 
                        ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs font-extrabold' 
                        : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-stone-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Home / Landing Page</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">Welcome</span>
                  </button>

                  {/* Catalog / Waitlist Page */}
                  <button
                    onClick={() => {
                      setActiveView('catalog');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      activeView === 'catalog' 
                        ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs font-extrabold' 
                        : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Compass className="w-4 h-4 text-stone-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Bespoke Catalog / Waitlist</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">View All</span>
                  </button>

                  {/* Saved Wishlist */}
                  <button
                    onClick={() => {
                      setActiveView('favorites');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      activeView === 'favorites' 
                        ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs font-extrabold' 
                        : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="w-4 h-4 text-stone-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Saved Wishlist</span>
                    </div>
                    <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[9px] text-white font-bold">
                      {favoritesCount}
                    </span>
                  </button>

                  {/* Pre-Order Tracker */}
                  <button
                    onClick={() => {
                      setActiveView('lookup');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      activeView === 'lookup' 
                        ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs font-extrabold' 
                        : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-stone-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Track Fulfillment</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">Lookup</span>
                  </button>

                  {/* Artisan Profile Screen */}
                  <button
                    onClick={() => {
                      setActiveView('profile');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      activeView === 'profile' 
                        ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs font-extrabold' 
                        : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-stone-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Artisan Profile</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">My Info</span>
                  </button>

                  {/* Artisan Sourcing Policies */}
                  <button
                    onClick={() => {
                      setActiveView('refund');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      activeView === 'refund' 
                        ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs font-extrabold' 
                        : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-stone-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Sourcing & Refunds</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">Policy</span>
                  </button>

                </div>

                {/* Logistics & Currency Settings */}
                <div className="space-y-3 pt-4 border-t border-stone-200">
                  <span className="block text-[10px] font-black uppercase text-stone-400 tracking-widest pl-1">Currency Preferences</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCurrency('NGN')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center uppercase tracking-wide ${
                        currency === 'NGN' 
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs' 
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      ₦ NGN Currency
                    </button>
                    <button
                      onClick={() => setCurrency('USD')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center uppercase tracking-wide ${
                        currency === 'USD' 
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs' 
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      $ USD Pegged
                    </button>
                  </div>
                </div>

                {/* Pre-Order Bag quick check */}
                <div className="pt-4 border-t border-stone-200">
                  <button
                    onClick={() => {
                      setIsCartOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-between bg-stone-900 hover:bg-stone-850 text-white p-4 rounded-xl shadow-md transition-all active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Open Pre-Order Bag</span>
                    </div>
                    <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] text-stone-950 font-black">
                      {cartCount} Items
                    </span>
                  </button>
                </div>

              </div>

              {/* Sidebar Footer */}
              <div className="p-5 border-t border-stone-200 bg-stone-100/80 text-center text-[10px] text-stone-400 font-mono">
                Curated Pre-Order Platform v2.1.0 • Verified Build
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
