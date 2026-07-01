/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  category: string; // category name or ID
  priceNGN: number; // base NGN price if currencyMode = 'NGN'
  priceUSD: number; // base USD price if currencyMode = 'USD'
  currencyMode: 'NGN' | 'USD';
  quantityAvailable: number;
  estimatedDeliveryDays: string; // e.g., "7–14 days"
  status: 'active' | 'draft' | 'soldOut';
  origin: 'China' | 'Italy' | 'Bangkok' | 'Nigeria';
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface GlobalSettings {
  usdToNgnRate: number; // conversion rate (e.g., 1500 NGN per 1 USD)
  updatedAt: number;
  updatedBy: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtPurchase: number; // snapshot of price per item in purchase currency
  currency: 'NGN' | 'USD';
}

export interface Order {
  id: string;
  customerSessionId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: 'NGN' | 'USD';
  paystackReference: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderStatus: 'processing' | 'ready' | 'shipped' | 'fulfilled';
  deliveryDetails: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  estimatedDeliveryDate: number; // timestamp
  createdAt: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface FavoriteItem {
  productId: string;
  addedAt: number;
}
