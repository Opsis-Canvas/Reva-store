/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, ArrowRight, Clock, Flame, Bell, BellOff, GitCompare } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  currency: 'NGN' | 'USD';
  conversionRate: number;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  isFavorite: boolean;
  isNotified?: boolean;
  onToggleNotification?: (e: React.MouseEvent) => void;
  isComparing?: boolean;
  onToggleCompare?: (e: React.MouseEvent) => void;
  key?: React.Key;
}

export function formatPrice(product: Product, currency: 'NGN' | 'USD', rate: number): string {
  if (product.currencyMode === 'NGN') {
    if (currency === 'NGN') {
      return `₦${product.priceNGN.toLocaleString()}`;
    } else {
      const converted = Math.round(product.priceNGN / rate);
      return `$${converted.toLocaleString()}`;
    }
  } else {
    // USD base
    if (currency === 'USD') {
      return `$${product.priceUSD.toLocaleString()}`;
    } else {
      const converted = Math.round(product.priceUSD * rate);
      return `₦${converted.toLocaleString()}`;
    }
  }
}

export default function ProductCard({
  product,
  currency,
  conversionRate,
  onSelect,
  onToggleFavorite,
  isFavorite,
  isNotified = false,
  onToggleNotification,
  isComparing = false,
  onToggleCompare
}: ProductCardProps) {
  const displayPrice = formatPrice(product, currency, conversionRate);
  const isSoldOut = product.quantityAvailable <= 0 || product.status === 'soldOut';
  const isLowStock = !isSoldOut && product.quantityAvailable > 0 && product.quantityAvailable <= 5;

  return (
    <div 
      id={`product-card-${product.id}`}
      onClick={onSelect}
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-stone-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 cursor-pointer break-inside-avoid inline-block w-full mb-4 sm:mb-6 select-none"
    >
      {/* Product Image & Overlays */}
      <div className="relative w-full overflow-hidden bg-stone-100">
        <img 
          src={product.images[0]} 
          alt={product.name}
          className="w-full h-auto block transition-all duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Top Right Action Overlays */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex flex-col gap-1.5 sm:gap-2">
          {/* Wishlist Button Overlay */}
          <button
            onClick={onToggleFavorite}
            className="p-1.5 sm:p-2.5 rounded-full bg-white/90 backdrop-blur-xs shadow-md text-stone-600 hover:text-red-500 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
            title={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                isFavorite ? 'fill-red-500 text-red-500' : 'text-stone-600'
              }`} 
            />
          </button>

          {/* Price Drop Notification Button */}
          {onToggleNotification && (
            <button
              onClick={onToggleNotification}
              className={`p-1.5 sm:p-2.5 rounded-full bg-white/90 backdrop-blur-xs shadow-md hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${
                isNotified ? 'text-amber-500' : 'text-stone-600 hover:text-amber-500'
              }`}
              title={isNotified ? "Disable price drop alert" : "Notify me on price drop"}
            >
              {isNotified ? (
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500 text-amber-500" />
              ) : (
                <BellOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
              )}
            </button>
          )}

          {/* Comparison Toggle Button */}
          {onToggleCompare && (
            <button
              onClick={onToggleCompare}
              className={`p-1.5 sm:p-2.5 rounded-full bg-white/90 backdrop-blur-xs shadow-md hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${
                isComparing ? 'text-amber-600 bg-amber-50 border border-amber-200' : 'text-stone-600 hover:text-amber-500'
              }`}
              title={isComparing ? "Remove from comparison" : "Add to comparison"}
            >
              <GitCompare className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isComparing ? 'text-amber-600 fill-amber-500/20' : 'text-stone-600'}`} />
            </button>
          )}
        </div>

        {/* Real-time Low Stock Badge */}
        {isLowStock && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 flex items-center gap-1 sm:gap-1.5 rounded-lg bg-red-600/95 backdrop-blur-xs px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-black text-white tracking-widest uppercase shadow-md animate-pulse border border-red-500/30">
            <Flame className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-300 fill-amber-300" />
            <span>Only {product.quantityAvailable} Left</span>
          </div>
        )}

        {/* Lead Time Badge */}
        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 flex items-center gap-1 sm:gap-1.5 rounded-md bg-stone-900/85 backdrop-blur-xs px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold text-white tracking-wider uppercase">
          <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400" />
          <span>{product.estimatedDeliveryDays}</span>
        </div>

        {/* Sold Out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-stone-950/65 flex items-center justify-center p-2">
            <span className="px-2.5 py-1.5 sm:px-4 sm:py-2 border border-white/50 rounded-lg text-[9px] sm:text-xs font-black uppercase tracking-widest text-white bg-stone-950/20 backdrop-blur-xs text-center">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Product Metadata & Content Info */}
      <div className="flex flex-col flex-1 p-3 sm:p-5 space-y-1 sm:space-y-2">
        <div className="flex items-start justify-between gap-1">
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-stone-400">
            {product.category}
          </span>
          {product.currencyMode === 'USD' && (
            <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded bg-stone-50 text-stone-500 font-bold border border-stone-200 uppercase tracking-wider font-mono">
              USD
            </span>
          )}
        </div>

        {/* Inline stock warning with a pulsing indicator */}
        {isLowStock && (
          <div className="flex items-center gap-1 text-[9px] sm:text-[11px] font-extrabold text-red-600 font-sans">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600"></span>
            </span>
            <span>Allocations running out</span>
          </div>
        )}
        
        {/* Title */}
        <h3 className="font-serif text-xs sm:text-base font-bold text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
          {product.name}
        </h3>
        
        {/* Description (hides on super small displays, line-clamped on others) */}
        <p className="text-[10px] sm:text-xs text-stone-500 line-clamp-2 leading-relaxed hidden xs:block">
          {product.description}
        </p>

        {/* Price and Action Footer */}
        <div className="flex items-end justify-between pt-2 sm:pt-3 mt-auto border-t border-stone-100 gap-1">
          <div className="min-w-0">
            <span className="block text-[7px] sm:text-[9px] font-black tracking-widest text-stone-400 uppercase truncate">ORDER PRICE</span>
            <span className="text-xs sm:text-base font-black text-stone-950 font-sans truncate block">
              {displayPrice}
            </span>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs font-black text-amber-700 uppercase group-hover:translate-x-1 transition-transform shrink-0">
            <span className="hidden xxs:inline">Configure</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
