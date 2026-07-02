/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, GitCompare, ArrowRight, ShoppingCart, Check, Heart } from 'lucide-react';
import { Product } from '../types';
import { formatPrice } from './ProductCard';

interface CompareModalProps {
  products: Product[];
  selectedCompareIds: string[];
  onClose: () => void;
  currency: 'NGN' | 'USD';
  conversionRate: number;
  onAddToCart: (productId: string) => void;
  onToggleCompare: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
}

export default function CompareModal({
  products,
  selectedCompareIds,
  onClose,
  currency,
  conversionRate,
  onAddToCart,
  onToggleCompare,
  onSelectProduct
}: CompareModalProps) {
  // Find the two products being compared
  const productA = products.find(p => p.id === selectedCompareIds[0]);
  const productB = products.find(p => p.id === selectedCompareIds[1]);

  // Fallback products dropdown selection
  const remainingProducts = products.filter(
    p => p.id !== selectedCompareIds[0] && p.id !== selectedCompareIds[1]
  );

  const renderProductColumn = (product: Product | undefined, slotIndex: number) => {
    if (!product) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl h-full min-h-[350px] text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-700">Add Product to Compare</h4>
            <p className="text-[10px] text-stone-400 mt-1 max-w-[150px]">Select from the available catalog items below.</p>
          </div>
          <select
            onChange={(e) => {
              if (e.target.value) {
                onToggleCompare(e.target.value);
              }
            }}
            className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:border-stone-500"
            defaultValue=""
          >
            <option value="" disabled>Select a product...</option>
            {remainingProducts.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      );
    }

    const isSoldOut = product.quantityAvailable <= 0 || product.status === 'soldOut';
    const isLowStock = !isSoldOut && product.quantityAvailable > 0 && product.quantityAvailable <= 5;
    const priceStr = formatPrice(product, currency, conversionRate);

    return (
      <div className="space-y-6 h-full flex flex-col justify-between">
        {/* Product Visual Header */}
        <div className="space-y-3 relative group">
          <div className="aspect-square w-full rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 relative">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => onToggleCompare(product.id)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 hover:bg-stone-950 backdrop-blur-xs text-white transition-all shadow-md"
              title="Remove from comparison"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">{product.category}</span>
            <h4 
              onClick={() => {
                onSelectProduct(product);
                onClose();
              }}
              className="font-serif text-sm sm:text-base font-bold text-stone-900 hover:text-amber-700 cursor-pointer transition-colors leading-snug line-clamp-2 mt-0.5"
            >
              {product.name}
            </h4>
          </div>
        </div>

        {/* Specs breakdown */}
        <div className="space-y-4 border-t border-stone-100 pt-4 flex-1">
          {/* Price */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Artisan Pre-Order Price</span>
            <span className="text-base font-black text-stone-900 font-sans block">{priceStr}</span>
          </div>

          {/* Sizing & Timeline */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Estimated Lead Time</span>
            <span className="text-xs font-bold text-stone-850 block">{product.estimatedDeliveryDays}</span>
          </div>

          {/* Stock Status */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Allocation Status</span>
            {isSoldOut ? (
              <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-black uppercase tracking-wider text-stone-500 inline-block">
                Sold Out
              </span>
            ) : isLowStock ? (
              <span className="px-2 py-0.5 rounded-md bg-red-50 border border-red-100 text-[10px] font-black uppercase tracking-wider text-red-600 inline-block animate-pulse">
                Low Stock ({product.quantityAvailable} left)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[10px] font-black uppercase tracking-wider text-emerald-700 inline-block">
                Available ({product.quantityAvailable} allocations)
              </span>
            )}
          </div>

          {/* Sizing Customizability */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Customizability</span>
            <span className="text-xs text-stone-600 block leading-relaxed">
              Fully customizable dimensions & boutique monogramming available on checkout.
            </span>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Bespoke Description</span>
            <p className="text-xs text-stone-500 leading-relaxed line-clamp-4">{product.description}</p>
          </div>
        </div>

        {/* Action Bottom */}
        <div className="border-t border-stone-100 pt-4 mt-auto space-y-2">
          <button
            onClick={() => {
              onAddToCart(product.id);
            }}
            disabled={isSoldOut}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-850 disabled:bg-stone-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add Allocation
          </button>
          
          <button
            onClick={() => {
              onSelectProduct(product);
              onClose();
            }}
            className="w-full py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Configure Specs
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-55 bg-stone-50 overflow-y-auto flex flex-col w-full h-full font-sans select-none animate-fade-in">
      
      {/* Full-Screen Comparison Header */}
      <div className="sticky top-0 bg-white border-b border-stone-200/80 px-4 py-4 sm:px-6 flex justify-between items-center shrink-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-stone-950 rounded-xl">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-stone-950 uppercase tracking-widest">Artisan Comparison Workspace</h2>
            <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider hidden sm:block">Side-by-Side Detailed Specs</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-stone-600 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-400 shadow-2xs transition-all active:scale-97 cursor-pointer"
        >
          Back to Catalog
        </button>
      </div>

      {/* Main Content (Side-by-Side) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-stone-200/80 items-stretch bg-white rounded-3xl border border-stone-250 p-6 my-8 shadow-sm">
        <div className="pb-6 md:pb-0">
          {renderProductColumn(productA, 0)}
        </div>
        <div className="pt-6 md:pt-0 md:pl-8">
          {renderProductColumn(productB, 1)}
        </div>
      </div>

      {/* Footer info banner */}
      <div className="bg-white border-t border-stone-200 px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
        <span className="text-[10px] text-stone-400 font-mono">
          * Conversions tracked live using secure escrow exchange rates.
        </span>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-full transition-all cursor-pointer"
        >
          Close Comparison Workspace
        </button>
      </div>

    </div>
  );
}
