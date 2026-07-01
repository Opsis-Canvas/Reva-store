/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, Trash2, ArrowRight, Clock, ShoppingBag, 
  List, LayoutGrid, Grid3X3, Minus, Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem } from '../types';
import { formatPrice } from './ProductCard';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  products: Product[];
  currency: 'NGN' | 'USD';
  conversionRate: number;
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
}

function getMaxDeliveryDays(deliveryString: string): number {
  const matches = deliveryString.match(/\d+/g);
  if (!matches) return 7;
  return Math.max(...matches.map(Number));
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  products,
  currency,
  conversionRate,
  onUpdateQty,
  onRemoveItem,
  onProceedToCheckout
}: CartDrawerProps) {
  // Layout Modes: 'list' | 'grid2' | 'grid3'
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid2' | 'grid3'>('list');

  if (!isOpen) return null;

  // Find full product details for each cart item
  const detailedItems = cartItems.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product };
  }).filter(item => item.product !== undefined) as {
    productId: string;
    quantity: number;
    product: Product;
  }[];

  // Calculate Subtotals
  const subtotal = detailedItems.reduce((acc, item) => {
    const p = item.product;
    let itemPrice = 0;
    
    if (p.currencyMode === 'NGN') {
      itemPrice = currency === 'NGN' ? p.priceNGN : p.priceNGN / conversionRate;
    } else {
      itemPrice = currency === 'USD' ? p.priceUSD : p.priceUSD * conversionRate;
    }
    
    return acc + (itemPrice * item.quantity);
  }, 0);

  // Calculate Delivery Estimate
  let maxEstimateString = '7–14 days';
  let maxDays = 0;
  
  detailedItems.forEach(item => {
    const days = getMaxDeliveryDays(item.product.estimatedDeliveryDays);
    if (days > maxDays) {
      maxDays = days;
      maxEstimateString = item.product.estimatedDeliveryDays;
    }
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto flex flex-col font-sans select-none animate-fade-in">
        
        {/* Full-Screen Bag Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200/80 px-4 py-4 sm:px-6 flex justify-between items-center shrink-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-stone-900 text-white rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-stone-950 uppercase tracking-widest">Your Order Bag</h2>
              <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider hidden sm:block">Step 1 of 2: Configured Selections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-stone-600 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-400 shadow-2xs transition-all active:scale-97 cursor-pointer"
          >
            Back to Catalog
          </button>
        </div>

        {/* Empty state container */}
        {detailedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 border shadow-2xs">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-bold text-stone-900">Your order bag is empty</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Configure beautiful layouts or artisan builds in our catalog, and add them to your order allocations!
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full px-6 py-3 transition-all cursor-pointer"
            >
              Browse creations
            </button>
          </div>
        ) : (
          /* Two-Column split layout */
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Layout Selector and Bag items (8 Columns) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Layout Mode controls (Windows Explorer Style) */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-2xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-0.5">Display Configuration</span>
                  <p className="text-xs text-stone-600 font-medium">Configure items layout to view allocation details</p>
                </div>

                {/* View toggles */}
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border">
                  {/* List mode option */}
                  <button
                    onClick={() => setLayoutMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      layoutMode === 'list' 
                        ? 'bg-white text-stone-900 shadow-2xs' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>

                  {/* 2-Columns grid option */}
                  <button
                    onClick={() => setLayoutMode('grid2')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      layoutMode === 'grid2' 
                        ? 'bg-white text-stone-900 shadow-2xs' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>2 Cols</span>
                  </button>

                  {/* 3-Columns grid option */}
                  <button
                    onClick={() => setLayoutMode('grid3')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      layoutMode === 'grid3' 
                        ? 'bg-white text-stone-900 shadow-2xs' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    <span>3 Cols</span>
                  </button>
                </div>
              </div>

              {/* Items Grid/List depending on layoutMode selection */}
              {layoutMode === 'list' ? (
                /* Traditional List Row layout */
                <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm divide-y divide-stone-100">
                  {detailedItems.map(item => {
                    const itemUnitVal = item.product.currencyMode === 'NGN' 
                      ? (currency === 'NGN' ? item.product.priceNGN : item.product.priceNGN / conversionRate)
                      : (currency === 'USD' ? item.product.priceUSD : item.product.priceUSD * conversionRate);
                    return (
                      <div key={item.productId} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4.5 first:pt-0 last:pb-0">
                        {/* Image */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-stone-100 border overflow-hidden shrink-0">
                          <img 
                            src={item.product.images[0]} 
                            alt={item.product.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Title and sub-info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif text-sm font-bold text-stone-950 truncate">{item.product.name}</h4>
                          <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">Category: {item.product.category}</span>
                          <span className="text-[10px] text-amber-800 font-semibold block mt-0.5">Est: {item.product.estimatedDeliveryDays}</span>
                        </div>

                        {/* Qty and price controls */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-stone-100">
                          {/* Qty incrementer */}
                          <div className="flex items-center gap-2 border rounded-xl p-1 bg-stone-50 shadow-3xs">
                            <button
                              onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                              className="p-1 text-stone-500 hover:text-stone-900 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-stone-900 font-mono w-5 text-center">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                              className="p-1 text-stone-500 hover:text-stone-900 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Pricing details */}
                          <div className="text-right min-w-[90px]">
                            <span className="text-[9px] text-stone-400 block font-mono">
                              UNIT: {currency === 'NGN' ? '₦' : '$'}{Math.round(itemUnitVal).toLocaleString()}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-stone-900">
                              {currency === 'NGN' ? '₦' : '$'}{Math.round(itemUnitVal * item.quantity).toLocaleString()}
                            </span>
                          </div>

                          {/* Trash button */}
                          <button
                            onClick={() => onRemoveItem(item.productId)}
                            className="p-2.5 hover:bg-red-50 text-stone-400 hover:text-red-500 border border-transparent hover:border-red-100 rounded-xl transition-all"
                            title="Remove layout"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Grid view modes (2 Cols vs 3 Cols) */
                <div className={`grid gap-5 ${
                  layoutMode === 'grid2' 
                    ? 'grid-cols-1 sm:grid-cols-2' 
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                }`}>
                  {detailedItems.map(item => {
                    const itemUnitVal = item.product.currencyMode === 'NGN' 
                      ? (currency === 'NGN' ? item.product.priceNGN : item.product.priceNGN / conversionRate)
                      : (currency === 'USD' ? item.product.priceUSD : item.product.priceUSD * conversionRate);
                    return (
                      <div key={item.productId} className="bg-white rounded-3xl border border-stone-200 p-4.5 flex flex-col justify-between shadow-2xs space-y-4">
                        
                        {/* Image banner */}
                        <div className="relative aspect-video rounded-2xl bg-stone-100 overflow-hidden border">
                          <img 
                            src={item.product.images[0]} 
                            alt={item.product.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            onClick={() => onRemoveItem(item.productId)}
                            className="absolute top-2.5 right-2.5 p-2 bg-white/90 hover:bg-white text-stone-500 hover:text-red-600 rounded-xl transition-all shadow border"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title block */}
                        <div className="space-y-1">
                          <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900 truncate leading-tight">
                            {item.product.name}
                          </h4>
                          <span className="text-[9px] uppercase font-mono tracking-wider text-stone-400">Category: {item.product.category}</span>
                        </div>

                        {/* Quantity selector and price details */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-stone-100">
                          {/* Qty selector */}
                          <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-stone-50">
                            <button
                              onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                              className="p-1 text-stone-500 hover:text-stone-900"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-xs font-black text-stone-900 font-mono w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                              className="p-1 text-stone-500 hover:text-stone-900"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Sum total price */}
                          <div className="text-right">
                            <span className="text-[8px] text-stone-400 block font-mono">QTY Total</span>
                            <span className="text-xs sm:text-sm font-black text-amber-900">
                              {currency === 'NGN' ? '₦' : '$'}{Math.round(itemUnitVal * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Sourcing Estimates and checkout trigger (4 Columns) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Delivery estimates */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-stone-400">
                  Logistics &amp; Scheduling
                </h3>

                <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-600/20 flex gap-3 items-start">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[10px] sm:text-xs text-amber-900 leading-normal">
                    <span className="font-black block uppercase tracking-wider mb-0.5">Sourced to Order Sourcing</span>
                    Crafting begins instantly upon checkout allocation. Max fulfillment window completes in <span className="font-black text-amber-800 underline">{maxEstimateString}</span>.
                  </div>
                </div>
              </div>

              {/* Computations Card */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-stone-400">
                  Order Ledger
                </h3>

                <div className="space-y-3 text-xs pt-1">
                  <div className="flex justify-between text-stone-500">
                    <span>Order Subtotal</span>
                    <span className="font-bold text-stone-800">
                      {currency === 'NGN' ? '₦' : '$'}{Math.round(subtotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Shipping Surcharges</span>
                    <span className="text-[9px] text-emerald-700 uppercase font-extrabold bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded">Calculated at Checkout</span>
                  </div>
                  
                  <div className="flex justify-between text-stone-900 font-black text-sm pt-3 border-t border-stone-200">
                    <span>Allocated Estimate</span>
                    <span className="font-serif text-amber-900 text-base">
                      {currency === 'NGN' ? '₦' : '$'}{Math.round(subtotal).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  id="cart-proceed-checkout-btn"
                  onClick={onProceedToCheckout}
                  className="w-full py-4 bg-stone-950 hover:bg-stone-850 text-white font-black tracking-widest text-xs uppercase rounded-2xl shadow-md transition-all active:scale-99 flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg"
                >
                  Proceed to Secure Checkout
                  <ArrowRight className="w-4 h-4 text-amber-400 animate-pulse" />
                </button>
              </div>

            </div>

          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
