/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Calendar } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-stone-100 py-16 sm:py-24 border-b border-stone-200">
      {/* Background elegant grid pattern or ambient circles */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-500 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-500 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Hero Copys */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-800 uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Bespoke Sourced-to-Order Catalog
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight text-stone-900 leading-[1.1] font-semibold">
              The Beauty of Slow, <span className="font-serif italic text-amber-700">Intentional</span> Design.
            </h1>
            
            <p className="font-sans text-stone-600 text-base sm:text-lg max-w-xl leading-relaxed">
              We produce custom, handcrafted apparel, furniture, and stoneware exclusively to order. By deferring inventory until you request it, we eliminate waist, refine craftsmanship, and bring you unmatched pricing in Naira and USD.
            </p>

            {/* Quick pre-order value indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3 p-4 bg-white/80 backdrop-blur rounded-xl border border-stone-200">
                <Calendar className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs font-black uppercase tracking-wider text-stone-800">Guaranteed Delivery Window</span>
                  <span className="text-xs text-stone-500 mt-1 block">Each item explicitly details its production lead-times. Know exactly when your creation will land.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white/80 backdrop-blur rounded-xl border border-stone-200">
                <div className="w-5 h-5 rounded-full bg-amber-600/10 flex items-center justify-center font-serif text-xs font-bold text-amber-800 shrink-0 mt-0.5">
                  $
                </div>
                <div>
                  <span className="block text-xs font-black uppercase tracking-wider text-stone-800">Dual Currency Support</span>
                  <span className="text-xs text-stone-500 mt-1 block">Seamlessly toggle between NGN and USD display. Admin-managed exchange conversions preserve price integrity.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Image/Feature block */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/25">
              <img 
                src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=600&auto=format&fit=crop" 
                alt="Minimalist design interior" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent" />
              
              {/* Overlay sticker card */}
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-stone-900/90 backdrop-blur-md rounded-xl text-white border border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Featured Pre-Order</span>
                    <span className="block text-sm font-serif font-medium mt-0.5">The Monolithic Travertine Side Table</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-amber-600 rounded-md">From $150</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
