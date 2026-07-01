/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, ArrowLeft, RefreshCw, AlertCircle, HelpCircle, FileText, ClipboardList, Send, CheckCircle2, ShoppingBag, Truck 
} from 'lucide-react';
import { db, doc, getDoc, updateDoc } from '../lib/firebase';
import { Order } from '../types';

interface RefundPageProps {
  setActiveView: (view: 'catalog' | 'favorites' | 'lookup' | 'profile' | 'refund') => void;
  currency: 'NGN' | 'USD';
  conversionRate: number;
}

export default function RefundPage({
  setActiveView,
  currency,
  conversionRate
}: RefundPageProps) {
  const [orderId, setOrderId] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [searchError, setSearchError] = useState('');
  
  // Refund Request State
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = orderId.trim().toUpperCase();
    const cleanContact = contactInfo.trim().toLowerCase();

    if (!cleanId || !cleanContact) {
      setSearchError('Please fill in both the Order ID and contact details.');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setFoundOrder(null);
    setSubmitSuccess(false);

    try {
      const orderRef = doc(db, 'orders', cleanId);
      const snap = await getDoc(orderRef);

      if (snap.exists()) {
        const orderData = snap.data() as Order;
        const dbEmail = orderData.deliveryDetails.email.toLowerCase();
        const dbPhone = orderData.deliveryDetails.phone;

        if (dbEmail === cleanContact || dbPhone === cleanContact) {
          setFoundOrder({ id: snap.id, ...orderData });
        } else {
          setSearchError('The email or phone number does not match this pre-order record.');
        }
      } else {
        setSearchError(`Pre-order ID "${cleanId}" not found in our registries.`);
      }
    } catch (err) {
      console.error('Error fetching order for refund:', err);
      setSearchError('An error occurred while scanning our registries. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundOrder || !refundReason.trim()) return;

    setIsSubmitting(true);
    try {
      const orderRef = doc(db, 'orders', foundOrder.id);
      
      // Update orderStatus to 'refund_requested' in Firestore
      await updateDoc(orderRef, {
        orderStatus: 'refund_requested' as any,
        refundReason: refundReason,
        refundRequestedAt: Date.now()
      });

      setFoundOrder(prev => prev ? { ...prev, orderStatus: 'refund_requested' as any } : null);
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Error updating refund status:', err);
      setSearchError('Failed to record refund request. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12 animate-fade-in">
      
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 text-stone-850 border border-stone-200 mb-2 shadow-xs">
          <RefreshCw className="w-5 h-5" />
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900">Artisan Sourcing Policies</h2>
        <p className="text-xs sm:text-sm text-stone-500 max-w-lg mx-auto leading-relaxed">
          Read our transparent sourcing commitment, and file an insured refund request on active pre-orders seamlessly.
        </p>
      </div>

      {/* Grid Layout: Left Column Policies (7 Cols) & Right Column Interactive Refund Form (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Sourcing & Refund policies */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Policy 1: Sourcing Commitment */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-serif text-lg font-bold text-stone-900">Insured Sourcing Guarantee</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              We operate on a zero-waste, made-to-order manufacturing model. When you place a pre-order, you secure an exclusive allocation of raw materials. To ensure absolute customer peace of mind:
            </p>
            <ul className="space-y-2.5 text-xs text-stone-500 pl-1">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span><strong>100% Capital Insurance:</strong> All funds are secured in escrow until your tracking details are officially verified.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span><strong>Artisan Work Allocation:</strong> Once raw materials are allocated to artisans (usually 24 hours post purchase), designs are customized individually.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span><strong>No Hidden Penalties:</strong> Cancel within 24 hours of ordering for an absolute 100% full refund with zero deductions.</span>
              </li>
            </ul>
          </div>

          {/* Policy 2: Refund & Return Parameters */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <FileText className="w-5 h-5 text-amber-700" />
              <h3 className="font-serif text-lg font-bold text-stone-900">Pre-Order Sizing & Refund Framework</h3>
            </div>
            <div className="space-y-4 text-xs text-stone-600 leading-relaxed">
              <div>
                <span className="font-bold text-stone-850 block mb-1">Cancellations After 24 Hours:</span>
                <p className="text-stone-500">
                  Because artisans procure leather, threads, and custom dyes matching your configuration, cancellations requested after 24 hours but before dispatch incur a 15% material restocking surcharge to compensate the workshop's layout phase.
                </p>
              </div>
              <div>
                <span className="font-bold text-stone-850 block mb-1">Returns Post-Delivery:</span>
                <p className="text-stone-500">
                  If the apparel or item does not match your sizing specs, we provide a 7-day direct exchange policy or 100% store credit with free courier pickup. If a refund is requested, the item must be returned in unworn, original packaging with boutique tags intact.
                </p>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <HelpCircle className="w-5 h-5 text-stone-400" />
              <h3 className="font-serif text-base font-bold text-stone-900">Sourcing Logistics FAQ</h3>
            </div>
            <div className="space-y-3.5 divide-y divide-stone-100">
              <div className="pt-0">
                <span className="font-bold text-xs text-stone-850 block">How long do refunds take to process?</span>
                <span className="text-[11px] text-stone-500 leading-relaxed block mt-0.5">
                  Verified refunds are returned directly to your original payment channel (Paystack bank/card transfer) within 3 to 5 business days from authorization.
                </span>
              </div>
              <div className="pt-3">
                <span className="font-bold text-xs text-stone-850 block">Can I modify my sizing details instead of refunding?</span>
                <span className="text-[11px] text-stone-500 leading-relaxed block mt-0.5">
                  Absolutely! Save your revised specs under your <strong>Artisan Profile</strong> or contact live assistance with your Order ID immediately.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Refund Request form */}
        <div className="lg:col-span-5 bg-stone-900 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-6">
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-bold text-amber-400">File Insured Refund</h3>
            <p className="text-xs text-stone-400">Scan our live database to request processing adjustments or Escrow releases.</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchOrder} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. PR-XXXXXX"
                className="w-full bg-stone-800 border border-stone-700 rounded-2xl py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 focus:bg-stone-800/50 transition-all placeholder-stone-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Email or Phone Number</label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="jane@domain.com or phone"
                className="w-full bg-stone-800 border border-stone-700 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:border-amber-400 focus:bg-stone-800/50 transition-all placeholder-stone-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-700 text-stone-950 font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSearching ? 'Scanning Registries...' : 'Search Pre-Order'}
              <ClipboardList className="w-4 h-4" />
            </button>

            {searchError && (
              <div className="p-3 bg-red-950/50 border border-red-900 text-red-400 text-xs rounded-2xl font-bold flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{searchError}</span>
              </div>
            )}
          </form>

          {/* Interactive State: Order Found */}
          {foundOrder && (
            <div className="bg-stone-800/80 rounded-2xl p-4 sm:p-5 border border-stone-700 space-y-4 animate-fade-in">
              <div className="flex justify-between items-start gap-3 pb-3 border-b border-stone-700">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Registry Found</span>
                  <span className="font-mono text-xs font-bold text-white block">{foundOrder.id}</span>
                </div>
                
                {/* Status Badge */}
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  foundOrder.orderStatus === 'refund_requested' ? 'bg-red-900/50 text-red-300 border border-red-800/50' :
                  foundOrder.orderStatus === 'fulfilled' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-800/50' :
                  foundOrder.orderStatus === 'shipped' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-800/50' :
                  foundOrder.orderStatus === 'ready' ? 'bg-blue-900/50 text-blue-300 border border-blue-800/50' :
                  'bg-amber-900/50 text-amber-300 border border-amber-800/50'
                }`}>
                  {foundOrder.orderStatus}
                </span>
              </div>

              {/* Order Items list */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-stone-400 block tracking-wider">Configured Items</span>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {foundOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-stone-300">
                      <span className="truncate max-w-[70%]">{it.name} (x{it.quantity})</span>
                      <span className="font-mono text-stone-400">
                        {it.currency === 'NGN' ? '₦' : '$'}{it.priceAtPurchase.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligibility & Forms */}
              {foundOrder.orderStatus === 'refund_requested' ? (
                <div className="p-3 bg-red-950/60 border border-red-900/50 rounded-xl space-y-1 text-center">
                  <CheckCircle2 className="w-5 h-5 text-red-400 mx-auto" />
                  <span className="font-bold text-xs text-red-300 block">Refund Request Under Review</span>
                  <p className="text-[10px] text-stone-400">
                    Artisan managers have flagged this pre-order allocation. Esrow holdings will update within 48 hours.
                  </p>
                </div>
              ) : foundOrder.orderStatus === 'shipped' || foundOrder.orderStatus === 'fulfilled' ? (
                <div className="p-3.5 bg-stone-700/60 border border-stone-600 rounded-xl space-y-2 text-center">
                  <Truck className="w-5 h-5 text-amber-400 mx-auto" />
                  <span className="font-bold text-xs text-stone-200 block">Bespoke Allocation Dispatched</span>
                  <p className="text-[10px] text-stone-400 leading-normal">
                    This order has been shipped or fulfilled. To initiate sizing exchange or returns, please wait for home delivery or contact couriers.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitRefund} className="space-y-3.5 pt-2 border-t border-stone-700">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Reason for Refund Request</label>
                    <textarea
                      rows={2}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="e.g. Accidental order, custom sizing adjustments, change of delivery details..."
                      className="w-full bg-stone-700 border border-stone-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400 resize-none placeholder-stone-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-700 text-white font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? 'Recording Request...' : 'Submit Cancellation Request'}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-900 text-emerald-300 text-[10px] rounded-xl font-bold flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Cancellation filed! Status modified to "refund_requested". Escrow has locked remaining artisan funds.
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
