/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Clock, PackageCheck, MapPin, ClipboardList, CheckCircle2, Circle, ArrowLeft, History, LogOut } from 'lucide-react';
import { db, doc, getDoc, collection, query, where, getDocs } from '../lib/firebase';
import { Order } from '../types';

interface OrderLookupProps {
  customerSessionId?: string;
}

export default function OrderLookup({ customerSessionId }: OrderLookupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeContact, setActiveContact] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [viewingDetailsMobile, setViewingDetailsMobile] = useState(false);

  // Automatically fetch session orders or fallback to saved contact on mount/change
  useEffect(() => {
    if (customerSessionId) {
      fetchOrdersForSessionId(customerSessionId);
    } else {
      const savedContact = localStorage.getItem('preorder_lookup_contact');
      if (savedContact) {
        setActiveContact(savedContact);
        fetchOrdersForContact(savedContact);
      }
    }
  }, [customerSessionId]);

  const fetchOrdersForSessionId = async (sessionId: string) => {
    setIsSearching(true);
    setErrorMsg('');
    try {
      const ordersRef = collection(db, 'orders');
      const qSession = query(ordersRef, where('customerSessionId', '==', sessionId));
      const snapSession = await getDocs(qSession);
      const foundOrders: Order[] = [];
      
      snapSession.forEach(doc => {
        foundOrders.push({ id: doc.id, ...doc.data() } as Order);
      });

      // Sort found orders by creation date (newest first)
      foundOrders.sort((a, b) => b.createdAt - a.createdAt);

      if (foundOrders.length > 0) {
        setOrdersList(foundOrders);
        setSelectedOrder(foundOrders[0]);
        setViewingDetailsMobile(false);
      } else {
        // Fallback to checking local storage if no session orders are found yet
        const savedContact = localStorage.getItem('preorder_lookup_contact');
        if (savedContact) {
          setActiveContact(savedContact);
          fetchOrdersForContact(savedContact);
        }
      }
    } catch (err) {
      console.error('Error querying orders list by session:', err);
      setErrorMsg('An error occurred while fetching order history. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchOrdersForContact = async (contact: string) => {
    setIsSearching(true);
    setErrorMsg('');
    try {
      const cleanContact = contact.trim();
      const ordersRef = collection(db, 'orders');
      let foundOrders: Order[] = [];

      // Try query by Email
      if (cleanContact.includes('@')) {
        const qEmail = query(ordersRef, where('deliveryDetails.email', '==', cleanContact.toLowerCase()));
        const snapEmail = await getDocs(qEmail);
        snapEmail.forEach(doc => {
          foundOrders.push({ id: doc.id, ...doc.data() } as Order);
        });
      } else {
        // Try query by Phone number
        const qPhone = query(ordersRef, where('deliveryDetails.phone', '==', cleanContact));
        const snapPhone = await getDocs(qPhone);
        snapPhone.forEach(doc => {
          foundOrders.push({ id: doc.id, ...doc.data() } as Order);
        });
      }

      // Sort found orders by creation date (newest first)
      foundOrders.sort((a, b) => b.createdAt - a.createdAt);

      if (foundOrders.length > 0) {
        setOrdersList(foundOrders);
        localStorage.setItem('preorder_lookup_contact', cleanContact);
        setActiveContact(cleanContact);
        // Default to showing the latest order's detail if none is selected
        setSelectedOrder(foundOrders[0]);
        setViewingDetailsMobile(false); // Default to showing list on mobile
      } else {
        setErrorMsg(`No active pre-orders were found matching "${cleanContact}". Please verify the email or phone number.`);
        if (!activeContact) {
          localStorage.removeItem('preorder_lookup_contact');
          setActiveContact('');
        }
      }
    } catch (err) {
      console.error('Error querying orders list:', err);
      setErrorMsg('An error occurred while fetching order history. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = searchQuery.trim();
    if (!queryStr) return;

    setIsSearching(true);
    setSelectedOrder(null);
    setOrdersList([]);
    setErrorMsg('');

    try {
      const trimmedQuery = queryStr.toUpperCase();

      // 1. Try to fetch as direct Order ID (starts with PR-)
      if (trimmedQuery.startsWith('PR-')) {
        const orderRef = doc(db, 'orders', trimmedQuery);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const singleOrder = { id: orderSnap.id, ...orderSnap.data() } as Order;
          setOrdersList([singleOrder]);
          setSelectedOrder(singleOrder);
          setViewingDetailsMobile(true); // View details immediately on direct search
          // If this order has contact details, we can also persist it to show history if they want!
          if (singleOrder.deliveryDetails?.email) {
            localStorage.setItem('preorder_lookup_contact', singleOrder.deliveryDetails.email);
            setActiveContact(singleOrder.deliveryDetails.email);
          } else if (singleOrder.deliveryDetails?.phone) {
            localStorage.setItem('preorder_lookup_contact', singleOrder.deliveryDetails.phone);
            setActiveContact(singleOrder.deliveryDetails.phone);
          }
          setIsSearching(false);
          return;
        } else {
          setErrorMsg(`Order ID "${trimmedQuery}" was not found. Please verify the ID or search using your phone or email.`);
          setIsSearching(false);
          return;
        }
      }

      // 2. Fetch as phone or email
      await fetchOrdersForContact(queryStr);
    } catch (err) {
      console.error('Error during search:', err);
      setErrorMsg('An error occurred during verification. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('preorder_lookup_contact');
    setActiveContact('');
    setOrdersList([]);
    setSelectedOrder(null);
    setSearchQuery('');
    setErrorMsg('');
    setViewingDetailsMobile(false);
  };

  // Get status color coding
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'processing':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Processing Allocation' };
      case 'ready':
        return { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Artisan Build Ready' };
      case 'shipped':
        return { bg: 'bg-cyan-100 text-cyan-800 border-cyan-200', label: 'In Transit / Dispatched' };
      case 'fulfilled':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Fulfilled' };
      default:
        return { bg: 'bg-stone-100 text-stone-800 border-stone-200', label: 'Awaiting Payment' };
    }
  };

  // Render a progress bar/milestone tracker
  const renderFulfillmentMilestones = (status: string) => {
    const milestones = [
      { id: 'received', name: 'Received' },
      { id: 'processing', name: 'Processing' },
      { id: 'ready', name: 'Ready for Dispatch' },
      { id: 'shipped', name: 'Shipped' },
      { id: 'fulfilled', name: 'Delivered' }
    ];

    const getStatusIndex = (current: string) => {
      if (current === 'processing') return 1;
      if (current === 'ready') return 2;
      if (current === 'shipped') return 3;
      if (current === 'fulfilled') return 4;
      return 0; // received / pending
    };

    const activeIdx = getStatusIndex(status);

    return (
      <div className="space-y-4 pt-5 border-t border-stone-100">
        <span className="block text-[10px] font-black uppercase tracking-wider text-stone-400">
          Order Fulfillment Progress
        </span>
        <div className="grid grid-cols-5 gap-1 relative select-none">
          {milestones.map((m, idx) => {
            const isCompleted = idx <= activeIdx;
            const isCurrent = idx === activeIdx;

            return (
              <div key={m.id} className="flex flex-col items-center text-center space-y-2 relative">
                {/* Connecting Line */}
                {idx < milestones.length - 1 && (
                  <div className={`absolute top-2.5 left-[50%] right-[-50%] h-[2.5px] z-0 transition-all duration-500 ${idx < activeIdx ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-stone-200'}`} />
                )}
                <div className="relative z-10 bg-white p-0.5 rounded-full transition-transform duration-300">
                  {isCurrent ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white ring-4 ring-amber-500/30 animate-pulse">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </div>
                  ) : isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center text-white">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-400">
                      <Circle className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <span className={`text-[9.5px] font-bold leading-tight px-0.5 transition-all duration-300 ${isCurrent ? 'text-amber-700 font-extrabold scale-105' : isCompleted ? 'text-stone-800' : 'text-stone-400 font-medium'}`}>
                  {m.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8 space-y-8 min-h-[70vh]">
      
      {/* Tracker Headers */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="font-serif text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Order History &amp; Tracking
        </h2>
        <p className="text-sm text-stone-500 font-sans leading-relaxed">
          Access your personalized pre-order history instantly. No accounts required—simply use your email, phone, or specific Order ID to query real-time artisan progress.
        </p>
      </div>

      {/* Persistence Info Banner */}
      {activeContact && (
        <div className="bg-stone-100 rounded-2xl p-4 border border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 text-white">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-stone-400 block">Logged Session Contact</span>
              <span className="text-sm font-bold text-stone-800 font-mono">{activeContact}</span>
            </div>
          </div>
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-950 border border-stone-200 rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-stone-400" />
            Switch Contact
          </button>
        </div>
      )}

      {/* Tracker Search Form (Show only if no activeContact, or as an optional expansion) */}
      {!activeContact && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xl space-y-6">
          <h3 className="font-serif text-lg font-bold text-stone-900 text-center">Verify Past Purchase Activity</h3>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="lookup-query-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order ID (PR-XXXXXX), Email, or Phone"
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-sans"
                required
              />
              <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-stone-400" />
            </div>
            <button
              id="lookup-submit-btn"
              type="submit"
              disabled={isSearching}
              className="bg-stone-950 hover:bg-stone-850 disabled:bg-stone-400 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md shrink-0"
            >
              {isSearching ? 'Querying...' : 'View History'}
            </button>
          </form>

          {errorMsg && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs leading-relaxed font-semibold">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Grid containing list on left (or full width if small) and selected order details on right */}
      {activeContact && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Orders History List */}
          <div className={`lg:col-span-5 space-y-4 ${viewingDetailsMobile ? 'hidden lg:block' : 'block'}`}>
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg font-bold text-stone-900">Your Saved Pre-Orders</h3>
              <span className="text-xs text-stone-500 font-mono font-bold bg-white px-2.5 py-1 border rounded-full">
                {ordersList.length} total
              </span>
            </div>

            {isSearching && ordersList.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
                <span className="text-xs text-stone-400 font-mono">Syncing order history...</span>
              </div>
            ) : ordersList.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-stone-100 space-y-3">
                <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">No orders matching this contact were found in our database.</p>
                <button 
                  onClick={handleClearHistory} 
                  className="text-xs font-bold text-amber-700 underline"
                >
                  Try another phone/email
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
                {ordersList.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  const ordStatus = getStatusStyle(ord.orderStatus);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setViewingDetailsMobile(true);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 text-left ${
                        isSelected 
                          ? 'bg-amber-50/50 border-amber-400 shadow-md translate-x-1 lg:translate-x-1' 
                          : 'bg-white border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <span className="font-mono text-xs font-black text-amber-700 block">{ord.id}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${ordStatus.bg} border`}>
                          {ordStatus.label}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline pt-2 border-t border-stone-100 text-xs">
                        <span className="text-stone-500">
                          {ord.items.reduce((acc, it) => acc + it.quantity, 0)} bespoke items
                        </span>
                        <span className="font-black text-stone-900 font-sans">
                          {ord.currency === 'NGN' ? '₦' : '$'}{ord.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Selected Order Details */}
          <div className={`lg:col-span-7 ${viewingDetailsMobile ? 'block' : 'hidden lg:block'}`}>
            {selectedOrder ? (
              <div className="space-y-4">
                {/* Back button on mobile only */}
                {viewingDetailsMobile && (
                  <button
                    onClick={() => setViewingDetailsMobile(false)}
                    className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 px-3 py-2 rounded-xl border border-stone-200 transition-all mb-2"
                  >
                    <ArrowLeft className="w-4 h-4 text-stone-500" />
                    Back to Pre-Orders List
                  </button>
                )}

                <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xl animate-fade-in">
                  
                  {/* Status Header */}
                  <div className="p-6 bg-stone-50 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-widest">
                        Active Sourced Build Tracking
                      </span>
                      <span className="font-mono text-xl font-black text-amber-700 block">
                        {selectedOrder.id}
                      </span>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${getStatusStyle(selectedOrder.orderStatus).bg}`}>
                        {getStatusStyle(selectedOrder.orderStatus).label}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        Fulfillment Status: {selectedOrder.paymentStatus === 'paid' ? 'Paid / Confirmed' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Countdown / Estimated delivery date */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex gap-3.5 items-start">
                      <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs font-sans text-stone-700 leading-relaxed">
                        <span className="font-bold uppercase block text-stone-800 tracking-wider mb-0.5">Estimated Delivery Window</span>
                        We expect your bespoke custom items to arrive on or before <span className="font-extrabold text-amber-700">{new Date(selectedOrder.estimatedDeliveryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>.
                      </div>
                    </div>

                    {/* Render milestones */}
                    {renderFulfillmentMilestones(selectedOrder.orderStatus)}

                    {/* Line Items ledger */}
                    <div className="space-y-3 pt-5 border-t border-stone-100">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-stone-400" />
                        Allocated Items Breakdown
                      </span>
                      <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                        {selectedOrder.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-xs p-3 bg-stone-50 rounded-xl border border-stone-200">
                            <div>
                              <span className="block font-serif font-bold text-stone-900">{item.name}</span>
                              <span className="text-stone-400 block mt-0.5">Quantity Sourced: {item.quantity}</span>
                            </div>
                            <span className="font-black text-stone-950 font-sans">
                              {selectedOrder.currency === 'NGN' ? '₦' : '$'}
                              {(item.priceAtPurchase * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                        
                        {/* Total */}
                        <div className="flex justify-between items-center pt-3 border-t border-stone-200 font-black text-sm text-stone-900">
                          <span>Grand Sourced Total</span>
                          <span className="font-serif">
                            {selectedOrder.currency === 'NGN' ? '₦' : '$'}{selectedOrder.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery address details */}
                    <div className="space-y-3 pt-5 border-t border-stone-100">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-stone-400" />
                        Secure Delivery Logistics
                      </span>
                      <div className="text-xs text-stone-600 font-sans space-y-1 bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <span className="block font-bold text-stone-800">{selectedOrder.deliveryDetails.name}</span>
                        <span className="block">{selectedOrder.deliveryDetails.phone} | {selectedOrder.deliveryDetails.email}</span>
                        <span className="block mt-1 pt-1.5 border-t border-stone-200 text-stone-500 leading-relaxed">
                          {selectedOrder.deliveryDetails.address}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[350px] bg-stone-100 border border-dashed border-stone-300 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-2">
                <ClipboardList className="w-8 h-8 text-stone-400" />
                <h4 className="font-serif text-base font-bold text-stone-700">No Pre-Order Selected</h4>
                <p className="text-xs text-stone-500 max-w-xs">Select any item in your pre-orders history list on the left to verify active shipping timelines and full receipt invoices.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

