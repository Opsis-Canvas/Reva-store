/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, Mail, Settings, Plus, Edit3, Trash2, Calendar, ClipboardList, 
  TrendingUp, LogOut, Loader2, Check, RefreshCw, Layers, CheckCircle, X 
} from 'lucide-react';
import { 
  db, auth, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, onSnapshot 
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User 
} from 'firebase/auth';
import { Product, Order, GlobalSettings } from '../types';

export default function AdminPortal() {
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isBootstrapMode, setIsBootstrapMode] = useState(false);
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Tab state: 'orders' | 'products' | 'settings'
  const [adminTab, setAdminTab] = useState<'orders' | 'products' | 'settings'>('orders');

  // Firestore Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ usdToNgnRate: 1550, updatedAt: Date.now(), updatedBy: 'System Default' });

  // Conversion rate form
  const [usdRateForm, setUsdRateForm] = useState(1550);

  // Product edit/add form states
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null); // null means adding new
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    imagesStr: '', // comma separated unsplash urls
    category: 'Bespoke Apparel',
    priceNGN: 0,
    priceUSD: 0,
    currencyMode: 'NGN' as 'NGN' | 'USD',
    quantityAvailable: 10,
    estimatedDeliveryDays: '14–21 days',
    status: 'active' as 'active' | 'draft' | 'soldOut'
  });

  // Check if system has admin accounts
  useEffect(() => {
    const checkBootstrapStatus = async () => {
      try {
        const adminsCol = collection(db, 'admins');
        const snap = await getDocs(adminsCol);
        if (snap.empty) {
          setIsBootstrapMode(true);
        }
      } catch (err) {
        console.error('Error checking admin collection:', err);
      } finally {
        setLoading(false);
      }
    };

    checkBootstrapStatus();
  }, []);

  // Monitor Auth state change
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // verify they are in the admins collection before granting view
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setAdminUser(user);
        } else {
          // not an admin, sign them out immediately
          await signOut(auth);
          setAdminUser(null);
          setAuthError('Unauthorized: Your UID is not registered as an administrator.');
        }
      } else {
        setAdminUser(null);
      }
    });
    return () => unsub();
  }, []);

  // Set up live sync of Products, Orders, and Settings if logged in
  useEffect(() => {
    if (!adminUser) return;

    // 1. Live Settings
    const settingsUnsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as GlobalSettings;
        setSettings(data);
        setUsdRateForm(data.usdToNgnRate);
      }
    });

    // 2. Live Products
    const productsUnsub = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snap) => {
      const prods: Product[] = [];
      snap.forEach((d) => {
        prods.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(prods);
    });

    // 3. Live Orders
    const ordersUnsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
      const ords: Order[] = [];
      snap.forEach((d) => {
        ords.push({ id: d.id, ...d.data() } as Order);
      });
      setOrders(ords);
    });

    return () => {
      settingsUnsub();
      productsUnsub();
      ordersUnsub();
    };
  }, [adminUser]);

  // Auth Submit logic
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Email and Password are required.');
      return;
    }

    try {
      if (isBootstrapMode) {
        // Create initial admin auth account
        const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        
        // Write details to Firestore 'admins'
        await setDoc(doc(db, 'admins', cred.user.uid), {
          uid: cred.user.uid,
          email: authEmail.toLowerCase(),
          role: 'owner',
          createdAt: Date.now()
        });

        // Initialize default global settings
        await setDoc(doc(db, 'settings', 'global'), {
          usdToNgnRate: 1550,
          updatedAt: Date.now(),
          updatedBy: authEmail.toLowerCase()
        });

        setAuthSuccess('Admin Account bootstrapped successfully! Redirecting dashboard...');
        setIsBootstrapMode(false);
      } else {
        // Standard admin log in
        const cred = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        
        // Check if UID exists in admins table
        const adminDoc = await getDoc(doc(db, 'admins', cred.user.uid));
        if (!adminDoc.exists()) {
          await signOut(auth);
          setAuthError('Account exists but has no Operator privileges.');
        } else {
          setAuthSuccess('Operator authenticated. Loading workspaces...');
        }
      }
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      setAuthError(err.message || 'Verification failed. Double check your operator credentials.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAdminUser(null);
    setAuthEmail('');
    setAuthPassword('');
    setAuthSuccess('');
    setAuthError('');
  };

  // Update Conversion Rate Setting in Firestore
  const handleUpdateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        usdToNgnRate: Number(usdRateForm),
        updatedAt: Date.now(),
        updatedBy: adminUser?.email || 'Admin'
      });
      alert('USD to NGN Conversion exchange rate updated successfully!');
    } catch (err) {
      console.error('Failed to update rate settings:', err);
      alert('Error updating rate settings.');
    }
  };

  // Order lifecycle update transition: processing -> ready -> shipped -> fulfilled
  const handleTransitionOrderStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus: 'processing' | 'ready' | 'shipped' | 'fulfilled' = 'processing';
    if (currentStatus === 'processing') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'shipped';
    else if (currentStatus === 'shipped') nextStatus = 'fulfilled';
    else return; // already fulfilled

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus: nextStatus,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Order state update failed:', err);
      alert('Failed to update order fulfillment status.');
    }
  };

  // Add or Edit Product in Firestore
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Split imagesStr back into clean array of strings
    const imagesArr = productForm.imagesStr
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (imagesArr.length === 0) {
      // Default placeholder if none entered
      imagesArr.push('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=600&auto=format&fit=crop');
    }

    const payload = {
      name: productForm.name,
      description: productForm.description,
      images: imagesArr,
      category: productForm.category,
      priceNGN: Number(productForm.priceNGN),
      priceUSD: Number(productForm.priceUSD),
      currencyMode: productForm.currencyMode,
      quantityAvailable: Number(productForm.quantityAvailable),
      estimatedDeliveryDays: productForm.estimatedDeliveryDays,
      status: productForm.status,
      updatedAt: Date.now()
    };

    try {
      if (editingProductId) {
        // Edit existing product
        await updateDoc(doc(db, 'products', editingProductId), payload);
      } else {
        // Add new product
        const newProductRef = doc(collection(db, 'products'));
        await setDoc(newProductRef, {
          ...payload,
          id: newProductRef.id,
          createdAt: Date.now()
        });
      }
      setIsProductFormOpen(false);
      setEditingProductId(null);
    } catch (err) {
      console.error('Failed to submit product:', err);
      alert('Error updating inventory item.');
    }
  };

  // Prep edit product form
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name,
      description: prod.description,
      imagesStr: prod.images.join(', '),
      category: prod.category,
      priceNGN: prod.priceNGN,
      priceUSD: prod.priceUSD,
      currencyMode: prod.currencyMode,
      quantityAvailable: prod.quantityAvailable,
      estimatedDeliveryDays: prod.estimatedDeliveryDays,
      status: prod.status
    });
    setIsProductFormOpen(true);
  };

  // Prep fresh product form
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      description: '',
      imagesStr: '',
      category: 'Bespoke Apparel',
      priceNGN: 45000,
      priceUSD: 30,
      currencyMode: 'NGN',
      quantityAvailable: 15,
      estimatedDeliveryDays: '14–21 days',
      status: 'active'
    });
    setIsProductFormOpen(true);
  };

  // Delete product
  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this product? This is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'products', prodId));
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Mounting operator terminal...
        </span>
      </div>
    );
  }

  // --- RENDERING IF NOT AUTHENTICATED ---
  if (!adminUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 min-h-[70vh]">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-amber-600/10 flex items-center justify-center rounded-full text-amber-700">
              <Lock className="w-5 h-5" />
            </div>
            
            <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
              {isBootstrapMode ? 'Bootstrap System Operator' : 'Operator Workstation'}
            </h2>
            
            <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
              {isBootstrapMode 
                ? 'Create the primary owner account to set up and run this catalog platform.' 
                : 'Authentication is invisible. Provide private credentials below to access catalogs and pipelines.'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            {/* Email field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="chidi@preorder.com"
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-600 focus:bg-white"
              />
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                Operator Passphrase
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••••••••"
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-amber-600 focus:bg-white"
              />
            </div>

            {/* Alerts */}
            {authError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-semibold leading-relaxed">
                {authError}
              </div>
            )}

            {authSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold leading-relaxed">
                {authSuccess}
              </div>
            )}

            <button
              id="admin-login-submit"
              type="submit"
              className="w-full bg-stone-950 hover:bg-stone-850 text-white font-bold uppercase tracking-wider text-xs py-3.5 rounded-xl transition-all shadow-md active:scale-98"
            >
              {isBootstrapMode ? 'Complete Platform Setup' : 'Access Operator Portal'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // --- RENDERING ONCE LOGGED IN (ADMIN DASHBOARD) ---
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase block mb-0.5">Control Center</span>
          <h2 className="font-serif text-2xl font-bold tracking-tight">Operator Dashboard</h2>
          <span className="text-xs text-stone-400 mt-1 block">Authenticated as: <strong className="text-stone-300">{adminUser.email}</strong></span>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>
      </div>

      {/* Admin Tab Selectors */}
      <div className="flex gap-2 border-b border-stone-200 pb-0.5">
        <button
          id="tab-orders-btn"
          onClick={() => setAdminTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            adminTab === 'orders' 
              ? 'border-amber-600 text-stone-900' 
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <ClipboardList className="w-4.5 h-4.5" />
          Order Pipeline ({orders.length})
        </button>
        <button
          id="tab-products-btn"
          onClick={() => setAdminTab('products')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            adminTab === 'products' 
              ? 'border-amber-600 text-stone-900' 
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Layers className="w-4.5 h-4.5" />
          Pre-Order Inventory ({products.length})
        </button>
        <button
          id="tab-settings-btn"
          onClick={() => setAdminTab('settings')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            adminTab === 'settings' 
              ? 'border-amber-600 text-stone-900' 
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Settings className="w-4.5 h-4.5" />
          System Settings
        </button>
      </div>

      {/* --- TAB CONTENT: SETTINGS (EXCHANGE RATE) --- */}
      {adminTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-md space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold uppercase tracking-wider text-stone-900">Exchange Rates Settings</h3>
            </div>

            <form onSubmit={handleUpdateExchangeRate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  USD to NGN rate (₦ per $1)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm font-bold text-stone-400">₦</span>
                  <input
                    id="input-usd-ngn-rate"
                    type="number"
                    required
                    value={usdRateForm}
                    onChange={(e) => setUsdRateForm(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-amber-600 focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 space-y-1">
                <span className="font-bold text-stone-700 uppercase block">How this works:</span>
                <p className="leading-relaxed">
                  All products pegged to USD will divide their priceUSD by this rate to calculate user displays. Products pegged to NGN will use this rate to calculate conversions when displaying in USD.
                </p>
              </div>

              <button
                id="submit-exchange-rate-btn"
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition-all shadow"
              >
                Save Conversion Rate
              </button>
            </form>
          </div>

          <div className="bg-stone-50 rounded-3xl border border-stone-200 p-8 flex flex-col justify-center space-y-4">
            <h4 className="font-serif text-lg font-bold text-stone-900">Current Conversion Rule snapshot</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
                <span className="text-[10px] uppercase font-bold text-stone-400">Active rate</span>
                <span className="block text-xl font-bold text-stone-950 mt-1">₦{settings.usdToNgnRate}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
                <span className="text-[10px] uppercase font-bold text-stone-400">Last Modified</span>
                <span className="block text-xs font-bold text-stone-600 mt-1.5">{new Date(settings.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <p className="text-xs text-stone-500 italic leading-relaxed text-center font-sans">
              System calculates updates instantly across all catalogs, bags, and checkouts.
            </p>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: INVENTORY MANAGER --- */}
      {adminTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-stone-500" />
              Pre-Order Product Catalog
            </h3>
            <button
              id="admin-add-product-btn"
              onClick={handleOpenAddProduct}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Pre-Order Product
            </button>
          </div>

          {/* Product form slide / modal drawer overlay */}
          {isProductFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
              <div 
                id="product-form-panel"
                className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]"
              >
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                  <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {editingProductId ? 'Configure Pre-Order Item' : 'New Pre-Order Item'}
                  </h4>
                  <button
                    onClick={() => setIsProductFormOpen(false)}
                    className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleProductFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Item Name</label>
                    <input
                      id="form-product-name"
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="The Editorial Linen Chore Jacket"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Category</label>
                    <select
                      id="form-product-category"
                      value={productForm.category}
                      onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white"
                    >
                      <option value="Bespoke Apparel">Bespoke Apparel</option>
                      <option value="Handcrafted Furniture">Handcrafted Furniture</option>
                      <option value="Artisanal Ceramics">Artisanal Ceramics</option>
                      <option value="Premium Footwear">Premium Footwear</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Detailed Description</label>
                    <textarea
                      id="form-product-description"
                      required
                      rows={3}
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Premium Belgian linen spun to order..."
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white resize-none"
                    />
                  </div>

                  {/* Pricing and Currency Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Currency Mode</label>
                      <select
                        id="form-product-currency-mode"
                        value={productForm.currencyMode}
                        onChange={(e) => setProductForm(prev => ({ ...prev, currencyMode: e.target.value as 'NGN' | 'USD' }))}
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white"
                      >
                        <option value="NGN">NGN Fixed</option>
                        <option value="USD">USD Fixed</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Price (NGN ₦)</label>
                      <input
                        id="form-product-price-ngn"
                        type="number"
                        required
                        value={productForm.priceNGN}
                        onChange={(e) => setProductForm(prev => ({ ...prev, priceNGN: Number(e.target.value) }))}
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Price (USD $)</label>
                      <input
                        id="form-product-price-usd"
                        type="number"
                        required
                        value={productForm.priceUSD}
                        onChange={(e) => setProductForm(prev => ({ ...prev, priceUSD: Number(e.target.value) }))}
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Sourcing details: Qty & Lead Days */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Allocation Quantity</label>
                      <input
                        id="form-product-qty"
                        type="number"
                        required
                        value={productForm.quantityAvailable}
                        onChange={(e) => setProductForm(prev => ({ ...prev, quantityAvailable: Number(e.target.value) }))}
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Production Lead Time</label>
                      <input
                        id="form-product-lead-days"
                        type="text"
                        required
                        value={productForm.estimatedDeliveryDays}
                        onChange={(e) => setProductForm(prev => ({ ...prev, estimatedDeliveryDays: e.target.value }))}
                        placeholder="14–21 days"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Images strings (comma separated unsplash links) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Unsplash Image URLs (comma separated)</label>
                    <textarea
                      id="form-product-images"
                      rows={2}
                      value={productForm.imagesStr}
                      onChange={(e) => setProductForm(prev => ({ ...prev, imagesStr: e.target.value }))}
                      placeholder="https://images.unsplash.com/photo-1598..., https://images.unsplash.com/photo-155..."
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white resize-none"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Status</label>
                    <select
                      id="form-product-status"
                      value={productForm.status}
                      onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-xs focus:bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="soldOut">Sold Out</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="form-product-submit"
                    type="submit"
                    className="w-full bg-stone-950 hover:bg-stone-850 text-white font-bold uppercase tracking-wider text-xs py-3.5 rounded-xl transition-all shadow-md active:scale-98 mt-4"
                  >
                    {editingProductId ? 'Apply Configurations' : 'Launch Pre-Order Allocation'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Product Cards Table */}
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[10px] font-black uppercase text-stone-400 tracking-wider">
                    <th className="p-4 pl-6">Catalog Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Pricings</th>
                    <th className="p-4">Lead times</th>
                    <th className="p-4">Allocated</th>
                    <th className="p-4 pr-6 text-right font-serif font-black">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs text-stone-600 font-sans">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-400">
                        Zero items found in your Firestore database. Click &quot;Add Pre-Order Product&quot; to begin catalog listings.
                      </td>
                    </tr>
                  ) : (
                    products.map(prod => (
                      <tr key={prod.id} className="hover:bg-stone-50/50">
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <img 
                            src={prod.images[0]} 
                            alt="" 
                            className="w-10 h-10 rounded object-cover border"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="block font-serif font-bold text-stone-950">{prod.name}</span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              prod.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                            }`}>
                              {prod.status.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 font-semibold">{prod.category}</td>
                        <td className="p-4">
                          <span className="block font-bold">₦{prod.priceNGN.toLocaleString()}</span>
                          <span className="text-stone-400 block">${prod.priceUSD.toLocaleString()}</span>
                          <span className="text-[9px] text-amber-800 font-bold uppercase">{prod.currencyMode} pegged</span>
                        </td>
                        <td className="p-4 font-medium">{prod.estimatedDeliveryDays}</td>
                        <td className="p-4 font-bold">{prod.quantityAvailable} left</td>
                        <td className="p-4 pr-6 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditProduct(prod)}
                            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-all"
                            title="Configure item"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                            title="Erase listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: ORDER PIPELINE --- */}
      {adminTab === 'orders' && (
        <div className="space-y-6">
          <h3 className="text-base font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-stone-500" />
            Bespoke Pre-Order Fulfillment Queue
          </h3>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-400">
                No customer orders recorded in Firestore. Try completing a checkout in the public storefront!
              </div>
            ) : (
              orders.map(order => (
                <div 
                  key={order.id}
                  className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex flex-col md:flex-row"
                >
                  
                  {/* Left Column: Order Metadata & Status */}
                  <div className="p-6 md:w-1/3 bg-stone-50 border-r border-stone-100 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-sm font-black text-amber-700">{order.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                          order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {order.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-xs space-y-0.5 text-stone-500">
                        <span className="block">Date Placed: {new Date(order.createdAt).toLocaleDateString()}</span>
                        {order.paystackReference && (
                          <span className="block text-[10px] font-mono">Paystack Ref: {order.paystackReference}</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs">
                      <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block mb-1">
                        Recipient Address
                      </span>
                      <strong className="block text-stone-900">{order.deliveryDetails.name}</strong>
                      <span className="block text-stone-500">{order.deliveryDetails.phone} | {order.deliveryDetails.email}</span>
                      <p className="mt-1.5 text-[11px] text-stone-600 border-t border-stone-100 pt-1 leading-relaxed">
                        {order.deliveryDetails.address}
                      </p>
                    </div>

                    {/* Next step transition trigger */}
                    {order.paymentStatus === 'paid' && order.orderStatus !== 'fulfilled' && (
                      <button
                        onClick={() => handleTransitionOrderStatus(order.id, order.orderStatus)}
                        className="w-full flex items-center justify-center gap-2 bg-stone-950 hover:bg-stone-850 text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        Advance to: {
                          order.orderStatus === 'processing' ? 'Ready (Completed)' : 
                          order.orderStatus === 'ready' ? 'Shipped (In Transit)' : 'Fulfilled'
                        }
                      </button>
                    )}
                  </div>

                  {/* Right Column: Ordered Items Details */}
                  <div className="p-6 md:w-2/3 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-widest font-black text-stone-400 block mb-2">
                        Bespoke Build Specifications
                      </span>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-3 bg-stone-50 rounded-xl border border-stone-200">
                          <div>
                            <span className="font-serif font-bold text-stone-900 block">{item.name}</span>
                            <span className="text-stone-400 block mt-0.5">Quantity: {item.quantity}</span>
                          </div>
                          <span className="font-bold text-stone-950">
                            {order.currency === 'NGN' ? '₦' : '$'}{(item.priceAtPurchase * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-stone-100 mt-auto">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Funded amount</span>
                        <span className="text-lg font-black text-stone-900 font-serif">
                          {order.currency === 'NGN' ? '₦' : '$'}{order.totalAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Fulfillment status</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800 uppercase tracking-wide bg-amber-100 px-3 py-1 rounded-full mt-1">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                          {order.orderStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
