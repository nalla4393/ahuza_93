export type UserRole = 'customer' | 'owner';

export type ProductStatus = 'Draft' | 'Published' | 'Unpublished' | 'Out of Stock';

export type OrderStatus =
  | 'Pending'
  | 'Payment Processing'
  | 'Paid'
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancellation Requested'
  | 'Cancelled'
  | 'Return Requested'
  | 'Return Approved'
  | 'Return Picked Up'
  | 'Refund Processing'
  | 'Refunded';

export type RefundStatus = 'Pending' | 'Approved' | 'Processing' | 'Completed' | 'Rejected';

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  emailVerified: boolean;
  addresses: Address[];
  recentlyViewedProductIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SizeChartRow {
  size: string;
  bustOrChestInches: string;
  waistInches: string;
  hipInches: string;
  lengthInches: string;
  shoulderInches: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  angleLabel: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categories: string[];
  gender: 'women' | 'men' | 'unisex';
  description: string;
  fabric: string;
  careInstructions: string;
  colors: { name: string; hex: string }[];
  sizes: string[];
  sizeChart: SizeChartRow[];
  images: ProductImage[];
  videoUrl?: string;
  price: number; // Strictly <= 2000 INR
  discountPrice: number; // Strictly <= 2000 INR
  stock: number;
  status: ProductStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  searchKeywords: string[];
  seoTitle: string;
  seoDescription: string;
  drapeType: 'kurti' | 'frock' | 'kurta_dupatta' | 'lehenga' | 'night_suit' | 'track_suit' | 'mens_kurta';
  deliveryEstimateDays: string;
  returnWindowDays: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender: 'women' | 'men' | 'all';
  description: string;
  productCount?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
  product?: Product;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  couponCode?: string;
  subtotal: number;
  productDiscount: number;
  couponDiscount: number;
  shipping: number;
  grandTotal: number;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product?: Product;
}

export interface PriceDropAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  email: string;
  userId?: string;
  currentPrice: number;
  targetPrice: number;
  preference?: 'any_drop' | 'below_target';
  status: 'active' | 'triggered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  triggeredAt?: string;
}

export interface StockArrivalAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  gender: 'men' | 'women' | 'unisex';
  selectedSize?: string;
  selectedColor?: string;
  email: string;
  phone?: string;
  userId?: string;
  status: 'pending' | 'notified' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  note: string;
  location?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  totalPrice?: number;
}

export type UpiPaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export interface UpiPaymentRecord {
  id: string;
  internalOrderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  currency: 'INR';
  merchantUPIId: string;
  merchantName: string;
  transactionRef: string;
  upiUri: string;
  paymentStatus: UpiPaymentStatus;
  orderStatus: OrderStatus;
  selectedUpiApp?: string;
  payerUpiId?: string;
  utrNumber?: string;
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string;
  verifiedBy?: 'system_reconciliation' | 'admin_manual';
  verificationNotes?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: 'UPI_DIRECT' | 'Razorpay';
  method: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Wallet';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: 'INR';
  status: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  isDemoMode: boolean;
  verifiedServerSide: boolean;
  paidAt?: string;
  upiRecord?: UpiPaymentRecord;
  utrNumber?: string;
  merchantUPIId?: string;
  transactionRef?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  courierName: string;
  trackingNumber: string;
  estimatedDelivery: string;
  currentLocation: string;
  status?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g., AHZ-2026-000001
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  totalAmount: number;
  status: OrderStatus;
  payment: Payment;
  shipment: Shipment;
  timeline: OrderTimelineEntry[];
  deliveryPincode?: string;
  deliveryZone?: string;
  deliveryCharge?: number;
  deliveredAt?: string;
  returnWindowEndDate?: string;
  returnReplacementStatus?: ReturnReplacementStatus;
  returnReason?: string;
  replacementStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReturnReplacementStatus =
  | 'Return Requested'
  | 'Replacement Requested'
  | 'Request Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Pickup Scheduled'
  | 'Product Picked Up'
  | 'Replacement Processing'
  | 'Replacement Shipped'
  | 'Replacement Delivered'
  | 'Return Completed'
  | 'Request Cancelled'
  | 'Requested'
  | 'Under Review'
  | 'More Info Needed'
  | 'Return Received';

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  type: 'Return' | 'Replacement' | 'Cancellation';
  productId?: string;
  productName?: string;
  productSku?: string;
  productImage?: string;
  productSize?: string;
  productColor?: string;
  quantity?: number;
  reason: string;
  details?: string;
  comments?: string;
  supportingImageUrl?: string;
  supportingImageUrls?: string[];
  status: ReturnReplacementStatus;
  refundId?: string;
  pickupCourier?: string;
  pickupTrackingNumber?: string;
  pickupScheduledDate?: string;
  replacementOrderId?: string;
  replacementCourier?: string;
  replacementTrackingNumber?: string;
  ownerNote?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingRule {
  id: string;
  name: string;
  zone: string;
  pincodePrefixes: string[];
  pincodeRanges?: { start: number; end: number }[];
  deliveryCharge: number;
  estimatedDays: string;
  serviceable: boolean;
}

export interface Refund {
  id: string;
  returnRequestId: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  status: RefundStatus;
  providerReference?: string;
  providerConfirmed: boolean;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  authorLocation: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  garmentFit: 'True to Size' | 'Slightly Relaxed' | 'Tailored Fit';
  createdAt: string;
}

export interface WhyAhuzaScene {
  id: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  description: string;
  metricLabel: string;
  visualMotif: 'fabric_wave' | 'price_ceiling' | 'modern_craft' | 'dual_wardrobe' | 'express_trust';
}

export interface WebsiteContent {
  brandName: string;
  tagline: string;
  logoUrl: string;
  logoPreviewUrl?: string;
  announcementBar: string;
  hideAnnouncementBar?: boolean;
  headerNavLabels: {
    women: string;
    men: string;
    whyAhuza: string;
    about: string;
    contact?: string;
    trackOrder: string;
    returns?: string;
  };
  hero: {
    heading: string;
    tagline: string;
    subheading: string;
    ctaWomen: string;
    ctaMen: string;
    ctaExplore: string;
    imageUrl?: string;
    hideCtaWomen?: boolean;
    hideCtaMen?: boolean;
    hideCtaExplore?: boolean;
  };
  whyAhuza: {
    narrativeHeadline: string;
    narrativeSubtext: string;
    ctaText: string;
    scenes: WhyAhuzaScene[];
  };
  aboutAhuza: {
    headline: string;
    storyParagraph1: string;
    storyParagraph2: string;
    craftsmanshipPromise: string;
    imageUrl?: string;
  };
  collectionTitles: {
    featured: string;
    newArrivals: string;
    bestSellers: string;
    under999: string;
    under1499: string;
    under2000: string;
  };
  promotionalBanner: {
    headline: string;
    subtext: string;
    code: string;
    imageUrl?: string;
    hideBanner?: boolean;
  };
  footer: {
    aboutSnippet: string;
    copyrightText: string;
    contactEmail: string;
    contactPhone: string;
    studioAddress: string;
    hours: string;
    hideNewsletter?: boolean;
    socialLinks: {
      instagram: string;
      pinterest: string;
      youtube: string;
    };
  };
  policies: {
    privacyPolicy: string;
    termsAndConditions: string;
    shippingPolicy: string;
    cancellationPolicy: string;
    returnReplacementPolicy: string;
    returnWindowDays: number;
    deliveryChargeNote: string;
    returnRefundPolicy?: string;
    freeShippingThreshold?: number;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    keywords: string;
    ogImage: string;
  };
  isPublished: boolean;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  isActive: boolean;
  usageCount: number;
}

export interface AnalyticsEvent {
  id: string;
  type: 'page_view' | 'product_view' | 'add_to_cart' | 'wishlist_add' | 'checkout_start' | 'purchase' | 'search';
  sessionId: string;
  isReturningVisitor: boolean;
  productId?: string;
  searchQuery?: string;
  trafficSource: 'Direct' | 'Organic Search' | 'Instagram Editorial' | 'WhatsApp Share' | 'Referral';
  deviceType: 'Mobile (Android)' | 'Mobile (iOS)' | 'Desktop' | 'Tablet';
  region: string;
  landingPage: string;
  revenueAmount?: number;
  timestamp: string;
}

export interface WebhookConfig {
  googleAppsScriptUrl: string;
  enabled: boolean;
  secretToken?: string;
  lastTestedAt?: string;
  lastTestStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  lastTestMessage?: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  event: 'order_created' | 'test_ping' | 'status_update';
  targetUrl: string;
  payload: any;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  statusCode?: number;
  responseBody?: string;
  latencyMs?: number;
  error?: string;
}

export interface CheckoutOrderPayload {
  customer_email: string;
  order_id: string;
  status: string;
  is_delayed: boolean;
  estimated_delivery_days: number;
  sku: string;
  quantity: number;
  product_name?: string;
  unit_price?: number;
  total_amount?: number;
  currency?: string;
  shipping_address?: {
    full_name?: string;
    phone?: string;
    line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  created_at?: string;
}

// ============================================================================
// AI MARKETING AUTOMATION & ZAPIER-ALTERNATIVE TYPES
// ============================================================================

export type AutomationEventType =
  | 'order.created'
  | 'order.paid'
  | 'cart.abandoned'
  | 'product.low_stock'
  | 'customer.churn_risk'
  | 'manual.sync'
  | 'manual.test_email'
  | 'manual.social_post'
  | 'manual.followup';

export type AutomationChannel =
  | 'google_ads'
  | 'gmail_email'
  | 'social_media'
  | 'internal_alerts'
  | 'ai_decision';

export interface MarketingDecisionOutput {
  customerSegment:
    | 'High Value VIP'
    | 'First-Time Shopper'
    | 'Ethnic Festive Enthusiast'
    | 'Casual Everyday Buyer'
    | 'Price Sensitive'
    | 'At-Risk Churn';
  churnRiskScore: number; // 0-100
  recommendedAction: string;
  nextBestOfferSku?: string;
  nextBestOfferName?: string;
  personalizedFollowupCopy: {
    emailSubject: string;
    emailPreviewText: string;
    emailBodyHtml: string;
    emailCallToAction: string;
    ctaUrl: string;
  };
  socialPromoDraft: {
    platform: 'Instagram' | 'Facebook' | 'Pinterest' | 'X';
    headline: string;
    caption: string;
    hashtags: string[];
    suggestedAssetType: 'Lookbook Reel' | 'Carousel Photo' | 'Story Promo';
  };
  googleAdsOptimization: {
    audienceSignal: string;
    suggestedBidAdjustment: string;
    conversionCategory: string;
    targetRoasAdjustment: string;
  };
  internalAlertNotice: {
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    team: 'Fulfillment' | 'Customer Experience' | 'Growth Marketing';
    taskSummary: string;
  };
}

export interface AutomationChannelResult {
  channel: AutomationChannel;
  channelName: string;
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  message: string;
  endpointUrl?: string;
  payloadSent?: any;
  responsePreview?: any;
  error?: string;
}

export interface AutomationExecutionLog {
  id: string;
  timestamp: string;
  eventType: AutomationEventType;
  triggerSource: 'webhook' | 'order_checkout' | 'admin_dashboard' | 'cron_schedule';
  orderId?: string;
  customerEmail?: string;
  aiDecision?: MarketingDecisionOutput;
  channelResults: AutomationChannelResult[];
  overallStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  totalLatencyMs: number;
}

export interface AutomationConfig {
  enabled: boolean;
  googleAds: {
    enabled: boolean;
    conversionActionId: string;
    autoSyncConversions: boolean;
    enhancedConversionsEnabled: boolean;
    lastSyncedAt?: string;
    syncedConversionsCount: number;
  };
  gmailAlerts: {
    enabled: boolean;
    senderEmail: string;
    alertRecipientEmail: string;
    sendCustomerFollowups: boolean;
    sendFulfillmentAlerts: boolean;
    lastAlertSentAt?: string;
    alertsSentCount: number;
  };
  socialMedia: {
    enabled: boolean;
    autoPostProductDrops: boolean;
    autoPostLookbooks: boolean;
    targetPlatforms: ('Instagram' | 'Facebook' | 'Pinterest' | 'X')[];
    webhookEndpoint?: string;
    lastPostedAt?: string;
    postsPublishedCount: number;
  };
  internalAlerts: {
    enabled: boolean;
    webhookUrl?: string;
    alertOnHighValue: boolean;
    alertOnDelay: boolean;
    lastAlertAt?: string;
    alertsCount: number;
  };
  aiMarketingEngine: {
    enabled: boolean;
    model: string;
    creativeTone: 'warm_conversational' | 'luxe_editorial' | 'festive_urgent' | 'modern_minimal';
    includeDynamicDiscount: boolean;
  };
}
