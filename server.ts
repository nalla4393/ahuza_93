import crypto from 'crypto';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { generateConciergeResponse } from './server/conciergeChatService';
import { generateStyleFinderRecommendations } from './server/styleFinderService';
import {
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  INITIAL_WEBSITE_CONTENT,
  MAX_ALLOWED_PRICE_INR,
} from './src/data/seedData';
import {
  Address,
  AnalyticsEvent,
  CartItem,
  Category,
  Coupon,
  Order,
  OrderStatus,
  Payment,
  PriceDropAlert,
  Product,
  ProductStatus,
  Refund,
  RefundStatus,
  ReturnRequest,
  Review,
  StockArrivalAlert,
  UpiPaymentRecord,
  User,
  WebsiteContent,
  WebhookConfig,
  WebhookLog,
  CheckoutOrderPayload,
  AutomationConfig,
  AutomationExecutionLog,
  WishlistItem,
} from './src/types';
import {
  createUpiPaymentRecord,
  verifyUpiPaymentRecord,
  MERCHANT_CONFIG,
} from './server/upiPaymentService';
import {
  DEFAULT_WEBHOOK_CONFIG,
  forwardOrderToGoogleAppsScript,
  testGoogleAppsScriptWebhook,
} from './server/webhookService';
import {
  DEFAULT_AUTOMATION_CONFIG,
  executeGoogleAdsSync,
  executeGmailAlert,
  executeSocialAutoPost,
  executeInternalAlert,
  routeAutomationEvent,
  runAiMarketingDecision,
} from './server/marketingAutomationService';

interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
  resetToken?: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  products: Product[];
  categories: Category[];
  carts: Record<string, { items: CartItem[]; couponCode?: string }>;
  wishlists: WishlistItem[];
  orders: Order[];
  returns: ReturnRequest[];
  refunds: Refund[];
  reviews: Review[];
  coupons: Coupon[];
  websiteContent: WebsiteContent;
  draftWebsiteContent: WebsiteContent;
  analyticsEvents: AnalyticsEvent[];
  priceDropAlerts: PriceDropAlert[];
  stockArrivalAlerts: StockArrivalAlert[];
  supportTickets?: any[];
  upiPayments: UpiPaymentRecord[];
  webhookConfig?: WebhookConfig;
  webhookLogs: WebhookLog[];
  automationConfig?: AutomationConfig;
  automationLogs: AutomationExecutionLog[];
  orderSequence: number;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'ahuza-db.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'ahuza_secure_hmac_secret_2026';

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash, salt: usedSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

function createAuthToken(user: User): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAuthToken(token: string): { id: string; email: string; role: 'customer' | 'owner' } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function sanitizeUser(u: StoredUser): User {
  return {
    id: u.id,
    uid: u.uid,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    emailVerified: u.emailVerified,
    addresses: u.addresses,
    recentlyViewedProductIds: u.recentlyViewedProductIds || [],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function generateInitialAnalytics(): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  const now = Date.now();
  const sources: AnalyticsEvent['trafficSource'][] = [
    'Organic Search',
    'Instagram Editorial',
    'Direct',
    'WhatsApp Share',
    'Referral',
  ];
  const devices: AnalyticsEvent['deviceType'][] = ['Mobile (Android)', 'Mobile (iOS)', 'Desktop', 'Tablet'];
  const regions = [
    'Mumbai, Maharashtra',
    'Bengaluru, Karnataka',
    'Pune, Maharashtra',
    'New Delhi, Delhi NCR',
    'Hyderabad, Telangana',
    'Jaipur, Rajasthan',
    'Ahmedabad, Gujarat',
    'Kochi, Kerala',
  ];
  const queries = [
    'cotton kurti under 999',
    'kurta set with dupatta',
    'mens slub cotton kurta',
    'everyday lehenga',
    'waffle night suit',
    'track suit cotton',
  ];

  // Seed 60 days of realistic aggregate store activity
  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const dayBase = now - dayOffset * 24 * 60 * 60 * 1000;
    const dailySessions = 14 + ((dayOffset * 7) % 12);

    for (let s = 0; s < dailySessions; s++) {
      const sessionId = `sess_${dayOffset}_${s}`;
      const isReturning = s % 3 === 0;
      const source = sources[(dayOffset + s) % sources.length];
      const device = devices[(dayOffset + s * 2) % devices.length];
      const region = regions[(dayOffset + s) % regions.length];
      const prod = INITIAL_PRODUCTS[(dayOffset + s) % INITIAL_PRODUCTS.length];
      const ts = new Date(dayBase - s * 1800 * 1000).toISOString();

      events.push({
        id: `ev_pv_${dayOffset}_${s}`,
        type: 'page_view',
        sessionId,
        isReturningVisitor: isReturning,
        trafficSource: source,
        deviceType: device,
        region,
        landingPage: s % 2 === 0 ? '/' : s % 3 === 0 ? '/women' : '/men',
        timestamp: ts,
      });

      if (s % 10 < 7) {
        events.push({
          id: `ev_prod_${dayOffset}_${s}`,
          type: 'product_view',
          sessionId,
          isReturningVisitor: isReturning,
          productId: prod.id,
          trafficSource: source,
          deviceType: device,
          region,
          landingPage: `/product/${prod.id}`,
          timestamp: ts,
        });
      }

      if (s % 10 === 2) {
        events.push({
          id: `ev_srch_${dayOffset}_${s}`,
          type: 'search',
          sessionId,
          isReturningVisitor: isReturning,
          searchQuery: queries[(dayOffset + s) % queries.length],
          trafficSource: source,
          deviceType: device,
          region,
          landingPage: '/search',
          timestamp: ts,
        });
      }

      if (s % 10 === 3) {
        events.push({
          id: `ev_wish_${dayOffset}_${s}`,
          type: 'wishlist_add',
          sessionId,
          isReturningVisitor: isReturning,
          productId: prod.id,
          trafficSource: source,
          deviceType: device,
          region,
          landingPage: `/product/${prod.id}`,
          timestamp: ts,
        });
      }

      if (s % 10 < 4) {
        events.push({
          id: `ev_atc_${dayOffset}_${s}`,
          type: 'add_to_cart',
          sessionId,
          isReturningVisitor: isReturning,
          productId: prod.id,
          trafficSource: source,
          deviceType: device,
          region,
          landingPage: `/product/${prod.id}`,
          timestamp: ts,
        });
      }

      if (s % 10 < 2) {
        events.push({
          id: `ev_chk_${dayOffset}_${s}`,
          type: 'checkout_start',
          sessionId,
          isReturningVisitor: isReturning,
          productId: prod.id,
          trafficSource: source,
          deviceType: device,
          region,
          landingPage: '/checkout',
          timestamp: ts,
        });
      }

      if (s % 12 === 0) {
        events.push({
          id: `ev_pur_${dayOffset}_${s}`,
          type: 'purchase',
          sessionId,
          isReturningVisitor: isReturning,
          productId: prod.id,
          trafficSource: source,
          deviceType: device,
          region,
          landingPage: '/checkout',
          revenueAmount: prod.discountPrice,
          timestamp: ts,
        });
      }
    }
  }
  return events;
}

function createInitialDatabase(): DatabaseSchema {
  const ownerPass = hashPassword('AhuzaOwner@2026');
  const customerPass = hashPassword('Customer@2026');

  const ownerUser: StoredUser = {
    id: 'usr-owner-1',
    name: 'Rosy Nallagonda (Ahuza Founder)',
    email: 'nallagondarosy@gmail.com',
    phone: '+91 98201 12026',
    role: 'owner',
    emailVerified: true,
    passwordHash: ownerPass.hash,
    passwordSalt: ownerPass.salt,
    addresses: [
      {
        id: 'addr-owner-1',
        label: 'Studio HQ',
        fullName: 'Rosy Nallagonda',
        phone: '+91 98201 12026',
        line1: 'Plot 42, Textile Artisan Park, Lower Parel',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400013',
        isDefault: true,
      },
    ],
    recentlyViewedProductIds: ['prod-w-kurti-001', 'prod-w-kurtaset-003'],
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
  };

  const secondaryOwner: StoredUser = {
    id: 'usr-owner-2',
    name: 'Ahuza Studio Director',
    email: 'info@ahuzawear.com',
    phone: '+91 9550582277',
    role: 'owner',
    emailVerified: true,
    passwordHash: ownerPass.hash,
    passwordSalt: ownerPass.salt,
    addresses: [],
    recentlyViewedProductIds: [],
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
  };

  const sampleCustomer: StoredUser = {
    id: 'usr-cust-1',
    name: 'Ananya Deshmukh',
    email: 'ananya@example.com',
    phone: '+91 98230 44510',
    role: 'customer',
    emailVerified: true,
    passwordHash: customerPass.hash,
    passwordSalt: customerPass.salt,
    addresses: [
      {
        id: 'addr-cust-1',
        label: 'Home',
        fullName: 'Ananya Deshmukh',
        phone: '+91 98230 44510',
        line1: 'Flat 402, Gulmohar Terrace, Koregaon Park',
        line2: 'Lane 5',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        isDefault: true,
      },
    ],
    recentlyViewedProductIds: ['prod-w-kurti-001', 'prod-w-kurtaset-003', 'prod-m-kurta-007'],
    createdAt: '2026-09-05T11:30:00.000Z',
    updatedAt: '2026-10-01T11:30:00.000Z',
  };

  const sampleOrders: Order[] = [
    {
      id: 'ord-1',
      orderNumber: 'AHZ-2026-000001',
      userId: sampleCustomer.id,
      customerName: sampleCustomer.name,
      customerEmail: sampleCustomer.email,
      customerPhone: sampleCustomer.phone,
      shippingAddress: sampleCustomer.addresses[0],
      items: [
        {
          id: 'oi-1',
          productId: 'prod-w-kurti-001',
          productName: 'Ahuza Cotton Everyday Kurti',
          sku: 'AHZ-W-KRT-001',
          imageUrl: INITIAL_PRODUCTS[0].images[0].url,
          size: 'M',
          color: 'Sage Leaf',
          quantity: 1,
          unitPrice: 799,
          originalPrice: 999,
        },
        {
          id: 'oi-2',
          productId: 'prod-w-kurtaset-003',
          productName: 'Ahuza Cotton Kurta Set with Dupatta',
          sku: 'AHZ-W-KSD-003',
          imageUrl: INITIAL_PRODUCTS[2].images[0].url,
          size: 'M',
          color: 'Dusty Rose',
          quantity: 1,
          unitPrice: 1499,
          originalPrice: 1999,
        },
      ],
      subtotal: 2298,
      discount: 700,
      shipping: 0,
      totalAmount: 2298,
      status: 'Delivered',
      payment: {
        id: 'pay-1',
        orderId: 'ord-1',
        provider: 'Razorpay',
        method: 'UPI',
        razorpayOrderId: 'order_AhzDemo000001',
        razorpayPaymentId: 'pay_AhzDemo000001',
        amount: 2298,
        currency: 'INR',
        status: 'Paid',
        isDemoMode: true,
        verifiedServerSide: true,
        paidAt: '2026-09-24T10:15:00.000Z',
      },
      shipment: {
        id: 'shp-1',
        orderId: 'ord-1',
        courierName: 'BlueDart Express India',
        trackingNumber: 'BD-AHZ-88492011',
        estimatedDelivery: 'Delivered on 27 Sep 2026',
        currentLocation: 'Pune Hub — Delivered',
      },
      timeline: [
        { status: 'Pending', timestamp: '2026-09-24T10:14:00.000Z', note: 'Order initiated at checkout' },
        { status: 'Paid', timestamp: '2026-09-24T10:15:00.000Z', note: 'Razorpay server-side signature verified (UPI)' },
        { status: 'Confirmed', timestamp: '2026-09-24T10:20:00.000Z', note: 'Order confirmed by Ahuza Mumbai Atelier' },
        { status: 'Packed', timestamp: '2026-09-24T16:40:00.000Z', note: 'Quality checked & packed inplastic-free cotton mailer' },
        { status: 'Shipped', timestamp: '2026-09-25T09:00:00.000Z', note: 'Handed over to BlueDart Express (AWB: BD-AHZ-88492011)', location: 'Mumbai Hub' },
        { status: 'Out for Delivery', timestamp: '2026-09-27T08:30:00.000Z', note: 'Out for delivery with courier executive', location: 'Koregaon Park, Pune' },
        { status: 'Delivered', timestamp: '2026-09-27T13:10:00.000Z', note: 'Package delivered to recipient', location: 'Pune, Maharashtra' },
      ],
      createdAt: '2026-09-24T10:14:00.000Z',
      updatedAt: '2026-09-27T13:10:00.000Z',
    },
    {
      id: 'ord-2',
      orderNumber: 'AHZ-2026-000002',
      userId: sampleCustomer.id,
      customerName: sampleCustomer.name,
      customerEmail: sampleCustomer.email,
      customerPhone: sampleCustomer.phone,
      shippingAddress: sampleCustomer.addresses[0],
      items: [
        {
          id: 'oi-3',
          productId: 'prod-m-kurta-007',
          productName: 'Ahuza Casual Cotton Kurta',
          sku: 'AHZ-M-KRT-007',
          imageUrl: INITIAL_PRODUCTS[6].images[0].url,
          size: 'L',
          color: 'Indigo Slate',
          quantity: 1,
          unitPrice: 799,
          originalPrice: 1299,
        },
      ],
      subtotal: 799,
      discount: 500,
      shipping: 79,
      totalAmount: 878,
      status: 'Shipped',
      payment: {
        id: 'pay-2',
        orderId: 'ord-2',
        provider: 'Razorpay',
        method: 'Credit Card',
        razorpayOrderId: 'order_AhzDemo000002',
        razorpayPaymentId: 'pay_AhzDemo000002',
        amount: 878,
        currency: 'INR',
        status: 'Paid',
        isDemoMode: true,
        verifiedServerSide: true,
        paidAt: '2026-10-01T11:05:00.000Z',
      },
      shipment: {
        id: 'shp-2',
        orderId: 'ord-2',
        courierName: 'Delhivery Surface Express',
        trackingNumber: 'DLV-AHZ-99201445',
        estimatedDelivery: '04 Oct 2026',
        currentLocation: 'In Transit — Lonavala Hub',
      },
      timeline: [
        { status: 'Pending', timestamp: '2026-10-01T11:04:00.000Z', note: 'Order initiated' },
        { status: 'Paid', timestamp: '2026-10-01T11:05:00.000Z', note: 'Server-side payment verified' },
        { status: 'Confirmed', timestamp: '2026-10-01T11:15:00.000Z', note: 'Order confirmed' },
        { status: 'Packed', timestamp: '2026-10-01T17:00:00.000Z', note: 'Dispatched from Lower Parel Studio' },
        { status: 'Shipped', timestamp: '2026-10-02T06:00:00.000Z', note: 'In transit via Delhivery (AWB: DLV-AHZ-99201445)', location: 'Mumbai -> Pune Corridor' },
      ],
      createdAt: '2026-10-01T11:04:00.000Z',
      updatedAt: '2026-10-02T06:00:00.000Z',
    },
  ];

  const sampleReturn: ReturnRequest = {
    id: 'ret-1',
    orderId: 'ord-1',
    orderNumber: 'AHZ-2026-000001',
    userId: sampleCustomer.id,
    customerName: sampleCustomer.name,
    customerEmail: sampleCustomer.email,
    type: 'Return',
    reason: 'Size Exchange / Fit Preference',
    details: 'Would like to return size M and reorder size S in the Everyday Kurti.',
    status: 'Approved',
    ownerNote: 'Pickup scheduled with BlueDart reverse logistics.',
    refundId: 'ref-1',
    createdAt: '2026-09-29T12:00:00.000Z',
    updatedAt: '2026-09-30T10:00:00.000Z',
  };

  const sampleRefund: Refund = {
    id: 'ref-1',
    returnRequestId: 'ret-1',
    orderId: 'ord-1',
    orderNumber: 'AHZ-2026-000001',
    userId: sampleCustomer.id,
    amount: 799,
    status: 'Approved',
    providerReference: 'rfnd_pending_confirmation',
    providerConfirmed: false,
    updatedAt: '2026-09-30T10:00:00.000Z',
  };

  return {
    users: [ownerUser, secondaryOwner, sampleCustomer],
    products: INITIAL_PRODUCTS,
    categories: INITIAL_CATEGORIES,
    carts: {},
    wishlists: [
      {
        id: 'wish-1',
        userId: sampleCustomer.id,
        productId: 'prod-w-lehenga-004',
        createdAt: '2026-09-28T10:00:00.000Z',
      },
    ],
    orders: sampleOrders,
    returns: [sampleReturn],
    refunds: [sampleRefund],
    reviews: INITIAL_REVIEWS,
    coupons: INITIAL_COUPONS,
    websiteContent: INITIAL_WEBSITE_CONTENT,
    draftWebsiteContent: JSON.parse(JSON.stringify(INITIAL_WEBSITE_CONTENT)),
    analyticsEvents: generateInitialAnalytics(),
    priceDropAlerts: [
      {
        id: 'alert-sample-1',
        productId: 'prod-w-kurtaset-003',
        productName: 'Ahuza Handloom Chanderi Kurta Set with Dupatta',
        sku: 'AHZ-W-KST-003',
        email: 'ananya@example.com',
        userId: sampleCustomer.id,
        currentPrice: 1499,
        targetPrice: 1299,
        preference: 'below_target',
        status: 'active',
        createdAt: '2026-09-28T10:00:00.000Z',
        updatedAt: '2026-09-28T10:00:00.000Z',
      },
    ],
    stockArrivalAlerts: [],
    upiPayments: [],
    webhookConfig: DEFAULT_WEBHOOK_CONFIG,
    webhookLogs: [],
    automationConfig: DEFAULT_AUTOMATION_CONFIG,
    automationLogs: [],
    orderSequence: 2,
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        parsed.priceDropAlerts = parsed.priceDropAlerts || [];
        parsed.stockArrivalAlerts = parsed.stockArrivalAlerts || [];
        parsed.upiPayments = parsed.upiPayments || [];
        parsed.webhookConfig = parsed.webhookConfig || DEFAULT_WEBHOOK_CONFIG;
        parsed.webhookLogs = parsed.webhookLogs || [];
        parsed.automationConfig = parsed.automationConfig || DEFAULT_AUTOMATION_CONFIG;
        parsed.automationLogs = parsed.automationLogs || [];
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Initializing fresh database store:', e);
  }
  const initial = createInitialDatabase();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(dbData: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to persist database:', e);
  }
}

const dbStore = loadDatabase();

// Simple in-memory rate limiter for auth & AI endpoints
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'anon'}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }
    bucket.count++;
    return next();
  };
}

interface AuthenticatedRequest extends Request {
  user?: StoredUser;
}

function attachUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyAuthToken(token);
    if (decoded) {
      const found = dbStore.users.find((u) => u.id === decoded.id || u.email.toLowerCase() === decoded.email.toLowerCase());
      if (found) {
        req.user = found;
      }
    }
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in to continue.' });
  }
  next();
}

function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: '403 Unauthorized: Owner Studio privileges required.' });
  }
  next();
}

function validateProductPriceServerSide(price: unknown, discountPrice: unknown): string | null {
  const p = Number(price);
  const dp = discountPrice !== undefined && discountPrice !== null && discountPrice !== '' ? Number(discountPrice) : p;
  if (!Number.isFinite(p) || p <= 0) {
    return 'Product price must be a valid positive amount in INR.';
  }
  if (p > MAX_ALLOWED_PRICE_INR || dp > MAX_ALLOWED_PRICE_INR) {
    return 'Maximum allowed product price is ₹2,000.';
  }
  if (!Number.isFinite(dp) || dp <= 0 || dp > p) {
    return 'Discount selling price must be positive and cannot exceed the MRP.';
  }
  return null;
}

function computeCartTotals(userId: string) {
  const entry = dbStore.carts[userId] || { items: [] };
  const enrichedItems: CartItem[] = [];
  let mrpSubtotal = 0;
  let sellingSubtotal = 0;

  for (const item of entry.items) {
    const product = dbStore.products.find((p) => p.id === item.productId && p.status === 'Published');
    if (product) {
      enrichedItems.push({
        ...item,
        product,
      });
      mrpSubtotal += product.price * item.quantity;
      sellingSubtotal += product.discountPrice * item.quantity;
    }
  }

  const productDiscount = Math.max(0, mrpSubtotal - sellingSubtotal);
  let couponDiscount = 0;
  if (entry.couponCode) {
    const cpn = dbStore.coupons.find((c) => c.code.toUpperCase() === entry.couponCode?.toUpperCase() && c.isActive);
    if (cpn && sellingSubtotal >= cpn.minOrderAmount) {
      if (cpn.discountType === 'percentage') {
        couponDiscount = Math.min(cpn.maxDiscountAmount, Math.round((sellingSubtotal * cpn.discountValue) / 100));
      } else {
        couponDiscount = Math.min(cpn.maxDiscountAmount, cpn.discountValue);
      }
    }
  }

  const afterCoupon = Math.max(0, sellingSubtotal - couponDiscount);
  const freeThreshold = dbStore.websiteContent.policies.freeShippingThreshold || 999;
  const shipping = enrichedItems.length === 0 ? 0 : afterCoupon >= freeThreshold ? 0 : 79;
  const grandTotal = afterCoupon + shipping;

  return {
    id: `cart_${userId}`,
    userId,
    items: enrichedItems,
    couponCode: entry.couponCode,
    subtotal: mrpSubtotal,
    productDiscount,
    couponDiscount,
    shipping,
    grandTotal,
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(attachUser);

  // ============================================================================
  // SEO: Sitemap & Robots.txt
  // ============================================================================
  app.get(['/sitemap.xml', '/api/sitemap.xml'], (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const publishedProducts = dbStore.products.filter((p) => p.status === 'Published');
    const urls = [
      '/',
      '/women',
      '/men',
      '/why-ahuza',
      '/about',
      '/contact',
      '/track-order',
      ...publishedProducts.map((p) => `/product/${p.id}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${baseUrl}${u}</loc>
    <changefreq>daily</changefreq>
    <priority>${u === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  });

  app.get(['/robots.txt', '/api/robots.txt'], (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /owner\nDisallow: /api/owner\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  // ============================================================================
  // 1. AUTHENTICATION API (/api/auth/*)
  // ============================================================================
  app.post('/api/auth/signup', rateLimit(20, 60_000), (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password || String(password).length < 6) {
      return res.status(400).json({ error: 'Please provide your full name, valid email, and a password of at least 6 characters.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = dbStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
    }

    const { hash, salt } = hashPassword(String(password));
    const isOwnerEmail = cleanEmail === 'nallagondarosy@gmail.com' || cleanEmail === 'owner@ahuza.in' || cleanEmail === 'info@ahuzawear.com';
    const now = new Date().toISOString();

    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: String(name).trim(),
      email: cleanEmail,
      phone: String(phone || '').trim(),
      role: isOwnerEmail ? 'owner' : 'customer',
      emailVerified: true,
      passwordHash: hash,
      passwordSalt: salt,
      addresses: [],
      recentlyViewedProductIds: [],
      createdAt: now,
      updatedAt: now,
    };

    dbStore.users.push(newUser);
    saveDatabase(dbStore);

    const sanitized = sanitizeUser(newUser);
    const token = createAuthToken(sanitized);
    return res.status(201).json({ user: sanitized, token });
  });

  app.post('/api/auth/login', rateLimit(30, 60_000), (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const user = dbStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || !verifyPassword(String(password), user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const isOwnerEmail = cleanEmail === 'nallagondarosy@gmail.com' || cleanEmail === 'owner@ahuza.in' || cleanEmail === 'info@ahuzawear.com';
    if (isOwnerEmail && user.role !== 'owner') {
      user.role = 'owner';
      saveDatabase(dbStore);
    }

    const sanitized = sanitizeUser(user);
    const token = createAuthToken(sanitized);
    return res.json({ user: sanitized, token });
  });

  app.post('/api/auth/google-sync', rateLimit(30, 60_000), (req, res) => {
    const { uid, email, name, phone } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google account email is required.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const isOwnerEmail = cleanEmail === 'nallagondarosy@gmail.com' || cleanEmail === 'owner@ahuza.in' || cleanEmail === 'info@ahuzawear.com';
    let user = dbStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const now = new Date().toISOString();

    if (!user) {
      const randomPass = hashPassword(crypto.randomBytes(16).toString('hex'));
      user = {
        id: uid || `usr_${Date.now()}`,
        uid: uid || undefined,
        name: String(name || cleanEmail.split('@')[0]).trim(),
        email: cleanEmail,
        phone: String(phone || '').trim(),
        role: isOwnerEmail ? 'owner' : 'customer',
        emailVerified: true,
        passwordHash: randomPass.hash,
        passwordSalt: randomPass.salt,
        addresses: [],
        recentlyViewedProductIds: [],
        createdAt: now,
        updatedAt: now,
      };
      dbStore.users.push(user);
    } else {
      user.uid = uid || user.uid;
      if (isOwnerEmail) user.role = 'owner';
      user.updatedAt = now;
    }

    saveDatabase(dbStore);
    const sanitized = sanitizeUser(user);
    const token = createAuthToken(sanitized);
    return res.json({ user: sanitized, token });
  });

  app.post('/api/auth/forgot-password', rateLimit(15, 60_000), (req, res) => {
    const { email } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = dbStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const demoResetCode = 'AHZ-849201';
    if (user) {
      user.resetToken = demoResetCode;
      saveDatabase(dbStore);
    }
    return res.json({
      message: 'If an account matches that email, a 6-digit password reset code has been dispatched.',
      demoResetCode,
    });
  });

  app.post('/api/auth/reset-password', rateLimit(15, 60_000), (req, res) => {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Please provide email, verification code, and a new password (min 6 chars).' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const user = dbStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || (user.resetToken && user.resetToken !== resetCode && resetCode !== 'AHZ-849201')) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }
    const { hash, salt } = hashPassword(String(newPassword));
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.resetToken = undefined;
    user.updatedAt = new Date().toISOString();
    saveDatabase(dbStore);
    return res.json({ message: 'Password updated successfully. You may now sign in.' });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    return res.json({ user: sanitizeUser(req.user!) });
  });

  app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { name, phone, addresses, recentlyViewedProductId } = req.body;
    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof phone === 'string') user.phone = phone.trim();
    if (Array.isArray(addresses)) {
      user.addresses = addresses.slice(0, 10);
    }
    if (typeof recentlyViewedProductId === 'string' && recentlyViewedProductId) {
      const filtered = (user.recentlyViewedProductIds || []).filter((id) => id !== recentlyViewedProductId);
      user.recentlyViewedProductIds = [recentlyViewedProductId, ...filtered].slice(0, 12);
    }
    user.updatedAt = new Date().toISOString();
    saveDatabase(dbStore);
    return res.json({ user: sanitizeUser(user) });
  });

  // ============================================================================
  // 2. STOREFRONT PRODUCTS & SEARCH API (/api/products/*)
  // ============================================================================
  app.get('/api/products', (req, res) => {
    const {
      q,
      gender,
      category,
      size,
      color,
      maxPrice,
      inStockOnly,
      featured,
      newArrival,
      bestSeller,
      sort,
    } = req.query;

    // Customer storefront NEVER exposes Unpublished or Draft products
    let list = dbStore.products.filter(
      (p) => p.status === 'Published' && p.price <= MAX_ALLOWED_PRICE_INR && p.discountPrice <= MAX_ALLOWED_PRICE_INR
    );

    if (gender && (gender === 'women' || gender === 'men')) {
      list = list.filter((p) => p.gender === gender || p.gender === 'unisex');
    }

    if (category && String(category).trim() && category !== 'All') {
      const catLower = String(category).trim().toLowerCase();
      list = list.filter((p) => p.categories.some((c) => c.toLowerCase() === catLower));
    }

    if (size && String(size).trim()) {
      const sz = String(size).trim().toUpperCase();
      list = list.filter((p) => p.sizes.includes(sz));
    }

    if (color && String(color).trim()) {
      const colLower = String(color).trim().toLowerCase();
      list = list.filter((p) => p.colors.some((c) => c.name.toLowerCase().includes(colLower)));
    }

    const priceCap = maxPrice ? Math.min(MAX_ALLOWED_PRICE_INR, Number(maxPrice)) : MAX_ALLOWED_PRICE_INR;
    list = list.filter((p) => p.discountPrice <= priceCap);

    if (inStockOnly === 'true') {
      list = list.filter((p) => p.stock > 0);
    }
    if (featured === 'true') {
      list = list.filter((p) => p.isFeatured);
    }
    if (newArrival === 'true') {
      list = list.filter((p) => p.isNewArrival);
    }
    if (bestSeller === 'true') {
      list = list.filter((p) => p.isBestSeller);
    }

    if (q && String(q).trim()) {
      const terms = String(q).trim().toLowerCase().split(/\s+/);
      list = list.filter((p) => {
        const haystack = [
          p.name,
          p.sku,
          p.gender,
          p.fabric,
          p.description,
          ...p.categories,
          ...p.colors.map((c) => c.name),
          ...p.searchKeywords,
        ]
          .join(' ')
          .toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });
    }

    if (sort === 'price_asc') {
      list.sort((a, b) => a.discountPrice - b.discountPrice);
    } else if (sort === 'price_desc') {
      list.sort((a, b) => b.discountPrice - a.discountPrice);
    } else if (sort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }

    return res.json({
      products: list,
      categories: dbStore.categories,
      maxAllowedPrice: MAX_ALLOWED_PRICE_INR,
    });
  });

  app.get('/api/products/:id', (req, res) => {
    const product = dbStore.products.find((p) => p.id === req.params.id);
    if (!product || (product.status !== 'Published' && product.status !== 'Out of Stock')) {
      return res.status(404).json({ error: 'Product not found or currently unavailable.' });
    }
    const reviews = dbStore.reviews.filter((r) => r.productId === product.id);
    const related = dbStore.products
      .filter((p) => p.id !== product.id && p.status === 'Published' && p.gender === product.gender)
      .slice(0, 3);
    return res.json({ product, reviews, related });
  });

  // Price Drop Alerts API
  app.post('/api/products/:id/price-drop-alerts', (req, res) => {
    dbStore.priceDropAlerts = dbStore.priceDropAlerts || [];
    const product = dbStore.products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const { email, targetPrice, preference } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const currentPrice = product.discountPrice || product.price;
    const alertTarget = typeof targetPrice === 'number' && targetPrice > 0 ? targetPrice : currentPrice;

    // Check optional auth token if signed in
    const authHeader = req.headers.authorization;
    let userId: string | undefined = undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authUser = verifyAuthToken(authHeader.slice(7));
      if (authUser) userId = authUser.id;
    }

    // Check if existing active alert for this product & email
    let alert = dbStore.priceDropAlerts.find(
      (a) => a.productId === product.id && a.email.toLowerCase() === cleanEmail && a.status === 'active'
    );

    const now = new Date().toISOString();
    if (alert) {
      alert.targetPrice = alertTarget;
      alert.preference = preference || 'below_target';
      alert.currentPrice = currentPrice;
      alert.updatedAt = now;
      if (userId) alert.userId = userId;
    } else {
      alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        email: cleanEmail,
        userId,
        currentPrice,
        targetPrice: alertTarget,
        preference: preference || 'below_target',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      dbStore.priceDropAlerts.unshift(alert);
    }

    // Record analytics event
    dbStore.analyticsEvents.push({
      id: `evt_${Date.now()}`,
      type: 'product_view',
      sessionId: req.headers['x-session-id']?.toString() || 'anonymous',
      isReturningVisitor: true,
      productId: product.id,
      trafficSource: 'Direct',
      deviceType: 'Mobile (Android)',
      region: 'India',
      landingPage: `/product/${product.id}`,
      timestamp: now,
    });

    saveDatabase(dbStore);
    return res.status(200).json({
      alert,
      message: `Price drop alert activated! We will alert ${cleanEmail} if the price decreases.`,
    });
  });

  app.get('/api/products/:id/price-drop-alerts/me', (req, res) => {
    dbStore.priceDropAlerts = dbStore.priceDropAlerts || [];
    const { email } = req.query;
    const authHeader = req.headers.authorization;
    let authUserEmail: string | undefined = undefined;
    let authUserId: string | undefined = undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const parsed = verifyAuthToken(authHeader.slice(7));
      if (parsed) {
        authUserEmail = parsed.email?.toLowerCase();
        authUserId = parsed.id;
      }
    }

    const targetEmail = email ? String(email).trim().toLowerCase() : authUserEmail;

    const alert = dbStore.priceDropAlerts.find(
      (a) =>
        a.productId === req.params.id &&
        a.status === 'active' &&
        ((targetEmail && a.email.toLowerCase() === targetEmail) || (authUserId && a.userId === authUserId))
    );

    return res.json({ alert: alert || null });
  });

  app.delete('/api/price-drop-alerts/:id', (req, res) => {
    dbStore.priceDropAlerts = dbStore.priceDropAlerts || [];
    const alert = dbStore.priceDropAlerts.find((a) => a.id === req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }
    alert.status = 'cancelled';
    alert.updatedAt = new Date().toISOString();
    saveDatabase(dbStore);
    return res.json({ cancelled: true, message: 'Price drop alert cancelled.' });
  });

  // ============================================================================
  // Stock Arrival / Restock Alerts API (Men's Collection & Handloom Batches)
  // ============================================================================
  app.post('/api/products/:id/restock-alerts', (req, res) => {
    dbStore.stockArrivalAlerts = dbStore.stockArrivalAlerts || [];
    const product = dbStore.products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const { email, phone, selectedSize, selectedColor } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const authHeader = req.headers.authorization;
    let userId: string | undefined = undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authUser = verifyAuthToken(authHeader.slice(7));
      if (authUser) userId = authUser.id;
    }

    let alert = dbStore.stockArrivalAlerts.find(
      (a) =>
        a.productId === product.id &&
        a.email.toLowerCase() === cleanEmail &&
        a.status === 'pending' &&
        (!selectedSize || a.selectedSize === selectedSize)
    );

    const now = new Date().toISOString();
    if (alert) {
      alert.selectedSize = selectedSize || alert.selectedSize;
      alert.selectedColor = selectedColor || alert.selectedColor;
      alert.phone = phone || alert.phone;
      alert.updatedAt = now;
      if (userId) alert.userId = userId;
    } else {
      alert = {
        id: `stock_alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        gender: product.gender,
        selectedSize: selectedSize || undefined,
        selectedColor: selectedColor || undefined,
        email: cleanEmail,
        phone: phone ? String(phone).trim() : undefined,
        userId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      dbStore.stockArrivalAlerts.unshift(alert);
    }

    saveDatabase(dbStore);
    return res.status(200).json({
      alert,
      message: `Restock alert confirmed! We will notify ${cleanEmail} the moment new stock arrives for ${product.name}.`,
    });
  });

  app.get('/api/products/:id/restock-alerts/me', (req, res) => {
    dbStore.stockArrivalAlerts = dbStore.stockArrivalAlerts || [];
    const { email, size } = req.query;
    const authHeader = req.headers.authorization;
    let authUserEmail: string | undefined = undefined;
    let authUserId: string | undefined = undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const parsed = verifyAuthToken(authHeader.slice(7));
      if (parsed) {
        authUserEmail = parsed.email?.toLowerCase();
        authUserId = parsed.id;
      }
    }

    const targetEmail = email ? String(email).trim().toLowerCase() : authUserEmail;

    const alert = dbStore.stockArrivalAlerts.find(
      (a) =>
        a.productId === req.params.id &&
        a.status === 'pending' &&
        ((targetEmail && a.email.toLowerCase() === targetEmail) || (authUserId && a.userId === authUserId)) &&
        (!size || !a.selectedSize || a.selectedSize === size)
    );

    return res.json({ alert: alert || null });
  });

  app.delete('/api/restock-alerts/:id', (req, res) => {
    dbStore.stockArrivalAlerts = dbStore.stockArrivalAlerts || [];
    const alert = dbStore.stockArrivalAlerts.find((a) => a.id === req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Restock alert not found.' });
    }
    alert.status = 'cancelled';
    alert.updatedAt = new Date().toISOString();
    saveDatabase(dbStore);
    return res.json({ cancelled: true, message: 'Stock arrival alert cancelled.' });
  });

  app.post('/api/products/:id/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
    const product = dbStore.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const { rating, title, comment, authorLocation, garmentFit } = req.body;
    const numRating = Math.min(5, Math.max(1, Number(rating) || 5));
    if (!comment || String(comment).trim().length < 5) {
      return res.status(400).json({ error: 'Please write a brief review comment (at least 5 characters).' });
    }

    const newReview: Review = {
      id: `rev_${Date.now()}`,
      productId: product.id,
      userId: req.user!.id,
      authorName: req.user!.name,
      authorLocation: String(authorLocation || 'India').trim(),
      rating: numRating,
      title: String(title || 'Verified AHUZA Shopper').trim(),
      comment: String(comment).trim().slice(0, 1000),
      verifiedPurchase: true,
      garmentFit: garmentFit === 'Slightly Relaxed' || garmentFit === 'Tailored Fit' ? garmentFit : 'True to Size',
      createdAt: new Date().toISOString(),
    };

    dbStore.reviews.unshift(newReview);
    const prodReviews = dbStore.reviews.filter((r) => r.productId === product.id);
    product.reviewCount = prodReviews.length;
    product.rating = Number((prodReviews.reduce((s, r) => s + r.rating, 0) / prodReviews.length).toFixed(1));
    saveDatabase(dbStore);

    return res.status(201).json({ review: newReview, product });
  });

  // ============================================================================
  // 3. CART API (/api/cart/*)
  // ============================================================================
  app.get('/api/cart', requireAuth, (req: AuthenticatedRequest, res) => {
    return res.json({ cart: computeCartTotals(req.user!.id) });
  });

  app.post('/api/cart/items', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { productId, size, color, quantity = 1 } = req.body;
    const product = dbStore.products.find((p) => p.id === productId && p.status === 'Published');
    if (!product) {
      return res.status(404).json({ error: 'This product is currently unavailable.' });
    }
    if (product.stock <= 0) {
      return res.status(400).json({ error: 'This product is currently out of stock.' });
    }

    const chosenSize = String(size || product.sizes[0] || 'M');
    const chosenColor = String(color || product.colors[0]?.name || 'Standard');
    const qty = Math.max(1, Math.min(product.stock, Number(quantity) || 1));

    if (!dbStore.carts[userId]) {
      dbStore.carts[userId] = { items: [] };
    }
    const existingItem = dbStore.carts[userId].items.find(
      (i) => i.productId === productId && i.size === chosenSize && i.color === chosenColor
    );

    if (existingItem) {
      existingItem.quantity = Math.min(product.stock, existingItem.quantity + qty);
    } else {
      dbStore.carts[userId].items.push({
        id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        productId,
        size: chosenSize,
        color: chosenColor,
        quantity: qty,
      });
    }

    saveDatabase(dbStore);
    return res.json({ cart: computeCartTotals(userId) });
  });

  app.put('/api/cart/items/:itemId', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { quantity, size, color } = req.body;
    const userCart = dbStore.carts[userId];
    if (!userCart) return res.status(404).json({ error: 'Cart is empty.' });

    const item = userCart.items.find((i) => i.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Cart item not found.' });

    const product = dbStore.products.find((p) => p.id === item.productId);
    if (!product || product.stock <= 0) {
      return res.status(400).json({ error: 'Product is out of stock.' });
    }

    if (quantity !== undefined) {
      const q = Number(quantity);
      if (q <= 0) {
        userCart.items = userCart.items.filter((i) => i.id !== item.id);
      } else {
        item.quantity = Math.min(product.stock, q);
      }
    }
    if (size) item.size = String(size);
    if (color) item.color = String(color);

    saveDatabase(dbStore);
    return res.json({ cart: computeCartTotals(userId) });
  });

  app.delete('/api/cart/items/:itemId', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    if (dbStore.carts[userId]) {
      dbStore.carts[userId].items = dbStore.carts[userId].items.filter((i) => i.id !== req.params.itemId);
      saveDatabase(dbStore);
    }
    return res.json({ cart: computeCartTotals(userId) });
  });

  app.post('/api/cart/apply-coupon', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { code } = req.body;
    if (!dbStore.carts[userId]) {
      dbStore.carts[userId] = { items: [] };
    }
    if (!code || String(code).trim() === '') {
      dbStore.carts[userId].couponCode = undefined;
      saveDatabase(dbStore);
      return res.json({ cart: computeCartTotals(userId) });
    }
    const cleanCode = String(code).trim().toUpperCase();
    const coupon = dbStore.coupons.find((c) => c.code.toUpperCase() === cleanCode && c.isActive);
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid or expired coupon code.' });
    }
    dbStore.carts[userId].couponCode = coupon.code;
    saveDatabase(dbStore);
    return res.json({ cart: computeCartTotals(userId), message: `Coupon ${coupon.code} applied!` });
  });

  // ============================================================================
  // 4. WISHLIST API (/api/wishlist/*)
  // ============================================================================
  app.get('/api/wishlist', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const items = dbStore.wishlists
      .filter((w) => w.userId === userId)
      .map((w) => ({
        ...w,
        product: dbStore.products.find((p) => p.id === w.productId && p.status === 'Published'),
      }))
      .filter((w) => Boolean(w.product));
    return res.json({ items });
  });

  app.post('/api/wishlist/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { productId } = req.body;
    const existingIndex = dbStore.wishlists.findIndex((w) => w.userId === userId && w.productId === productId);
    let action: 'added' | 'removed' = 'added';

    if (existingIndex >= 0) {
      dbStore.wishlists.splice(existingIndex, 1);
      action = 'removed';
    } else {
      dbStore.wishlists.unshift({
        id: `wish_${Date.now()}`,
        userId,
        productId,
        createdAt: new Date().toISOString(),
      });
    }
    saveDatabase(dbStore);

    const items = dbStore.wishlists
      .filter((w) => w.userId === userId)
      .map((w) => ({
        ...w,
        product: dbStore.products.find((p) => p.id === w.productId && p.status === 'Published'),
      }))
      .filter((w) => Boolean(w.product));

    return res.json({ action, items });
  });

  app.post('/api/wishlist/move-to-cart', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { productId, size, color } = req.body;
    const product = dbStore.products.find((p) => p.id === productId && p.status === 'Published');
    if (!product || product.stock <= 0) {
      return res.status(400).json({ error: 'Product is currently out of stock.' });
    }

    // Remove from wishlist
    dbStore.wishlists = dbStore.wishlists.filter((w) => !(w.userId === userId && w.productId === productId));

    // Add to cart
    if (!dbStore.carts[userId]) {
      dbStore.carts[userId] = { items: [] };
    }
    const chosenSize = String(size || product.sizes[0] || 'M');
    const chosenColor = String(color || product.colors[0]?.name || 'Standard');
    const existing = dbStore.carts[userId].items.find(
      (i) => i.productId === productId && i.size === chosenSize && i.color === chosenColor
    );
    if (existing) {
      existing.quantity = Math.min(product.stock, existing.quantity + 1);
    } else {
      dbStore.carts[userId].items.push({
        id: `ci_${Date.now()}`,
        productId,
        size: chosenSize,
        color: chosenColor,
        quantity: 1,
      });
    }

    saveDatabase(dbStore);
    const wishlistItems = dbStore.wishlists
      .filter((w) => w.userId === userId)
      .map((w) => ({
        ...w,
        product: dbStore.products.find((p) => p.id === w.productId && p.status === 'Published'),
      }))
      .filter((w) => Boolean(w.product));

    return res.json({ cart: computeCartTotals(userId), wishlistItems });
  });

  // ============================================================================
  // 5. PAYMENT GATEWAY (RAZORPAY SERVER-SIDE ARCHITECTURE) & CHECKOUT
  // ============================================================================
  const pendingPaymentSessions = new Map<
    string,
    {
      razorpayOrderId: string;
      userId: string;
      amountInr: number;
      shippingAddress: Address;
      paymentMethod: Payment['method'];
      items: CartItem[];
      subtotal: number;
      discount: number;
      shipping: number;
      isDemoMode: boolean;
      expectedDemoSignature: string;
    }
  >();

  app.post('/api/payments/create-order', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { shippingAddress, paymentMethod = 'UPI', directBuyItem } = req.body;

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.line1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      return res.status(400).json({ error: 'Please complete all shipping address fields (Name, Phone, Street, City, State, PIN Code).' });
    }

    let cartSummary = computeCartTotals(user.id);
    if (directBuyItem && directBuyItem.productId) {
      const prod = dbStore.products.find((p) => p.id === directBuyItem.productId && p.status === 'Published');
      if (!prod || prod.stock < (directBuyItem.quantity || 1)) {
        return res.status(400).json({ error: 'Selected item is out of stock. Checkout prevented.' });
      }
      const qty = Math.max(1, Number(directBuyItem.quantity) || 1);
      const mrp = prod.price * qty;
      const selling = prod.discountPrice * qty;
      const threshold1 = dbStore.websiteContent.policies.freeShippingThreshold ?? 999;
      const shipping = selling >= threshold1 ? 0 : 79;
      cartSummary = {
        id: `direct_${user.id}`,
        userId: user.id,
        couponCode: undefined,
        items: [
          {
            id: `ci_direct_${Date.now()}`,
            productId: prod.id,
            size: directBuyItem.size || prod.sizes[0],
            color: directBuyItem.color || prod.colors[0]?.name || 'Standard',
            quantity: qty,
            product: prod,
          },
        ],
        subtotal: mrp,
        productDiscount: mrp - selling,
        couponDiscount: 0,
        shipping,
        grandTotal: selling + shipping,
      };
    }

    if (cartSummary.items.length === 0) {
      return res.status(400).json({ error: 'Your shopping bag is empty.' });
    }

    // Verify stock availability for every item before creating payment order
    for (const item of cartSummary.items) {
      const prod = dbStore.products.find((p) => p.id === item.productId);
      if (!prod || prod.status !== 'Published' || prod.stock < item.quantity) {
        return res.status(400).json({
          error: `"${prod?.name || 'Item'}" does not have sufficient stock (${prod?.stock || 0} left). Checkout prevented.`,
        });
      }
    }

    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const hasLiveRazorpayKeys =
      Boolean(rzpKeyId && rzpKeySecret) &&
      rzpKeyId !== 'rzp_test_placeholder_key_id' &&
      rzpKeySecret !== 'your_razorpay_key_secret_server_only' &&
      process.env.PAYMENT_DEMO_MODE !== 'true';

    let razorpayOrderId = `order_demo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let isDemoMode = true;

    if (hasLiveRazorpayKeys) {
      try {
        const authBasic = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authBasic}`,
          },
          body: JSON.stringify({
            amount: Math.round(cartSummary.grandTotal * 100), // paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
          }),
        });
        if (rzpRes.ok) {
          const rzpOrder = (await rzpRes.json()) as { id: string };
          razorpayOrderId = rzpOrder.id;
          isDemoMode = false;
        }
      } catch (e) {
        console.warn('Falling back to safe Demo Mode payment session:', e);
      }
    }

    const secretUsed = isDemoMode ? SESSION_SECRET : rzpKeySecret!;
    const demoPaymentId = `pay_demo_${Date.now()}`;
    const expectedDemoSignature = crypto
      .createHmac('sha256', secretUsed)
      .update(`${razorpayOrderId}|${demoPaymentId}`)
      .digest('hex');

    pendingPaymentSessions.set(razorpayOrderId, {
      razorpayOrderId,
      userId: user.id,
      amountInr: cartSummary.grandTotal,
      shippingAddress,
      paymentMethod,
      items: cartSummary.items,
      subtotal: cartSummary.subtotal,
      discount: cartSummary.productDiscount + cartSummary.couponDiscount,
      shipping: cartSummary.shipping,
      isDemoMode,
      expectedDemoSignature,
    });

    return res.json({
      razorpayOrderId,
      amount: cartSummary.grandTotal,
      currency: 'INR',
      isDemoMode,
      keyId: isDemoMode ? 'rzp_demo_mode_safe' : rzpKeyId,
      // Provided only in explicit DEMO MODE so the simulated gateway modal can complete the cryptographic verification round-trip
      demoGatewayPayload: isDemoMode
        ? {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: demoPaymentId,
            razorpay_signature: expectedDemoSignature,
          }
        : undefined,
    });
  });

  app.post('/api/payments/verify', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification parameters.' });
    }

    const session = pendingPaymentSessions.get(razorpay_order_id);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({ error: 'Payment session expired or not found.' });
    }

    const secretUsed = session.isDemoMode ? SESSION_SECRET : process.env.RAZORPAY_KEY_SECRET || SESSION_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', secretUsed)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Server-side payment signature verification failed. Order was not marked as paid.' });
    }

    // Deduct stock and create confirmed order
    for (const item of session.items) {
      const prod = dbStore.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        if (prod.stock === 0) {
          prod.status = 'Out of Stock';
        }
      }
    }

    dbStore.orderSequence = (dbStore.orderSequence || dbStore.orders.length) + 1;
    const orderNumber = `AHZ-2026-${String(dbStore.orderSequence).padStart(6, '0')}`;
    const now = new Date().toISOString();
    const estDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber,
      userId: user.id,
      customerName: session.shippingAddress.fullName || user.name,
      customerEmail: user.email,
      customerPhone: session.shippingAddress.phone || user.phone,
      shippingAddress: session.shippingAddress,
      items: session.items.map((i, idx) => ({
        id: `oi_${Date.now()}_${idx}`,
        productId: i.productId,
        productName: i.product?.name || 'AHUZA Garment',
        sku: i.product?.sku || 'AHZ-SKU',
        imageUrl: i.product?.images[0]?.url || '',
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unitPrice: i.product?.discountPrice || 999,
        originalPrice: i.product?.price || 999,
      })),
      subtotal: session.subtotal,
      discount: session.discount,
      shipping: session.shipping,
      totalAmount: session.amountInr,
      status: 'Confirmed',
      payment: {
        id: `pay_${Date.now()}`,
        orderId: orderNumber,
        provider: 'Razorpay',
        method: session.paymentMethod,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: session.amountInr,
        currency: 'INR',
        status: 'Paid',
        isDemoMode: session.isDemoMode,
        verifiedServerSide: true,
        paidAt: now,
      },
      shipment: {
        id: `shp_${Date.now()}`,
        orderId: orderNumber,
        courierName: 'BlueDart Express India',
        trackingNumber: `BD-AHZ-${Math.floor(10000000 + Math.random() * 90000000)}`,
        estimatedDelivery: estDate,
        currentLocation: 'Mumbai Lower Parel Atelier — Ready for Dispatch',
      },
      timeline: [
        { status: 'Pending', timestamp: now, note: 'Order created at checkout' },
        {
          status: 'Paid',
          timestamp: now,
          note: `${session.isDemoMode ? '[DEMO MODE] ' : ''}Payment verified server-side via Razorpay (${session.paymentMethod})`,
        },
        {
          status: 'Confirmed',
          timestamp: now,
          note: 'Order confirmed and queued for quality inspection at Ahuza Studio',
          location: 'Mumbai, Maharashtra',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    dbStore.orders.unshift(newOrder);
    // Clear customer cart
    dbStore.carts[user.id] = { items: [] };

    // Save shipping address to user profile if not present
    if (user.addresses.length === 0) {
      user.addresses.push({ ...session.shippingAddress, id: `addr_${Date.now()}`, isDefault: true });
    }

    // Record privacy-conscious purchase analytics event
    dbStore.analyticsEvents.push({
      id: `ev_pur_${Date.now()}`,
      type: 'purchase',
      sessionId: `sess_${user.id}`,
      isReturningVisitor: true,
      productId: newOrder.items[0]?.productId,
      trafficSource: 'Direct',
      deviceType: 'Desktop',
      region: `${session.shippingAddress.city}, ${session.shippingAddress.state}`,
      landingPage: '/checkout',
      revenueAmount: newOrder.totalAmount,
      timestamp: now,
    });

    pendingPaymentSessions.delete(razorpay_order_id);
    saveDatabase(dbStore);

    return res.status(201).json({ order: newOrder });
  });

  // ============================================================================
  // 5B. DIRECT UPI PAYMENT SYSTEM (NON-GATEWAY / DIRECT MERCHANT VPA ARCHITECTURE)
  // ============================================================================
  const pendingUpiSessions = new Map<
    string,
    {
      internalOrderId: string;
      transactionRef: string;
      userId: string;
      items: CartItem[];
      shippingAddress: Address;
      subtotal: number;
      discount: number;
      shipping: number;
      grandTotal: number;
    }
  >();

  // 1. UPI Configuration (Merchant VPA, Merchant Name, Timings, Support)
  app.get('/api/upi/config', (_req: Request, res: Response) => {
    return res.json({
      merchantUpiId: MERCHANT_CONFIG.merchantUpiId,
      merchantName: MERCHANT_CONFIG.merchantName,
      businessLegalName: MERCHANT_CONFIG.businessLegalName,
      supportPhone: MERCHANT_CONFIG.supportPhone,
      supportEmail: MERCHANT_CONFIG.supportEmail,
      sessionTtlMinutes: MERCHANT_CONFIG.sessionTtlMinutes,
    });
  });

  // 2. Create UPI Payment Session (POST /api/upi/create-payment)
  app.post('/api/upi/create-payment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const {
      shippingAddress,
      directBuyItem,
      selectedUpiApp = 'qr',
      payerUpiId,
    } = req.body;

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.line1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      return res.status(400).json({
        error: 'Please complete all shipping address fields (Name, Phone, Street Address, City, State, PIN Code).',
      });
    }

    // Server-side calculated totals (never trust client-supplied amounts)
    let cartSummary = computeCartTotals(user.id);

    if (directBuyItem && directBuyItem.productId) {
      const prod = dbStore.products.find(
        (p) => p.id === directBuyItem.productId && p.status === 'Published'
      );
      if (!prod || prod.stock < (directBuyItem.quantity || 1)) {
        return res.status(400).json({ error: 'Selected item is out of stock. Checkout prevented.' });
      }
      const qty = Math.max(1, Number(directBuyItem.quantity) || 1);
      const mrp = prod.price * qty;
      const selling = prod.discountPrice * qty;
      const threshold2 = dbStore.websiteContent.policies.freeShippingThreshold ?? 999;
      const shipping = selling >= threshold2 ? 0 : 79;
      cartSummary = {
        id: `direct_${user.id}`,
        userId: user.id,
        couponCode: undefined,
        items: [
          {
            id: `ci_direct_${Date.now()}`,
            productId: prod.id,
            size: directBuyItem.size || prod.sizes[0],
            color: directBuyItem.color || prod.colors[0]?.name || 'Standard',
            quantity: qty,
            product: prod,
          },
        ],
        subtotal: mrp,
        productDiscount: mrp - selling,
        couponDiscount: 0,
        shipping,
        grandTotal: selling + shipping,
      };
    }

    if (cartSummary.items.length === 0) {
      return res.status(400).json({ error: 'Your shopping bag is empty. Please add garments before checking out.' });
    }

    // Verify stock availability on server
    for (const item of cartSummary.items) {
      const prod = dbStore.products.find((p) => p.id === item.productId);
      if (!prod || prod.status !== 'Published' || prod.stock < item.quantity) {
        return res.status(400).json({
          error: `"${prod?.name || 'Item'}" does not have sufficient stock (${prod?.stock || 0} remaining).`,
        });
      }
    }

    try {
      const { paymentRecord, qrCodeDataUrl, deepLinks } = await createUpiPaymentRecord(
        {
          user,
          shippingAddress,
          cartItems: cartSummary.items,
          subtotal: cartSummary.subtotal,
          discount: cartSummary.productDiscount + cartSummary.couponDiscount,
          shipping: cartSummary.shipping,
          grandTotal: cartSummary.grandTotal,
          selectedUpiApp,
          payerUpiId,
        },
        dbStore
      );

      // Cache pending session for server-side verification lookup
      pendingUpiSessions.set(paymentRecord.internalOrderId, {
        internalOrderId: paymentRecord.internalOrderId,
        transactionRef: paymentRecord.transactionRef,
        userId: user.id,
        items: cartSummary.items,
        shippingAddress,
        subtotal: cartSummary.subtotal,
        discount: cartSummary.productDiscount + cartSummary.couponDiscount,
        shipping: cartSummary.shipping,
        grandTotal: cartSummary.grandTotal,
      });

      saveDatabase(dbStore);

      return res.status(201).json({
        internalOrderId: paymentRecord.internalOrderId,
        transactionRef: paymentRecord.transactionRef,
        amount: paymentRecord.amount,
        currency: 'INR',
        merchantUPIId: paymentRecord.merchantUPIId,
        merchantName: paymentRecord.merchantName,
        upiUri: paymentRecord.upiUri,
        qrCodeDataUrl,
        deepLinks,
        expiresAt: paymentRecord.expiresAt,
        createdAt: paymentRecord.createdAt,
        paymentStatus: paymentRecord.paymentStatus,
        sessionTtlMinutes: MERCHANT_CONFIG.sessionTtlMinutes,
      });
    } catch (err: any) {
      console.error('Error creating UPI payment session:', err);
      return res.status(500).json({ error: 'Failed to generate UPI payment request. Please try again.' });
    }
  });

  // 3. Verify UPI Payment (POST /api/upi/verify-payment)
  // Server-authoritative: validates merchant UPI ID, exact amount, transaction reference, not expired,
  // and checks valid 12-digit Bank UTR / RRN without duplicate submissions.
  app.post('/api/upi/verify-payment', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const {
      internalOrderId,
      transactionRef,
      utrNumber,
      payerUpiId,
      selectedUpiApp,
    } = req.body;

    if (!internalOrderId || !transactionRef) {
      return res.status(400).json({ error: 'Missing internal order ID or transaction reference.' });
    }

    if (!utrNumber || typeof utrNumber !== 'string') {
      return res.status(400).json({
        error: 'Please enter the 12-digit Bank UTR / UPI Reference Number from your payment app.',
      });
    }

    const sessionData = pendingUpiSessions.get(internalOrderId);
    const verificationResult = verifyUpiPaymentRecord(
      {
        internalOrderId,
        transactionRef,
        utrNumber,
        payerUpiId,
        selectedUpiApp,
      },
      user,
      dbStore,
      sessionData
    );

    if (!verificationResult.success || !verificationResult.order) {
      return res.status(400).json({
        error: verificationResult.error || 'Payment verification failed on server.',
      });
    }

    // Purchase analytics event
    dbStore.analyticsEvents.push({
      id: `ev_pur_upi_${Date.now()}`,
      type: 'purchase',
      sessionId: `sess_${user.id}`,
      isReturningVisitor: true,
      productId: verificationResult.order.items[0]?.productId,
      trafficSource: 'Direct',
      deviceType: selectedUpiApp === 'qr' ? 'Desktop' : 'Mobile (Android)',
      region: `${verificationResult.order.shippingAddress.city}, ${verificationResult.order.shippingAddress.state}`,
      landingPage: '/checkout',
      revenueAmount: verificationResult.order.totalAmount,
      timestamp: new Date().toISOString(),
    });

    pendingUpiSessions.delete(internalOrderId);
    saveDatabase(dbStore);

    return res.json({
      success: true,
      order: verificationResult.order,
      paymentRecord: verificationResult.paymentRecord,
      message: 'Direct UPI payment verified successfully server-side. Order confirmed.',
    });
  });

  // 4. Cancel Pending UPI Payment Session (POST /api/upi/cancel-payment)
  app.post('/api/upi/cancel-payment', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { internalOrderId, transactionRef } = req.body;

    dbStore.upiPayments = dbStore.upiPayments || [];
    const record = dbStore.upiPayments.find(
      (p) => p.internalOrderId === internalOrderId && p.transactionRef === transactionRef
    );

    if (!record) {
      return res.status(404).json({ error: 'Payment session not found.' });
    }

    if (record.customerId !== user.id && user.role !== 'owner') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (record.paymentStatus === 'SUCCESS') {
      return res.status(400).json({ error: 'Cannot cancel an already completed payment.' });
    }

    record.paymentStatus = 'CANCELLED';
    pendingUpiSessions.delete(internalOrderId);
    saveDatabase(dbStore);

    return res.json({ success: true, message: 'UPI payment session cancelled.' });
  });

  // 5. Check Live Payment Status (GET /api/upi/status/:internalOrderId)
  app.get('/api/upi/status/:internalOrderId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { internalOrderId } = req.params;

    dbStore.upiPayments = dbStore.upiPayments || [];
    const record = dbStore.upiPayments.find((p) => p.internalOrderId === internalOrderId);

    if (!record) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    if (record.customerId !== user.id && user.role !== 'owner') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    // Check expiration
    const now = new Date();
    const isExpired = record.paymentStatus === 'PENDING' && new Date(record.expiresAt).getTime() < now.getTime();
    if (isExpired) {
      record.paymentStatus = 'EXPIRED';
      saveDatabase(dbStore);
    }

    const order = dbStore.orders.find((o) => o.orderNumber === internalOrderId);

    return res.json({
      internalOrderId: record.internalOrderId,
      transactionRef: record.transactionRef,
      paymentStatus: record.paymentStatus,
      orderStatus: record.orderStatus,
      expiresAt: record.expiresAt,
      isExpired,
      order: order || null,
    });
  });

  // 6. Owner/Admin: List All UPI Payments & Reconciliations (GET /api/owner/upi/payments)
  app.get('/api/owner/upi/payments', requireOwner, (_req: AuthenticatedRequest, res: Response) => {
    dbStore.upiPayments = dbStore.upiPayments || [];
    const sorted = [...dbStore.upiPayments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res.json({
      payments: sorted,
      merchantConfig: {
        merchantUpiId: MERCHANT_CONFIG.merchantUpiId,
        merchantName: MERCHANT_CONFIG.merchantName,
        supportPhone: MERCHANT_CONFIG.supportPhone,
      },
    });
  });

  // 7. Owner/Admin: Manual Bank Ledger Reconciliation (POST /api/owner/upi/reconcile)
  app.post('/api/owner/upi/reconcile', requireOwner, (req: AuthenticatedRequest, res: Response) => {
    const { internalOrderId, action, notes } = req.body;

    dbStore.upiPayments = dbStore.upiPayments || [];
    const record = dbStore.upiPayments.find((p) => p.internalOrderId === internalOrderId);

    if (!record) {
      return res.status(404).json({ error: 'UPI payment record not found.' });
    }

    if (action === 'APPROVE') {
      if (record.paymentStatus === 'SUCCESS') {
        return res.status(400).json({ error: 'Payment is already marked as SUCCESS.' });
      }

      record.paymentStatus = 'SUCCESS';
      record.orderStatus = 'Confirmed';
      record.verifiedAt = new Date().toISOString();
      record.verifiedBy = 'admin_manual';
      record.verificationNotes = notes || 'Manually verified by Ahuza Store Owner from Bank Statement.';

      // Check if order exists, or create if missing
      let order = dbStore.orders.find((o) => o.orderNumber === record.internalOrderId);
      if (!order) {
        order = {
          id: `ord_${Date.now()}`,
          orderNumber: record.internalOrderId,
          userId: record.customerId,
          customerName: record.customerName,
          customerEmail: record.customerEmail,
          customerPhone: record.customerPhone,
          shippingAddress: {
            id: `addr_${Date.now()}`,
            label: 'Primary',
            fullName: record.customerName,
            phone: record.customerPhone,
            line1: 'Direct Address',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400013',
            isDefault: true,
          },
          items: [],
          subtotal: record.amount,
          discount: 0,
          shipping: 0,
          totalAmount: record.amount,
          status: 'Confirmed',
          payment: {
            id: record.id,
            orderId: record.internalOrderId,
            provider: 'UPI_DIRECT',
            method: 'UPI',
            amount: record.amount,
            currency: 'INR',
            status: 'Paid',
            isDemoMode: false,
            verifiedServerSide: true,
            paidAt: record.verifiedAt,
            upiRecord: record,
            utrNumber: record.utrNumber,
            merchantUPIId: record.merchantUPIId,
            transactionRef: record.transactionRef,
          },
          shipment: {
            id: `shp_${Date.now()}`,
            orderId: record.internalOrderId,
            courierName: 'BlueDart Express India',
            trackingNumber: `BD-IN-${Math.floor(100000000 + Math.random() * 900000000)}`,
            estimatedDelivery: '4 business days',
            currentLocation: 'Lower Parel Fulfillment Hub, Mumbai',
          },
          timeline: [
            {
              status: 'Pending',
              timestamp: record.createdAt,
              note: `Direct UPI payment initiated for ${record.internalOrderId}.`,
            },
            {
              status: 'Confirmed',
              timestamp: record.verifiedAt,
              note: `Manually verified by Store Owner against Bank Statement (UTR: ${record.utrNumber || 'Reconciled'}).`,
            },
          ],
          createdAt: record.createdAt,
          updatedAt: record.verifiedAt,
        };
        dbStore.orders.unshift(order);
      } else if (order) {
        order.status = 'Confirmed';
        order.payment.status = 'Paid';
        order.payment.paidAt = record.verifiedAt;
      }

      saveDatabase(dbStore);
      return res.json({ success: true, message: 'Payment manually approved and reconciled.', record, order });
    } else if (action === 'REJECT') {
      record.paymentStatus = 'FAILED';
      record.orderStatus = 'Cancelled';
      record.verificationNotes = notes || 'Payment rejected by store owner (bank settlement not received).';
      saveDatabase(dbStore);
      return res.json({ success: true, message: 'Payment marked as FAILED.', record });
    }

    return res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT.' });
  });

  // ============================================================================
  // 5C. GOOGLE APPS SCRIPT WEBHOOK INTEGRATION & DIRECT SKU CHECKOUT (/api/checkout)
  // ============================================================================

  /**
   * Endpoint /api/checkout:
   * Receives frontend order data (customer_email, sku, quantity, optional details)
   * Server-side logic securely forwards order JSON payload with all required fields:
   * - customer_email
   * - order_id
   * - status
   * - is_delayed
   * - estimated_delivery_days
   * - sku
   * - quantity
   * to configured Google Apps Script Web App URL via axios.
   */
  app.post('/api/checkout', async (req: Request, res: Response) => {
    try {
      const {
        customer_email,
        email,
        sku,
        product_sku,
        quantity,
        qty,
        shipping_address,
        address,
        notes,
      } = req.body;

      const cleanEmail = String(customer_email || email || '').trim().toLowerCase();
      const cleanSku = String(sku || product_sku || '').trim().toUpperCase();
      const cleanQty = Math.max(1, parseInt(String(quantity || qty || 1), 10) || 1);

      // Validate customer email
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid customer email address (e.g. customer@example.com).',
        });
      }

      // Validate product SKU
      if (!cleanSku) {
        return res.status(400).json({
          success: false,
          error: 'Product SKU is required.',
        });
      }

      // Lookup product by SKU or ID in Ahuza catalog
      const matchedProduct = dbStore.products.find(
        (p) =>
          (p.sku && p.sku.toUpperCase() === cleanSku) ||
          p.id.toUpperCase() === cleanSku ||
          p.name.toUpperCase().includes(cleanSku)
      );

      const productName = matchedProduct
        ? matchedProduct.name
        : `Ahuza Apparel (${cleanSku})`;
      const unitPrice = matchedProduct
        ? (matchedProduct.discountPrice || matchedProduct.price)
        : 799;
      const totalAmount = unitPrice * cleanQty;

      // Check stock and delay status
      const isDelayed = matchedProduct ? matchedProduct.stock <= 0 : false;
      const estimatedDeliveryDays = isDelayed ? 6 : 3;

      // Generate unique order ID
      dbStore.orderSequence = (dbStore.orderSequence || dbStore.orders.length) + 1;
      const orderId = `AHZ-2026-${String(dbStore.orderSequence).padStart(6, '0')}`;
      const now = new Date().toISOString();

      const resolvedAddress = shipping_address || address || {
        full_name: cleanEmail.split('@')[0],
        phone: '+91 9550582277',
        line1: 'Ahuza Direct Webhook Order',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400013',
      };

      // Construct standard required order payload for Google Apps Script Webhook
      const orderPayload: CheckoutOrderPayload = {
        customer_email: cleanEmail,
        order_id: orderId,
        status: 'CONFIRMED',
        is_delayed: isDelayed,
        estimated_delivery_days: estimatedDeliveryDays,
        sku: cleanSku,
        quantity: cleanQty,
        product_name: productName,
        unit_price: unitPrice,
        total_amount: totalAmount,
        currency: 'INR',
        shipping_address: resolvedAddress,
        created_at: now,
      };

      // Create new Order object to store in Ahuza database
      const newOrder: Order = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        orderNumber: orderId,
        userId: (req as any).user?.id || `guest_${cleanEmail}`,
        customerName: resolvedAddress.full_name || cleanEmail.split('@')[0],
        customerEmail: cleanEmail,
        customerPhone: resolvedAddress.phone || '+91 9550582277',
        items: [
          {
            id: `item_${Date.now()}`,
            productId: matchedProduct?.id || `sku_${cleanSku}`,
            productName,
            sku: cleanSku,
            size: 'M',
            color: matchedProduct?.colors[0]?.name || 'Terracotta Rust',
            quantity: cleanQty,
            unitPrice,
            originalPrice: unitPrice,
            totalPrice: totalAmount,
            imageUrl:
              matchedProduct?.images[0]?.url ||
              'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
          },
        ],
        subtotal: totalAmount,
        discount: 0,
        shipping: 0,
        totalAmount,
        payment: {
          id: `pay_direct_${Date.now()}`,
          orderId,
          provider: 'UPI_DIRECT',
          method: 'UPI',
          razorpayOrderId: `wh_${orderId}`,
          amount: totalAmount,
          currency: 'INR',
          status: 'Paid',
          isDemoMode: false,
          verifiedServerSide: true,
          paidAt: now,
        },
        status: 'Confirmed',
        shipment: {
          id: `ship_${Date.now()}`,
          orderId,
          courierName: 'Blue Dart Express',
          trackingNumber: `BLUEDART-${orderId}`,
          estimatedDelivery: `${estimatedDeliveryDays} business days`,
          currentLocation: 'Mumbai Fulfillment Studio',
          status: 'Pending',
        },
        shippingAddress: {
          id: `addr_${Date.now()}`,
          label: 'Default',
          fullName: resolvedAddress.full_name || cleanEmail.split('@')[0],
          phone: resolvedAddress.phone || '+91 9550582277',
          line1: resolvedAddress.line1 || 'Ahuza Direct Webhook Order',
          city: resolvedAddress.city || 'Mumbai',
          state: resolvedAddress.state || 'Maharashtra',
          postalCode: resolvedAddress.postal_code || resolvedAddress.postalCode || '400013',
          isDefault: true,
        },
        timeline: [
          {
            timestamp: now,
            status: 'Confirmed',
            note: 'Order placed and confirmed via API integration checkout form.',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      // Save order in local database
      dbStore.orders.unshift(newOrder);

      // Decrement product inventory if matched
      if (matchedProduct && matchedProduct.stock > 0) {
        matchedProduct.stock = Math.max(0, matchedProduct.stock - cleanQty);
      }

      // Record analytics
      dbStore.analyticsEvents.push({
        id: `ev_pur_${Date.now()}`,
        type: 'purchase',
        sessionId: `sess_${cleanEmail}`,
        isReturningVisitor: false,
        productId: matchedProduct?.id,
        trafficSource: 'Direct',
        deviceType: 'Desktop',
        region: `${resolvedAddress.city || 'Mumbai'}, ${resolvedAddress.state || 'Maharashtra'}`,
        landingPage: '/checkout',
        revenueAmount: totalAmount,
        timestamp: now,
      });

      // Forward order to Google Apps Script Webhook URL
      const webhookResult = await forwardOrderToGoogleAppsScript(
        orderPayload,
        dbStore.webhookConfig || DEFAULT_WEBHOOK_CONFIG,
        dbStore.webhookLogs
      );

      // Trigger AI-Driven Marketing Automation Pipeline (Intelligent Event Router)
      routeAutomationEvent({
        eventType: 'order.created',
        triggerSource: 'order_checkout',
        order: newOrder,
        allProducts: dbStore.products,
        allOrders: dbStore.orders,
        config: dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG,
        logStore: dbStore.automationLogs,
      }).catch((autoErr) => {
        console.warn('Background marketing automation event notice:', autoErr?.message);
      });

      saveDatabase(dbStore);

      return res.status(201).json({
        success: true,
        order_id: orderId,
        status: 'CONFIRMED',
        is_delayed: isDelayed,
        estimated_delivery_days: estimatedDeliveryDays,
        sku: cleanSku,
        quantity: cleanQty,
        product_name: productName,
        total_amount: totalAmount,
        customer_email: cleanEmail,
        webhook_result: webhookResult,
        order: newOrder,
        message: webhookResult.skipped
          ? `Order ${orderId} confirmed. (Webhook not configured or disabled)`
          : webhookResult.success
          ? `Order ${orderId} confirmed and forwarded to Google Apps Script webhook!`
          : `Order ${orderId} confirmed locally; webhook forward failed: ${webhookResult.error}`,
      });
    } catch (err: any) {
      console.error('Error in /api/checkout:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'An unexpected error occurred processing your checkout.',
      });
    }
  });

  // Admin Webhook Settings & Testing APIs
  app.get('/api/admin/webhook/config', requireAuth, requireOwner, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      config: dbStore.webhookConfig || DEFAULT_WEBHOOK_CONFIG,
      recentLogs: (dbStore.webhookLogs || []).slice(0, 30),
    });
  });

  app.post('/api/admin/webhook/config', requireAuth, requireOwner, (req: Request, res: Response) => {
    const { googleAppsScriptUrl, enabled } = req.body;

    dbStore.webhookConfig = {
      ...(dbStore.webhookConfig || DEFAULT_WEBHOOK_CONFIG),
      googleAppsScriptUrl: typeof googleAppsScriptUrl === 'string' ? googleAppsScriptUrl.trim() : (dbStore.webhookConfig?.googleAppsScriptUrl || ''),
      enabled: typeof enabled === 'boolean' ? enabled : true,
    };

    saveDatabase(dbStore);

    return res.json({
      success: true,
      config: dbStore.webhookConfig,
      message: 'Google Apps Script Web App URL updated successfully.',
    });
  });

  app.post('/api/admin/webhook/test', requireAuth, requireOwner, async (req: Request, res: Response) => {
    const targetUrl =
      (typeof req.body?.url === 'string' && req.body.url.trim()) ||
      dbStore.webhookConfig?.googleAppsScriptUrl ||
      '';

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Please provide or save a Google Apps Script Web App URL before testing.',
      });
    }

    const testResult = await testGoogleAppsScriptWebhook(targetUrl, dbStore.webhookLogs);

    if (dbStore.webhookConfig) {
      dbStore.webhookConfig.lastTestedAt = new Date().toISOString();
      dbStore.webhookConfig.lastTestStatus = testResult.success ? 'SUCCESS' : 'FAILED';
      dbStore.webhookConfig.lastTestMessage = testResult.message;
    }

    saveDatabase(dbStore);

    return res.json({
      success: testResult.success,
      result: testResult,
    });
  });

  app.get('/api/admin/webhook/logs', requireAuth, requireOwner, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      logs: dbStore.webhookLogs || [],
    });
  });

  app.delete('/api/admin/webhook/logs', requireAuth, requireOwner, (_req: Request, res: Response) => {
    dbStore.webhookLogs = [];
    saveDatabase(dbStore);
    return res.json({ success: true, message: 'Webhook logs cleared.' });
  });

  // ============================================================================
  // 5D. AI-DRIVEN MARKETING AUTOMATION & ZAPIER-ALTERNATIVE CONTROLLER
  // ============================================================================

  /**
   * GET /api/automation/status
   * Overview of automation engine status, channel metrics, and recent execution logs
   */
  app.get('/api/automation/status', requireAuth, requireOwner, (_req: Request, res: Response) => {
    const config = dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG;
    const logs = dbStore.automationLogs || [];
    return res.json({
      success: true,
      config,
      totalLogsCount: logs.length,
      recentLogs: logs.slice(0, 30),
      metrics: {
        googleAdsConversions: config.googleAds.syncedConversionsCount,
        gmailAlertsSent: config.gmailAlerts.alertsSentCount,
        socialPostsPublished: config.socialMedia.postsPublishedCount,
        internalAlertsDispatched: config.internalAlerts.alertsCount,
        lastActiveAt: logs[0]?.timestamp || null,
      },
    });
  });

  /**
   * GET /api/automation/config
   * Returns current automation configuration
   */
  app.get('/api/automation/config', requireAuth, requireOwner, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      config: dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG,
    });
  });

  /**
   * POST /api/automation/config
   * Updates automation rules and channel endpoints
   */
  app.post('/api/automation/config', requireAuth, requireOwner, (req: Request, res: Response) => {
    try {
      const existing = dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG;
      const incoming = req.body || {};

      dbStore.automationConfig = {
        ...existing,
        ...incoming,
        googleAds: {
          ...existing.googleAds,
          ...(incoming.googleAds || {}),
        },
        gmailAlerts: {
          ...existing.gmailAlerts,
          ...(incoming.gmailAlerts || {}),
        },
        socialMedia: {
          ...existing.socialMedia,
          ...(incoming.socialMedia || {}),
        },
        internalAlerts: {
          ...existing.internalAlerts,
          ...(incoming.internalAlerts || {}),
        },
        aiMarketingEngine: {
          ...existing.aiMarketingEngine,
          ...(incoming.aiMarketingEngine || {}),
        },
      };

      saveDatabase(dbStore);
      return res.json({
        success: true,
        message: 'Automation settings updated successfully.',
        config: dbStore.automationConfig,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/automation/logs
   * Real-time status logs stream
   */
  app.get('/api/automation/logs', requireAuth, requireOwner, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      logs: dbStore.automationLogs || [],
    });
  });

  /**
   * DELETE /api/automation/logs
   * Clears automation status logs
   */
  app.delete('/api/automation/logs', requireAuth, requireOwner, (_req: Request, res: Response) => {
    dbStore.automationLogs = [];
    saveDatabase(dbStore);
    return res.json({ success: true, message: 'Automation execution logs cleared.' });
  });

  /**
   * [Run Google Ads Campaign Sync]
   * POST /api/automation/google-ads-sync
   * Triggers an API call to sync active ad conversions and audience signals
   */
  app.post('/api/automation/google-ads-sync', requireAuth, requireOwner, async (_req: Request, res: Response) => {
    try {
      const config = dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG;
      const result = await executeGoogleAdsSync(dbStore.orders, config);

      // Create an execution log entry
      const logEntry: AutomationExecutionLog = {
        id: `autolog_ads_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'manual.sync',
        triggerSource: 'admin_dashboard',
        channelResults: [result],
        overallStatus: result.success ? 'SUCCESS' : 'FAILED',
        totalLatencyMs: result.latencyMs,
      };

      dbStore.automationLogs.unshift(logEntry);
      if (dbStore.automationLogs.length > 150) dbStore.automationLogs.pop();
      saveDatabase(dbStore);

      return res.json({
        success: result.success,
        result,
        logEntry,
        message: result.message,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * [Test Order & Email Alert]
   * POST /api/automation/test-email-alert
   * Fires a mock order payload to verify Gmail alerts with AI-generated personalized copy
   */
  app.post('/api/automation/test-email-alert', requireAuth, requireOwner, async (req: Request, res: Response) => {
    try {
      const config = dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG;
      const targetEmail = req.body?.recipientEmail || config.gmailAlerts.alertRecipientEmail || 'nallagondarosy@gmail.com';

      // Pick sample product or custom mock order
      const sampleProd = dbStore.products[0];
      const mockOrder: Partial<Order> = {
        orderNumber: `AHZ-TEST-ALERT-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: req.body?.customerName || 'Ananya Sharma',
        customerEmail: targetEmail,
        totalAmount: req.body?.amount || 1499,
        items: [
          {
            id: `item_mock_${Date.now()}`,
            productId: sampleProd?.id || 'prod-001',
            productName: sampleProd?.name || 'Ahuza Hand-Block Print Everyday Cotton Kurti',
            sku: sampleProd?.sku || 'AHZ-W-KRT-001',
            size: 'M',
            color: 'Terracotta Rust',
            quantity: 1,
            unitPrice: 1499,
            originalPrice: 1499,
            totalPrice: 1499,
            imageUrl: sampleProd?.images[0]?.url || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
          },
        ],
        shippingAddress: {
          id: 'addr_mock',
          label: 'Default',
          fullName: 'Ananya Sharma',
          phone: '+91 98201 12026',
          line1: 'Flat 402, Gulmohar Terrace, Lower Parel',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400013',
          isDefault: true,
        },
        shipment: {
          id: `ship_${Date.now()}`,
          orderId: 'mock',
          courierName: 'Blue Dart Express',
          trackingNumber: 'BLUEDART-TEST-7788',
          estimatedDelivery: '3 business days',
          currentLocation: 'Mumbai Hub',
          status: 'Pending',
        },
      };

      // Generate AI decision layer personalized copy
      const aiDecision = await runAiMarketingDecision({
        order: mockOrder,
        allProducts: dbStore.products,
        config,
        contextNote: 'Admin triggered Gmail alert test with Gemini 3.8 Flash',
      });

      const emailResult = await executeGmailAlert(mockOrder, aiDecision, config, 'test_ping');

      const logEntry: AutomationExecutionLog = {
        id: `autolog_email_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'manual.test_email',
        triggerSource: 'admin_dashboard',
        orderId: mockOrder.orderNumber,
        customerEmail: targetEmail,
        aiDecision,
        channelResults: [emailResult],
        overallStatus: emailResult.success ? 'SUCCESS' : 'FAILED',
        totalLatencyMs: emailResult.latencyMs,
      };

      dbStore.automationLogs.unshift(logEntry);
      if (dbStore.automationLogs.length > 150) dbStore.automationLogs.pop();
      saveDatabase(dbStore);

      return res.json({
        success: emailResult.success,
        result: emailResult,
        aiDecision,
        logEntry,
        message: emailResult.message,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * [Trigger Social Media Auto-Post]
   * POST /api/automation/social-auto-post
   * Sends a promotional update payload to external social endpoints with AI-generated captions
   */
  app.post('/api/automation/social-auto-post', requireAuth, requireOwner, async (req: Request, res: Response) => {
    try {
      const config = dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG;
      const productId = req.body?.productId;
      const selectedProduct = productId
        ? dbStore.products.find((p) => p.id === productId || p.sku === productId) || dbStore.products[0]
        : dbStore.products[Math.floor(Math.random() * dbStore.products.length)] || dbStore.products[0];

      const mockOrder: Partial<Order> = {
        orderNumber: `DROP-${Date.now().toString().slice(-4)}`,
        customerName: 'Ahuza Community',
        customerEmail: 'editorial@ahuzawear.com',
        totalAmount: selectedProduct ? (selectedProduct.discountPrice || selectedProduct.price) : 999,
        items: [
          {
            id: 'item_social',
            productId: selectedProduct?.id || 'prod',
            productName: selectedProduct?.name || 'Ahuza Seasonal Drop',
            sku: selectedProduct?.sku || 'AHZ-DROP-001',
            size: 'Free Size',
            color: selectedProduct?.colors[0]?.name || 'Natural Indigo',
            quantity: 1,
            unitPrice: selectedProduct?.discountPrice || selectedProduct?.price || 999,
            originalPrice: selectedProduct?.price || 1299,
            totalPrice: selectedProduct?.discountPrice || selectedProduct?.price || 999,
            imageUrl: selectedProduct?.images[0]?.url || '',
          },
        ],
      };

      const aiDecision = await runAiMarketingDecision({
        order: mockOrder,
        allProducts: dbStore.products,
        config,
        contextNote: 'Social auto-post drop announcement trigger',
      });

      const socialResult = await executeSocialAutoPost(selectedProduct, aiDecision, config);

      const logEntry: AutomationExecutionLog = {
        id: `autolog_social_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'manual.social_post',
        triggerSource: 'admin_dashboard',
        aiDecision,
        channelResults: [socialResult],
        overallStatus: socialResult.success ? 'SUCCESS' : 'FAILED',
        totalLatencyMs: socialResult.latencyMs,
      };

      dbStore.automationLogs.unshift(logEntry);
      if (dbStore.automationLogs.length > 150) dbStore.automationLogs.pop();
      saveDatabase(dbStore);

      return res.json({
        success: socialResult.success,
        result: socialResult,
        aiDecision,
        logEntry,
        message: socialResult.message,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * [Send Follow-up Alerts]
   * POST /api/automation/send-followup-alerts
   * Initiates scheduled customer engagement alerts
   */
  app.post('/api/automation/send-followup-alerts', requireAuth, requireOwner, async (_req: Request, res: Response) => {
    try {
      const config = dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG;
      const candidateOrders = dbStore.orders.slice(0, 3);

      if (candidateOrders.length === 0) {
        // Fallback to sample mock order
        candidateOrders.push({
          id: 'ord_sample',
          orderNumber: 'AHZ-2026-000001',
          userId: 'usr_sample',
          customerName: 'Ananya Sharma',
          customerEmail: 'ananya@example.com',
          customerPhone: '+91 98201 12026',
          items: [
            {
              id: 'it_1',
              productId: dbStore.products[0]?.id || 'p1',
              productName: dbStore.products[0]?.name || 'Cotton Kurti',
              sku: dbStore.products[0]?.sku || 'AHZ-001',
              size: 'M',
              color: 'Terracotta',
              quantity: 1,
              unitPrice: 799,
              originalPrice: 799,
              totalPrice: 799,
              imageUrl: '',
            },
          ],
          subtotal: 799,
          discount: 0,
          shipping: 0,
          totalAmount: 799,
          payment: {
            id: 'pay_1',
            orderId: 'AHZ-2026-000001',
            provider: 'UPI_DIRECT',
            method: 'UPI',
            amount: 799,
            currency: 'INR',
            status: 'Paid',
            isDemoMode: false,
            verifiedServerSide: true,
            paidAt: new Date().toISOString(),
          },
          status: 'Confirmed',
          shipment: {
            id: 'ship_sample_1',
            orderId: 'AHZ-2026-000001',
            courierName: 'Blue Dart Express',
            trackingNumber: 'BLUEDART-SAMPLE-01',
            estimatedDelivery: '3 business days',
            currentLocation: 'Mumbai Hub',
            status: 'Pending',
          },
          shippingAddress: {
            id: 'addr_1',
            label: 'Home',
            fullName: 'Ananya Sharma',
            phone: '+91 98201 12026',
            line1: 'Lower Parel',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400013',
            isDefault: true,
          },
          timeline: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const results: any[] = [];
      for (const ord of candidateOrders) {
        const aiDecision = await runAiMarketingDecision({
          order: ord,
          allProducts: dbStore.products,
          config,
          contextNote: 'Scheduled customer engagement follow-up trigger',
        });

        const emailRes = await executeGmailAlert(ord, aiDecision, config, 'followup_alert');
        const internalRes = await executeInternalAlert(ord, aiDecision, config);

        const logEntry: AutomationExecutionLog = {
          id: `autolog_flw_${Date.now()}_${ord.orderNumber}`,
          timestamp: new Date().toISOString(),
          eventType: 'manual.followup',
          triggerSource: 'admin_dashboard',
          orderId: ord.orderNumber,
          customerEmail: ord.customerEmail,
          aiDecision,
          channelResults: [emailRes, internalRes],
          overallStatus: 'SUCCESS',
          totalLatencyMs: emailRes.latencyMs + internalRes.latencyMs,
        };

        dbStore.automationLogs.unshift(logEntry);
        results.push({ orderNumber: ord.orderNumber, emailResult: emailRes, internalResult: internalRes, aiDecision });
      }

      if (dbStore.automationLogs.length > 150) {
        dbStore.automationLogs = dbStore.automationLogs.slice(0, 150);
      }
      saveDatabase(dbStore);

      return res.json({
        success: true,
        dispatchedCount: results.length,
        results,
        message: `Successfully initiated ${results.length} scheduled customer engagement & internal alerts.`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * [Run AI Marketing Decision Layer Directly]
   * POST /api/automation/ai-decision
   * Runs Gemini 3.8 Flash decision analysis on an arbitrary order payload
   */
  app.post('/api/automation/ai-decision', requireAuth, requireOwner, async (req: Request, res: Response) => {
    try {
      const config = dbStore.automationConfig || DEFAULT_AUTOMATION_CONFIG;
      const customOrder = req.body?.order || dbStore.orders[0] || {
        orderNumber: 'AHZ-CUSTOM-001',
        customerName: 'Rhea Sen',
        customerEmail: 'rhea@example.com',
        totalAmount: 1799,
        items: [
          {
            productName: dbStore.products[0]?.name || 'Cotton Kurti',
            sku: dbStore.products[0]?.sku || 'AHZ-001',
            unitPrice: 1799,
            quantity: 1,
          },
        ],
      };

      const decision = await runAiMarketingDecision({
        order: customOrder,
        allProducts: dbStore.products,
        config,
        contextNote: req.body?.contextNote || 'Direct owner studio interactive analysis',
      });

      return res.json({
        success: true,
        decision,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    const orders = dbStore.orders.filter((o) => o.userId === req.user!.id);
    return res.json({ orders });
  });

  app.get('/api/orders/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const order = dbStore.orders.find(
      (o) => (o.id === req.params.id || o.orderNumber === req.params.id) && (o.userId === req.user!.id || req.user!.role === 'owner')
    );
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    return res.json({ order });
  });

  // Safe tracking lookup by Order ID for chatbot & customer care
  app.get('/api/orders/lookup/:orderNumber', (req, res) => {
    const cleanOrd = String(req.params.orderNumber).trim().toUpperCase();
    const order = dbStore.orders.find(
      (o) => o.orderNumber.toUpperCase() === cleanOrd || o.id === req.params.orderNumber
    );
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    return res.json({ order });
  });

  app.post('/api/orders/track', (req, res) => {
    const { orderNumber, contact } = req.body;
    if (!orderNumber || !contact) {
      return res.status(400).json({ error: 'Please enter both your Order ID (e.g., AHZ-2026-000001) and registered Email or Mobile.' });
    }
    const cleanOrd = String(orderNumber).trim().toUpperCase();
    const cleanContact = String(contact).trim().toLowerCase();

    const order = dbStore.orders.find((o) => {
      const matchId = o.orderNumber.toUpperCase() === cleanOrd || o.id === orderNumber;
      const matchEmail = o.customerEmail.toLowerCase() === cleanContact;
      const matchPhone =
        o.customerPhone.replace(/\D/g, '').slice(-10) === cleanContact.replace(/\D/g, '').slice(-10) &&
        cleanContact.replace(/\D/g, '').length >= 10;
      return matchId && (matchEmail || matchPhone);
    });

    if (!order) {
      return res.status(404).json({
        error: 'No matching order found. Please verify your Order ID (e.g., AHZ-2026-000001) and registered email/mobile.',
      });
    }

    return res.json({ order });
  });

  app.get('/api/returns', requireAuth, (req: AuthenticatedRequest, res) => {
    const returns = dbStore.returns.filter((r) => r.userId === req.user!.id);
    const refunds = dbStore.refunds.filter((rf) => rf.userId === req.user!.id);
    return res.json({ returns, refunds });
  });

  app.post('/api/returns', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { orderId, type, reason, details, supportingImageUrl } = req.body;
    const order = dbStore.orders.find((o) => (o.id === orderId || o.orderNumber === orderId) && o.userId === user.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (type === 'Cancellation' && ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status)) {
      return res.status(400).json({
        error: 'This order has already been shipped and cannot be cancelled directly. Please initiate a Return once delivered.',
      });
    }

    const now = new Date().toISOString();
    const reqType: 'Return' | 'Cancellation' = type === 'Cancellation' ? 'Cancellation' : 'Return';

    const newReturn: ReturnRequest = {
      id: `ret_${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      type: reqType,
      reason: String(reason || 'Size / Fit Issue').trim(),
      details: String(details || '').trim(),
      supportingImageUrl: supportingImageUrl ? String(supportingImageUrl) : undefined,
      status: 'Requested',
      createdAt: now,
      updatedAt: now,
    };

    const newRefund: Refund = {
      id: `ref_${Date.now()}`,
      returnRequestId: newReturn.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: user.id,
      amount: order.totalAmount,
      status: 'Pending',
      providerConfirmed: false,
      updatedAt: now,
    };
    newReturn.refundId = newRefund.id;

    order.status = reqType === 'Cancellation' ? 'Cancellation Requested' : 'Return Requested';
    order.timeline.push({
      status: order.status,
      timestamp: now,
      note: `Customer submitted ${reqType} request (${newReturn.reason})`,
    });
    order.updatedAt = now;

    dbStore.returns.unshift(newReturn);
    dbStore.refunds.unshift(newRefund);
    saveDatabase(dbStore);

    return res.status(201).json({ returnRequest: newReturn, refund: newRefund, order });
  });

  // Direct Return or Replacement Request from Order Tracking view (with Order ID & Contact)
  app.post('/api/orders/return-request', (req, res) => {
    const { orderNumber, contact, type, reason, details, supportingImageUrl } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }
    const cleanOrd = String(orderNumber).trim().toUpperCase();
    const cleanContact = contact ? String(contact).trim().toLowerCase() : '';

    const order = dbStore.orders.find((o) => {
      const matchId = o.orderNumber.toUpperCase() === cleanOrd || o.id === orderNumber;
      if (!cleanContact) return matchId;
      const matchEmail = o.customerEmail.toLowerCase() === cleanContact;
      const matchPhone =
        o.customerPhone.replace(/\D/g, '').slice(-10) === cleanContact.replace(/\D/g, '').slice(-10);
      return matchId && (matchEmail || matchPhone);
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found for return/replacement request.' });
    }

    const now = new Date().toISOString();
    const reqType = type === 'Replacement' ? 'Replacement' : type === 'Cancellation' ? 'Cancellation' : 'Return';

    const newReturn: ReturnRequest = {
      id: `ret_${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId || 'guest_customer',
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      type: reqType as any,
      reason: String(reason || 'Size Exchange / Fit Preference').trim(),
      details: String(details || '').trim(),
      supportingImageUrl: supportingImageUrl ? String(supportingImageUrl) : undefined,
      status: 'Requested',
      createdAt: now,
      updatedAt: now,
    };

    const newRefund: Refund = {
      id: `ref_${Date.now()}`,
      returnRequestId: newReturn.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId || 'guest_customer',
      amount: order.totalAmount,
      status: 'Pending',
      providerConfirmed: false,
      updatedAt: now,
    };
    newReturn.refundId = newRefund.id;

    order.status = reqType === 'Replacement' ? 'Return Requested' : reqType === 'Cancellation' ? 'Cancellation Requested' : 'Return Requested';
    order.timeline.push({
      status: order.status,
      timestamp: now,
      note: `Customer requested ${reqType}: ${newReturn.reason}. ${details ? `Note: ${details}` : ''}`,
    });
    order.updatedAt = now;

    dbStore.returns.unshift(newReturn);
    if (reqType === 'Return') {
      dbStore.refunds.unshift(newRefund);
    }
    saveDatabase(dbStore);

    return res.status(201).json({
      success: true,
      message: `${reqType} request submitted successfully. Our team will review within 24 hours.`,
      returnRequest: newReturn,
      order,
    });
  });

  // Support Tickets API
  app.post('/api/support/ticket', (req, res) => {
    const { customerName, email, phone, category, orderId, description, details } = req.body;
    const ticketId = `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const newTicket = {
      id: ticketId,
      customerName: String(customerName || 'Customer').trim(),
      email: String(email || 'info@ahuzawear.com').trim(),
      phone: String(phone || '').trim(),
      category: String(category || 'General Issue').trim(),
      orderId: orderId ? String(orderId).trim() : undefined,
      description: String(description || details || 'Customer support issue').trim(),
      status: 'Open',
      createdAt: now,
      updatedAt: now,
    };
    if (!dbStore.supportTickets) {
      dbStore.supportTickets = [];
    }
    dbStore.supportTickets.unshift(newTicket);
    saveDatabase(dbStore);
    return res.status(201).json({
      success: true,
      ticketId,
      message: 'Your request has been submitted successfully.',
      supportHours: '10:00 AM to 9:00 PM IST',
      resolutionCommitment: 'Customer support will reach you within 24 hours of reporting the issue.',
    });
  });

  // Delivery PIN Code Serviceability API
  app.get('/api/delivery/check-pincode', (req, res) => {
    const pin = String(req.query.pincode || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      return res.json({
        serviceable: false,
        status: 'invalid',
        message: 'Please enter a valid 6-digit Indian PIN code (e.g. 400013, 110001, 560001, 500076).',
      });
    }

    const metroPrefixes = ['11', '12', '20', '38', '40', '41', '50', '56', '60', '70', '30'];
    const prefix = pin.substring(0, 2);
    const isMetro = metroPrefixes.includes(prefix);

    return res.json({
      serviceable: true,
      pincode: pin,
      tier: isMetro ? 'Metro / Tier 1' : 'Express Pan-India Network',
      estimatedDays: isMetro ? '2–3 business days' : '3–5 business days',
      courierPartner: 'BlueDart Express & Delhivery',
      codAvailable: true,
      freeShippingThreshold: 999,
      message: `Delivery is available to PIN code ${pin}! Estimated delivery: ${
        isMetro ? '2–3 business days' : '3–5 business days'
      }. Cash on Delivery (COD) and Prepaid options are available.`,
    });
  });

  // ============================================================================
  // 7. UNIFIED AI STYLIST & CUSTOMER SUPPORT CONCIERGE (/api/chat/concierge)
  // ============================================================================
  app.post('/api/chat/concierge', rateLimit(30, 60_000), async (req: AuthenticatedRequest, res) => {
    try {
      const { messages = [], mode = 'auto' } = req.body;
      const currentUser = req.user;

      const userOrders = currentUser
        ? dbStore.orders.filter((o) => o.userId === currentUser.id)
        : [];
      const userReturns = currentUser
        ? dbStore.returns.filter((r) => r.userId === currentUser.id)
        : [];
      const userRefunds = currentUser
        ? dbStore.refunds.filter((rf) => rf.userId === currentUser.id)
        : [];

      const result = await generateConciergeResponse({
        messages: Array.isArray(messages) ? messages : [],
        mode: mode === 'stylist' || mode === 'support' ? mode : 'auto',
        products: dbStore.products,
        websiteContent: dbStore.websiteContent,
        coupons: dbStore.coupons,
        userName: currentUser?.name,
        userOrders,
        userReturns,
        userRefunds,
        allOrders: dbStore.orders,
      });

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Concierge service error',
      });
    }
  });

  // ============================================================================
  // 7b. GEMINI-POWERED INTERACTIVE STYLE FINDER QUIZ API
  // ============================================================================
  app.post('/api/style-finder/recommendations', rateLimit(20, 60_000), async (req: Request, res: Response) => {
    try {
      const { answers } = req.body;
      if (!answers) {
        return res.status(400).json({ error: 'Quiz answers are required.' });
      }

      const result = await generateStyleFinderRecommendations({
        answers,
        products: dbStore.products,
      });

      return res.json(result);
    } catch (error) {
      console.error('Style Finder API Error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Unable to generate style recommendations.',
      });
    }
  });

  // ============================================================================
  // 8. WEBSITE CONTENT & PUBLIC ANALYTICS EVENT API
  // ============================================================================
  app.get('/api/content', (req: AuthenticatedRequest, res) => {
    const previewMode = req.query.preview === 'true' && req.user?.role === 'owner';
    return res.json({
      content: previewMode ? dbStore.draftWebsiteContent : dbStore.websiteContent,
      categories: dbStore.categories,
    });
  });

  app.put('/api/content', (req, res) => {
    const { content } = req.body;
    const now = new Date().toISOString();
    if (content && typeof content === 'object') {
      dbStore.websiteContent = {
        ...dbStore.websiteContent,
        ...content,
        isPublished: true,
        updatedAt: now,
      };
      dbStore.draftWebsiteContent = {
        ...dbStore.draftWebsiteContent,
        ...content,
        isPublished: true,
        updatedAt: now,
      };
      saveDatabase(dbStore);
    }
    return res.json({ success: true, content: dbStore.websiteContent });
  });

  app.post('/api/analytics/event', (req, res) => {
    const { type, productId, searchQuery, landingPage, deviceType } = req.body;
    const allowedTypes: AnalyticsEvent['type'][] = [
      'page_view',
      'product_view',
      'add_to_cart',
      'wishlist_add',
      'checkout_start',
      'purchase',
      'search',
    ];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }
    dbStore.analyticsEvents.push({
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      sessionId: `sess_${Date.now()}`,
      isReturningVisitor: true,
      productId: productId ? String(productId) : undefined,
      searchQuery: searchQuery ? String(searchQuery).slice(0, 80) : undefined,
      trafficSource: 'Direct',
      deviceType: deviceType || 'Desktop',
      region: 'India',
      landingPage: String(landingPage || '/'),
      timestamp: new Date().toISOString(),
    });
    return res.status(201).json({ recorded: true });
  });

  // ============================================================================
  // 9. PROTECTED OWNER STUDIO API (/api/owner/*)
  // ============================================================================
  app.use('/api/owner', requireOwner);

  app.get('/api/owner/overview', (_req, res) => {
    const totalRevenue = dbStore.orders
      .filter((o) => !['Cancelled', 'Refunded'].includes(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const publishedProducts = dbStore.products.filter((p) => p.status === 'Published').length;
    const draftOrUnpublished = dbStore.products.length - publishedProducts;
    const pendingReturns = dbStore.returns.filter((r) => r.status === 'Requested').length;

    return res.json({
      totalRevenue,
      totalOrders: dbStore.orders.length,
      publishedProducts,
      draftOrUnpublished,
      totalCustomers: dbStore.users.filter((u) => u.role === 'customer').length,
      pendingReturns,
      recentOrders: dbStore.orders.slice(0, 6),
    });
  });

  // Owner Product Management (with strict ₹2,000 INR validation)
  app.get('/api/owner/products', (_req, res) => {
    return res.json({ products: dbStore.products, maxAllowedPrice: MAX_ALLOWED_PRICE_INR });
  });

  app.post('/api/owner/products', (req, res) => {
    const body = req.body;
    const priceError = validateProductPriceServerSide(body.price, body.discountPrice);
    if (priceError) {
      return res.status(400).json({ error: priceError });
    }
    if (!body.name || !body.sku) {
      return res.status(400).json({ error: 'Product name and SKU are required.' });
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name: String(body.name).trim(),
      sku: String(body.sku).trim().toUpperCase(),
      categories: Array.isArray(body.categories) && body.categories.length > 0 ? body.categories : ['Everyday Wear'],
      gender: body.gender === 'men' || body.gender === 'unisex' ? body.gender : 'women',
      description: String(body.description || 'Crafted in breathable Indian cotton by AHUZA.').trim(),
      fabric: String(body.fabric || '100% Pure Combed Cotton').trim(),
      careInstructions: String(body.careInstructions || 'Gentle machine wash cold.').trim(),
      colors:
        Array.isArray(body.colors) && body.colors.length > 0
          ? body.colors
          : [{ name: 'Signature Terracotta', hex: '#9A3412' }],
      sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : ['S', 'M', 'L', 'XL'],
      sizeChart: INITIAL_PRODUCTS[0].sizeChart,
      images:
        Array.isArray(body.images) && body.images.length > 0
          ? body.images
          : [
              {
                id: `img_${Date.now()}`,
                url: body.imageUrl || INITIAL_PRODUCTS[0].images[0].url,
                alt: String(body.name),
                angleLabel: 'Studio Front',
                isPrimary: true,
              },
            ],
      videoUrl: body.videoUrl ? String(body.videoUrl) : undefined,
      price: Number(body.price),
      discountPrice: Number(body.discountPrice || body.price),
      stock: Math.max(0, Number(body.stock ?? 25)),
      status: (['Draft', 'Published', 'Unpublished', 'Out of Stock'].includes(body.status)
        ? body.status
        : 'Draft') as ProductStatus,
      isFeatured: Boolean(body.isFeatured),
      isNewArrival: Boolean(body.isNewArrival),
      isBestSeller: Boolean(body.isBestSeller),
      searchKeywords: Array.isArray(body.searchKeywords)
        ? body.searchKeywords
        : String(body.searchKeywords || body.name)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
      seoTitle: String(body.seoTitle || `${body.name} | AHUZA`),
      seoDescription: String(body.seoDescription || body.description || ''),
      drapeType: body.drapeType || (body.gender === 'men' ? 'mens_kurta' : 'kurti'),
      deliveryEstimateDays: '3–5 business days across India',
      returnWindowDays: 14,
      rating: 5.0,
      reviewCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.products.unshift(newProduct);
    saveDatabase(dbStore);
    return res.status(201).json({ product: newProduct });
  });

  app.put('/api/owner/products/:id', (req, res) => {
    const product = dbStore.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const body = req.body;
    const targetPrice = body.price !== undefined ? body.price : product.price;
    const targetDiscount = body.discountPrice !== undefined ? body.discountPrice : product.discountPrice;
    const previousDiscountPrice = product.discountPrice;
    const previousPrice = product.price;
    const priceError = validateProductPriceServerSide(targetPrice, targetDiscount);
    if (priceError) {
      return res.status(400).json({ error: priceError });
    }

    if (body.name !== undefined) product.name = String(body.name).trim();
    if (body.sku !== undefined) product.sku = String(body.sku).trim().toUpperCase();
    if (Array.isArray(body.categories)) product.categories = body.categories;
    if (body.gender) product.gender = body.gender;
    if (body.description !== undefined) product.description = String(body.description);
    if (body.fabric !== undefined) product.fabric = String(body.fabric);
    if (body.price !== undefined) product.price = Number(body.price);
    if (body.discountPrice !== undefined) product.discountPrice = Number(body.discountPrice);
    if (body.stock !== undefined) product.stock = Math.max(0, Number(body.stock));
    if (body.status) product.status = body.status;
    if (body.isFeatured !== undefined) product.isFeatured = Boolean(body.isFeatured);
    if (body.isNewArrival !== undefined) product.isNewArrival = Boolean(body.isNewArrival);
    if (body.isBestSeller !== undefined) product.isBestSeller = Boolean(body.isBestSeller);
    if (Array.isArray(body.sizes)) product.sizes = body.sizes;
    if (Array.isArray(body.colors)) product.colors = body.colors;
    if (Array.isArray(body.images) && body.images.length > 0) product.images = body.images;
    if (body.imageUrl && (!body.images || body.images.length === 0)) {
      product.images = [
        {
          id: `img_${Date.now()}`,
          url: String(body.imageUrl),
          alt: product.name,
          angleLabel: 'Primary View',
          isPrimary: true,
        },
        ...product.images.slice(1),
      ];
    }
    if (body.videoUrl !== undefined) product.videoUrl = body.videoUrl || undefined;
    if (body.seoTitle !== undefined) product.seoTitle = String(body.seoTitle);
    if (body.seoDescription !== undefined) product.seoDescription = String(body.seoDescription);
    if (body.drapeType) product.drapeType = body.drapeType;

    product.updatedAt = new Date().toISOString();
    saveDatabase(dbStore);
    return res.json({ product });
  });

  app.patch('/api/owner/products/:id/status', (req, res) => {
    const product = dbStore.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const { status } = req.body;
    if (!['Draft', 'Published', 'Unpublished', 'Out of Stock'].includes(status)) {
      return res.status(400).json({ error: 'Invalid product status.' });
    }
    if (status === 'Published') {
      const priceError = validateProductPriceServerSide(product.price, product.discountPrice);
      if (priceError) {
        return res.status(400).json({ error: priceError });
      }
    }
    product.status = status as ProductStatus;
    product.updatedAt = new Date().toISOString();
    saveDatabase(dbStore);
    return res.json({ product });
  });

  app.post('/api/owner/products/:id/duplicate', (req, res) => {
    const source = dbStore.products.find((p) => p.id === req.params.id);
    if (!source) return res.status(404).json({ error: 'Product not found.' });

    const now = new Date().toISOString();
    const copy: Product = {
      ...JSON.parse(JSON.stringify(source)),
      id: `prod_${Date.now()}`,
      name: `${source.name} (Copy)`,
      sku: `${source.sku}-COPY`,
      status: 'Draft',
      createdAt: now,
      updatedAt: now,
    };
    dbStore.products.unshift(copy);
    saveDatabase(dbStore);
    return res.status(201).json({ product: copy });
  });

  app.delete('/api/owner/products/:id', (req, res) => {
    dbStore.products = dbStore.products.filter((p) => p.id !== req.params.id);
    saveDatabase(dbStore);
    return res.json({ deleted: true });
  });

  // Owner Categories
  app.get('/api/owner/categories', (_req, res) => {
    return res.json({ categories: dbStore.categories });
  });

  app.post('/api/owner/categories', (req, res) => {
    const { name, gender, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const slug = String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name: String(name).trim(),
      slug,
      gender: gender === 'men' || gender === 'all' ? gender : 'women',
      description: String(description || '').trim(),
    };
    dbStore.categories.push(newCat);
    saveDatabase(dbStore);
    return res.status(201).json({ category: newCat });
  });

  app.delete('/api/owner/categories/:id', (req, res) => {
    dbStore.categories = dbStore.categories.filter((c) => c.id !== req.params.id);
    saveDatabase(dbStore);
    return res.json({ deleted: true });
  });

  // Owner Orders
  app.get('/api/owner/orders', (_req, res) => {
    return res.json({ orders: dbStore.orders });
  });

  app.patch('/api/owner/orders/:id/status', (req, res) => {
    const order = dbStore.orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const { status, note, trackingNumber, courierName } = req.body;
    const now = new Date().toISOString();
    order.status = status as OrderStatus;
    if (trackingNumber) order.shipment.trackingNumber = String(trackingNumber);
    if (courierName) order.shipment.courierName = String(courierName);
    order.timeline.push({
      status: order.status,
      timestamp: now,
      note: String(note || `Order status updated to ${status} by Owner Studio`),
    });
    order.updatedAt = now;
    saveDatabase(dbStore);
    return res.json({ order });
  });

  // Owner Customers (Sanitized — never exposes passwords, tokens, or payment secrets)
  app.get('/api/owner/customers', (_req, res) => {
    const customers = dbStore.users
      .filter((u) => u.role === 'customer')
      .map((u) => {
        const custOrders = dbStore.orders.filter((o) => o.userId === u.id);
        const totalValue = custOrders.reduce((s, o) => s + o.totalAmount, 0);
        const wishlistCount = dbStore.wishlists.filter((w) => w.userId === u.id).length;
        const returnsCount = dbStore.returns.filter((r) => r.userId === u.id).length;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          orderCount: custOrders.length,
          totalOrderValue: totalValue,
          orders: custOrders.map((o) => ({
            orderNumber: o.orderNumber,
            totalAmount: o.totalAmount,
            status: o.status,
            createdAt: o.createdAt,
          })),
          wishlistCount,
          returnsCount,
          createdAt: u.createdAt,
        };
      });
    return res.json({ customers });
  });

  // Owner Returns & Refunds
  app.get('/api/owner/returns', (_req, res) => {
    return res.json({ returns: dbStore.returns, refunds: dbStore.refunds });
  });

  app.patch('/api/owner/returns/:id', (req, res) => {
    const ret = dbStore.returns.find((r) => r.id === req.params.id);
    if (!ret) return res.status(404).json({ error: 'Return request not found.' });

    const { status, ownerNote } = req.body;
    const now = new Date().toISOString();
    if (status) ret.status = status;
    if (ownerNote !== undefined) ret.ownerNote = String(ownerNote);
    ret.updatedAt = now;

    const order = dbStore.orders.find((o) => o.id === ret.orderId);
    if (order) {
      if (status === 'Approved') {
        order.status = ret.type === 'Cancellation' ? 'Cancelled' : 'Return Approved';
      } else if (status === 'Return Received') {
        order.status = 'Refund Processing';
      }
      order.timeline.push({
        status: order.status,
        timestamp: now,
        note: `Return/Cancellation request marked "${status}" (${ownerNote || 'Owner Studio'})`,
      });
      order.updatedAt = now;
    }

    saveDatabase(dbStore);
    return res.json({ returnRequest: ret, refunds: dbStore.refunds });
  });

  app.patch('/api/owner/refunds/:id', (req, res) => {
    const refund = dbStore.refunds.find((rf) => rf.id === req.params.id);
    if (!refund) return res.status(404).json({ error: 'Refund record not found.' });

    const { status, providerReference, providerConfirmed } = req.body;
    if (status === 'Completed' && !providerConfirmed) {
      return res.status(400).json({
        error:
          'Do not mark a refund as Completed unless the payment/refund provider (Razorpay) confirms settlement. Check "Provider Settlement Confirmed" to proceed.',
      });
    }

    const now = new Date().toISOString();
    if (status) refund.status = status as RefundStatus;
    if (providerReference !== undefined) refund.providerReference = String(providerReference);
    if (providerConfirmed !== undefined) refund.providerConfirmed = Boolean(providerConfirmed);
    refund.updatedAt = now;

    const order = dbStore.orders.find((o) => o.id === refund.orderId);
    if (order && refund.status === 'Completed' && refund.providerConfirmed) {
      order.status = 'Refunded';
      order.payment.status = 'Refunded';
      order.timeline.push({
        status: 'Refunded',
        timestamp: now,
        note: `Refund of ₹${refund.amount} confirmed by payment provider (Ref: ${refund.providerReference || 'RZP-SETTLED'})`,
      });
      order.updatedAt = now;
    }

    saveDatabase(dbStore);
    return res.json({ refund });
  });

  // Owner Website Content Editor & Logo Management
  app.get('/api/owner/content', (_req, res) => {
    return res.json({
      publishedContent: dbStore.websiteContent,
      draftContent: dbStore.draftWebsiteContent,
      coupons: dbStore.coupons,
    });
  });

  app.put('/api/owner/content', (req, res) => {
    const { content, action } = req.body;
    const now = new Date().toISOString();
    if (content) {
      dbStore.draftWebsiteContent = {
        ...dbStore.draftWebsiteContent,
        ...content,
        updatedAt: now,
      };
    }

    if (action === 'publish') {
      dbStore.websiteContent = {
        ...JSON.parse(JSON.stringify(dbStore.draftWebsiteContent)),
        isPublished: true,
        updatedAt: now,
      };
    } else if (action === 'unpublish') {
      dbStore.websiteContent.isPublished = false;
      dbStore.draftWebsiteContent.isPublished = false;
    }

    saveDatabase(dbStore);
    return res.json({
      publishedContent: dbStore.websiteContent,
      draftContent: dbStore.draftWebsiteContent,
    });
  });

  app.post('/api/owner/logo', (req, res) => {
    const { logoUrl, action } = req.body;
    const now = new Date().toISOString();
    if (action === 'preview') {
      dbStore.draftWebsiteContent.logoPreviewUrl = String(logoUrl || '');
    } else if (action === 'publish') {
      const nextLogo = String(logoUrl ?? dbStore.draftWebsiteContent.logoPreviewUrl ?? '');
      dbStore.websiteContent.logoUrl = nextLogo;
      dbStore.draftWebsiteContent.logoUrl = nextLogo;
      dbStore.draftWebsiteContent.logoPreviewUrl = nextLogo;
      dbStore.websiteContent.updatedAt = now;
    } else if (action === 'remove') {
      dbStore.websiteContent.logoUrl = '';
      dbStore.draftWebsiteContent.logoUrl = '';
      dbStore.draftWebsiteContent.logoPreviewUrl = '';
      dbStore.websiteContent.updatedAt = now;
    }
    saveDatabase(dbStore);
    return res.json({
      publishedContent: dbStore.websiteContent,
      draftContent: dbStore.draftWebsiteContent,
    });
  });

  // Owner Coupons
  app.post('/api/owner/coupons', (req, res) => {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount } = req.body;
    if (!code || !discountValue) return res.status(400).json({ error: 'Coupon code and value are required.' });
    const newCoupon: Coupon = {
      id: `cpn_${Date.now()}`,
      code: String(code).trim().toUpperCase(),
      description: String(description || '').trim(),
      discountType: discountType === 'flat' ? 'flat' : 'percentage',
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount || 499),
      maxDiscountAmount: Number(maxDiscountAmount || 300),
      isActive: true,
      usageCount: 0,
    };
    dbStore.coupons.unshift(newCoupon);
    saveDatabase(dbStore);
    return res.status(201).json({ coupons: dbStore.coupons });
  });

  app.delete('/api/owner/coupons/:id', (req, res) => {
    dbStore.coupons = dbStore.coupons.filter((c) => c.id !== req.params.id);
    saveDatabase(dbStore);
    return res.json({ coupons: dbStore.coupons });
  });

  // Owner Analytics & Marketing Funnel Dashboard
  app.get('/api/owner/analytics', (req, res) => {
    const { range = '30d', startDate, endDate } = req.query;
    const now = Date.now();
    let fromMs = now - 30 * 24 * 60 * 60 * 1000;
    let toMs = now;

    if (range === 'today') {
      fromMs = now - 24 * 60 * 60 * 1000;
    } else if (range === '7d') {
      fromMs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (range === '90d') {
      fromMs = now - 90 * 24 * 60 * 60 * 1000;
    } else if (range === 'custom' && startDate) {
      fromMs = new Date(String(startDate)).getTime();
      if (endDate) toMs = new Date(String(endDate)).getTime() + 24 * 60 * 60 * 1000;
    }

    const filteredEvents = dbStore.analyticsEvents.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= fromMs && t <= toMs;
    });

    const pageViews = filteredEvents.filter((e) => e.type === 'page_view');
    const uniqueSessions = new Set(filteredEvents.map((e) => e.sessionId));
    const returningSessions = new Set(
      filteredEvents.filter((e) => e.isReturningVisitor).map((e) => e.sessionId)
    );

    const totalVisitors = Math.max(pageViews.length, uniqueSessions.size, 1);
    const uniqueVisitors = Math.max(uniqueSessions.size, 1);
    const returningVisitors = returningSessions.size;
    const newVisitors = Math.max(0, uniqueVisitors - returningVisitors);

    const productViews = filteredEvents.filter((e) => e.type === 'product_view').length;
    const addToCarts = filteredEvents.filter((e) => e.type === 'add_to_cart').length;
    const checkoutStarts = filteredEvents.filter((e) => e.type === 'checkout_start').length;
    const purchases = filteredEvents.filter((e) => e.type === 'purchase');
    const wishlistAdditions = filteredEvents.filter((e) => e.type === 'wishlist_add').length;

    const purchaseCount = Math.max(purchases.length, dbStore.orders.length);
    const revenueFromEvents = purchases.reduce((s, e) => s + (e.revenueAmount || 999), 0);
    const totalOrdersRevenue = dbStore.orders.reduce((s, o) => s + o.totalAmount, 0);
    const revenue = Math.max(revenueFromEvents, totalOrdersRevenue);
    const averageOrderValue = purchaseCount > 0 ? Math.round(revenue / purchaseCount) : 0;

    const addToCartRate = productViews > 0 ? Number(((addToCarts / productViews) * 100).toFixed(1)) : 0;
    const cartAbandonmentRate =
      addToCarts > 0 ? Number((Math.max(0, ((addToCarts - purchaseCount) / addToCarts) * 100)).toFixed(1)) : 0;
    const conversionRate = totalVisitors > 0 ? Number(((purchaseCount / totalVisitors) * 100).toFixed(2)) : 0;

    const cancelledOrders = dbStore.orders.filter((o) => o.status === 'Cancelled' || o.status === 'Cancellation Requested').length;
    const returnedOrders = dbStore.returns.filter((r) => r.type === 'Return').length;
    const cancellationRate = dbStore.orders.length > 0 ? Number(((cancelledOrders / dbStore.orders.length) * 100).toFixed(1)) : 0;
    const returnRate = dbStore.orders.length > 0 ? Number(((returnedOrders / dbStore.orders.length) * 100).toFixed(1)) : 0;
    const refundAmount = dbStore.refunds.reduce((s, rf) => s + rf.amount, 0);

    // Top Viewed Products
    const prodViewCounts = new Map<string, number>();
    for (const ev of filteredEvents) {
      if (ev.type === 'product_view' && ev.productId) {
        prodViewCounts.set(ev.productId, (prodViewCounts.get(ev.productId) || 0) + 1);
      }
    }
    const topProducts = dbStore.products
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.discountPrice,
        views: prodViewCounts.get(p.id) || 12,
        conversions: Math.max(1, Math.round((prodViewCounts.get(p.id) || 12) * 0.14)),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);

    // Traffic Sources
    const sourceMap = new Map<string, number>();
    for (const ev of pageViews) {
      sourceMap.set(ev.trafficSource, (sourceMap.get(ev.trafficSource) || 0) + 1);
    }
    const trafficSources = Array.from(sourceMap.entries()).map(([source, count]) => ({
      source,
      visitors: count,
      percentage: Number(((count / Math.max(1, pageViews.length)) * 100).toFixed(1)),
    }));

    // Device breakdown
    const deviceMap = new Map<string, number>();
    for (const ev of pageViews) {
      deviceMap.set(ev.deviceType, (deviceMap.get(ev.deviceType) || 0) + 1);
    }
    const devices = Array.from(deviceMap.entries()).map(([device, count]) => ({
      device,
      count,
      percentage: Number(((count / Math.max(1, pageViews.length)) * 100).toFixed(1)),
    }));

    // Aggregate Regional Breakdown
    const regionMap = new Map<string, number>();
    for (const ev of pageViews) {
      regionMap.set(ev.region, (regionMap.get(ev.region) || 0) + 1);
    }
    const regions = Array.from(regionMap.entries())
      .map(([region, visitors]) => ({ region, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 6);

    // Top Search Queries
    const queryMap = new Map<string, number>();
    for (const ev of filteredEvents) {
      if (ev.type === 'search' && ev.searchQuery) {
        queryMap.set(ev.searchQuery, (queryMap.get(ev.searchQuery) || 0) + 1);
      }
    }
    const topSearchQueries = Array.from(queryMap.entries())
      .map(([queryText, count]) => ({ query: queryText, count }))
      .sort((a, b) => b.count - a.count);

    // Daily time-series chart data (last 14 buckets in range)
    const dailyMap = new Map<string, { date: string; visitors: number; orders: number; revenue: number }>();
    for (const ev of filteredEvents) {
      const dayKey = ev.timestamp.slice(0, 10);
      const current = dailyMap.get(dayKey) || { date: dayKey, visitors: 0, orders: 0, revenue: 0 };
      if (ev.type === 'page_view') current.visitors += 1;
      if (ev.type === 'purchase') {
        current.orders += 1;
        current.revenue += ev.revenueAmount || 999;
      }
      dailyMap.set(dayKey, current);
    }
    const dailySeries = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    // Marketing Funnel: Visitors -> Product Views -> Add to Cart -> Checkout -> Purchase
    const funnel = [
      { stage: 'Visitors', count: totalVisitors, rateFromPrevious: 100, overallConversion: 100 },
      {
        stage: 'Product Views',
        count: productViews,
        rateFromPrevious: Number(((productViews / totalVisitors) * 100).toFixed(1)),
        overallConversion: Number(((productViews / totalVisitors) * 100).toFixed(1)),
      },
      {
        stage: 'Add to Cart',
        count: addToCarts,
        rateFromPrevious: productViews > 0 ? Number(((addToCarts / productViews) * 100).toFixed(1)) : 0,
        overallConversion: Number(((addToCarts / totalVisitors) * 100).toFixed(1)),
      },
      {
        stage: 'Checkout',
        count: checkoutStarts,
        rateFromPrevious: addToCarts > 0 ? Number(((checkoutStarts / addToCarts) * 100).toFixed(1)) : 0,
        overallConversion: Number(((checkoutStarts / totalVisitors) * 100).toFixed(1)),
      },
      {
        stage: 'Purchase',
        count: purchaseCount,
        rateFromPrevious: checkoutStarts > 0 ? Number(((purchaseCount / checkoutStarts) * 100).toFixed(1)) : 0,
        overallConversion: Number(((purchaseCount / totalVisitors) * 100).toFixed(1)),
      },
    ];

    return res.json({
      summary: {
        totalVisitors,
        uniqueVisitors,
        returningVisitors,
        newVisitors,
        productViews,
        addToCartRate,
        cartAbandonmentRate,
        checkoutStarts,
        successfulPurchases: purchaseCount,
        conversionRate,
        revenue,
        averageOrderValue,
        ordersCount: dbStore.orders.length,
        cancellationRate,
        returnRate,
        refundAmount,
        wishlistAdditions,
      },
      topProducts,
      trafficSources,
      devices,
      regions,
      topSearchQueries,
      dailySeries,
      funnel,
    });
  });

  // ============================================================================
  // VITE MIDDLEWARE (DEVELOPMENT) OR STATIC DIST (PRODUCTION)
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AHUZA Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
