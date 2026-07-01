/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CreditCard, ShieldCheck, Mail, MapPin, User, Phone, CheckCircle, 
  Clock, ShoppingBag, Printer, ChevronDown, Building, Truck, Check, HelpCircle 
} from 'lucide-react';
import { Product, CartItem } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  products: Product[];
  currency: 'NGN' | 'USD';
  conversionRate: number;
  customerSessionId: string;
  onOrderCreated: (orderId: string) => void;
  clearCart: () => void;
}

// Representative States and LGAs in Nigeria
const NIGERIA_REGIONS: Record<string, string[]> = {
  'Abia': ['Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano', 'Isiala Ngwa North', 'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa', 'Ohafia', 'Osisioma', 'Ugwunagbo', 'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South', 'Umunneochi'],
  'Abuja (FCT)': ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'],
  'Anambra': ['Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North', 'Awka South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North', 'Idemili South', 'Ihiala', 'Njikoka', 'Nnewi North', 'Nnewi South', 'Ogbaru', 'Onitsha North', 'Onitsha South', 'Orumba North', 'Orumba South', 'Oyi'],
  'Enugu': ['Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu', 'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo', 'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi', 'Uzo Uwani'],
  'Imo': ['Aboh Mbaise', 'Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte', 'Ideato North', 'Ideato South', 'Ihitte/Uboma', 'Ikeduru', 'Isiala Mbano', 'Isu', 'Mbaitoli', 'Ngor Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Orlu', 'Orsu', 'Oru East', 'Oru West', 'Owerri Municipal', 'Owerri North', 'Owerri West', 'Unuimo'],
  'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
  'Rivers': ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai']
};

function generateOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'PR-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getMaxDeliveryDays(deliveryString: string): number {
  const matches = deliveryString.match(/\d+/g);
  if (!matches) return 14;
  return Math.max(...matches.map(Number));
}

// Premium Customized Dropdown Menu Panel
function CustomDropdown({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-1 flex-1 min-w-[140px]">
      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block pl-1">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border ${isOpen ? 'border-amber-600 ring-2 ring-amber-600/15' : 'border-stone-300'} disabled:opacity-50 disabled:bg-stone-50 rounded-xl py-3 px-4 text-xs font-medium text-left text-stone-800 flex justify-between items-center transition-all shadow-xs`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1 animate-fade-in divide-y divide-stone-50">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                value === opt 
                  ? 'bg-amber-50 text-amber-900 font-bold' 
                  : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  products,
  currency,
  conversionRate,
  customerSessionId,
  onOrderCreated,
  clearCart
}: CheckoutModalProps) {
  // Contact details
  const [formData, setFormData] = useState({
    name: localStorage.getItem('preorder_checkout_name') || '',
    email: localStorage.getItem('preorder_checkout_email') || '',
    phone: localStorage.getItem('preorder_checkout_phone') || ''
  });

  // Delivery configuration
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'doorstep'>('pickup');
  const [shippingTier, setShippingTier] = useState<'air' | 'boat'>('air');
  
  // Cascading Address states
  const [country, setCountry] = useState<string>('Nigeria');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedLga, setSelectedLga] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentSandbox, setShowPaymentSandbox] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [createdOrderRef, setCreatedOrderRef] = useState<any>(null);

  if (!isOpen) return null;

  // Compute items in pre-order bag
  const detailedItems = cartItems.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product };
  }).filter(item => item.product !== undefined) as any[];

  // Subtotal in base pricing currency
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

  // Delivery surcharge calculation
  // Pickup station is free. Customers in Nigeria get doorstep for free.
  // International doorstep: Air is NGN 15,000 / USD 15, Boat is NGN 6,000 / USD 6
  let deliveryFee = 0;
  if (deliveryMethod === 'doorstep') {
    if (country === 'Nigeria') {
      deliveryFee = 0;
    } else {
      if (shippingTier === 'air') {
        deliveryFee = currency === 'NGN' ? 15000 : 15;
      } else {
        deliveryFee = currency === 'NGN' ? 6000 : 6;
      }
    }
  }
  const totalAmount = subtotal + deliveryFee;

  // Maximum delivery estimate
  let baseDeliveryDays = 14;
  let baseEstimateString = '14 days';
  detailedItems.forEach(item => {
    const d = getMaxDeliveryDays(item.product.estimatedDeliveryDays);
    if (d > baseDeliveryDays) {
      baseDeliveryDays = d;
      baseEstimateString = item.product.estimatedDeliveryDays;
    }
  });

  const isBoatSelected = deliveryMethod === 'doorstep' && country !== 'Nigeria' && shippingTier === 'boat';
  const finalDeliveryDays = isBoatSelected ? (baseDeliveryDays + 14) : baseDeliveryDays;
  const finalEstimateString = isBoatSelected 
    ? `${baseDeliveryDays + 14} days (Slower Boat Transit)` 
    : baseEstimateString;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Valid email address is required';
    if (!formData.phone.trim() || formData.phone.length < 8) errors.phone = 'Valid phone number is required';
    
    if (deliveryMethod === 'doorstep') {
      if (!country) errors.country = 'Please select a country';
      if (country === 'Nigeria') {
        if (!selectedState) errors.state = 'Please select a state';
        if (!selectedLga) errors.lga = 'Please select a local government';
      }
      if (!streetAddress.trim()) errors.streetAddress = 'Street address is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Register order in Firestore and open Payment Simulator
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const orderId = generateOrderId();
      
      const { db, doc, writeBatch } = await import('../lib/firebase');

      // Create snapshot items for the order
      const snapshotItems = detailedItems.map(item => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        priceAtPurchase: Math.round(
          item.product.currencyMode === 'NGN'
            ? (currency === 'NGN' ? item.product.priceNGN : item.product.priceNGN / conversionRate)
            : (currency === 'USD' ? item.product.priceUSD : item.product.priceUSD * conversionRate)
        ),
        currency: currency
      }));

      // Determine address details
      let finalAddress = 'Pickup Station Allocation';
      if (deliveryMethod === 'doorstep') {
        if (country === 'Nigeria') {
          finalAddress = `${streetAddress.trim()}, ${selectedLga} LGA, ${selectedState} State, ${country}`;
        } else {
          finalAddress = `${streetAddress.trim()}, ${country}`;
        }
      }

      const estimatedDeliveryMs = Date.now() + (finalDeliveryDays * 24 * 60 * 60 * 1000);
      const currentTimestamp = Date.now();

      const orderData = {
        id: orderId,
        customerSessionId: customerSessionId,
        items: snapshotItems,
        totalAmount: Math.round(totalAmount),
        currency: currency,
        paystackReference: '',
        paymentStatus: 'pending',
        orderStatus: 'processing',
        deliveryDetails: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: finalAddress,
          deliveryMethod: deliveryMethod,
          state: selectedState || null,
          lga: selectedLga || null,
          country: country
        },
        estimatedDeliveryDate: estimatedDeliveryMs,
        createdAt: currentTimestamp
      };

      // Store in firestore under "orders" and "rate_limits" atomically
      const batch = writeBatch(db);
      const orderRef = doc(db, 'orders', orderId);
      const rateLimitRef = doc(db, 'rate_limits', customerSessionId);

      batch.set(orderRef, orderData);
      batch.set(rateLimitRef, {
        customerSessionId: customerSessionId,
        lastOrderTime: currentTimestamp
      }, { merge: true });

      // Save client profile details in localStorage to persist preferences
      localStorage.setItem('preorder_checkout_name', formData.name);
      localStorage.setItem('preorder_checkout_email', formData.email);
      localStorage.setItem('preorder_checkout_phone', formData.phone);
      if (deliveryMethod === 'doorstep') {
        localStorage.setItem('preorder_checkout_address', finalAddress);
      }

      await batch.commit();

      setCreatedOrderRef(orderData);
      setShowPaymentSandbox(true);
    } catch (err) {
      console.error('Failed to register order in Firestore:', err);
      try {
        const { handleFirestoreError, OperationType } = await import('../lib/firebase');
        handleFirestoreError(err, OperationType.WRITE, `orders`);
      } catch (inner) {
        console.error('Formatted Error:', inner);
      }
      alert('An error occurred while placing your pre-order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulated payment with server-side validation
  const handleSimulatedPayment = async (status: 'success' | 'fail') => {
    setPaymentStep('processing');
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (status === 'fail') {
      setPaymentStep('failed');
      return;
    }

    const paystackRef = `PR-PAY-${Math.floor(Math.random() * 1000000000)}`;

    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: createdOrderRef.id,
          paystackReference: paystackRef,
          amountPaid: createdOrderRef.totalAmount,
          currency: createdOrderRef.currency
        })
      });

      const verificationResult = await response.json();

      if (verificationResult.success) {
        setPaymentStep('success');
        clearCart();
        onOrderCreated(createdOrderRef.id);
      } else {
        console.error('Server verification failed:', verificationResult.message);
        setPaymentStep('failed');
      }
    } catch (err) {
      console.error('Network error during verification:', err);
      setPaymentStep('failed');
    }
  };

  return (
    <>
      {/* Full-Screen Confirm Pre-order Overlay View */}
      <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto flex flex-col print:hidden animate-fade-in font-sans">
        
        {/* Top bar header */}
        <div className="sticky top-0 bg-white border-b border-stone-200/80 px-4 py-4 sm:px-6 flex justify-between items-center shrink-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-stone-900 text-white rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-stone-950 uppercase tracking-widest">Confirm Pre-Order</h1>
              <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider hidden sm:block">Step 2 of 2: Allocation Specifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-stone-600 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-400 shadow-2xs transition-all active:scale-97 cursor-pointer"
          >
            Cancel &amp; Go Back
          </button>
        </div>

        {/* Outer content container */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: Delivery Option & Cascaded address Forms (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Delivery Method Choice selector cards */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">
                1. Select Delivery Preference
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option A: Pickup station */}
                <div 
                  onClick={() => {
                    setDeliveryMethod('pickup');
                    // Reset address cascading values if toggled off
                    setCountry('Nigeria');
                    setSelectedState('');
                    setSelectedLga('');
                    setStreetAddress('');
                  }}
                  className={`border rounded-2xl p-4 flex gap-3.5 items-start cursor-pointer transition-all select-none ${
                    deliveryMethod === 'pickup' 
                      ? 'border-amber-600 bg-amber-500/5 ring-1 ring-amber-600' 
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${deliveryMethod === 'pickup' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500'}`}>
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-900">Pickup Station</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 font-extrabold rounded">FREE</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-stone-500 leading-normal">
                      We will call you to coordinate the nearest custom regional collection point once crafting completes.
                    </p>
                  </div>
                </div>

                {/* Option B: Doorstep Delivery */}
                <div 
                  onClick={() => setDeliveryMethod('doorstep')}
                  className={`border rounded-2xl p-4 flex gap-3.5 items-start cursor-pointer transition-all select-none ${
                    deliveryMethod === 'doorstep' 
                      ? 'border-amber-600 bg-amber-500/5 ring-1 ring-amber-600' 
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${deliveryMethod === 'doorstep' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500'}`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-900">Doorstep Courier</span>
                      <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-800 border border-stone-200 font-extrabold rounded">
                        {currency === 'NGN' ? '₦7,500' : '$5'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-stone-500 leading-normal">
                      Insured freight directly to your home, office, or studio. Requires full address lookup specifications.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Paystack simulator vs main input form */}
            {!showPaymentSandbox ? (
              <form onSubmit={handleProceedToPayment} className="space-y-6">
                
                {/* Contact Information Card */}
                <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                  <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">
                    2. Contact Information
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Full Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Adaeze Chidi"
                          className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-2xs"
                        />
                        <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      </div>
                      {formErrors.name && <span className="text-[9px] text-red-500 font-bold uppercase block pl-1">{formErrors.name}</span>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="adaeze@example.com"
                          className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-2xs"
                        />
                        <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      </div>
                      {formErrors.email && <span className="text-[9px] text-red-500 font-bold uppercase block pl-1">{formErrors.email}</span>}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Phone Number (Pre-Order Updates)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+234 80 1234 5678"
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-2xs"
                      />
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    </div>
                    {formErrors.phone && <span className="text-[9px] text-red-500 font-bold uppercase block pl-1">{formErrors.phone}</span>}
                  </div>
                </div>

                {/* Address specification card (Only visible if doorstep delivery chosen) */}
                {deliveryMethod === 'doorstep' && (
                  <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4 animate-fade-in">
                    <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">
                      3. Premium Shipping Location Sourcing
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Country dropdown */}
                      <CustomDropdown 
                        label="Country"
                        value={country}
                        options={['Nigeria', 'Other International']}
                        onChange={(val) => {
                          setCountry(val);
                          setSelectedState('');
                          setSelectedLga('');
                        }}
                        placeholder="Select Country"
                      />

                      {/* State drop-down - populated if Nigeria */}
                      {country === 'Nigeria' && (
                        <CustomDropdown 
                          label="State"
                          value={selectedState}
                          options={Object.keys(NIGERIA_REGIONS)}
                          onChange={(val) => {
                            setSelectedState(val);
                            setSelectedLga('');
                          }}
                          placeholder="Select Nigerian State"
                        />
                      )}
                    </div>

                    {formErrors.state && <span className="text-[9px] text-red-500 font-bold uppercase block pl-1">{formErrors.state}</span>}

                    {/* Local Government Dropdown - populated based on state selection */}
                    {country === 'Nigeria' && selectedState && (
                      <div className="animate-fade-in">
                        <CustomDropdown 
                          label="Local Government Area (LGA)"
                          value={selectedLga}
                          options={NIGERIA_REGIONS[selectedState] || []}
                          onChange={(val) => setSelectedLga(val)}
                          placeholder={`Select LGA in ${selectedState}`}
                        />
                        {formErrors.lga && <span className="text-[9px] text-red-500 font-bold uppercase block pl-1">{formErrors.lga}</span>}
                      </div>
                    )}

                    {/* Street details input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">Street Address Details</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={streetAddress}
                          onChange={(e) => setStreetAddress(e.target.value)}
                          placeholder="House Number, Street Name, Estate/Suite Info"
                          className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-stone-400 focus:bg-white transition-all shadow-2xs"
                        />
                        <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      </div>
                      {formErrors.streetAddress && <span className="text-[9px] text-red-500 font-bold uppercase block pl-1">{formErrors.streetAddress}</span>}
                    </div>

                    {/* Shipping Speed (Air vs Boat) Option for international doorstep */}
                    {country !== 'Nigeria' && (
                      <div className="space-y-2 pt-4 border-t border-stone-150 mt-4 animate-fade-in">
                        <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block pl-1">
                          Shipping Method &amp; Delivery Speed
                        </label>
                        <div className="grid grid-cols-2 gap-3.5">
                          {/* Option A: Air */}
                          <div 
                            onClick={() => setShippingTier('air')}
                            className={`border rounded-2xl p-4 flex gap-3 items-start cursor-pointer transition-all select-none ${
                              shippingTier === 'air' 
                                ? 'border-amber-600 bg-amber-500/5 ring-1 ring-amber-600' 
                                : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 mt-0.5 shrink-0">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-stone-900 block">Air Freight</span>
                              <span className="text-[10px] font-mono text-amber-700 font-extrabold block">
                                {currency === 'NGN' ? '₦15,000' : '$15'}
                              </span>
                              <span className="text-[9px] text-stone-400 block font-medium">Standard estimated delivery window</span>
                            </div>
                          </div>

                          {/* Option B: Boat */}
                          <div 
                            onClick={() => setShippingTier('boat')}
                            className={`border rounded-2xl p-4 flex gap-3 items-start cursor-pointer transition-all select-none ${
                              shippingTier === 'boat' 
                                ? 'border-amber-600 bg-amber-500/5 ring-1 ring-amber-600' 
                                : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-blue-100 text-blue-800 mt-0.5 shrink-0">
                              <Building className="w-4 h-4" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-stone-900 block">Ocean / Boat</span>
                              <span className="text-[10px] font-mono text-blue-700 font-extrabold block">
                                {currency === 'NGN' ? '₦6,000' : '$6'}
                              </span>
                              <span className="text-[9px] text-stone-400 block font-medium">Eco-saving slower transit (+14 days)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-stone-950 hover:bg-stone-850 disabled:bg-stone-400 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-md transition-all active:scale-99 hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Registering Pre-Order...' : 'Proceed to Paystack Sandbox'}
                </button>
              </form>
            ) : (
              /* Paystack sandbox container */
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
                
                {paymentStep === 'idle' && (
                  <div className="space-y-6 text-center py-4">
                    <div className="mx-auto w-14 h-14 bg-amber-500/10 flex items-center justify-center rounded-full text-amber-700 border border-amber-200">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] bg-amber-500/15 border border-amber-500/25 px-3 py-1 rounded-full text-amber-900 font-black uppercase tracking-widest">
                        Paystack Simulation Gateway
                      </span>
                      <h3 className="font-serif text-xl font-bold text-stone-900 pt-2">
                        Simulate Secure Checkout
                      </h3>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                        This simulates Paystack&apos;s transaction interface. Select a successful transaction to verify order verification logic server-side.
                      </p>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-400 font-medium">Order ID:</span>
                        <span className="font-mono font-black text-stone-900">{createdOrderRef?.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 font-medium">Recipient:</span>
                        <span className="text-stone-900 font-semibold">{createdOrderRef?.deliveryDetails.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 font-medium">Contact:</span>
                        <span className="text-stone-900 font-mono">{createdOrderRef?.deliveryDetails.email}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t border-stone-200">
                        <span className="text-stone-800">Total Price:</span>
                        <span className="text-stone-950 text-sm font-black">
                          {createdOrderRef?.currency === 'NGN' ? '₦' : '$'}
                          {createdOrderRef?.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => handleSimulatedPayment('success')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Simulate Success
                      </button>
                      <button
                        onClick={() => handleSimulatedPayment('fail')}
                        className="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Simulate Failure
                      </button>
                    </div>
                  </div>
                )}

                {paymentStep === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="w-10 h-10 rounded-full border-4 border-amber-600 border-t-transparent animate-spin" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-stone-950 uppercase tracking-widest">
                        Authorizing on Paystack
                      </h4>
                      <p className="text-xs text-stone-500 font-sans">
                        Calling server-side verification hook `/api/verify-payment`...
                      </p>
                    </div>
                  </div>
                )}

                {paymentStep === 'success' && (
                  <div className="text-center py-8 space-y-6">
                    <div className="mx-auto w-14 h-14 bg-emerald-500/10 flex items-center justify-center rounded-full text-emerald-600 border border-emerald-200">
                      <CheckCircle className="w-8 h-8 animate-bounce" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-serif text-2xl font-bold text-stone-900">
                        Order Reserved!
                      </h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                        Payment verified successfully by server. Your customized order is logged in Firestore database and is currently marked as <span className="text-amber-700 font-bold uppercase">Processing</span>.
                      </p>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-400 font-medium">Assigned Order ID:</span>
                        <span className="font-mono font-black text-amber-800">{createdOrderRef?.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 font-medium">Recipient Address:</span>
                        <span className="font-medium text-stone-950 truncate max-w-[200px]">{createdOrderRef?.deliveryDetails.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 font-medium">Estimated Delivery:</span>
                        <span className="font-bold text-stone-950">{finalEstimateString}</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200 text-xs text-stone-600 text-center leading-relaxed">
                      You can print your invoice immediately below. You can also view this verified pre-order under your <strong>Profile Screen</strong> Order History.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => window.print()}
                        className="w-full bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-black uppercase tracking-wider text-[10px] py-3.5 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-stone-500" />
                        Print Invoice
                      </button>
                      <button
                        onClick={onClose}
                        className="w-full bg-stone-950 hover:bg-stone-850 text-white font-black uppercase tracking-wider text-[10px] py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Return to Catalog
                      </button>
                    </div>
                  </div>
                )}

                {paymentStep === 'failed' && (
                  <div className="text-center py-8 space-y-6">
                    <div className="mx-auto w-14 h-14 bg-red-500/10 flex items-center justify-center rounded-full text-red-600 border border-red-200">
                      <X className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-serif text-xl font-bold text-stone-900">
                        Payment Refused
                      </h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                        The transaction could not be processed by our sandbox partner. Please retry with a valid card profile.
                      </p>
                    </div>

                    <button
                      onClick={() => setPaymentStep('idle')}
                      className="w-full bg-stone-900 hover:bg-stone-800 text-white font-black uppercase tracking-wider text-xs py-3.5 rounded-xl transition-all shadow cursor-pointer"
                    >
                      Retry Transaction
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Right Panel: Pricing calculations & Sourced Items checklist (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Price details ledger card */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">
                Summary Ledger
              </h2>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Pre-Order Subtotal ({detailedItems.length} items)</span>
                  <span className="font-bold text-stone-800">
                    {currency === 'NGN' ? '₦' : '$'}{Math.round(subtotal).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-stone-500">
                  <span>Fulfillment Logistics ({deliveryMethod === 'pickup' ? 'Pickup Station' : 'Doorstep Courier'})</span>
                  <span className={`font-bold ${deliveryFee === 0 ? 'text-emerald-600 uppercase text-[10px] bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded font-black' : 'text-stone-800'}`}>
                    {deliveryFee === 0 ? 'Free' : (currency === 'NGN' ? `₦${deliveryFee.toLocaleString()}` : `$${deliveryFee}`)}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-stone-400">
                  <span>Consolidated Artisan Tariffs</span>
                  <span className="text-emerald-600 font-bold uppercase tracking-wider">Free Sourcing</span>
                </div>

                <div className="flex justify-between text-sm text-stone-950 font-black pt-3 border-t border-stone-200">
                  <span>Amount Due Today</span>
                  <span className="font-serif text-base text-amber-900">
                    {currency === 'NGN' ? '₦' : '$'}{Math.round(totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Sourced Items Specifications Checklist */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">
                Allocated Bag Items ({detailedItems.length})
              </h2>

              <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1">
                {detailedItems.map((item, idx) => {
                  let itemPrice = 0;
                  if (item.product.currencyMode === 'NGN') {
                    itemPrice = currency === 'NGN' ? item.product.priceNGN : item.product.priceNGN / conversionRate;
                  } else {
                    itemPrice = currency === 'USD' ? item.product.priceUSD : item.product.priceUSD * conversionRate;
                  }
                  return (
                    <div key={idx} className="flex gap-3 py-3 items-start first:pt-0 last:pb-0">
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name} 
                        className="w-10 h-12 object-cover rounded-md border bg-stone-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-stone-900 block truncate">{item.product.name}</span>
                        <span className="text-[10px] text-stone-400 block font-mono">QTY: {item.quantity} • UNIT: {currency === 'NGN' ? '₦' : '$'}{Math.round(itemPrice).toLocaleString()}</span>
                      </div>
                      <span className="font-mono text-xs font-black text-stone-950 text-right shrink-0">
                        {currency === 'NGN' ? '₦' : '$'}{Math.round(itemPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Sourcing Timeline Info */}
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-600/20 flex gap-2.5 items-start text-left">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-900 leading-normal font-sans">
                  Sourcing begins immediately. Handcrafted custom production completes inside <span className="font-bold underline">{finalEstimateString}</span>.
                </div>
              </div>
            </div>

            {/* Security banner */}
            <div className="p-4 bg-stone-100 rounded-2xl border border-stone-200/60 flex items-center gap-2.5 text-[10px] text-stone-500 leading-normal">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Insured checkout allocation. All transaction proxy data is PCI-DSS authenticated.</span>
            </div>

          </div>
        </div>
      </div>

      {/* Hidden printable Invoice template using browser print styles */}
      {createdOrderRef && (
        <div className="hidden print:block p-12 bg-white text-stone-900 font-sans w-full max-w-4xl mx-auto">
          <div className="flex justify-between items-start border-b-2 border-stone-800 pb-6 mb-8">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-stone-400 block font-mono">Bespoke Pre-Order Platform</span>
              <h1 className="font-serif text-3xl font-black text-stone-900">OFFICIAL INVOICE</h1>
              <span className="text-xs font-mono text-stone-500">Order Ref: {createdOrderRef.id}</span>
            </div>
            <div className="text-right">
              <span className="block text-xs text-stone-500">Date Generated</span>
              <span className="block text-sm font-bold font-mono">{new Date(createdOrderRef.createdAt).toLocaleDateString()}</span>
              <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded">Payment Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 text-xs leading-relaxed">
            <div>
              <h3 className="font-black uppercase tracking-wider text-stone-400 mb-2 font-mono text-[10px]">Customer Logistics</h3>
              <p className="font-bold text-sm text-stone-950">{createdOrderRef.deliveryDetails.name}</p>
              <p>{createdOrderRef.deliveryDetails.phone}</p>
              <p>{createdOrderRef.deliveryDetails.email}</p>
            </div>
            <div>
              <h3 className="font-black uppercase tracking-wider text-stone-400 mb-2 font-mono text-[10px]">Fulfillment Location</h3>
              <p className="whitespace-pre-line text-stone-700">{createdOrderRef.deliveryDetails.address}</p>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-6 mb-8">
            <h3 className="font-black uppercase tracking-wider text-stone-400 mb-4 font-mono text-[10px]">Allocated Item Specifications</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-[10px] uppercase font-black tracking-wider text-stone-500">
                  <th className="py-2.5">Item Description</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detailedItems.map((item: any, idx: number) => {
                  let itemPrice = 0;
                  if (item.product.currencyMode === 'NGN') {
                    itemPrice = currency === 'NGN' ? item.product.priceNGN : item.product.priceNGN / conversionRate;
                  } else {
                    itemPrice = currency === 'USD' ? item.product.priceUSD : item.product.priceUSD * conversionRate;
                  }
                  return (
                    <tr key={idx} className="border-b border-stone-100 text-stone-700">
                      <td className="py-3 font-medium font-serif text-stone-950">{item.product.name}</td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right font-mono">{currency === 'NGN' ? '₦' : '$'}{Math.round(itemPrice).toLocaleString()}</td>
                      <td className="py-3 text-right font-bold font-mono text-stone-950">{currency === 'NGN' ? '₦' : '$'}{Math.round(itemPrice * item.quantity).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-800">
            <div className="w-64 text-right space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span className="font-mono font-bold">{currency === 'NGN' ? '₦' : '$'}{Math.round(subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Fulfillment Courier ({createdOrderRef.deliveryDetails.deliveryMethod === 'pickup' ? 'Pickup' : 'Courier'})</span>
                <span className="text-stone-900 font-bold">
                  {deliveryFee === 0 ? 'FREE' : (currency === 'NGN' ? `₦${deliveryFee.toLocaleString()}` : `$${deliveryFee}`)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-stone-950 pt-2 border-t border-stone-300">
                <span>Amount Paid</span>
                <span className="font-mono font-serif text-base">{currency === 'NGN' ? '₦' : '$'}{Math.round(totalAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center border-t border-stone-200 pt-8 text-[10px] text-stone-400 font-mono tracking-wider">
            Thank you for supporting handcrafted independent artisans. Delivery window: {finalEstimateString}.
          </div>
        </div>
      )}
    </>
  );
}
