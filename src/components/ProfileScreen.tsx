/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, ClipboardList, AlertCircle, Save, Bell, BellOff, 
  Heart, ArrowRight, ShieldCheck, Copy, Check, Calendar, RotateCcw, FileText, 
  X, Truck, Building, CheckCircle2, Circle, Clock, ChevronRight
} from 'lucide-react';
import { db, doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from '../lib/firebase';
import { Product, FavoriteItem, Order } from '../types';

interface ProfileScreenProps {
  customerSessionId: string;
  favoritesItems: FavoriteItem[];
  products: Product[];
  notificationItems: any[];
  onToggleFavorite: (productId: string) => void;
  onToggleNotification: (productId: string) => void;
  setActiveView: (view: 'catalog' | 'favorites' | 'lookup' | 'profile' | 'refund') => void;
  currency: 'NGN' | 'USD';
  conversionRate: number;
  onSelectProduct: (product: Product) => void;
  onQuickReorder: (items: { productId: string; quantity: number }[]) => void;
}

export default function ProfileScreen({
  customerSessionId,
  favoritesItems,
  products,
  notificationItems,
  onToggleFavorite,
  onToggleNotification,
  setActiveView,
  currency,
  conversionRate,
  onSelectProduct,
  onQuickReorder
}: ProfileScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  // Filtering & Detail Modal States
  const [orderTimeFilter, setOrderTimeFilter] = useState<'all' | 'last7' | 'last30'>('all');
  const [selectedDetailedOrder, setSelectedDetailedOrder] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Load saved profile data from Firestore or localStorage
  useEffect(() => {
    const fetchProfile = async () => {
      if (!customerSessionId) return;
      try {
        const docRef = doc(db, 'profiles', customerSessionId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');
        } else {
          // Fallback to localStorage
          setName(localStorage.getItem('preorder_checkout_name') || '');
          setEmail(localStorage.getItem('preorder_checkout_email') || '');
          setPhone(localStorage.getItem('preorder_checkout_phone') || '');
          setAddress(localStorage.getItem('preorder_checkout_address') || '');
        }
      } catch (err) {
        console.error('Failed to fetch profile details:', err);
      }
    };

    const fetchOrders = async () => {
      if (!customerSessionId) return;
      setLoadingOrders(true);
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('customerSessionId', '==', customerSessionId));
        const snap = await getDocs(q);
        const fetched: Order[] = [];
        
        snap.forEach(doc => {
          fetched.push({ id: doc.id, ...doc.data() } as Order);
        });

        // Sort by date (newest first)
        fetched.sort((a, b) => b.createdAt - a.createdAt);
        setUserOrders(fetched);
      } catch (err) {
        console.error('Error fetching user order history:', err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchProfile();
    fetchOrders();
  }, [customerSessionId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (customerSessionId) {
        await setDoc(doc(db, 'profiles', customerSessionId), {
          name,
          email,
          phone,
          address,
          updatedAt: Date.now()
        }, { merge: true });

        // Save email directly to the user's document inside the users collection in Firestore
        await setDoc(doc(db, 'users', customerSessionId), {
          email,
          name,
          updatedAt: Date.now()
        }, { merge: true });

        // Backup in localStorage
        localStorage.setItem('preorder_checkout_name', name);
        localStorage.setItem('preorder_checkout_email', email);
        localStorage.setItem('preorder_checkout_phone', phone);
        localStorage.setItem('preorder_checkout_address', address);

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(customerSessionId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyOrderId = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const displayPrice = (p: Product) => {
    let itemPrice = 0;
    if (p.currencyMode === 'NGN') {
      itemPrice = currency === 'NGN' ? p.priceNGN : p.priceNGN / conversionRate;
    } else {
      itemPrice = currency === 'USD' ? p.priceUSD : p.priceUSD * conversionRate;
    }
    return `${currency === 'NGN' ? '₦' : '$'}${Math.round(itemPrice).toLocaleString()}`;
  };

  // Filter orders based on selected time horizon tab
  const filteredOrders = userOrders.filter(ord => {
    if (orderTimeFilter === 'last7') {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return ord.createdAt >= sevenDaysAgo;
    }
    if (orderTimeFilter === 'last30') {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return ord.createdAt >= thirtyDaysAgo;
    }
    return true;
  });

  const favoritedProducts = products.filter(p => favoritesItems.some(f => f.productId === p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12 animate-fade-in font-sans selection:bg-amber-100">
      
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-700 border border-amber-200 mb-2 shadow-xs">
          <User className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900">Your Artisan Profile</h2>
        <p className="text-xs sm:text-sm text-stone-500 max-w-lg mx-auto leading-relaxed">
          Manage your bespoke pre-order details, track active allocations, and maintain direct control of custom alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Profile Card & Information Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Profile Details Form */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-stone-100">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900">Custom Contact Details</h3>
                <p className="text-xs text-stone-400">Pre-fills checkout form configurations automatically.</p>
              </div>
              
              {/* Copyable Identifier */}
              <button 
                onClick={handleCopyId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-500 hover:text-stone-850 transition-all select-all shadow-2xs cursor-pointer"
                title="Copy customer identifier ID"
              >
                <span>ID: {customerSessionId.substring(0, 8)}...</span>
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-2xs"
                    />
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@domain.com"
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-2xs"
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Phone Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-2xs"
                    />
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {/* Insured Security Check */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Insured Vault Security</span>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Your identity data is securely managed and localized. No public tracking occurs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Primary Shipping Address</label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Provide full shipping address (street address, city, state, country)"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-stone-400 focus:bg-white transition-all resize-none shadow-2xs font-sans"
                  />
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-stone-950 hover:bg-stone-850 disabled:bg-stone-400 text-white rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:scale-98 cursor-pointer"
                >
                  {isSaving ? 'Saving Profile...' : 'Save Profile'}
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>

              {saveSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] rounded-2xl font-bold flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Your profile details have been saved to secure storage. Checkout forms will pre-fill instantly.
                </div>
              )}
            </form>
          </div>

          {/* Active Notifications & Price Drop Alerts */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">Your Active Price Alerts</h3>
              <p className="text-xs text-stone-400">Get notified the second the conversion rate drops or active discounts are applied.</p>
            </div>

            {notificationItems.length === 0 ? (
              <div className="text-center py-8 bg-stone-50 border border-stone-100 rounded-2xl space-y-2">
                <div className="mx-auto w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <BellOff className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-stone-800">No Active Notifications</h4>
                <p className="text-[10px] text-stone-400 max-w-xs mx-auto">
                  Click the bell icon on product card items to activate conversion alerts here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {notificationItems.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.id} className="flex items-center justify-between py-3.5 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {product ? (
                          <img 
                            src={product.images[0]} 
                            alt={item.productName} 
                            className="w-10 h-12 object-cover rounded-md bg-stone-100 border"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-12 rounded-md bg-stone-100 flex items-center justify-center text-stone-300">
                            <Bell className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-stone-850 truncate block">{item.productName}</span>
                          <span className="text-[10px] text-stone-400 block font-mono">
                            Created: {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleNotification(item.productId)}
                        className="p-2 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 text-stone-500 hover:text-red-600 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Remove price alert"
                      >
                        <BellOff className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline uppercase text-[9px] tracking-wider font-bold">Unsubscribe</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Wishlist Items and Pre-Order list (5 Cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Active Orders List with Category Filters & Copy Buttons & Quick Reorders */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-serif text-lg font-bold text-stone-900">Registered Pre-Orders</h3>
                <ClipboardList className="w-5 h-5 text-stone-400" />
              </div>
              
              {/* Category Time Filters tab control */}
              {userOrders.length > 0 && (
                <div className="flex items-center gap-1 bg-stone-150 p-1 rounded-xl border border-stone-200 w-full">
                  <button
                    onClick={() => setOrderTimeFilter('all')}
                    className={`flex-1 text-center py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                      orderTimeFilter === 'all' 
                        ? 'bg-white text-stone-950 shadow-3xs' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setOrderTimeFilter('last7')}
                    className={`flex-1 text-center py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                      orderTimeFilter === 'last7' 
                        ? 'bg-white text-stone-950 shadow-3xs' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Last 7D
                  </button>
                  <button
                    onClick={() => setOrderTimeFilter('last30')}
                    className={`flex-1 text-center py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                      orderTimeFilter === 'last30' 
                        ? 'bg-white text-stone-950 shadow-3xs' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Last 30D
                  </button>
                </div>
              )}
            </div>

            {loadingOrders ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-stone-400">
                <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin" />
                <span className="text-xs font-mono">Querying historical registry...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 bg-stone-50 border border-stone-100 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-stone-800 block">No pre-orders found</span>
                <p className="text-[10px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                  Change your filter selection or lock in a new configuration to track live artisan work.
                </p>
                {userOrders.length === 0 && (
                  <button
                    onClick={() => setActiveView('lookup')}
                    className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full px-4 py-2 transition-all cursor-pointer"
                  >
                    Manual Tracker Lookup
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(ord => (
                  <div 
                    key={ord.id} 
                    onClick={() => setSelectedDetailedOrder(ord)}
                    className="bg-stone-50 hover:bg-stone-100/70 cursor-pointer rounded-2xl border border-stone-200 p-4.5 space-y-3.5 transition-all shadow-3xs hover:shadow-2xs group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        {/* Copyable Order ID block */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-extrabold text-stone-950 block">{ord.id}</span>
                          <button
                            onClick={(e) => handleCopyOrderId(ord.id, e)}
                            className="p-1 rounded bg-stone-150 border border-stone-200 hover:bg-stone-250 hover:text-stone-900 transition-all text-stone-400"
                            title="Copy Order Reference ID"
                          >
                            {copiedOrderId === ord.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-stone-500" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-stone-400 block font-mono">
                          {new Date(ord.createdAt).toLocaleDateString()} • {ord.items.length} artisan item{ord.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* Status pill */}
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        ord.orderStatus === 'fulfilled' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        ord.orderStatus === 'shipped' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                        ord.orderStatus === 'ready' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {ord.orderStatus}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-600 border-t border-stone-200/60 pt-3.5 flex justify-between items-center gap-4">
                      <span className="font-bold text-stone-800 font-sans">
                        Total: {ord.currency === 'NGN' ? '₦' : '$'}{ord.totalAmount.toLocaleString()}
                      </span>

                      {/* Interactive details and reorder action bar */}
                      <div className="flex items-center gap-2">
                        {/* Quick Reorder Trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickReorder(ord.items.map(i => ({ productId: i.productId, quantity: i.quantity })));
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 hover:border-stone-300 text-[10px] text-stone-700 hover:text-stone-950 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-96"
                          title="Instantly re-add to bag"
                        >
                          <RotateCcw className="w-3 h-3 text-stone-500" />
                          <span>Reorder</span>
                        </button>
                        
                        <button
                          onClick={() => setSelectedDetailedOrder(ord)}
                          className="text-amber-800 font-extrabold text-[10px] tracking-wider uppercase hover:underline flex items-center gap-0.5 group-hover:translate-x-1 transition-transform"
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Wishlist View */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2">
              <h3 className="font-serif text-lg font-bold text-stone-900">Your Quick Wishlist</h3>
              <Heart className="w-5 h-5 text-stone-400" />
            </div>

            {favoritedProducts.length === 0 ? (
              <div className="text-center py-6 bg-stone-50 border border-stone-100 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-stone-800 block">Wishlist is empty</span>
                <p className="text-[10px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                  Favorite custom layouts to view them saved here for later checkout.
                </p>
                <button
                  onClick={() => setActiveView('catalog')}
                  className="text-[10px] font-bold uppercase tracking-wider text-stone-800 border border-stone-300 rounded-full px-4 py-2 hover:bg-stone-100 transition-all cursor-pointer"
                >
                  Browse Creations
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1">
                {favoritedProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3 gap-3">
                    <div 
                      onClick={() => onSelectProduct(p)}
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 group"
                    >
                      <img 
                        src={p.images[0]} 
                        alt={p.name} 
                        className="w-10 h-12 object-cover rounded-md bg-stone-100 border"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-stone-850 group-hover:text-amber-700 transition-colors truncate block">{p.name}</span>
                        <span className="text-[10px] font-mono text-stone-500 font-semibold block">{displayPrice(p)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleFavorite(p.id)}
                      className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-red-500 transition-all select-none cursor-pointer"
                      title="Remove from wishlist"
                    >
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Interactive Detailed Order Page/Overlay Modal (Full-Screen popup style) */}
      {selectedDetailedOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-stone-50 w-full max-w-3xl rounded-3xl border border-stone-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-white border-b border-stone-200/80 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-700" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-base font-bold text-stone-900">Allocation Reference Details</h3>
                    <button
                      onClick={(e) => handleCopyOrderId(selectedDetailedOrder.id, e)}
                      className="p-1.5 rounded bg-stone-100 border hover:bg-stone-200 transition-all text-stone-500"
                      title="Copy Reference ID"
                    >
                      {copiedOrderId === selectedDetailedOrder.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-stone-500" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 block">ID: {selectedDetailedOrder.id} • Registered {new Date(selectedDetailedOrder.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailedOrder(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all border border-transparent hover:border-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Progress Milestones & Status Timeline */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Pre-Order Fulfillment Milestone</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedDetailedOrder.orderStatus === 'fulfilled' ? 'bg-emerald-100 text-emerald-800' :
                    selectedDetailedOrder.orderStatus === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                    selectedDetailedOrder.orderStatus === 'ready' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedDetailedOrder.orderStatus}
                  </span>
                </div>

                {/* Progress milestone timeline bar */}
                <div className="grid grid-cols-5 gap-1.5 pt-2">
                  {[
                    { id: 'pending', name: 'Allocation Funded' },
                    { id: 'processing', name: 'Artisan Sourcing' },
                    { id: 'ready', name: 'Custom Crafting' },
                    { id: 'shipped', name: 'In Transit' },
                    { id: 'fulfilled', name: 'Delivered' }
                  ].map((milestone, idx) => {
                    const statusIdx = ['pending', 'processing', 'ready', 'shipped', 'fulfilled'].indexOf(selectedDetailedOrder.orderStatus);
                    const isCompleted = idx <= (statusIdx >= 0 ? statusIdx : 0);
                    const isCurrent = idx === statusIdx;

                    return (
                      <div key={milestone.id} className="flex flex-col items-center text-center space-y-1.5 relative">
                        {idx < 4 && (
                          <div className={`absolute top-2.5 left-[50%] right-[-50%] h-[2px] -z-0 ${
                            idx < (statusIdx >= 0 ? statusIdx : 0) ? 'bg-amber-600' : 'bg-stone-200'
                          }`} />
                        )}
                        <div className="relative z-10 bg-white p-0.5 rounded-full">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-300 shrink-0" />
                          )}
                        </div>
                        <span className={`text-[8px] font-bold leading-tight px-0.5 transition-all ${
                          isCurrent ? 'text-amber-800 font-black scale-102' : isCompleted ? 'text-stone-800' : 'text-stone-400'
                        }`}>
                          {milestone.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Sourcing expected time countdown */}
                {selectedDetailedOrder.orderStatus !== 'fulfilled' && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2 items-center text-left text-[10px] text-amber-900 font-semibold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>
                      Estimated completion countdown: {Math.max(1, Math.ceil((selectedDetailedOrder.estimatedDeliveryDate - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining until custom freight handoff.
                    </span>
                  </div>
                )}
              </div>

              {/* Delivery specifications & Shipping Address details */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 border-b pb-2">Fulfillment Logistics Details</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-stone-400 block font-medium">Logistics Method</span>
                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                      {selectedDetailedOrder.deliveryDetails?.address === 'Pickup Station Allocation' ? (
                        <>
                          <Building className="w-4 h-4 text-amber-600" />
                          <span>Pickup Station Allocation</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-4 h-4 text-amber-600" />
                          <span>Insured Doorstep Courier</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-stone-400 block font-medium">Primary Destination</span>
                    <p className="font-semibold text-stone-800 leading-normal">
                      {selectedDetailedOrder.deliveryDetails?.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ordered Products breakdown table list */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 border-b pb-2">Allocated Specifications List</h4>
                
                <div className="divide-y divide-stone-100">
                  {selectedDetailedOrder.items.map((it, itemIdx) => {
                    const matchedProd = products.find(p => p.id === it.productId);
                    return (
                      <div key={itemIdx} className="flex gap-3 py-3 items-center first:pt-0 last:pb-0">
                        {matchedProd ? (
                          <img 
                            src={matchedProd.images[0]} 
                            alt={it.name} 
                            className="w-9 h-11 object-cover rounded-md border bg-stone-100 cursor-pointer"
                            onClick={() => {
                              onSelectProduct(matchedProd);
                              setSelectedDetailedOrder(null);
                            }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-11 rounded-md bg-stone-100 flex items-center justify-center text-stone-300">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span 
                            onClick={() => matchedProd && [onSelectProduct(matchedProd), setSelectedDetailedOrder(null)]}
                            className={`font-serif text-xs font-bold text-stone-950 block ${matchedProd ? 'cursor-pointer hover:text-amber-800 hover:underline' : ''}`}
                          >
                            {it.name}
                          </span>
                          <span className="text-[10px] text-stone-400 block font-mono">QTY: {it.quantity} • PRICE SNAPSHOT: {selectedDetailedOrder.currency === 'NGN' ? '₦' : '$'}{it.priceAtPurchase.toLocaleString()}</span>
                        </div>
                        <span className="font-mono text-xs font-black text-stone-900">
                          {selectedDetailedOrder.currency === 'NGN' ? '₦' : '$'}{(it.priceAtPurchase * it.quantity).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* pricing summary breakdown */}
              <div className="bg-stone-100 rounded-2xl p-4.5 border text-xs space-y-2">
                <div className="flex justify-between text-stone-500">
                  <span>Pre-order subtotal</span>
                  <span className="font-bold text-stone-800">
                    {selectedDetailedOrder.currency === 'NGN' ? '₦' : '$'}
                    {selectedDetailedOrder.items.reduce((acc, it) => acc + (it.priceAtPurchase * it.quantity), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Logistics fee</span>
                  <span className="font-bold text-stone-800">
                    {selectedDetailedOrder.deliveryDetails?.address === 'Pickup Station Allocation' ? 'FREE' : (selectedDetailedOrder.currency === 'NGN' ? '₦7,500' : '$5')}
                  </span>
                </div>
                <div className="flex justify-between text-stone-950 font-black pt-2 border-t text-sm">
                  <span>Total amount paid</span>
                  <span className="font-serif text-base text-amber-900">
                    {selectedDetailedOrder.currency === 'NGN' ? '₦' : '$'}{selectedDetailedOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-white border-t border-stone-200/80 flex justify-between items-center shrink-0">
              {/* Quick Reorder from details view */}
              <button
                type="button"
                onClick={() => {
                  onQuickReorder(selectedDetailedOrder.items.map(i => ({ productId: i.productId, quantity: i.quantity })));
                  setSelectedDetailedOrder(null);
                }}
                className="px-5 py-2.5 bg-stone-950 hover:bg-stone-850 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-97 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Re-Add All Items to Bag</span>
              </button>

              <button
                onClick={() => setSelectedDetailedOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:text-stone-950 hover:bg-stone-50 cursor-pointer"
              >
                Close details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
