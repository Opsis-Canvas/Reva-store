/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  db, auth, collection, doc, getDoc, getDocs, setDoc, onSnapshot, query, where, orderBy, signInAnonymously, onAuthStateChanged,
  handleFirestoreError, OperationType
} from './lib/firebase';
import { Product, CartItem, FavoriteItem, Category } from './types';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrderLookup from './components/OrderLookup';
import AdminPortal from './components/AdminPortal';
import Onboarding from './components/Onboarding';
import ProfileScreen from './components/ProfileScreen';
import RefundPage from './components/RefundPage';
import CompareModal from './components/CompareModal';
import { Layers, Heart, Compass, Search, ShieldCheck, HelpCircle, Shirt, Baby, ShoppingBag, Home, ChevronDown, Flame, TrendingUp, AlertCircle, RefreshCw, ArrowRight, User, GitCompare, BellRing, Sparkles, X, Share2 } from 'lucide-react';

export default function App() {
  // Navigation & View controllers
  const [isControlPath, setIsControlPath] = useState(
    window.location.pathname === '/control' || 
    window.location.hash === '#control' || 
    window.location.search.includes('admin=true')
  );
  
  const [activeView, setActiveView] = useState<'landing' | 'catalog' | 'favorites' | 'lookup' | 'profile' | 'refund'>('landing');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  
  // Database States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'All Allocations', 'Adult Apparel', 'Kids Sizing (0–18 Years)', 'Clothing Accessories', 'Home Accessories'
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Allocations');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversionRate, setConversionRate] = useState<number>(1550);

  // Customer Session States
  const [customerSessionId, setCustomerSessionId] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favoritesItems, setFavoritesItems] = useState<FavoriteItem[]>([]);
  
  // Dialog visibility controls
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Product Comparison States
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Real-time Order Status Toasts State
  interface OrderToast {
    id: string;
    orderId: string;
    status: 'processing' | 'shipped';
    itemsText: string;
    timestamp: number;
  }
  const [orderToasts, setOrderToasts] = useState<OrderToast[]>([]);
  const prevOrderStatusesRef = useRef<Record<string, string>>({});
  const observerRef = useRef<HTMLDivElement | null>(null);
  
  // Loading & Onboarding states
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Catalog sorting, filter tiers, and notification states
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [selectedPriceTier, setSelectedPriceTier] = useState<'All' | 'High' | 'Medium' | 'Low' | 'Ultra-Low'>('All');
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(1000000);
  const [notificationItems, setNotificationItems] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Onboarding status check on mount
  useEffect(() => {
    const hasCompleted = localStorage.getItem('has_completed_preorder_onboarding');
    if (!hasCompleted) {
      setShowOnboarding(true);
    }
  }, []);

  // Update slider default ranges when currency changes
  useEffect(() => {
    if (currency === 'NGN') {
      setPriceMin(0);
      setPriceMax(1000000);
    } else {
      setPriceMin(0);
      setPriceMax(1000);
    }
  }, [currency]);

  // Reset visible item count when filter category, query, or price options change
  useEffect(() => {
    setVisibleCount(8);
  }, [selectedCategory, searchQuery, selectedPriceTier, priceMin, priceMax]);

  // 1. Listen for isolated route paths (/control or #control)
  useEffect(() => {
    const handlePathAndHash = () => {
      const isAdmin = 
        window.location.pathname === '/control' || 
        window.location.hash === '#control' || 
        window.location.search.includes('admin=true');
      setIsControlPath(isAdmin);
    };

    window.addEventListener('popstate', handlePathAndHash);
    window.addEventListener('hashchange', handlePathAndHash);
    
    // Check path on mount
    handlePathAndHash();

    return () => {
      window.removeEventListener('popstate', handlePathAndHash);
      window.removeEventListener('hashchange', handlePathAndHash);
    };
  }, []);

  // 2. Invisible Customer Auth & Firestore Data Sync
  useEffect(() => {
    let unsubscribeCart: (() => void) | null = null;
    let unsubscribeFavs: (() => void) | null = null;
    let unsubscribeNotifs: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;

    const getLocalFallbackSessionId = () => {
      let id = localStorage.getItem('preorder_fallback_session_id');
      if (!id) {
        id = 'session-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('preorder_fallback_session_id', id);
      }
      return id;
    };

    const setupSnapshotListeners = (id: string) => {
      if (unsubscribeCart) unsubscribeCart();
      if (unsubscribeFavs) unsubscribeFavs();
      if (unsubscribeNotifs) unsubscribeNotifs();
      if (unsubscribeOrders) unsubscribeOrders();

      // Listen to live Cart document from Firestore
      const cartRef = doc(db, 'carts', id);
      unsubscribeCart = onSnapshot(cartRef, (snap) => {
        if (snap.exists()) {
          setCartItems(snap.data().items || []);
        } else {
          setCartItems([]);
        }
      }, (error) => {
        console.warn('[Cart Snapshot Sync Failure - fallback active]:', error);
      });

      // Listen to live Favorites document from Firestore
      const favRef = doc(db, 'favorites', id);
      unsubscribeFavs = onSnapshot(favRef, (snap) => {
        if (snap.exists()) {
          setFavoritesItems(snap.data().items || []);
        } else {
          setFavoritesItems([]);
        }
      }, (error) => {
        console.warn('[Favorites Snapshot Sync Failure - fallback active]:', error);
      });

      // Listen to live Notifications collection from Firestore for this user
      const notificationsRef = collection(db, 'notifications');
      const qNotif = query(notificationsRef, where('customerSessionId', '==', id));
      unsubscribeNotifs = onSnapshot(qNotif, (snap) => {
        const items: any[] = [];
        snap.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        setNotificationItems(items);
      }, (error) => {
        console.warn('[Notifications Snapshot Sync Failure]:', error);
      });

      // Listen to live Orders for real-time order status transition notifications
      const ordersRef = collection(db, 'orders');
      const qOrders = query(ordersRef, where('customerSessionId', '==', id));
      unsubscribeOrders = onSnapshot(qOrders, (snap) => {
        snap.forEach(docSnap => {
          const oId = docSnap.id;
          const oData = docSnap.data();
          const currentStatus = oData.orderStatus;
          const prevStatus = prevOrderStatusesRef.current[oId];

          // If we had a cached status and it transitioned, show a premium toast notification
          if (prevStatus && prevStatus !== currentStatus) {
            if (currentStatus === 'processing' || currentStatus === 'shipped') {
              const itemsList = oData.items || [];
              const itemsText = itemsList.map((itm: any) => `${itm.quantity}x ${itm.name}`).join(', ');

              const newToast: OrderToast = {
                id: Math.random().toString(36).substring(2, 9),
                orderId: oId,
                status: currentStatus as 'processing' | 'shipped',
                itemsText: itemsText || 'Artisan Custom Order',
                timestamp: Date.now()
              };

              setOrderToasts(prev => [newToast, ...prev]);

              // Automatically clear the toast after 8 seconds
              setTimeout(() => {
                setOrderToasts(prev => prev.filter(t => t.id !== newToast.id));
              }, 8000);
            }
          }

          // Update cached status
          prevOrderStatusesRef.current[oId] = currentStatus;
        });
      }, (error) => {
        console.warn('[Orders Real-time Snapshot Sync Failure]:', error);
      });
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCustomerSessionId(user.uid);
        setupSnapshotListeners(user.uid);
      } else {
        // Authenticate silently
        try {
          const cred = await signInAnonymously(auth);
          setCustomerSessionId(cred.user.uid);
          setupSnapshotListeners(cred.user.uid);
        } catch (err) {
          console.warn('[Invisible Auth Failure - falling back to local session ID]:', err);
          const fallbackId = getLocalFallbackSessionId();
          setCustomerSessionId(fallbackId);
          setupSnapshotListeners(fallbackId);
        }
      }
    });

    return () => {
      unsub();
      if (unsubscribeCart) unsubscribeCart();
      if (unsubscribeFavs) unsubscribeFavs();
      if (unsubscribeNotifs) unsubscribeNotifs();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, []);

  // Handle shared link lookups on startup
  const hasLoadedShareRef = useRef(false);
  useEffect(() => {
    if (!customerSessionId || hasLoadedShareRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) {
      hasLoadedShareRef.current = true;
      const loadSharedSnapshot = async () => {
        try {
          const shareDoc = await getDoc(doc(db, 'shares', shareId));
          if (shareDoc.exists()) {
            const data = shareDoc.data();
            if (data.type === 'favorites') {
              setFavoritesItems(data.items || []);
              setActiveView('favorites');
              // Save to Firestore under user's actual favorites collection for persistent sync
              await setDoc(doc(db, 'favorites', customerSessionId), {
                items: data.items || [],
                updatedAt: Date.now()
              });
              alert("Shared Wishlist loaded successfully!");
            } else if (data.type === 'cart') {
              setCartItems(data.items || []);
              setIsCartOpen(true);
              // Save to Firestore under user's actual carts collection for persistent sync
              await setDoc(doc(db, 'carts', customerSessionId), {
                items: data.items || [],
                updatedAt: Date.now()
              });
              alert("Shared Order Bag loaded successfully!");
            }
            // Clean up share parameter from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('share');
            window.history.replaceState({}, '', url.toString());
          } else {
            console.error("Shared link not found or expired.");
          }
        } catch (err) {
          console.error("Failed to load shared configuration:", err);
        }
      };
      loadSharedSnapshot();
    }
  }, [customerSessionId]);

  // 3. Dynamic Products & Rate Sync + Auto-Seeding with Offline-First Local Cache
  useEffect(() => {
    // Immediate fallback load from local storage for offline support
    try {
      const cached = localStorage.getItem('cached_artisan_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
          setIsProductsLoading(false);
        }
      }
    } catch (e) {
      console.warn('[Offline Cache load error]:', e);
    }

    // A. Sync conversion exchange rate from Firestore global settings
    const settingsRef = doc(db, 'settings', 'global');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setConversionRate(snap.data().usdToNgnRate || 1550);
      }
    });

    // B. Live sync Products
    const productsRef = collection(db, 'products');
    const qProds = query(productsRef, where('status', '==', 'active'));
    
    const unsubProducts = onSnapshot(qProds, async (snap) => {
      let needsReSeed = false;
      const tempProds: Product[] = [];
      
      snap.forEach((doc) => {
        const d = doc.data();
        tempProds.push({ id: doc.id, ...d } as Product);
        // If an old category exists, trigger re-seed
        if (d.category === 'Bespoke Apparel' || d.category === 'Handcrafted Furniture' || d.category === 'Artisanal Ceramics' || d.category === 'Premium Footwear') {
          needsReSeed = true;
        }
      });

      if (snap.empty || needsReSeed) {
        try {
          console.log('[SEEDING] Clearing or initializing catalog. Seeding Firestore with premium apparel, kids clothing, and accessories...');
          
          // Clear any active ones if we're re-seeding
          if (needsReSeed) {
            for (const docObj of snap.docs) {
              await setDoc(docObj.ref, { status: 'deleted', updatedAt: Date.now() }, { merge: true });
            }
          }

          const { SEED_PRODUCTS } = await import('./lib/seed');
          
          // Seed settings default
          await setDoc(doc(db, 'settings', 'global'), {
            usdToNgnRate: 1550,
            updatedAt: Date.now(),
            updatedBy: 'System Bootstrap'
          });

          // Seed products
          for (const p of SEED_PRODUCTS) {
            const docRef = doc(collection(db, 'products'));
            await setDoc(docRef, {
              ...p,
              id: docRef.id,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          console.log('[SEEDING] Firestore seeded successfully with fresh apparel catalog.');
        } catch (err) {
          console.error('[SEEDING ERROR]:', err);
        }
      } else {
        // Sort by createdAt desc in memory
        tempProds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setProducts(tempProds);
        
        // Cache to localStorage for future offline boots
        try {
          localStorage.setItem('cached_artisan_products', JSON.stringify(tempProds));
        } catch (e) {
          console.warn('[Offline Cache save error]:', e);
        }
        
        // Ensure a premium minimum loading sequence of 1200ms so the skeleton is visible & graceful
        setTimeout(() => {
          setIsProductsLoading(false);
        }, 1200);
      }
    });

    return () => {
      unsubSettings();
      unsubProducts();
    };
  }, []);

  // 3.5 Dynamic Head Tag Management (SEO / Dynamic Open Graph Tags)
  useEffect(() => {
    // Helper to set or create meta tags
    const setMetaTag = (name: string, content: string, isProperty: boolean = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    let title = "PREORDER — Bespoke Sourced-to-Order Catalog";
    let description = "Secure premium bespoke fashion, custom children's sizing, and artisan home accessories with verified authenticity.";
    let image = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600";
    let url = window.location.href;

    if (isControlPath) {
      title = "Admin Portal | PREORDER Platform";
      description = "Artisan Admin Console. Track preorder metrics, update allocations, and manage custom orders.";
    } else if (selectedProduct) {
      title = `${selectedProduct.name} | Premium Allocation PREORDER`;
      description = `Secure your preorder allocation for ${selectedProduct.name}. Crafted from premium materials with standard custom tailoring.`;
      image = selectedProduct.images?.[0] || image;
      url = `${window.location.origin}/product/${selectedProduct.id}`;
    } else if (activeView === 'favorites') {
      title = "My Saved Allocations | PREORDER";
      description = "Your curated wishlist of handcrafted clothing, bespoke shoes, and rare artisan home designs.";
    } else if (activeView === 'lookup') {
      title = "Order Status Lookup | PREORDER";
      description = "Track your artisan custom orders and check active pre-order queue in real-time.";
    } else if (activeView === 'profile') {
      title = "My Preorder Profile | PREORDER";
      description = "Manage your bespoke measurement profiles and tracking info.";
    } else if (selectedCategory && selectedCategory !== 'All Allocations') {
      title = `${selectedCategory} | PREORDER Bespoke Catalog`;
      description = `Discover our premium curated collection of ${selectedCategory}. Limitless options, custom sizing, and guaranteed authenticity.`;
    }

    // Set page title
    document.title = title;

    // Set meta tags
    setMetaTag('description', description);
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', image, true);
    setMetaTag('og:url', url, true);
    setMetaTag('og:type', 'website', true);
  }, [selectedProduct, selectedCategory, activeView, isControlPath]);

  // --- INTERACTION HOOKS (Saves to Firestore) ---

  const handleToggleCompare = (productId: string) => {
    setSelectedCompareIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      if (prev.length >= 2) {
        return [prev[1], productId];
      }
      return [...prev, productId];
    });
  };

  const handleToggleNotification = async (productId: string) => {
    if (!customerSessionId) return;
    try {
      const { db, collection, query, where, getDocs, deleteDoc, doc, writeBatch } = await import('./lib/firebase');
      
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef, 
        where('customerSessionId', '==', customerSessionId),
        where('productId', '==', productId)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        // Remove existing notification preference
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'notifications', d.id));
        }
      } else {
        // Add new notification preference atomically with rate-limit tracking
        const product = products.find(p => p.id === productId);
        const batch = writeBatch(db);
        
        const notifRef = doc(collection(db, 'notifications'));
        const rateLimitRef = doc(db, 'rate_limits', customerSessionId);
        const currentTimestamp = Date.now();

        batch.set(notifRef, {
          id: notifRef.id,
          customerSessionId: customerSessionId,
          productId: productId,
          productName: product?.name || 'Unknown Product',
          priceAtCreation: product?.currencyMode === 'NGN' ? product.priceNGN : product?.priceUSD || 0,
          currencyMode: product?.currencyMode || 'USD',
          createdAt: currentTimestamp,
          active: true
        });

        batch.set(rateLimitRef, {
          customerSessionId: customerSessionId,
          lastNotificationTime: currentTimestamp
        }, { merge: true });

        await batch.commit();
      }
    } catch (err) {
      console.error('Failed to toggle notification:', err);
    }
  };

  const handleUpdateCartQty = async (productId: string, qty: number) => {
    if (!customerSessionId) return;

    let updated = [...cartItems];
    const existingIdx = updated.findIndex(item => item.productId === productId);

    if (existingIdx > -1) {
      if (qty <= 0) {
        updated.splice(existingIdx, 1);
      } else {
        updated[existingIdx].quantity = qty;
      }
    }

    setCartItems(updated);
    
    // Save to Firestore cart document
    try {
      await setDoc(doc(db, 'carts', customerSessionId), {
        items: updated,
        updatedAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `carts/${customerSessionId}`);
    }
  };

  const triggerHapticFeedback = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(20);
    }
  };

  const handleAddToCart = async (productId: string, qty: number) => {
    if (!customerSessionId) return;
    triggerHapticFeedback();

    let updated = [...cartItems];
    const existingIdx = updated.findIndex(item => item.productId === productId);

    if (existingIdx > -1) {
      updated[existingIdx].quantity += qty;
    } else {
      updated.push({ productId, quantity: qty });
    }

    setCartItems(updated);
    setIsCartOpen(true); // open bag to show item added!

    // Save to Firestore cart document
    try {
      await setDoc(doc(db, 'carts', customerSessionId), {
        items: updated,
        updatedAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `carts/${customerSessionId}`);
    }
  };

  const handleRemoveFromCart = async (productId: string) => {
    handleUpdateCartQty(productId, 0);
  };

  const handleToggleFavorite = async (productId: string) => {
    if (!customerSessionId) return;
    triggerHapticFeedback();

    let updated = [...favoritesItems];
    const existingIdx = updated.findIndex(item => item.productId === productId);

    if (existingIdx > -1) {
      updated.splice(existingIdx, 1);
    } else {
      updated.push({ productId, addedAt: Date.now() });
    }

    setFavoritesItems(updated);

    // Save to Firestore favorites document
    try {
      await setDoc(doc(db, 'favorites', customerSessionId), {
        items: updated,
        updatedAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `favorites/${customerSessionId}`);
    }
  };

  const handleShareCart = async () => {
    if (cartItems.length === 0) {
      alert("Your order bag is empty.");
      return;
    }
    try {
      const shareId = `share-cart-${Math.random().toString(36).substring(2, 11)}`;
      await setDoc(doc(db, 'shares', shareId), {
        id: shareId,
        type: 'cart',
        items: cartItems,
        createdAt: Date.now()
      });
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Curated order bag shareable link copied to clipboard!");
    } catch (err) {
      console.error("Failed to create shared link:", err);
      alert("Failed to share curated order bag.");
    }
  };

  const handleShareFavorites = async () => {
    if (favoritesItems.length === 0) {
      alert("Your wishlist is empty.");
      return;
    }
    try {
      const shareId = `share-fav-${Math.random().toString(36).substring(2, 11)}`;
      await setDoc(doc(db, 'shares', shareId), {
        id: shareId,
        type: 'favorites',
        items: favoritesItems,
        createdAt: Date.now()
      });
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Wishlist shareable link copied to clipboard!");
    } catch (err) {
      console.error("Failed to create shared link:", err);
      alert("Failed to share wishlist.");
    }
  };

  const handleQuickReorder = async (items: { productId: string; quantity: number }[]) => {
    if (!customerSessionId) return;
    triggerHapticFeedback();

    let updated = [...cartItems];
    items.forEach(newItem => {
      const existingIdx = updated.findIndex(item => item.productId === newItem.productId);
      if (existingIdx > -1) {
        updated[existingIdx].quantity += newItem.quantity;
      } else {
        updated.push({ productId: newItem.productId, quantity: newItem.quantity });
      }
    });

    setCartItems(updated);
    setIsCartOpen(true); // Open the pre-order bag to show added items!

    // Save to Firestore cart document
    try {
      await setDoc(doc(db, 'carts', customerSessionId), {
        items: updated,
        updatedAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `carts/${customerSessionId}`);
    }
  };

  const handleClearCart = async () => {
    setCartItems([]);
    if (!customerSessionId) return;
    try {
      await setDoc(doc(db, 'carts', customerSessionId), {
        items: [],
        updatedAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `carts/${customerSessionId}`);
    }
  };

  const handleOpenCatalog = (cat?: string) => {
    if (cat) {
      setSelectedCategory(cat);
    }
    setIsProductsLoading(true);
    setActiveView('catalog');
    setTimeout(() => {
      setIsProductsLoading(false);
    }, 750);
  };

  // Helper to get active currency price of a product
  const getProductPrice = (prod: Product) => {
    if (prod.currencyMode === 'NGN') {
      return currency === 'NGN' ? prod.priceNGN : prod.priceNGN / conversionRate;
    } else {
      return currency === 'USD' ? prod.priceUSD : prod.priceUSD * conversionRate;
    }
  };

  // Filter and search catalog items
  const filteredProducts = products.filter(prod => {
    const matchesCategory = selectedCategory === 'All Allocations' || prod.category === selectedCategory;
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Get item price in display currency
    const price = getProductPrice(prod);

    // Apply Price Tier filter
    let matchesTier = true;
    if (selectedPriceTier !== 'All') {
      const highLimit = currency === 'NGN' ? 100000 : 100;
      const medLimit = currency === 'NGN' ? 40000 : 40;
      const lowLimit = currency === 'NGN' ? 10000 : 10;

      if (selectedPriceTier === 'High') {
        matchesTier = price >= highLimit;
      } else if (selectedPriceTier === 'Medium') {
        matchesTier = price >= medLimit && price < highLimit;
      } else if (selectedPriceTier === 'Low') {
        matchesTier = price >= lowLimit && price < medLimit;
      } else if (selectedPriceTier === 'Ultra-Low') {
        matchesTier = price < lowLimit;
      }
    }

    // Apply custom dual-input price range filter
    const matchesSlider = price >= priceMin && price <= priceMax;

    return matchesCategory && matchesSearch && matchesTier && matchesSlider;
  });

  // Sort catalog items
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return getProductPrice(a) - getProductPrice(b);
    } else if (sortBy === 'price_desc') {
      return getProductPrice(b) - getProductPrice(a);
    } else {
      // Newest arrivals
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
  });

  useEffect(() => {
    if (sortedProducts.length <= visibleCount) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 8);
      }
    }, {
      rootMargin: '150px',
      threshold: 0.1
    });

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [sortedProducts.length, visibleCount, activeView, isProductsLoading]);

  // --- ADMIN PORTAL WORKSPACE ISOLATION ---
  if (isControlPath) {
    return <AdminPortal />;
  }

  // --- CUSTOMER CATALOG STOREFRONT VIEW ---
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans antialiased pb-24 md:pb-0">
      
      {/* Header */}
      <Header 
        activeView={activeView}
        setActiveView={setActiveView}
        currency={currency}
        setCurrency={setCurrency}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        favoritesCount={favoritesItems.length}
        setIsCartOpen={setIsCartOpen}
      />

      {/* Main Viewport Routing */}
      <main className="flex-1 bg-stone-50">
        {activeView === 'landing' && (
          <div className="space-y-12 py-10 animate-fade-in bg-stone-50">
            {/* Bold Title Section */}
            <div className="text-center space-y-4 px-4">
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-900 px-4 py-1.5 rounded-full font-black uppercase tracking-[0.25em] inline-block shadow-2xs">
                Introducing The New Era
              </span>
              <h1 className="font-serif text-5xl sm:text-7xl font-black text-stone-950 uppercase tracking-widest leading-none pt-2">
                R E V A
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 max-w-lg mx-auto leading-relaxed">
                A premium, curated order platform offering sustainable handcrafted apparel, luxury scents, and high-quality clothing accessories. Sourced globally, tailored for perfection.
              </p>
            </div>

            {/* Infinite Moving Carousels of curate products (Left and Right) */}
            {products.length > 0 && (
              <div className="space-y-2">
                <div className="px-4 max-w-7xl mx-auto flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Featured Allocations</span>
                  <span className="text-[9px] font-mono text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Continuous Live Gallery (Hover to Pause)
                  </span>
                </div>
                
                <div className="w-full overflow-hidden py-6 bg-white border-y border-stone-200/80 shadow-2xs relative space-y-4">
                  {/* Row 1: Left Carousel */}
                  <div className="relative w-full overflow-hidden">
                    <div className="animate-marquee-left flex gap-4 pr-4">
                      {[...products, ...products, ...products].slice(0, 16).map((prod, idx) => (
                        <div 
                          key={`left-${prod.id}-${idx}`}
                          onClick={() => {
                            setSelectedProduct(prod);
                          }}
                          className="w-60 bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 shrink-0 cursor-pointer hover:shadow-md hover:border-amber-600/40 transition-all flex items-center gap-3.5 select-none animate-fade-in"
                        >
                          <img 
                            src={prod.images[0]} 
                            alt={prod.name} 
                            className="w-14 h-16 object-cover rounded-xl border border-stone-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-black uppercase text-stone-400 tracking-wider block">{prod.category}</span>
                            <h4 className="text-[11px] font-black text-stone-850 truncate">{prod.name}</h4>
                            <span className="text-[10px] font-mono text-amber-900 font-extrabold mt-0.5 block">
                              {prod.currencyMode === 'NGN'
                                ? (currency === 'NGN' ? `₦${prod.priceNGN.toLocaleString()}` : `$${Math.round(prod.priceNGN / conversionRate).toLocaleString()}`)
                                : (currency === 'USD' ? `$${prod.priceUSD.toLocaleString()}` : `₦${Math.round(prod.priceUSD * conversionRate).toLocaleString()}`)
                              }
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 2: Right Carousel */}
                  <div className="relative w-full overflow-hidden">
                    <div className="animate-marquee-right flex gap-4 pr-4">
                      {[...products, ...products, ...products].reverse().slice(0, 16).map((prod, idx) => (
                        <div 
                          key={`right-${prod.id}-${idx}`}
                          onClick={() => {
                            setSelectedProduct(prod);
                          }}
                          className="w-60 bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 shrink-0 cursor-pointer hover:shadow-md hover:border-amber-600/40 transition-all flex items-center gap-3.5 select-none animate-fade-in"
                        >
                          <img 
                            src={prod.images[0]} 
                            alt={prod.name} 
                            className="w-14 h-16 object-cover rounded-xl border border-stone-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-black uppercase text-stone-400 tracking-wider block">{prod.category}</span>
                            <h4 className="text-[11px] font-black text-stone-850 truncate">{prod.name}</h4>
                            <span className="text-[10px] font-mono text-amber-900 font-extrabold mt-0.5 block">
                              {prod.currencyMode === 'NGN'
                                ? (currency === 'NGN' ? `₦${prod.priceNGN.toLocaleString()}` : `$${Math.round(prod.priceNGN / conversionRate).toLocaleString()}`)
                                : (currency === 'USD' ? `$${prod.priceUSD.toLocaleString()}` : `₦${Math.round(prod.priceUSD * conversionRate).toLocaleString()}`)
                              }
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Category Store Section: Soft-edged Rectangles for Men, Women, Children */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-black text-stone-900 tracking-tight">Top Category Stores</h3>
                <p className="text-xs text-stone-400 font-mono uppercase tracking-widest">Curated lines designed for targeted fits and specifications</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Men's Store Rectangle */}
                <div 
                  onClick={() => {
                    setSearchQuery('Men');
                    handleOpenCatalog('Adult Apparel');
                  }}
                  className="bg-white border border-stone-200/80 p-8 rounded-3xl cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between h-56 group select-none relative overflow-hidden"
                >
                  <div className="absolute right-0 bottom-0 translate-x-1/6 translate-y-1/6 opacity-10 group-hover:scale-110 group-hover:opacity-15 transition-all duration-300">
                    <Shirt className="w-48 h-48 text-stone-900" />
                  </div>
                  <div className="z-10">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider font-mono">Curated Tailoring</span>
                    <h4 className="font-serif text-2xl font-bold text-stone-900 mt-2 group-hover:text-amber-700 transition-colors">Men's Line</h4>
                    <p className="text-[11px] text-stone-500 mt-1 max-w-[200px]">Structured jackets, premium Belgian linen, and custom transitional knitwear.</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-800 mt-4 z-10">
                    Explore Store <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Women's Store Rectangle */}
                <div 
                  onClick={() => {
                    setSearchQuery('Women');
                    handleOpenCatalog('Adult Apparel');
                  }}
                  className="bg-white border border-stone-200/80 p-8 rounded-3xl cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between h-56 group select-none relative overflow-hidden"
                >
                  <div className="absolute right-0 bottom-0 translate-x-1/6 translate-y-1/6 opacity-10 group-hover:scale-110 group-hover:opacity-15 transition-all duration-300">
                    <Layers className="w-48 h-48 text-stone-900" />
                  </div>
                  <div className="z-10">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider font-mono">Modern Silhouette</span>
                    <h4 className="font-serif text-2xl font-bold text-stone-900 mt-2 group-hover:text-amber-700 transition-colors">Women's Line</h4>
                    <p className="text-[11px] text-stone-500 mt-1 max-w-[200px]">Elegant drapes, handcrafted resort wear, and detailed wool coordinates.</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-800 mt-4 z-10">
                    Explore Store <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Kids Store Rectangle */}
                <div 
                  onClick={() => {
                    setSearchQuery('');
                    handleOpenCatalog('Kids Sizing (0–18 Years)');
                  }}
                  className="bg-white border border-stone-200/80 p-8 rounded-3xl cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between h-56 group select-none relative overflow-hidden"
                >
                  <div className="absolute right-0 bottom-0 translate-x-1/6 translate-y-1/6 opacity-10 group-hover:scale-110 group-hover:opacity-15 transition-all duration-300">
                    <Baby className="w-48 h-48 text-stone-900" />
                  </div>
                  <div className="z-10">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider font-mono">Sizing 0–18 Years</span>
                    <h4 className="font-serif text-2xl font-bold text-stone-900 mt-2 group-hover:text-amber-700 transition-colors">Children's Line</h4>
                    <p className="text-[11px] text-stone-500 mt-1 max-w-[200px]">Handcrafted child assemblies, soft cotton layers, and vibrant accessories.</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-800 mt-4 z-10">
                    Explore Store <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </section>

            {/* Browse by Category with Icons */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="text-center space-y-1.5">
                <h3 className="font-serif text-2xl font-black text-stone-900 tracking-tight">Browse by Category</h3>
                <p className="text-xs text-stone-400">Select a curated department to configure customized orders</p>
              </div>

              {/* Grid with icons and categories (clothes, shoes, perfumes, accessories, and rest) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {/* Clothes Category Box */}
                <div 
                  onClick={() => {
                    setSearchQuery('');
                    handleOpenCatalog('Adult Apparel');
                  }}
                  className="bg-white border border-stone-200/85 p-6 rounded-2xl flex flex-col items-center text-center gap-3.5 cursor-pointer hover:border-amber-600 hover:shadow-sm transition-all select-none group active:scale-97"
                >
                  <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                    <Shirt className="w-6 h-6 text-stone-700" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-stone-800">Clothes</span>
                </div>

                {/* Shoes Category Box */}
                <div 
                  onClick={() => {
                    setSearchQuery('shoe');
                    handleOpenCatalog('Clothing Accessories');
                  }}
                  className="bg-white border border-stone-200/85 p-6 rounded-2xl flex flex-col items-center text-center gap-3.5 cursor-pointer hover:border-amber-600 hover:shadow-sm transition-all select-none group active:scale-97"
                >
                  <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                    <Layers className="w-6 h-6 text-stone-700" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-stone-800">Shoes</span>
                </div>

                {/* Perfumes Category Box */}
                <div 
                  onClick={() => {
                    setSearchQuery('scent');
                    handleOpenCatalog('Home Accessories');
                  }}
                  className="bg-white border border-stone-200/85 p-6 rounded-2xl flex flex-col items-center text-center gap-3.5 cursor-pointer hover:border-amber-600 hover:shadow-sm transition-all select-none group active:scale-97"
                >
                  <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                    <Flame className="w-6 h-6 text-stone-700 animate-pulse" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-stone-800">Perfumes</span>
                </div>

                {/* Accessories Category Box */}
                <div 
                  onClick={() => {
                    setSearchQuery('');
                    handleOpenCatalog('Clothing Accessories');
                  }}
                  className="bg-white border border-stone-200/85 p-6 rounded-2xl flex flex-col items-center text-center gap-3.5 cursor-pointer hover:border-amber-600 hover:shadow-sm transition-all select-none group active:scale-97"
                >
                  <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                    <ShoppingBag className="w-6 h-6 text-stone-700" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-stone-800">Accessories</span>
                </div>

                {/* All the Rest Category Box */}
                <div 
                  onClick={() => {
                    setSearchQuery('');
                    handleOpenCatalog('All Allocations');
                  }}
                  className="bg-white border border-stone-200/85 p-6 rounded-2xl flex flex-col items-center text-center gap-3.5 cursor-pointer hover:border-amber-600 hover:shadow-sm transition-all select-none group col-span-2 sm:col-span-1 active:scale-97"
                >
                  <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                    <Compass className="w-6 h-6 text-stone-700" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-stone-800">All the Rest</span>
                </div>
              </div>

              {/* Catalog Button that opens the catalog with shimmer loader */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => handleOpenCatalog('All Allocations')}
                  className="px-10 py-4 bg-stone-950 hover:bg-stone-850 text-white font-black text-xs uppercase tracking-[0.2em] rounded-full shadow-md transition-all active:scale-98 hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  Open Full Catalog <Compass className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </section>
          </div>
        )}

        {activeView === 'catalog' && (
          <div className="space-y-0">
            {/* Elegant Hero Banner */}
            <Hero />

            {/* Trending Allocations Carousel Section */}
            {products.length > 0 && (
              <section className="bg-stone-100 border-y border-stone-200 py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                      <h3 className="font-serif text-xl font-black text-stone-900 tracking-tight">Trending Allocations</h3>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono font-bold uppercase tracking-widest bg-stone-200/60 border border-stone-300/40 px-2.5 py-1 rounded-full">
                      High Demand Batches
                    </span>
                  </div>

                  {/* Horizontal Scroll Carousel */}
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 px-1 snap-x scrollbar-thin scrollbar-thumb-stone-300">
                    {products.slice(0, 4).map(prod => (
                      <div
                        key={`trending-${prod.id}`}
                        onClick={() => setSelectedProduct(prod)}
                        className="snap-start shrink-0 w-64 sm:w-72 bg-white rounded-2xl border border-stone-200 p-3.5 space-y-3 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none relative group animate-fade-in"
                      >
                        {/* Image Frame */}
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-100">
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 left-2 bg-amber-500/95 backdrop-blur-3xs text-stone-950 font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs animate-pulse">
                            <Flame className="w-2.5 h-2.5 fill-stone-950" />
                            Trending
                          </div>
                        </div>

                        {/* Title & Metadata */}
                        <div className="space-y-1">
                          <span className="text-[8px] font-black uppercase tracking-wider text-stone-400 block">{prod.category}</span>
                          <h4 className="font-serif text-sm font-extrabold text-stone-850 group-hover:text-amber-700 transition-colors line-clamp-1">{prod.name}</h4>
                          <div className="flex justify-between items-center pt-1">
                            <span className="font-mono text-xs font-bold text-stone-700">
                              {prod.currencyMode === 'NGN'
                                ? (currency === 'NGN' ? `₦${prod.priceNGN.toLocaleString()}` : `$${Math.round(prod.priceNGN / conversionRate).toLocaleString()}`)
                                : (currency === 'USD' ? `$${prod.priceUSD.toLocaleString()}` : `₦${Math.round(prod.priceUSD * conversionRate).toLocaleString()}`)
                              }
                            </span>
                            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider group-hover:text-amber-800 flex items-center gap-0.5 transition-colors">
                              View Specs
                              <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Catalog Browse Section */}
            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
              
              {/* Category Filter Pills and Search */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-stone-200 pb-6">
                
                {/* Scrollable Horizontal Pill Navigation with Dedicated Icons */}
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2.5 max-w-full -mx-4 px-4 md:mx-0 md:px-0">
                  {categories.map(cat => {
                    let IconComponent = Compass;
                    if (cat === 'Adult Apparel') IconComponent = Shirt;
                    if (cat === 'Kids Sizing (0–18 Years)') IconComponent = Baby;
                    if (cat === 'Clothing Accessories') IconComponent = ShoppingBag;
                    if (cat === 'Home Accessories') IconComponent = Home;

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap border ${
                          selectedCategory === cat 
                            ? 'bg-stone-950 text-white border-stone-950 shadow-md scale-[1.02]' 
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900 shadow-sm'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${selectedCategory === cat ? 'text-amber-400' : 'text-stone-400'}`} />
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Search Controls Container */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  {/* Filter Search Field */}
                  <div className="relative w-full sm:w-80 md:w-96">
                    <input
                      id="catalog-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search bespoke creations..."
                      className="w-full bg-white border border-stone-200 rounded-full pl-4 pr-10 py-2.5 text-xs focus:outline-amber-600 focus:border-transparent shadow-sm"
                    />
                    <Search className="absolute right-3.5 top-3.5 w-3.5 h-3.5 text-stone-400" />
                  </div>

                  {/* Refined Filters Sleek Dropdown Toggle Button */}
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-bold transition-all select-none shadow-sm cursor-pointer ${
                      isFilterDropdownOpen
                        ? 'bg-amber-500 border-amber-600 text-white'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>Filters &amp; Sorting</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Premium Refined Sourcing Filter Workspace */}
              {isFilterDropdownOpen && (
                <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in mb-6">
                  
                  {/* Col 1: Preset Price Tiers (Span 5) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-stone-850">Preset Price Tiers</span>
                      {/* Tooltip Icon with Help info */}
                      <div className="group relative cursor-pointer">
                        <HelpCircle className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600 transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-stone-900 text-stone-100 text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30 leading-relaxed text-left">
                          Pre-segmented premium price classes. Tap any tier to quickly lock catalog to that tier's standard range.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 xs:grid-cols-5 gap-2">
                      {[
                        { id: 'All', label: 'All', range: 'Any Price' },
                        { id: 'High', label: 'High', range: currency === 'NGN' ? '≥ ₦100k' : '≥ $100' },
                        { id: 'Medium', label: 'Medium', range: currency === 'NGN' ? '₦40k-100k' : '$40-100' },
                        { id: 'Low', label: 'Low', range: currency === 'NGN' ? '₦10k-40k' : '$10-40' },
                        { id: 'Ultra-Low', label: 'Ultra-Low', range: currency === 'NGN' ? '< ₦10k' : '< $10' }
                      ].map(tier => (
                        <button
                          key={tier.id}
                          onClick={() => {
                            setSelectedPriceTier(tier.id as any);
                            const highLimit = currency === 'NGN' ? 100000 : 100;
                            const medLimit = currency === 'NGN' ? 40000 : 40;
                            const lowLimit = currency === 'NGN' ? 10000 : 10;
                            const maxLimit = currency === 'NGN' ? 1000000 : 1000;

                            if (tier.id === 'All') {
                              setPriceMin(0);
                              setPriceMax(maxLimit);
                            } else if (tier.id === 'High') {
                              setPriceMin(highLimit);
                              setPriceMax(maxLimit);
                            } else if (tier.id === 'Medium') {
                              setPriceMin(medLimit);
                              setPriceMax(highLimit);
                            } else if (tier.id === 'Low') {
                              setPriceMin(lowLimit);
                              setPriceMax(medLimit);
                            } else if (tier.id === 'Ultra-Low') {
                              setPriceMin(0);
                              setPriceMax(lowLimit);
                            }
                          }}
                          className={`px-2 py-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 select-none ${
                            selectedPriceTier === tier.id
                              ? 'bg-amber-500/10 border-amber-600 text-amber-950 font-black scale-[1.02]'
                              : 'bg-stone-50 border-stone-250 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                          }`}
                        >
                          <span className="text-[10px] font-extrabold uppercase tracking-wide">{tier.label}</span>
                          <span className="text-[8px] font-mono text-stone-400 font-bold block whitespace-nowrap">{tier.range}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Col 2: Interactive Dual-Input Price Slider (Span 4) */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-stone-500" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-stone-850">Custom Price Range</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-amber-850 bg-amber-500/5 px-2 py-0.5 rounded-md border border-amber-600/10 uppercase">
                        Slider Active
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* The Sliders */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Min Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Min Price</span>
                            <span className="text-[10px] font-mono font-black text-stone-800">
                              {currency === 'NGN' ? '₦' : '$'}{priceMin.toLocaleString()}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={currency === 'NGN' ? '500000' : '500'}
                            step={currency === 'NGN' ? '5000' : '5'}
                            value={priceMin}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPriceMin(val);
                              if (val > priceMax) setPriceMax(val);
                              setSelectedPriceTier('All');
                            }}
                            className="w-full accent-amber-600 cursor-pointer h-1 bg-stone-200 rounded-lg appearance-none"
                          />
                        </div>

                        {/* Max Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Max Price</span>
                            <span className="text-[10px] font-mono font-black text-stone-800">
                              {currency === 'NGN' ? '₦' : '$'}{priceMax.toLocaleString()}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={currency === 'NGN' ? '1000000' : '1000'}
                            step={currency === 'NGN' ? '5000' : '5'}
                            value={priceMax}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPriceMax(val);
                              if (val < priceMin) setPriceMin(val);
                              setSelectedPriceTier('All');
                            }}
                            className="w-full accent-amber-600 cursor-pointer h-1 bg-stone-200 rounded-lg appearance-none"
                          />
                        </div>
                      </div>

                      {/* Numeric Input overrides */}
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-2 text-[10px] text-stone-400 font-bold uppercase">{currency === 'NGN' ? '₦' : '$'}</span>
                          <input
                            type="number"
                            value={priceMin}
                            onChange={(e) => {
                              setPriceMin(Math.max(0, Number(e.target.value)));
                              setSelectedPriceTier('All');
                            }}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl py-1.5 pl-6 pr-2 text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-400"
                            placeholder="Min"
                          />
                        </div>
                        <span className="text-[9px] text-stone-400 font-bold uppercase">TO</span>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-2 text-[10px] text-stone-400 font-bold uppercase">{currency === 'NGN' ? '₦' : '$'}</span>
                          <input
                            type="number"
                            value={priceMax}
                            onChange={(e) => {
                              setPriceMax(Math.max(0, Number(e.target.value)));
                              setSelectedPriceTier('All');
                            }}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl py-1.5 pl-6 pr-2 text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-400"
                            placeholder="Max"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Col 3: Sorting Options with Explanations (Span 3) */}
                  <div className="lg:col-span-3 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-stone-500" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-stone-850">Sort Ordering</span>
                      {/* Tooltip Icon with Sorting info */}
                      <div className="group relative cursor-pointer">
                        <HelpCircle className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600 transition-colors" />
                        <div className="absolute bottom-full right-0 mb-2 w-52 bg-stone-900 text-stone-100 text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30 leading-relaxed text-left">
                          Control how the customized catalog elements are sequenced for display.
                        </div>
                      </div>
                    </div>

                    <div className="relative space-y-1.5">
                      <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-250 rounded-2xl py-3 px-4 text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-400 transition-all cursor-pointer shadow-3xs"
                      >
                        <option value="newest">Newest Batches</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                      </select>

                      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60">
                        <span className="text-[9px] text-stone-500 leading-normal block font-sans text-left">
                          {sortBy === 'newest' && '⚡ Displaying the latest releases and restocks first.'}
                          {sortBy === 'price_asc' && '📈 Sequenced from most accessible to highest luxury premium.'}
                          {sortBy === 'price_desc' && '💎 Displaying top high-end collections first.'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Grid Catalog Cards */}
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
                    {selectedCategory}
                  </h2>
                  <span className="text-xs text-stone-400 font-mono">
                    {filteredProducts.length} unique builds available
                  </span>
                </div>

                {isProductsLoading ? (
                  <div className="columns-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-6 space-y-0">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                      <div 
                        key={idx} 
                        className="bg-white rounded-2xl overflow-hidden border border-stone-200 p-0 break-inside-avoid inline-block w-full mb-4 sm:mb-6 select-none shadow-sm animate-fade-in"
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        {/* Shimmery Product Image aspect-[4/5] */}
                        <div className="relative w-full aspect-[4/5] animate-shimmer" />
                        
                        {/* Content section */}
                        <div className="p-3 sm:p-5 space-y-3">
                          {/* Category Badge skeleton */}
                          <div className="h-3.5 w-1/4 animate-shimmer-dark rounded-md" />
                          {/* Title skeleton */}
                          <div className="h-5 w-3/4 animate-shimmer rounded-lg" />
                          {/* Description lines */}
                          <div className="space-y-1.5 pt-1">
                            <div className="h-2.5 w-full animate-shimmer rounded" />
                            <div className="h-2.5 w-5/6 animate-shimmer rounded" />
                          </div>
                          {/* Bottom Row skeleton */}
                          <div className="flex justify-between items-center pt-4 border-t border-stone-100 mt-2">
                            <div className="space-y-1.5 w-1/3">
                              <div className="h-2 w-1/2 animate-shimmer rounded" />
                              <div className="h-4 w-full animate-shimmer-dark rounded" />
                            </div>
                            {/* Action Button skeleton */}
                            <div className="h-7 w-20 animate-shimmer-dark rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-24 bg-white border rounded-3xl space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                      <Compass className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-stone-900">No bespoke allocations found</h3>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                      Try resetting your categories or keywords to find curated items currently active.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="columns-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-6 space-y-0">
                      {sortedProducts.slice(0, visibleCount).map(prod => (
                        <ProductCard 
                          key={prod.id}
                          product={prod}
                          currency={currency}
                          conversionRate={conversionRate}
                          onSelect={() => setSelectedProduct(prod)}
                          onToggleFavorite={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(prod.id);
                          }}
                          isFavorite={favoritesItems.some(item => item.productId === prod.id)}
                          isNotified={notificationItems.some(item => item.productId === prod.id)}
                          onToggleNotification={(e) => {
                            e.stopPropagation();
                            handleToggleNotification(prod.id);
                          }}
                          isComparing={selectedCompareIds.includes(prod.id)}
                          onToggleCompare={(e) => {
                            e.stopPropagation();
                            handleToggleCompare(prod.id);
                          }}
                        />
                      ))}
                    </div>

                    {sortedProducts.length > visibleCount && (
                      <div ref={observerRef} className="flex justify-center pt-8 pb-4">
                        <div className="flex items-center gap-2 text-xs text-stone-400 font-mono tracking-wider">
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                          <span>LOADING MORE CREATIONS AUTOMATICALLY...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </section>
          </div>
        )}

        {/* Saved Wishlist View */}
        {activeView === 'favorites' && (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-8 min-h-[60vh]">
            <div className="text-center space-y-4">
              <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900 font-medium">Your Saved Wishlist</h2>
              <p className="text-sm text-stone-500 max-w-sm mx-auto">
                Review your customized configured selections before locking down pre-order quantities.
              </p>
              {favoritesItems.length > 0 && (
                <div className="flex justify-center">
                  <button
                    onClick={handleShareFavorites}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-250 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-xs font-bold transition-all shadow-3xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-stone-500" />
                    Share Wishlist Link
                  </button>
                </div>
              )}
            </div>

            {favoritesItems.length === 0 ? (
              <div className="text-center py-24 bg-white border rounded-3xl space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900">Your wishlist is empty</h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                  Tap the heart icon on any curated catalog product card to save item configurations here.
                </p>
                <button
                  onClick={() => setActiveView('catalog')}
                  className="mt-2 text-xs font-bold text-stone-950 border border-stone-400 rounded-full px-5 py-2.5 hover:bg-stone-100 uppercase transition-all"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              <div className="columns-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-6 space-y-0">
                {products
                  .filter(p => favoritesItems.some(item => item.productId === p.id))
                  .map(prod => (
                    <ProductCard 
                      key={prod.id}
                      product={prod}
                      currency={currency}
                      conversionRate={conversionRate}
                      onSelect={() => setSelectedProduct(prod)}
                      onToggleFavorite={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(prod.id);
                      }}
                      isFavorite={true}
                      isNotified={notificationItems.some(item => item.productId === prod.id)}
                      onToggleNotification={(e) => {
                        e.stopPropagation();
                        handleToggleNotification(prod.id);
                      }}
                    />
                  ))}
              </div>
            )}
          </section>
        )}

        {/* Order Status Lookup View */}
        {activeView === 'lookup' && <OrderLookup customerSessionId={customerSessionId} />}

        {/* Profile Details Screen */}
        {activeView === 'profile' && (
          <ProfileScreen
            customerSessionId={customerSessionId}
            favoritesItems={favoritesItems}
            products={products}
            notificationItems={notificationItems}
            onToggleFavorite={handleToggleFavorite}
            onToggleNotification={handleToggleNotification}
            setActiveView={setActiveView}
            currency={currency}
            conversionRate={conversionRate}
            onSelectProduct={setSelectedProduct}
            onQuickReorder={handleQuickReorder}
          />
        )}

        {/* Refund & Sourcing Policies View */}
        {activeView === 'refund' && (
          <RefundPage
            setActiveView={setActiveView}
            currency={currency}
            conversionRate={conversionRate}
          />
        )}
      </main>

      {/* Custom Global Footer */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-5 space-y-4">
            <span className="font-serif text-lg tracking-wide text-white block">P R E O R D E R</span>
            <p className="text-xs leading-relaxed max-w-sm">
              An offline-first, made-to-order catalog platform that brings premium artisan quality directly to your doorstep. Supporting NGN and USD display options with real-time conversion rates.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Verified Secure Server Authentication Architecture
            </div>
          </div>

          <div className="md:col-span-3 space-y-3 text-xs">
            <span className="font-bold text-white uppercase tracking-wider block">Information</span>
            <ul className="space-y-2 flex flex-col items-start text-left">
              <li><button onClick={() => setActiveView('catalog')} className="hover:text-white transition-colors text-left">Browse Catalog</button></li>
              <li><button onClick={() => setActiveView('lookup')} className="hover:text-white transition-colors text-left">Track Order Status</button></li>
              <li><button onClick={() => setActiveView('profile')} className="hover:text-white transition-colors text-left">Artisan Profile Settings</button></li>
              <li><button onClick={() => setActiveView('refund')} className="hover:text-white transition-colors text-left">Insured Refund & Policies</button></li>
              <li><a href="/control" className="hover:text-white transition-colors font-semibold text-left">Operator Workstation login</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3 text-xs">
            <span className="font-bold text-white uppercase tracking-wider block">Artisan Sourcing Model</span>
            <p className="leading-relaxed">
              We eliminate traditional retail waste by producing exclusively on demand. Sourcing raw materials to custom specs takes a few extra days, which keeps our pricing exceptional. Thank you for shopping intentionally.
            </p>
          </div>

        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-stone-800 mt-10 pt-6 text-[11px] text-stone-500 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <span>&copy; {new Date().getFullYear()} PreOrder Studio Platform. Produced under VCAM Phase 1.</span>
          <div className="flex gap-4">
            <span>PCI Compliant Paystack Simulators</span>
            <span>Firestore Persistent Storage</span>
          </div>
        </div>
      </footer>

      {/* --- DRAWERS & MODALS MOUNTED GLOBALLY --- */}

      {/* Product Detail Spec Dialog */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct}
          currency={currency}
          conversionRate={conversionRate}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onToggleFavorite={() => handleToggleFavorite(selectedProduct.id)}
          isFavorite={favoritesItems.some(item => item.productId === selectedProduct.id)}
          allProducts={products}
          onSelectProduct={setSelectedProduct}
          favoritesItems={favoritesItems}
          onToggleFavoriteById={handleToggleFavorite}
        />
      )}

      {/* Cart Sidebar drawer */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        products={products}
        currency={currency}
        conversionRate={conversionRate}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        onShareCart={handleShareCart}
      />

      {/* Checkout Payment Dialog */}
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        products={products}
        currency={currency}
        conversionRate={conversionRate}
        customerSessionId={customerSessionId}
        onOrderCreated={(orderId) => {
          // Can navigate or do callback updates
          setActiveView('lookup');
        }}
        clearCart={handleClearCart}
      />

      {/* Onboarding Dialog Overlay */}
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}

      {/* Floating Compare Action Bar */}
      {selectedCompareIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-xl flex flex-col xs:flex-row items-center gap-4 border border-stone-800 max-w-[90vw] w-full sm:max-w-md animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <GitCompare className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black uppercase tracking-wider">Compare Artisan Builds</p>
              <p className="text-[9px] text-stone-400 font-medium">
                {selectedCompareIds.length === 1 
                  ? 'Select 1 more creation to compare specs' 
                  : '2 creations selected for side-by-side spec check'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full xs:w-auto justify-end">
            <button
              onClick={() => setSelectedCompareIds([])}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-[10px] text-stone-300 font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-[10px] text-stone-950 font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              Compare
              <span className="bg-stone-950 text-white px-1.5 py-0.5 rounded-full text-[8px] font-black">
                {selectedCompareIds.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {isCompareModalOpen && (
        <CompareModal
          products={products}
          selectedCompareIds={selectedCompareIds}
          onClose={() => setIsCompareModalOpen(false)}
          currency={currency}
          conversionRate={conversionRate}
          onAddToCart={(productId) => handleAddToCart(productId, 1)}
          onToggleCompare={handleToggleCompare}
          onSelectProduct={setSelectedProduct}
        />
      )}

      {/* Real-time Order Status Toasts Container */}
      {orderToasts.length > 0 && (
        <div className="fixed top-6 right-6 z-55 flex flex-col gap-3 max-w-sm w-full">
          {orderToasts.map(toast => (
            <div
              key={toast.id}
              className="bg-stone-900 border border-stone-800 text-white rounded-2xl shadow-2xl p-4 flex gap-3.5 relative overflow-hidden animate-slide-in select-none group text-left"
            >
              {/* Gold gradient background bar */}
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
              
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 font-bold tracking-wider font-mono text-left">ORDER STATUS TRIGGERED</span>
                  <button
                    onClick={() => setOrderToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="text-stone-500 hover:text-white transition-colors p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-left">
                  <h4 className="font-serif text-sm font-black text-amber-400">Order {toast.orderId} is now {toast.status}!</h4>
                  <p className="text-[11px] text-stone-300 leading-normal font-medium mt-0.5 line-clamp-2">
                    {toast.itemsText}
                  </p>
                </div>
                <div className="flex items-center gap-1 pt-1.5 justify-start">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest">
                    {toast.status === 'processing' ? 'Crafting in progress' : 'Dispatched to Courier'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
