/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Category } from '../types';

export const SEED_CATEGORIES: Category[] = [
  { id: 'adult_apparel', name: 'Adult Apparel', slug: 'adult-apparel' },
  { id: 'kids_sizing', name: 'Kids Sizing (0–18 Years)', slug: 'kids-sizing' },
  { id: 'clothing_accessories', name: 'Clothing Accessories', slug: 'clothing-accessories' },
  { id: 'home_accessories', name: 'Home Accessories', slug: 'home-accessories' }
];

export const SEED_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'The Editorial Linen Chore Jacket',
    description: 'Cut from premium 340gsm heavy Belgian linen, tailored to order. Features organic horn buttons, three patch pockets, and a relaxed structured drape. Sourced, dyed, and sewn individually to minimize textile waste.',
    images: [
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=600&h=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=600&h=800&auto=format&fit=crop'
    ],
    category: 'Adult Apparel',
    priceNGN: 85000,
    priceUSD: 60,
    currencyMode: 'NGN', // Admin set price in Naira, converts dynamically for USD
    quantityAvailable: 15,
    estimatedDeliveryDays: '14–21 days',
    status: 'active',
    origin: 'Italy'
  },
  {
    name: 'The Modernist Ribbed Adult Knitwear',
    description: 'Spun from raw merino wool, offering a regular relaxed fit. Designed with subtle mock-neck trim and heavy ribbing at the hem. Perfect transitional layering artifact.',
    images: [
      'https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=600&h=900&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&h=900&auto=format&fit=crop'
    ],
    category: 'Adult Apparel',
    priceNGN: 95000,
    priceUSD: 65,
    currencyMode: 'NGN',
    quantityAvailable: 4, // Trigger low stock badge
    estimatedDeliveryDays: '10–14 days',
    status: 'active',
    origin: 'Nigeria'
  },
  {
    name: 'Artisan Denim Work Jacket',
    description: 'Tough, 14oz shuttle-loomed Japanese selvedge denim jacket. Raw, unwashed finish for custom wear creases. Built with triple-needle flat-felled seams.',
    images: [
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800&h=533&auto=format&fit=crop'
    ],
    category: 'Adult Apparel',
    priceNGN: 145000,
    priceUSD: 95,
    currencyMode: 'USD',
    quantityAvailable: 12,
    estimatedDeliveryDays: '21–28 days',
    status: 'active',
    origin: 'China'
  },
  {
    name: 'Pure Cotton Infant Romper Set (0-12m)',
    description: 'Supremely soft organic pima cotton romper with raw wooden buttons and comfortable diaper-snap bindings. Hypoallergenic, breathable, and designed for dynamic toddler movement.',
    images: [
      'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=600&h=600&auto=format&fit=crop'
    ],
    category: 'Kids Sizing (0–18 Years)',
    priceNGN: 35000,
    priceUSD: 24,
    currencyMode: 'NGN',
    quantityAvailable: 2, // Low stock
    estimatedDeliveryDays: '7–10 days',
    status: 'active',
    origin: 'Bangkok'
  },
  {
    name: 'Youth Heavyweight French Terry Hoodie',
    description: '450gsm dense cotton fleece custom built for active comfort. Features zero-drawstring visual styling for safety, flatlock seams, and deep cozy hand-warmer pockets.',
    images: [
      'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=600&h=750&auto=format&fit=crop'
    ],
    category: 'Kids Sizing (0–18 Years)',
    priceNGN: 55000,
    priceUSD: 38,
    currencyMode: 'NGN',
    quantityAvailable: 10,
    estimatedDeliveryDays: '12–16 days',
    status: 'active',
    origin: 'China'
  },
  {
    name: 'The Sculpted Calf-Skin Crossbody Bag',
    description: 'Sculptured geometric pouch carved out of vegetable-dyed full-grain calf skin. Features an adjustable shoulder strap, a raw linen lining, and internal pockets.',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&h=800&auto=format&fit=crop'
    ],
    category: 'Clothing Accessories',
    priceNGN: 110000,
    priceUSD: 72,
    currencyMode: 'USD',
    quantityAvailable: 6,
    estimatedDeliveryDays: '18–25 days',
    status: 'active',
    origin: 'Italy'
  },
  {
    name: 'Vibrant Designer Handbag Accents',
    description: 'Saffron orange statement handbag in durable textured leather with hand-painted edges and polished brass clasp hardware. Adds instant sculptural luxury to any evening wear outfit.',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&h=480&auto=format&fit=crop'
    ],
    category: 'Clothing Accessories',
    priceNGN: 125000,
    priceUSD: 80,
    currencyMode: 'USD',
    quantityAvailable: 3, // Low stock
    estimatedDeliveryDays: '14–21 days',
    status: 'active',
    origin: 'Bangkok'
  },
  {
    name: 'The Signature Hand-Poured Amber Candle',
    description: 'Soy wax candle infused with custom elements of dry cedar wood, warm amber resins, and raw vetiver root. Poured in a heavy reusable smoked glass vessel. Burns for 65 hours.',
    images: [
      'https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=600&h=750&auto=format&fit=crop'
    ],
    category: 'Home Accessories',
    priceNGN: 25000,
    priceUSD: 18,
    currencyMode: 'NGN',
    quantityAvailable: 30,
    estimatedDeliveryDays: '5–8 days',
    status: 'active',
    origin: 'Nigeria'
  },
  {
    name: 'Minimalist Sandstone Linen Valet Tray',
    description: 'Geometric catchall container hand-cast from raw textured sandstone cement with a premium protective organic linen protective base padding. Holds keys, glasses, and pocket items.',
    images: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=800&h=450&auto=format&fit=crop'
    ],
    category: 'Home Accessories',
    priceNGN: 22000,
    priceUSD: 15,
    currencyMode: 'NGN',
    quantityAvailable: 5, // Low stock
    estimatedDeliveryDays: '6–9 days',
    status: 'active',
    origin: 'Nigeria'
  }
];
