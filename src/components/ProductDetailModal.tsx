/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Heart, 
  Clock, 
  Truck, 
  ShieldCheck, 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Sparkles,
  Layers,
  BookmarkCheck,
  Share2,
  Copy,
  Star,
  CheckCircle2,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Product, FavoriteItem } from '../types';
import { formatPrice } from './ProductCard';
import { 
  db, 
  auth, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  setDoc,
  onAuthStateChanged
} from '../lib/firebase';

interface Review {
  id: string;
  productId: string;
  orderId: string;
  customerSessionId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

interface ProductDetailModalProps {
  product: Product;
  currency: 'NGN' | 'USD';
  conversionRate: number;
  onClose: () => void;
  onAddToCart: (productId: string, qty: number) => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  favoritesItems: FavoriteItem[];
  onToggleFavoriteById: (productId: string) => void;
}

export default function ProductDetailModal({
  product,
  currency,
  conversionRate,
  onClose,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
  allProducts,
  onSelectProduct,
  favoritesItems,
  onToggleFavoriteById
}: ProductDetailModalProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedQuickId, setAddedQuickId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  // Reviews & Verification states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [matchingOrderId, setMatchingOrderId] = useState<string | null>(null);

  // Form states
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // 1. Fetch reviews in real-time
  useEffect(() => {
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('productId', '==', product.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Review[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Review);
      });
      // Sort in-memory descending by createdAt to avoid composite index error
      items.sort((a, b) => b.createdAt - a.createdAt);
      setReviews(items);
    }, (err) => {
      console.error('Error fetching reviews:', err);
    });

    return unsubscribe;
  }, [product.id]);

  // 2. Listen to Auth state and verify purchaser status
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsVerified(false);
        setMatchingOrderId(null);
        return;
      }

      try {
        // Query fulfilled orders for this user session
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('customerSessionId', '==', currentUser.uid),
          where('orderStatus', '==', 'fulfilled')
        );

        const querySnapshot = await getDocs(q);
        let eligibleOrderId: string | null = null;
        
        querySnapshot.forEach((docSnap) => {
          const orderData = docSnap.data();
          const hasProduct = orderData.items?.some((item: any) => item.productId === product.id);
          if (hasProduct) {
            eligibleOrderId = docSnap.id;
          }
        });

        if (eligibleOrderId) {
          setIsVerified(true);
          setMatchingOrderId(eligibleOrderId);
        } else {
          setIsVerified(false);
          setMatchingOrderId(null);
        }
      } catch (err) {
        console.error('Error verifying purchaser eligibility:', err);
        setIsVerified(false);
        setMatchingOrderId(null);
      }
    });

    return unsubscribeAuth;
  }, [product.id, reviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setReviewError('You must be logged in to leave a review.');
      return;
    }
    if (!isVerified || !matchingOrderId) {
      setReviewError('Only verified purchasers can leave reviews.');
      return;
    }
    if (!newComment.trim()) {
      setReviewError('Please write a comment.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      // Fetch customer name from profile or default to Email/Anonymous User
      let customerName = 'Verified Purchaser';
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const pData = profileSnap.data();
        if (pData.name) {
          customerName = pData.name;
        }
      } else if (user.email) {
        customerName = user.email.split('@')[0];
      }

      const reviewId = `rev-${Math.random().toString(36).substring(2, 11)}`;
      const reviewData: Review = {
        id: reviewId,
        productId: product.id,
        orderId: matchingOrderId,
        customerSessionId: user.uid,
        customerName: customerName,
        rating: newRating,
        comment: newComment.trim(),
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'reviews', reviewId), reviewData);

      setReviewSuccess('Review submitted successfully!');
      setNewComment('');
      setNewRating(5);
    } catch (err) {
      console.error('Failed to submit review:', err);
      setReviewError('Error submitting review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);

  const displayPrice = formatPrice(product, currency, conversionRate);
  const isSoldOut = product.quantityAvailable <= 0 || product.status === 'soldOut';

  // Extract Similar and Recommended products
  const similarProducts = allProducts.filter(
    p => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  const recommendedProducts = allProducts.filter(
    p => p.category !== product.category && p.id !== product.id
  ).slice(0, 4);

  // Smooth scroll back to top when a recommendation is clicked
  const handleSelectProduct = (p: Product) => {
    onSelectProduct(p);
    setActiveImageIdx(0);
    setQuantity(1);
    if (modalRef.current) {
      modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCartClick = () => {
    setIsAdding(true);
    setTimeout(() => {
      onAddToCart(product.id, quantity);
      setIsAdding(false);
      onClose();
    }, 450);
  };

  // Framer Motion Swipe Gesture Tracker
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      // Swiped Left -> Go to next image
      setActiveImageIdx(prev => (prev === product.images.length - 1 ? 0 : prev + 1));
    } else if (info.offset.x > swipeThreshold) {
      // Swiped Right -> Go to previous image
      setActiveImageIdx(prev => (prev === 0 ? product.images.length - 1 : prev - 1));
    }
  };

  // Web Share API handler
  const handleShareClick = async () => {
    const shareData = {
      title: product.name,
      text: `Check out this premium pre-order: ${product.name} - ${product.description}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareStatus('success');
        setTimeout(() => setShareStatus('idle'), 2500);
      } catch (err: any) {
        // Aborted or cancelled is standard behavior, don't show error
        if (err.name !== 'AbortError') {
          setShareStatus('failed');
          setTimeout(() => setShareStatus('idle'), 2500);
        }
      }
    } else {
      // Fallback copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        setShareStatus('success');
        setTimeout(() => setShareStatus('idle'), 2500);
      } catch (copyErr) {
        setShareStatus('failed');
        setTimeout(() => setShareStatus('idle'), 2500);
      }
    }
  };

  // Handler for direct add to cart on recommendation cards
  const handleQuickAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    setAddedQuickId(p.id);
    onAddToCart(p.id, 1);
    setTimeout(() => {
      setAddedQuickId(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-3 md:p-6 bg-stone-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        id="product-detail-modal"
        ref={modalRef}
        className="relative w-full max-w-5xl bg-stone-50 rounded-none sm:rounded-3xl shadow-2xl border border-stone-200 min-h-full sm:min-h-0 sm:max-h-[92vh] overflow-y-auto flex flex-col my-auto"
      >
        
        {/* Floating Controls Header */}
        <div className="fixed top-3 right-3 sm:absolute sm:top-4 sm:right-4 z-40 flex items-center gap-2">
          
          {/* Share Button using Web Share API */}
          <button
            onClick={handleShareClick}
            className="p-2.5 rounded-full bg-white/95 text-stone-850 hover:bg-stone-100 hover:text-stone-950 shadow-md transition-all active:scale-95 border border-stone-200"
            title="Share Product"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-stone-900/90 hover:bg-stone-850 text-white shadow-md transition-all active:scale-95 border border-stone-800"
            title="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Share Status Toast Indicator */}
        {shareStatus === 'success' && (
          <div className="absolute top-16 right-4 z-40 bg-emerald-900 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-xl border border-emerald-700 animate-bounce">
            Link Copied / Shared Successfully!
          </div>
        )}

        {/* MAIN PRODUCT LAYOUT (Top Fold) */}
        <div className="flex flex-col md:flex-row border-b border-stone-200">
          
          {/* Left Side: Swipe-supported Image Gallery Workspace */}
          <div className="w-full md:w-[48%] bg-stone-100 p-4 sm:p-6 flex flex-col justify-center space-y-4 md:border-r border-stone-200 relative select-none">
            
            {/* Gallery Wrapper with motion's real drag gestures - Uncropped Full Image */}
            <div className="relative w-full aspect-square sm:aspect-[4/5] rounded-2xl overflow-hidden shadow-xs bg-stone-100 border border-stone-200/60 flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={activeImageIdx}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing absolute inset-0 p-2"
                >
                  <img 
                    src={product.images[activeImageIdx]} 
                    alt={product.name} 
                    className="max-w-full max-h-full w-auto h-auto object-contain mx-auto rounded-lg select-none"
                    referrerPolicy="no-referrer"
                    draggable={false} // Prevents default browser image drag interference
                  />
                </motion.div>
              </AnimatePresence>

              {/* Swipe/Drag Instructions Overlay */}
              <div className="absolute bottom-3.5 inset-x-0 text-center pointer-events-none z-10">
                <span className="inline-block bg-stone-900/85 backdrop-blur-xs text-[9px] text-stone-100 px-3 py-1.5 rounded-full font-black uppercase tracking-widest shadow-md">
                  ← Swipe Left / Right to Browse →
                </span>
              </div>

              {/* Gallery Arrow Controls */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIdx(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/95 text-stone-800 shadow-md hover:bg-stone-50 active:scale-95 transition-all pointer-events-auto"
                    title="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveImageIdx(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/95 text-stone-800 shadow-md hover:bg-stone-50 active:scale-95 transition-all pointer-events-auto"
                    title="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Pagination Dots Indicator */}
            {product.images.length > 1 && (
              <div className="flex justify-center gap-1.5 py-1.5 z-10">
                {product.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeImageIdx === i ? 'w-6 bg-amber-600' : 'w-2 bg-stone-350 hover:bg-stone-500'
                    }`}
                    title={`Slide indicator ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Thumbnail Shortcuts */}
            {product.images.length > 1 && (
              <div className="flex gap-2 justify-center overflow-x-auto pb-1 max-w-full select-none">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIdx === i ? 'border-amber-600 scale-105 shadow-xs' : 'border-stone-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Product configuration specs & Details */}
          <div className="w-full md:w-[52%] p-5 sm:p-8 flex flex-col justify-between space-y-5 bg-white">
            <div className="space-y-4">
              
              {/* Category tag and status */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black tracking-widest text-stone-400 uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-stone-400" />
                    {product.category}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-600/20 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    Sourced from: {product.originCountry || product.origin || 'China'}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-amber-700 font-extrabold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Custom Handcrafted
                </span>
              </div>

              {/* Product Title */}
              <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-black text-stone-900 leading-tight">
                {product.name}
              </h2>

              {/* Price Tag container */}
              <div className="flex items-baseline gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-xl sm:text-2xl font-black text-stone-950 font-sans">{displayPrice}</span>
                <span className="text-[9px] text-stone-400 font-mono font-bold uppercase tracking-wider">
                  ({product.currencyMode === 'NGN' ? 'NGN FIXED' : 'USD PEGGED'})
                </span>
              </div>

              {/* Low Stock Urgent Alarm */}
              {!isSoldOut && product.quantityAvailable > 0 && product.quantityAvailable <= 5 && (
                <div className="p-3 bg-red-50 text-red-850 rounded-xl border border-red-200/60 flex items-start gap-2.5">
                  <span className="relative flex h-2 w-2 shrink-0 mt-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                  <div className="text-[11px] sm:text-xs font-sans leading-relaxed">
                    <span className="font-extrabold uppercase block text-red-950 tracking-wider mb-0.5">Urgent Artisan allocation limit</span>
                    Only <span className="font-black text-red-700 underline">{product.quantityAvailable} units</span> remaining before this sourcing allocation closes.
                  </div>
                </div>
              )}

              {/* Specification description */}
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
                {product.description}
              </p>

              {/* Delivery Lead Time window */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <div className="flex gap-2 items-center text-xs font-black uppercase tracking-wider text-stone-850">
                  <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                  Estimated Sourcing Schedule
                </div>
                <p className="text-[11px] sm:text-xs text-stone-600 pl-6 leading-relaxed">
                  Bespoke design produced on demand. Ships directly via custom courier. Delivered to your door in <span className="font-extrabold text-amber-700">{product.estimatedDeliveryDays}</span>.
                </p>
              </div>

              {/* Premium Trust Badges */}
              <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] font-bold text-stone-500">
                <div className="flex items-center gap-1.5 bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Quality Assured
                </div>
                <div className="flex items-center gap-1.5 bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Made to Order
                </div>
                <div className="flex items-center gap-1.5 bg-stone-50 p-2 rounded-xl border border-stone-100 col-span-2">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-stone-400">Sourced From:</span>
                  <span className="text-amber-950 font-black uppercase tracking-wider">{product.originCountry || product.origin || 'China'}</span>
                </div>
              </div>

            </div>

            {/* Actions Panel: Counter, Add to Bag & Wishlist togglers */}
            <div className="space-y-3 pt-3.5 border-t border-stone-150 mt-auto">
              {!isSoldOut ? (
                <div className="flex gap-2.5">
                  
                  {/* Quantity adjustment */}
                  <div className="flex items-center justify-between border border-stone-300 rounded-xl px-2.5 py-1.5 w-24 sm:w-28 shrink-0 bg-stone-50 shadow-xs">
                    <button
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="text-stone-500 hover:text-stone-800 font-extrabold text-sm p-1"
                    >
                      -
                    </button>
                    <span className="font-sans font-black text-stone-950 text-xs sm:text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity(prev => Math.min(product.quantityAvailable, prev + 1))}
                      className="text-stone-500 hover:text-stone-800 font-extrabold text-sm p-1"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to pre-order button */}
                  <button
                    id="add-to-bag-modal-btn"
                    onClick={handleAddToCartClick}
                    disabled={isAdding}
                    className="flex-1 flex items-center justify-center gap-2 bg-stone-950 hover:bg-stone-850 disabled:bg-stone-400 text-white font-bold tracking-wider text-[11px] uppercase py-2.5 sm:py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-98"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                    {isAdding ? 'Securing Allocations...' : 'Add to Order Bag'}
                  </button>

                </div>
              ) : (
                <div className="bg-red-50 text-red-750 text-center text-xs font-black uppercase py-3 rounded-xl border border-red-200">
                  Fully Allocated (Sold Out)
                </div>
              )}

              {/* Bookmark Save to Wishlist Toggle */}
              <button
                onClick={onToggleFavorite}
                className={`w-full flex items-center justify-center gap-2 py-2.5 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  isFavorite 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 shadow-xs' 
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-stone-600'}`} />
                {isFavorite ? 'Saved in Wishlist' : 'Add to Wishlist'}
              </button>
            </div>

          </div>
        </div>

        {/* BOTTOM SCROLL CONTENT (Similar, Recommendations, Swipes list) */}
        <div className="p-4 sm:p-6 md:p-8 space-y-10 bg-stone-50 rounded-b-3xl">

          {/* PRODUCT REVIEWS & RATING SYSTEM */}
          <div className="space-y-6 bg-white p-5 sm:p-8 rounded-3xl border border-stone-200 shadow-sm text-left">
            <div className="flex justify-between items-baseline border-b border-stone-200 pb-3">
              <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-stone-600 animate-pulse" />
                Product Reviews &amp; Ratings
              </h4>
              <span className="text-[10px] sm:text-xs text-stone-400 font-mono font-bold">
                {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Ratings Summary Stats */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 text-center space-y-2">
                  <span className="text-4xl font-black font-sans text-stone-900">
                    {reviews.length > 0 
                      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                      : '0.0'}
                  </span>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const avgRating = reviews.length > 0 
                        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
                        : 0;
                      return (
                        <Star 
                          key={starVal}
                          className={`w-4 h-4 ${
                            starVal <= Math.round(avgRating) 
                              ? 'text-amber-500 fill-amber-500' 
                              : 'text-stone-300'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-stone-500 font-medium">
                    Based on {reviews.length} {reviews.length === 1 ? 'verified review' : 'verified reviews'}
                  </p>
                </div>

                {/* Star rating breakdown bars */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((starNum) => {
                    const count = reviews.filter(r => r.rating === starNum).length;
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={starNum} className="flex items-center gap-2.5 text-xs text-stone-600">
                        <span className="w-3 font-mono font-bold text-right">{starNum}</span>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden border">
                          <div 
                            className="h-full bg-amber-500 rounded-full" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right font-mono text-[10px] text-stone-400 font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews List and Review Creator Form */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Review Creator Form */}
                <div className="bg-stone-50 p-5 sm:p-6 rounded-2xl border border-stone-200 space-y-4">
                  <h5 className="text-xs font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Write a Product Review
                  </h5>

                  {reviewSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{reviewSuccess}</span>
                    </div>
                  )}

                  {reviewError && (
                    <div className="p-3 bg-red-50 text-red-800 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  {!user ? (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-xs text-stone-500 leading-relaxed">
                        You must be logged in to leave a star rating and review.
                      </p>
                    </div>
                  ) : !isVerified ? (
                    <div className="p-3.5 bg-amber-500/5 text-amber-900 text-xs rounded-xl border border-amber-600/20 flex gap-2.5 items-start">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <span className="font-extrabold block uppercase tracking-wider mb-0.5">Verified Purchase Required</span>
                        Only customers who have ordered, received, and completed transit of this specific handcrafted creation can leave an official rating.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      {/* Star rating selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block pl-0.5">
                          Select Star Rating
                        </label>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => setNewRating(starVal)}
                              className="p-1 text-stone-400 hover:text-amber-500 transition-colors focus:outline-none"
                            >
                              <Star 
                                className={`w-6 h-6 transition-all ${
                                  starVal <= newRating 
                                    ? 'text-amber-500 fill-amber-500 scale-110' 
                                    : 'text-stone-300 hover:scale-105'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Comment */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block pl-0.5">
                          Share your experience
                        </label>
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="What did you think of the fabric, stitching, or fit? Sourced with precision..."
                          className="w-full bg-white border border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/15 rounded-xl py-3 px-4 text-xs font-medium text-stone-800 transition-all shadow-xs resize-none placeholder-stone-400"
                        />
                        <div className="text-right text-[9px] text-stone-400 font-mono font-semibold">
                          {newComment.length}/500 Characters
                        </div>
                      </div>

                      {/* Submit btn */}
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="px-5 py-2.5 bg-stone-950 hover:bg-stone-850 disabled:bg-stone-400 text-white font-black tracking-widest text-[10px] uppercase rounded-xl transition-all shadow-xs active:scale-97 cursor-pointer"
                      >
                        {isSubmittingReview ? 'Submitting review...' : 'Publish verified review'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Reviews List */}
                <div className="space-y-4 divide-y divide-stone-100 max-h-96 overflow-y-auto pr-1">
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 space-y-2">
                      <MessageSquare className="w-8 h-8 mx-auto stroke-1" />
                      <p className="text-xs font-semibold">No reviews yet for this product.</p>
                      <p className="text-[10px] max-w-xs mx-auto leading-normal">
                        Be the first verified purchaser to complete fulfillment and leave a rating!
                      </p>
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-black text-stone-750 uppercase border shadow-2xs">
                              {rev.customerName.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-stone-905">{rev.customerName}</span>
                                <span className="flex items-center gap-0.5 text-[8px] font-black tracking-widest uppercase bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600/10 shrink-0" />
                                  <span>Verified</span>
                                </span>
                              </div>
                              <span className="text-[9px] text-stone-400 font-mono">
                                {new Date(rev.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Star rating display */}
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((starNum) => (
                              <Star 
                                key={starNum}
                                className={`w-3 h-3 ${
                                  starNum <= rev.rating 
                                    ? 'text-amber-500 fill-amber-500' 
                                    : 'text-stone-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed pl-9 whitespace-pre-line font-sans">
                          {rev.comment}
                        </p>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* Similar items panel */}
          {similarProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-baseline border-b border-stone-200 pb-2">
                <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Similar Handcrafted Builds
                </h4>
                <span className="text-[9px] sm:text-[10px] text-stone-400 font-mono">Artisan match</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {similarProducts.map(p => {
                  const isFavorited = favoritesItems.some(fav => fav.productId === p.id);
                  const isQuickAdding = addedQuickId === p.id;
                  const isSOut = p.quantityAvailable <= 0 || p.status === 'soldOut';

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="group bg-white rounded-2xl border border-stone-200 p-2.5 sm:p-3 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 mb-2">
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavoriteById(p.id);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm text-stone-600 hover:text-red-500 transition-all"
                          >
                            <Heart className={`w-3 h-3 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                        </div>
                        <span className="text-[8px] uppercase tracking-wider text-stone-400 font-bold block mb-0.5">{p.category}</span>
                        <h5 className="text-[11px] sm:text-xs font-bold font-serif text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">{p.name}</h5>
                      </div>

                      <div className="flex justify-between items-end pt-1.5 mt-1.5 border-t border-stone-100">
                        <div>
                          <span className="block text-[8px] tracking-wider text-stone-400 font-mono">Price</span>
                          <span className="text-[11px] sm:text-xs font-black text-stone-950">{formatPrice(p, currency, conversionRate)}</span>
                        </div>
                        
                        {!isSOut ? (
                          <button
                            onClick={(e) => handleQuickAdd(e, p)}
                            className={`p-1 sm:p-1.5 rounded-lg border transition-all ${
                              isQuickAdding 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'bg-stone-900 hover:bg-stone-850 border-stone-900 text-white'
                            }`}
                            title="Quick add pre-order item"
                          >
                            {isQuickAdding ? <BookmarkCheck className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="text-[7px] bg-stone-100 text-stone-400 px-1 py-0.5 rounded font-bold">SOLD</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sourced recommendations panel */}
          {recommendedProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-baseline border-b border-stone-200 pb-2">
                <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-stone-600" />
                  Artisan Recommendations
                </h4>
                <span className="text-[9px] sm:text-[10px] text-stone-400 font-mono">Curated picks</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {recommendedProducts.map(p => {
                  const isFavorited = favoritesItems.some(fav => fav.productId === p.id);
                  const isQuickAdding = addedQuickId === p.id;
                  const isSOut = p.quantityAvailable <= 0 || p.status === 'soldOut';

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="group bg-white rounded-2xl border border-stone-200 p-2.5 sm:p-3 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 mb-2">
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavoriteById(p.id);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm text-stone-600 hover:text-red-500 transition-all"
                          >
                            <Heart className={`w-3 h-3 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                        </div>
                        <span className="text-[8px] uppercase tracking-wider text-stone-400 font-bold block mb-0.5">{p.category}</span>
                        <h5 className="text-[11px] sm:text-xs font-bold font-serif text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">{p.name}</h5>
                      </div>

                      <div className="flex justify-between items-end pt-1.5 mt-1.5 border-t border-stone-100">
                        <div>
                          <span className="block text-[8px] tracking-wider text-stone-400 font-mono">Price</span>
                          <span className="text-[11px] sm:text-xs font-black text-stone-950">{formatPrice(p, currency, conversionRate)}</span>
                        </div>
                        
                        {!isSOut ? (
                          <button
                            onClick={(e) => handleQuickAdd(e, p)}
                            className={`p-1 sm:p-1.5 rounded-lg border transition-all ${
                              isQuickAdding 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'bg-stone-900 hover:bg-stone-850 border-stone-900 text-white'
                            }`}
                            title="Quick add pre-order item"
                          >
                            {isQuickAdding ? <BookmarkCheck className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="text-[7px] bg-stone-100 text-stone-400 px-1 py-0.5 rounded font-bold">SOLD</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
