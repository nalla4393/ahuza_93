import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Copy,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  Lock,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Users,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Webhook,
  Zap,
} from 'lucide-react';
import { DocumentHead } from '../components/Layout';
import { SafeImage } from '../components/SafeImage';
import { ClothImageEditorModal } from '../components/ClothImageEditorModal';
import { AdminWebhookSettingsPanel } from '../components/AdminWebhookSettingsPanel';
import { MarketingAutomationDashboard } from '../components/MarketingAutomationDashboard';
import { useStore } from '../context/StoreContext';
import { MAX_ALLOWED_PRICE_INR } from '../data/seedData';
import {
  Coupon,
  Order,
  OrderStatus,
  Product,
  ProductStatus,
  Refund,
  RefundStatus,
  ReturnRequest,
  UpiPaymentRecord,
  WebsiteContent,
} from '../types';

type StudioTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'returns'
  | 'cms'
  | 'logo'
  | 'coupons'
  | 'analytics'
  | 'marketing'
  | 'automation'
  | 'webhook'
  | 'upi';

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Payment Processing',
  'Paid',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancellation Requested',
  'Cancelled',
  'Return Requested',
  'Return Approved',
  'Return Picked Up',
  'Refund Processing',
  'Refunded',
];

export const OwnerStudioPage: React.FC = () => {
  const {
    user,
    token,
    login,
    loginWithGoogle,
    products,
    categories,
    websiteContent,
    refreshCatalog,
    refreshContent,
    showToast,
  } = useStore();

  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as StudioTab;
  const validTabs: StudioTab[] = [
    'overview',
    'products',
    'categories',
    'orders',
    'customers',
    'returns',
    'cms',
    'logo',
    'coupons',
    'automation',
    'webhook',
    'upi',
    'analytics',
    'marketing',
  ];
  const [activeTab, setActiveTab] = useState<StudioTab>(
    validTabs.includes(urlTab) ? urlTab : 'overview'
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab') as StudioTab;
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [loadingOwnerData, setLoadingOwnerData] = useState(false);

  // Owner datasets loaded from /api/owner/*
  const [ownerOrders, setOwnerOrders] = useState<Order[]>([]);
  const [ownerCustomers, setOwnerCustomers] = useState<any[]>([]);
  const [ownerReturns, setOwnerReturns] = useState<ReturnRequest[]>([]);
  const [ownerRefunds, setOwnerRefunds] = useState<Refund[]>([]);
  const [ownerCoupons, setOwnerCoupons] = useState<Coupon[]>([]);
  const [ownerUpiPayments, setOwnerUpiPayments] = useState<UpiPaymentRecord[]>([]);
  const [upiFilter, setUpiFilter] = useState<'ALL' | 'PENDING' | 'SUCCESS' | 'EXPIRED' | 'CANCELLED'>('ALL');
  const [reconcileActionLoading, setReconcileActionLoading] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsRange, setAnalyticsRange] = useState<'today' | '7d' | '30d' | '90d'>('30d');

  // Product Editor Modal State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [clothEditorProduct, setClothEditorProduct] = useState<Product | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGender, setNewCategoryGender] = useState<'women' | 'men' | 'all'>('women');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Order Edit State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderStatusInput, setOrderStatusInput] = useState<OrderStatus>('Confirmed');
  const [courierNameInput, setCourierNameInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [statusNoteInput, setStatusNoteInput] = useState('');

  // CMS & Logo Local State
  const [cmsDraft, setCmsDraft] = useState<WebsiteContent>(websiteContent);
  const [logoUrlInput, setLogoUrlInput] = useState(websiteContent.logoUrl || '');

  // Coupon Form State
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'flat'>('flat');
  const [couponValue, setCouponValue] = useState(200);
  const [couponMinOrder, setCouponMinOrder] = useState(999);
  const [couponDesc, setCouponDesc] = useState('');

  // Owner Login Form State (if not signed in as owner)
  const [ownerEmail, setOwnerEmail] = useState('nallagondarosy@gmail.com');
  const [ownerPassword, setOwnerPassword] = useState('AhuzaOwner@2026');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    setCmsDraft(websiteContent);
    setLogoUrlInput(websiteContent.logoUrl || '');
  }, [websiteContent]);

  const fetchOwnerDashboardData = async () => {
    if (!token || user?.role !== 'owner') return;
    setLoadingOwnerData(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersRes, custRes, retRes, contentRes, analyticsRes, upiRes] = await Promise.all([
        fetch('/api/owner/orders', { headers }),
        fetch('/api/owner/customers', { headers }),
        fetch('/api/owner/returns', { headers }),
        fetch('/api/owner/content', { headers }),
        fetch(`/api/owner/analytics?range=${analyticsRange}`, { headers }),
        fetch('/api/owner/upi/payments', { headers }),
      ]);

      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOwnerOrders(d.orders || []);
      }
      if (custRes.ok) {
        const d = await custRes.json();
        setOwnerCustomers(d.customers || []);
      }
      if (retRes.ok) {
        const d = await retRes.json();
        setOwnerReturns(d.returns || []);
        setOwnerRefunds(d.refunds || []);
      }
      if (contentRes.ok) {
        const d = await contentRes.json();
        if (d.draftContent) setCmsDraft(d.draftContent);
        if (d.coupons) setOwnerCoupons(d.coupons);
      }
      if (analyticsRes.ok) {
        const d = await analyticsRes.json();
        setAnalyticsData(d);
      }
      if (upiRes && upiRes.ok) {
        const d = await upiRes.json();
        setOwnerUpiPayments(d.payments || []);
      }
    } catch {
      // handled gracefully
    } finally {
      setLoadingOwnerData(false);
    }
  };

  useEffect(() => {
    fetchOwnerDashboardData();
  }, [token, user?.role, analyticsRange]);

  // Guard: If user is not logged in as owner, show secure Owner Studio Access Portal
  if (!user || user.role !== 'owner') {
    const handleOwnerLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthSubmitting(true);
      const res = await login(ownerEmail, ownerPassword);
      setAuthSubmitting(false);
      if (!res.ok) {
        showToast(res.error || 'Owner authentication failed', 'error');
      }
    };

    return (
      <div className="min-h-[80vh] bg-[#18181B] text-[#F9F8F6] flex items-center justify-center px-4 py-16">
        <DocumentHead title="Owner Studio Access — AHUZA" />
        <div className="max-w-md w-full bg-[#27272A] border border-white/10 rounded-xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono-num uppercase tracking-widest text-[#FDBA74] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Role-Based Admin Access
            </span>
            <span className="text-[11px] text-[#A1A1AA]">Max Cap: ₹2,000 INR</span>
          </div>

          <div>
            <h1 className="font-display text-3xl font-semibold text-white">AHUZA Owner Studio</h1>
            <p className="text-xs text-[#D4D4D8] mt-1 leading-relaxed">
              Sign in with an authorized store owner account to manage catalog pricing, orders, returns,
              CMS storytelling, discount coupons, and marketing analytics.
            </p>
          </div>

          <form onSubmit={handleOwnerLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#D4D4D8] mb-1 font-medium">Owner Email</label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#18181B] border border-white/15 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-[#D4D4D8] mb-1 font-medium">Owner Password</label>
              <input
                type="password"
                required
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#18181B] border border-white/15 rounded-lg text-white"
              />
            </div>
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3 bg-[#9A3412] hover:bg-[#7C2D12] text-white font-semibold rounded-lg transition-colors"
            >
              {authSubmitting ? 'Authenticating...' : 'Sign In to Owner Studio'}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 space-y-3">
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Continue with Authorized Google Account
            </button>
            <p className="text-[11px] text-[#A1A1AA] text-center">
              Pre-configured Owner credentials:{' '}
              <span className="font-mono-num text-white">nallagondarosy@gmail.com</span> /{' '}
              <span className="font-mono-num text-white">AhuzaOwner@2026</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Product Create / Save Handler with strict ₹2,000 Price Ceiling check
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !token) return;
    setPriceError(null);

    const price = Number(editingProduct.price || 0);
    const discountPrice = Number(editingProduct.discountPrice || price);

    if (price <= 0 || discountPrice <= 0) {
      setPriceError('Product price and selling price must be greater than ₹0.');
      return;
    }

    if (price > MAX_ALLOWED_PRICE_INR || discountPrice > MAX_ALLOWED_PRICE_INR) {
      setPriceError(
        `AHUZA Brand Rule Violation: Maximum selling price is strictly ₹${MAX_ALLOWED_PRICE_INR.toLocaleString(
          'en-IN'
        )} INR. You entered ₹${Math.max(price, discountPrice).toLocaleString('en-IN')}.`
      );
      return;
    }

    if (discountPrice > price) {
      setPriceError('Discount selling price cannot exceed the base MRP price.');
      return;
    }

    const isExisting = products.some((p) => p.id === editingProduct.id);
    const endpoint = isExisting ? `/api/owner/products/${editingProduct.id}` : '/api/owner/products';
    const method = isExisting ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editingProduct),
    });

    const data = await res.json();
    if (!res.ok) {
      setPriceError(data.error || 'Failed to save product');
      showToast(data.error || 'Failed to save product', 'error');
      return;
    }

    showToast(isExisting ? 'Product updated in catalog' : 'New product published under ₹2,000');
    setEditingProduct(null);
    await refreshCatalog();
  };

  const handleDuplicateProduct = async (productId: string) => {
    if (!token) return;
    const res = await fetch(`/api/owner/products/${productId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Product duplicated as Draft');
      await refreshCatalog();
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!token) return;
    const res = await fetch(`/api/owner/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Product removed from catalog');
      await refreshCatalog();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newCategoryName.trim()) return;
    const res = await fetch('/api/owner/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newCategoryName.trim(),
        gender: newCategoryGender,
        description: newCategoryDesc.trim(),
      }),
    });
    if (res.ok) {
      showToast(`Category "${newCategoryName}" created`);
      setNewCategoryName('');
      setNewCategoryDesc('');
      await refreshContent();
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!token) return;
    const res = await fetch(`/api/owner/categories/${catId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Category deleted');
      await refreshContent();
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedOrder) return;
    const res = await fetch(`/api/owner/orders/${selectedOrder.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: orderStatusInput,
        courierName: courierNameInput,
        trackingNumber: trackingNumberInput,
        note: statusNoteInput || `Order updated to ${orderStatusInput} by Owner Studio`,
      }),
    });
    if (res.ok) {
      showToast(`Order ${selectedOrder.orderNumber} updated to ${orderStatusInput}`);
      setSelectedOrder(null);
      await fetchOwnerDashboardData();
    }
  };

  const handleReturnDecision = async (
    returnId: string,
    status: ReturnRequest['status'],
    ownerNote: string
  ) => {
    if (!token) return;
    const res = await fetch(`/api/owner/returns/${returnId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, ownerNote }),
    });
    if (res.ok) {
      showToast(`Return request marked ${status}`);
      await fetchOwnerDashboardData();
    }
  };

  const handleRefundUpdate = async (
    refundId: string,
    status: RefundStatus,
    providerConfirmed: boolean
  ) => {
    if (!token) return;
    const res = await fetch(`/api/owner/refunds/${refundId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        providerReference: `RZP-RFND-${Date.now()}`,
        providerConfirmed,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Refund update failed', 'error');
      return;
    }
    showToast(`Refund status updated to ${status}`);
    await fetchOwnerDashboardData();
  };

  const handleSaveCMS = async (action: 'save' | 'publish' | 'unpublish' = 'publish') => {
    if (!token) return;
    const res = await fetch('/api/owner/content', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: cmsDraft,
        action,
      }),
    });
    if (res.ok) {
      showToast(
        action === 'publish'
          ? 'Website content published live!'
          : action === 'unpublish'
          ? 'Draft unpublished'
          : 'Draft saved'
      );
      await refreshContent();
    }
  };

  const handleUpdateLogo = async (action: 'preview' | 'publish' | 'remove') => {
    if (!token) return;
    const res = await fetch('/api/owner/logo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        logoUrl: logoUrlInput,
        action,
      }),
    });
    if (res.ok) {
      showToast(`Brand logo ${action} applied`);
      await refreshContent(action === 'preview');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !couponCode.trim()) return;
    const res = await fetch('/api/owner/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: couponCode.trim().toUpperCase(),
        discountType: couponType,
        discountValue: Number(couponValue),
        minOrderAmount: Number(couponMinOrder),
        maxDiscountAmount: 400,
        description: couponDesc || `Save on orders above ₹${couponMinOrder}`,
      }),
    });
    if (res.ok) {
      showToast(`Coupon ${couponCode.toUpperCase()} created`);
      setCouponCode('');
      setCouponDesc('');
      await fetchOwnerDashboardData();
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/owner/coupons/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Coupon removed');
      await fetchOwnerDashboardData();
    }
  };

  const handleReconcileUpi = async (internalOrderId: string, action: 'APPROVE' | 'REJECT', notes?: string) => {
    if (!token) return;
    setReconcileActionLoading(internalOrderId);
    try {
      const res = await fetch('/api/owner/upi/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internalOrderId,
          action,
          notes: notes || (action === 'APPROVE' ? 'Bank settlement verified by store owner' : 'Rejected - UTR not found on statement'),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message || `UPI Payment ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`);
        await fetchOwnerDashboardData();
      } else {
        showToast(d.error || 'Failed to reconcile payment', 'error');
      }
    } catch {
      showToast('Network error during reconciliation', 'error');
    } finally {
      setReconcileActionLoading(null);
    }
  };

  const totalRevenue = ownerOrders
    .filter((o) => !['Cancelled', 'Refunded'].includes(o.status))
    .reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-[#18181B]">
      <DocumentHead title="Owner Studio — AHUZA Operations & CMS" />

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Left Fixed Studio Navigation Sidebar */}
        <aside className="w-full lg:w-64 bg-[#18181B] text-[#F9F8F6] p-5 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-num uppercase tracking-widest text-[#FDBA74]">
                  AHUZA STUDIO
                </span>
                <span className="text-[11px] font-mono-num px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  CAP ≤ ₹2,000
                </span>
              </div>
              <h1 className="font-display text-2xl font-semibold text-white mt-1">Owner Control</h1>
              <p className="text-[11px] text-[#A1A1AA] truncate">{user.email}</p>
            </div>

            <nav className="space-y-1 text-xs">
              {[
                { id: 'overview', label: 'Overview & KPIs', icon: BarChart3 },
                { id: 'products', label: `Products (${products.length})`, icon: Package },
                { id: 'categories', label: `Categories (${categories.length})`, icon: Layers },
                { id: 'orders', label: `Orders (${ownerOrders.length})`, icon: Truck },
                { id: 'customers', label: `Customers (${ownerCustomers.length})`, icon: Users },
                { id: 'returns', label: `Returns & Refunds (${ownerReturns.length})`, icon: RotateCcw },
                { id: 'cms', label: 'Website Content CMS', icon: FileText },
                { id: 'logo', label: 'Brand Logo Manager', icon: ImageIcon },
                { id: 'coupons', label: 'Coupons & Offers', icon: Tag },
                { id: 'upi', label: `Direct UPI & UTR (${ownerUpiPayments.length})`, icon: Smartphone },
                { id: 'webhook', label: 'Apps Script Webhook', icon: Webhook },
                { id: 'automation', label: 'AI Marketing Automation', icon: Zap },
                { id: 'analytics', label: 'Store Telemetry & KPIs', icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as StudioTab)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-[#9A3412] text-white'
                        : 'text-[#D4D4D8] hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-white/10 space-y-2 text-xs">
            <button
              type="button"
              onClick={fetchOwnerDashboardData}
              className="w-full py-2 px-3 bg-white/8 hover:bg-white/15 rounded-lg flex items-center justify-center gap-1.5 text-[#D4D4D8]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOwnerData ? 'animate-spin' : ''}`} />
              <span>Sync Live Data</span>
            </button>
            <Link
              to="/"
              className="block w-full py-2 px-3 text-center border border-white/15 rounded-lg text-[#D4D4D8] hover:text-white"
            >
              View Customer Storefront →
            </Link>
          </div>
        </aside>

        {/* Main Studio Workspace */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-semibold text-[#18181B]">
                    Storefront & Operations Overview
                  </h2>
                  <p className="text-xs text-[#52525B] mt-0.5">
                    Real-time metrics across orders, inventory compliance (≤ ₹2,000), and customer purchases.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('products');
                    setEditingProduct({
                      name: '',
                      sku: `AHZ-${Date.now().toString().slice(-5)}`,
                      gender: 'women',
                      categories: ['Kurtis'],
                      description: '',
                      fabric: '100% Breathable Mulmul Cotton',
                      careInstructions: 'Gentle machine wash cold',
                      colors: [{ name: 'Terracotta Rust', hex: '#9A3412' }],
                      sizes: ['S', 'M', 'L', 'XL'],
                      images: [
                        {
                          id: `img_${Date.now()}`,
                          url: products[0]?.images[0]?.url || '',
                          alt: 'AHUZA Apparel',
                          angleLabel: 'Front View',
                          isPrimary: true,
                        },
                      ],
                      price: 1299,
                      discountPrice: 999,
                      stock: 25,
                      status: 'Published',
                      isFeatured: true,
                      isNewArrival: true,
                      isBestSeller: false,
                      drapeType: 'kurti',
                      searchKeywords: ['kurti', 'cotton', 'everyday wear'],
                      seoTitle: '',
                      seoDescription: '',
                    });
                  }}
                  className="py-2.5 px-4 bg-[#18181B] hover:bg-[#9A3412] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product (≤ ₹2,000)</span>
                </button>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#18181B]/10 rounded-xl p-5">
                  <span className="text-xs text-[#71717A]">Net Store Revenue</span>
                  <div className="font-mono-num text-2xl font-bold text-[#18181B] mt-1">
                    ₹{totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                    Server-Side Verified Payments
                  </span>
                </div>

                <div className="bg-white border border-[#18181B]/10 rounded-xl p-5">
                  <span className="text-xs text-[#71717A]">Total Orders</span>
                  <div className="font-mono-num text-2xl font-bold text-[#18181B] mt-1">
                    {ownerOrders.length}
                  </div>
                  <span className="text-[11px] text-[#52525B] mt-1 block">
                    {ownerReturns.length} return/cancellation requests
                  </span>
                </div>

                <div className="bg-white border border-[#18181B]/10 rounded-xl p-5">
                  <span className="text-xs text-[#71717A]">Active Catalog SKUs</span>
                  <div className="font-mono-num text-2xl font-bold text-[#18181B] mt-1">
                    {products.filter((p) => p.status === 'Published').length} / {products.length}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                    100% compliant with ₹2,000 ceiling
                  </span>
                </div>

                <div className="bg-white border border-[#18181B]/10 rounded-xl p-5">
                  <span className="text-xs text-[#71717A]">Active Categories</span>
                  <div className="font-mono-num text-2xl font-bold text-[#9A3412] mt-1">
                    {categories.length}
                  </div>
                  <span className="text-[11px] text-[#52525B] mt-1 block">
                    Women & Men Collections
                  </span>
                </div>
              </div>

              {/* Recent Orders & Inventory Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-semibold">Recent Customer Orders</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-[#9A3412] font-semibold"
                    >
                      Manage All →
                    </button>
                  </div>
                  {ownerOrders.length === 0 ? (
                    <p className="text-xs text-[#71717A] py-4">No orders placed yet.</p>
                  ) : (
                    <div className="divide-y divide-[#18181B]/10 text-xs">
                      {ownerOrders.slice(0, 5).map((ord) => (
                        <div key={ord.id} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <span className="font-mono-num font-bold text-[#18181B]">{ord.orderNumber}</span>
                            <p className="text-[#52525B]">
                              {ord.customerName} · {ord.items.length} item(s)
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono-num font-semibold">
                              ₹{ord.totalAmount.toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[11px] text-[#9A3412] font-medium">
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                  <h3 className="font-display text-xl font-semibold">Low Stock & Price Guard</h3>
                  <div className="divide-y divide-[#18181B]/10 text-xs">
                    {products.slice(0, 6).map((prod) => (
                      <div key={prod.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="font-medium text-[#18181B]">{prod.name}</span>
                          <span className="block text-[11px] text-[#71717A] font-mono-num">
                            SKU: {prod.sku}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono-num font-semibold text-[#18181B]">
                            ₹{prod.discountPrice}
                          </span>
                          <span
                            className={`block text-[11px] font-mono-num ${
                              prod.stock < 10 ? 'text-amber-700 font-semibold' : 'text-emerald-700'
                            }`}
                          >
                            {prod.stock} in stock
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-semibold">Product Catalog Management</h2>
                  <p className="text-xs text-[#52525B]">
                    Strict Price Cap Enforced: No product can be created or published above ₹2,000 INR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPriceError(null);
                    setEditingProduct({
                      name: '',
                      sku: `AHZ-${Date.now().toString().slice(-5)}`,
                      gender: 'women',
                      categories: ['Kurtis'],
                      description: '',
                      fabric: 'Pure Breathable Cotton',
                      careInstructions: 'Gentle cold wash',
                      colors: [{ name: 'Terracotta Rust', hex: '#9A3412' }],
                      sizes: ['S', 'M', 'L', 'XL'],
                      images: [
                        {
                          id: `img_${Date.now()}`,
                          url: products[0]?.images[0]?.url || '',
                          alt: 'Product image',
                          angleLabel: 'Studio Front',
                          isPrimary: true,
                        },
                      ],
                      price: 1499,
                      discountPrice: 999,
                      stock: 30,
                      status: 'Published',
                      isFeatured: false,
                      isNewArrival: true,
                      isBestSeller: false,
                      drapeType: 'kurti',
                      searchKeywords: ['everyday wear', 'cotton'],
                      seoTitle: '',
                      seoDescription: '',
                    });
                  }}
                  className="py-2.5 px-4 bg-[#9A3412] hover:bg-[#7C2D12] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Product</span>
                </button>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {['all', 'women', 'men', 'Draft', 'Published', 'Out of Stock'].map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setCategoryFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-md font-medium capitalize ${
                      categoryFilter === filterKey
                        ? 'bg-[#18181B] text-white'
                        : 'bg-white border border-[#18181B]/10 text-[#52525B]'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>

              {/* Product Editor Modal */}
              {editingProduct && (
                <form
                  onSubmit={handleSaveProduct}
                  className="bg-white border-2 border-[#18181B] rounded-xl p-6 space-y-5 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-[#18181B]/10 pb-3">
                    <div>
                      <span className="text-[11px] font-mono-num uppercase text-[#9A3412] font-semibold">
                        PRODUCT STUDIO EDITOR · MAX CAP ₹2,000 INR
                      </span>
                      <h3 className="font-display text-2xl font-semibold">
                        {editingProduct.id ? `Edit: ${editingProduct.name}` : 'Create New Product'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="text-xs text-[#71717A] hover:text-[#18181B]"
                    >
                      Close ✕
                    </button>
                  </div>

                  {priceError && (
                    <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2.5 text-xs text-red-900">
                      <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                      <span>{priceError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={editingProduct.name || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">SKU *</label>
                      <input
                        type="text"
                        required
                        value={editingProduct.sku || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Gender Collection *</label>
                      <select
                        value={editingProduct.gender || 'women'}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            gender: e.target.value as 'women' | 'men',
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      >
                        <option value="women">Women&apos;s Collection</option>
                        <option value="men">Men&apos;s Collection</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Base MRP Price (₹ INR — Max ₹2,000) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={2500}
                        value={editingProduct.price ?? 999}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingProduct({ ...editingProduct, price: val });
                          if (val > MAX_ALLOWED_PRICE_INR) {
                            setPriceError(
                              `Price ₹${val} exceeds AHUZA's maximum allowed selling price of ₹2,000 INR.`
                            );
                          } else {
                            setPriceError(null);
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Discount Selling Price (₹ INR — Max ₹2,000) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={2500}
                        value={editingProduct.discountPrice ?? 799}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingProduct({ ...editingProduct, discountPrice: val });
                          if (val > MAX_ALLOWED_PRICE_INR) {
                            setPriceError(
                              `Discount price ₹${val} exceeds AHUZA's maximum allowed selling price of ₹2,000 INR.`
                            );
                          } else {
                            setPriceError(null);
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Stock Quantity *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editingProduct.stock ?? 20}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Product Status *</label>
                      <select
                        value={editingProduct.status || 'Published'}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            status: e.target.value as ProductStatus,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      >
                        <option value="Published">Published</option>
                        <option value="Draft">Draft</option>
                        <option value="Unpublished">Unpublished</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Fabric *</label>
                      <input
                        type="text"
                        required
                        value={editingProduct.fabric || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, fabric: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">3D Garment Drape Silhouette</label>
                      <select
                        value={editingProduct.drapeType || 'kurti'}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            drapeType: e.target.value as Product['drapeType'],
                          })
                        }
                        className="w-full px-2 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      >
                        <option value="kurti">Kurti / Tunic</option>
                        <option value="frock">Tiered Frock</option>
                        <option value="kurta_dupatta">Kurta Set with Dupatta</option>
                        <option value="lehenga">Lehenga</option>
                        <option value="mens_kurta">Men&apos;s Kurta</option>
                        <option value="track_suit">Track Suit</option>
                        <option value="night_suit">Night Suit</option>
                      </select>
                    </div>
                  </div>

                  {/* Categories Multi-Select */}
                  <div className="text-xs">
                    <label className="block font-semibold mb-1.5">
                      Assign Categories (Multiple Allowed)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter((c) => c.gender === (editingProduct.gender || 'women') || c.gender === 'all')
                        .map((cat) => {
                          const selected = (editingProduct.categories || []).includes(cat.name);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                const current = editingProduct.categories || [];
                                const updated = selected
                                  ? current.filter((x) => x !== cat.name)
                                  : [...current, cat.name];
                                setEditingProduct({
                                  ...editingProduct,
                                  categories: updated.length ? updated : [cat.name],
                                });
                              }}
                              className={`px-3 py-1.5 rounded-md border transition-colors ${
                                selected
                                  ? 'bg-[#18181B] text-white border-[#18181B]'
                                  : 'bg-[#F9F8F6] text-[#52525B] border-[#18181B]/15'
                              }`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Description & SEO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Product Description *</label>
                      <textarea
                        rows={3}
                        required
                        value={editingProduct.description || ''}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, description: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block font-semibold mb-1">SEO Title</label>
                        <input
                          type="text"
                          value={editingProduct.seoTitle || ''}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, seoTitle: e.target.value })
                          }
                          placeholder="Automatic if left blank"
                          className="w-full px-3 py-1.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">
                          Search Keywords (comma separated)
                        </label>
                        <input
                          type="text"
                          value={(editingProduct.searchKeywords || []).join(', ')}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              searchKeywords: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          className="w-full px-3 py-1.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Images & Flags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Product Image URLs</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="Paste image URL or asset path..."
                          className="flex-1 px-3 py-1.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!imageUrlInput.trim()) return;
                            setEditingProduct({
                              ...editingProduct,
                              images: [
                                ...(editingProduct.images || []),
                                {
                                  id: `img_${Date.now()}`,
                                  url: imageUrlInput.trim(),
                                  alt: editingProduct.name || 'AHUZA',
                                  angleLabel: 'Gallery View',
                                  isPrimary: (editingProduct.images || []).length === 0,
                                },
                              ],
                            });
                            setImageUrlInput('');
                          }}
                          className="px-3 py-1.5 bg-[#18181B] text-white rounded-lg font-semibold"
                        >
                          Add URL
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (editingProduct) {
                            setClothEditorProduct(editingProduct as Product);
                          }
                        }}
                        className="mt-2 w-full py-2 px-3 bg-[#9A3412] hover:bg-[#7C2D12] text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-xs shadow-xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#FED7AA]" />
                        <span>Upload & Edit Pure Cloth Images (No Body/Faces Standard)</span>
                      </button>
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {(editingProduct.images || []).map((img, i) => (
                          <div key={i} className="relative w-14 h-16 rounded border overflow-hidden shrink-0">
                            <SafeImage src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProduct({
                                  ...editingProduct,
                                  images: (editingProduct.images || []).filter((_, idx) => idx !== i),
                                })
                              }
                              className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[10px] px-1 rounded"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-center space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editingProduct.isFeatured)}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })
                          }
                        />
                        <span>Feature on Home Page</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editingProduct.isNewArrival)}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, isNewArrival: e.target.checked })
                          }
                        />
                        <span>Mark as New Arrival</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editingProduct.isBestSeller)}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })
                          }
                        />
                        <span>Mark as Bestseller</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-[#18181B]/10">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="py-2 px-4 border border-[#18181B]/20 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2 px-6 bg-[#9A3412] hover:bg-[#7C2D12] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Product (≤ ₹2,000 Verified)</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Products Table */}
              <div className="bg-white border border-[#18181B]/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F9F8F6] border-b border-[#18181B]/10 text-[#71717A] uppercase font-mono-num text-[11px]">
                        <th className="py-3.5 px-4">Product</th>
                        <th className="py-3.5 px-4">SKU / Gender</th>
                        <th className="py-3.5 px-4">Categories</th>
                        <th className="py-3.5 px-4">Selling Price</th>
                        <th className="py-3.5 px-4">Stock</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#18181B]/10">
                      {products
                        .filter((p) => {
                          if (categoryFilter === 'all') return true;
                          if (categoryFilter === 'women' || categoryFilter === 'men')
                            return p.gender === categoryFilter;
                          return p.status === categoryFilter;
                        })
                        .map((prod) => (
                          <tr key={prod.id} className="hover:bg-[#F9F8F6]/60">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-12 rounded bg-[#F2EFE9] overflow-hidden shrink-0">
                                  <SafeImage
                                    src={prod.images[0]?.url}
                                    alt={prod.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="font-semibold text-[#18181B]">{prod.name}</div>
                                  <div className="text-[11px] text-[#71717A]">{prod.fabric}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono-num">
                              <div>{prod.sku}</div>
                              <div className="text-[11px] text-[#71717A] capitalize">{prod.gender}</div>
                            </td>
                            <td className="py-3 px-4 text-[#52525B]">{prod.categories.join(', ')}</td>
                            <td className="py-3 px-4 font-mono-num">
                              <span className="font-bold text-[#18181B]">₹{prod.discountPrice}</span>
                              {prod.price > prod.discountPrice && (
                                <span className="text-[#71717A] line-through ml-1.5">₹{prod.price}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono-num">{prod.stock}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  prod.status === 'Published'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-amber-50 text-amber-800'
                                }`}
                              >
                                {prod.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setClothEditorProduct(prod)}
                                  className="p-1.5 px-2.5 rounded bg-[#9A3412] hover:bg-[#7C2D12] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                                  title="Upload & Edit Pure Cloth Images (No Body/Faces Standard)"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-[#FED7AA]" />
                                  <span>Cloth Images</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPriceError(null);
                                    setEditingProduct(prod);
                                  }}
                                  className="p-1.5 rounded hover:bg-[#18181B]/5 text-[#18181B]"
                                  title="Edit Product"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateProduct(prod.id)}
                                  className="p-1.5 rounded hover:bg-[#18181B]/5 text-[#52525B]"
                                  title="Duplicate Product"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(prod.id)}
                                  className="p-1.5 rounded hover:bg-red-50 text-red-700"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-3xl font-semibold">Category Architecture</h2>
                <p className="text-xs text-[#52525B]">
                  Manage Women&apos;s and Men&apos;s everyday apparel categories.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleAddCategory}
                  className="lg:col-span-4 bg-white border border-[#18181B]/10 rounded-xl p-5 space-y-4 text-xs h-fit"
                >
                  <h3 className="font-display text-xl font-semibold">Create Category</h3>
                  <div>
                    <label className="block font-semibold mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Festive Kurtis"
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Gender *</label>
                    <select
                      value={newCategoryGender}
                      onChange={(e) => setNewCategoryGender(e.target.value as 'women' | 'men' | 'all')}
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    >
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                      <option value="all">Unisex / All</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#18181B] text-white font-semibold rounded-lg"
                  >
                    Add Category
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white border border-[#18181B]/10 rounded-xl p-5 space-y-4">
                  <h3 className="font-display text-xl font-semibold">Active Categories</h3>
                  <div className="divide-y divide-[#18181B]/10 text-xs">
                    {categories.map((cat) => (
                      <div key={cat.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <span className="font-semibold text-[#18181B]">{cat.name}</span>
                          <span className="ml-2 uppercase text-[10px] px-2 py-0.5 rounded bg-[#F2EFE9] text-[#9A3412] font-semibold">
                            {cat.gender}
                          </span>
                          <p className="text-[#71717A] mt-0.5">{cat.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-red-700 hover:underline text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ORDERS & DISPATCH */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-3xl font-semibold">Order Fulfillment & Courier Dispatch</h2>
                <p className="text-xs text-[#52525B]">
                  Update order status across all 15 lifecycle stages and attach courier tracking details.
                </p>
              </div>

              {selectedOrder && (
                <form
                  onSubmit={handleUpdateOrder}
                  className="bg-white border-2 border-[#18181B] rounded-xl p-6 space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-2xl font-semibold">
                      Update Order: <span className="font-mono-num">{selectedOrder.orderNumber}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="text-[#71717A]"
                    >
                      Close ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Lifecycle Status</label>
                      <select
                        value={orderStatusInput}
                        onChange={(e) => setOrderStatusInput(e.target.value as OrderStatus)}
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      >
                        {ALL_ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Courier Partner</label>
                      <input
                        type="text"
                        value={courierNameInput}
                        onChange={(e) => setCourierNameInput(e.target.value)}
                        placeholder="BlueDart / Delhivery Express"
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">AWB / Tracking Number</label>
                      <input
                        type="text"
                        value={trackingNumberInput}
                        onChange={(e) => setTrackingNumberInput(e.target.value)}
                        placeholder="BD99281726IN"
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-semibold mb-1">Timeline Update Note</label>
                      <input
                        type="text"
                        value={statusNoteInput}
                        onChange={(e) => setStatusNoteInput(e.target.value)}
                        placeholder="Package handed over to courier hub in Mumbai"
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="py-2 px-5 bg-[#9A3412] text-white font-semibold rounded-lg"
                    >
                      Save Order & Notify Timeline
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white border border-[#18181B]/10 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F9F8F6] border-b border-[#18181B]/10 text-[#71717A] font-mono-num text-[11px] uppercase">
                      <th className="py-3.5 px-4">Order ID</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Items / Total</th>
                      <th className="py-3.5 px-4">Payment</th>
                      <th className="py-3.5 px-4">Courier / Tracking</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181B]/10">
                    {ownerOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="py-3.5 px-4 font-mono-num font-bold">{ord.orderNumber}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold">{ord.customerName}</div>
                          <div className="text-[11px] text-[#71717A]">
                            {ord.shippingAddress?.city}, {ord.shippingAddress?.state}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono-num">
                          <div>₹{ord.totalAmount.toLocaleString('en-IN')}</div>
                          <div className="text-[11px] text-[#71717A]">{ord.items.length} item(s)</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="uppercase font-mono-num text-[11px] font-semibold">
                            {ord.payment.method} · {ord.payment.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono-num text-[11px]">
                          {ord.shipment?.courierName
                            ? `${ord.shipment.courierName} (${ord.shipment.trackingNumber})`
                            : 'Pending Dispatch'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded bg-[#F2EFE9] text-[#9A3412] font-semibold">
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(ord);
                              setOrderStatusInput(ord.status);
                              setCourierNameInput(ord.shipment?.courierName || 'BlueDart Express');
                              setTrackingNumberInput(
                                ord.shipment?.trackingNumber || `BD${Date.now().toString().slice(-8)}IN`
                              );
                              setStatusNoteInput('');
                            }}
                            className="py-1.5 px-3 bg-[#18181B] text-white rounded-md font-semibold"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-3xl font-semibold">Customer Directory</h2>
                <p className="text-xs text-[#52525B]">
                  Sanitized customer view (passwords, raw tokens, and payment secrets are never exposed).
                </p>
              </div>
              <div className="bg-white border border-[#18181B]/10 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F9F8F6] border-b border-[#18181B]/10 text-[#71717A] font-mono-num text-[11px] uppercase">
                      <th className="py-3.5 px-4">Customer Name</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Orders</th>
                      <th className="py-3.5 px-4">Total Spend</th>
                      <th className="py-3.5 px-4">Wishlist / Returns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181B]/10">
                    {ownerCustomers.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3.5 px-4 font-semibold">{c.name}</td>
                        <td className="py-3.5 px-4">
                          <div>{c.email}</div>
                          <div className="font-mono-num text-[11px] text-[#71717A]">{c.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono-num">{c.orderCount}</td>
                        <td className="py-3.5 px-4 font-mono-num font-semibold">
                          ₹{(c.totalOrderValue || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 font-mono-num">
                          {c.wishlistCount} saved · {c.returnsCount} returns
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: RETURNS & REFUNDS */}
          {activeTab === 'returns' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-3xl font-semibold">Returns, Cancellations & Refunds</h2>
                <p className="text-xs text-[#52525B]">
                  Approve or reject customer return requests and manage payment provider refund lifecycles.
                </p>
              </div>

              <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-xl font-semibold">Return & Cancellation Requests</h3>
                {ownerReturns.length === 0 ? (
                  <p className="text-xs text-[#71717A]">No return requests submitted yet.</p>
                ) : (
                  <div className="divide-y divide-[#18181B]/10 text-xs">
                    {ownerReturns.map((ret) => (
                      <div key={ret.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-mono-num font-bold">
                            {ret.orderNumber} · {ret.type} ({ret.customerName})
                          </div>
                          <div className="text-[#52525B]">
                            Reason: <strong>{ret.reason}</strong> — {ret.details}
                          </div>
                          <div className="text-[11px] text-[#9A3412] font-semibold">
                            Current Status: {ret.status}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleReturnDecision(
                                ret.id,
                                'Approved',
                                'Approved for reverse pickup and refund settlement.'
                              )
                            }
                            className="py-1.5 px-3 bg-emerald-700 text-white rounded-md font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleReturnDecision(
                                ret.id,
                                'Return Received',
                                'Returned garment inspected at Mumbai studio.'
                              )
                            }
                            className="py-1.5 px-3 bg-[#18181B] text-white rounded-md font-semibold"
                          >
                            Mark Received
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleReturnDecision(
                                ret.id,
                                'More Info Needed',
                                'Please share a clear photo of the garment tag.'
                              )
                            }
                            className="py-1.5 px-3 bg-amber-600 text-white rounded-md font-semibold"
                          >
                            Request Info
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleReturnDecision(
                                ret.id,
                                'Rejected',
                                'Item outside return window or tags removed.'
                              )
                            }
                            className="py-1.5 px-3 bg-red-700 text-white rounded-md font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-xl font-semibold">
                  Refund Settlement Ledger (Requires Provider Confirmation before Completed)
                </h3>
                {ownerRefunds.length === 0 ? (
                  <p className="text-xs text-[#71717A]">No refunds initiated yet.</p>
                ) : (
                  <div className="divide-y divide-[#18181B]/10 text-xs">
                    {ownerRefunds.map((ref) => (
                      <div key={ref.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="font-mono-num font-bold">
                            {ref.orderNumber} · ₹{ref.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[#52525B]">
                            Status: <strong>{ref.status}</strong> · Provider Confirmed:{' '}
                            {ref.providerConfirmed ? 'YES' : 'NO'}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {(['Pending', 'Approved', 'Processing', 'Rejected'] as RefundStatus[]).map(
                            (st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleRefundUpdate(ref.id, st, ref.providerConfirmed)}
                                className={`py-1 px-2.5 rounded border text-[11px] font-semibold ${
                                  ref.status === st
                                    ? 'bg-[#18181B] text-white border-[#18181B]'
                                    : 'bg-[#F9F8F6] text-[#52525B]'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => handleRefundUpdate(ref.id, 'Completed', true)}
                            className="py-1 px-3 rounded bg-emerald-700 text-white text-[11px] font-semibold"
                          >
                            Verify Provider & Mark Completed
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: WEBSITE CONTENT CMS */}
          {activeTab === 'cms' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-semibold">No-Code Website Content Editor</h2>
                  <p className="text-xs text-[#52525B]">
                    Edit Hero headlines, Why Ahuza 3D chapters, About story, announcements, and store policies.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveCMS('save')}
                    className="py-2 px-4 bg-white border border-[#18181B]/20 text-xs font-semibold rounded-lg"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveCMS('publish')}
                    className="py-2.5 px-5 bg-[#9A3412] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Publish Changes Live</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                  <h3 className="font-display text-xl font-semibold">Hero Banner & Tagline</h3>
                  <div>
                    <label className="block font-semibold mb-1">Brand Tagline</label>
                    <input
                      type="text"
                      value={cmsDraft.tagline}
                      onChange={(e) => setCmsDraft({ ...cmsDraft, tagline: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Hero Subheading</label>
                    <input
                      type="text"
                      value={cmsDraft.hero.subheading}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          hero: { ...cmsDraft.hero, subheading: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Top Promotional Announcement Strip</label>
                    <input
                      type="text"
                      value={cmsDraft.announcementBar}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          announcementBar: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                </div>

                <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                  <h3 className="font-display text-xl font-semibold">About Ahuza Story</h3>
                  <div>
                    <label className="block font-semibold mb-1">Headline</label>
                    <input
                      type="text"
                      value={cmsDraft.aboutAhuza.headline}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          aboutAhuza: { ...cmsDraft.aboutAhuza, headline: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Story Paragraph</label>
                    <textarea
                      rows={4}
                      value={cmsDraft.aboutAhuza.storyParagraph1}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          aboutAhuza: { ...cmsDraft.aboutAhuza, storyParagraph1: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                  <h3 className="font-display text-xl font-semibold">
                    Configurable Store Policies (Return, Cancellation, Shipping, Privacy)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Return & Refund Policy</label>
                      <textarea
                        rows={4}
                        value={cmsDraft.policies.returnRefundPolicy}
                        onChange={(e) =>
                          setCmsDraft({
                            ...cmsDraft,
                            policies: { ...cmsDraft.policies, returnRefundPolicy: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Cancellation Policy</label>
                      <textarea
                        rows={4}
                        value={cmsDraft.policies.cancellationPolicy}
                        onChange={(e) =>
                          setCmsDraft({
                            ...cmsDraft,
                            policies: { ...cmsDraft.policies, cancellationPolicy: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: BRAND LOGO MANAGER */}
          {activeTab === 'logo' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-semibold">Brand Logo Manager</h2>
                  <p className="text-xs text-[#52525B]">
                    Upload or paste SVG/PNG/WebP logo URL, preview in header/footer, and publish live.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateLogo('preview')}
                    className="py-2 px-4 bg-white border border-[#18181B]/20 text-xs font-semibold rounded-lg"
                  >
                    Preview Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateLogo('publish')}
                    className="py-2 px-5 bg-[#9A3412] text-white text-xs font-semibold rounded-lg"
                  >
                    Publish Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrlInput('');
                      handleUpdateLogo('remove');
                    }}
                    className="py-2 px-4 bg-red-50 text-red-700 text-xs font-semibold rounded-lg"
                  >
                    Reset to Wordmark
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                  <div>
                    <label className="block font-semibold mb-1">Brand Wordmark Name</label>
                    <input
                      type="text"
                      value={cmsDraft.brandName}
                      onChange={(e) => setCmsDraft({ ...cmsDraft, brandName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Logo Image URL (SVG/PNG/WebP — leave blank for Editorial Serif Wordmark)
                    </label>
                    <input
                      type="text"
                      value={logoUrlInput}
                      onChange={(e) => setLogoUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#F9F8F6] border border-[#18181B]/15 rounded-xl p-6">
                    <span className="text-[11px] font-mono-num uppercase text-[#71717A]">
                      LIVE LIGHT HEADER PREVIEW
                    </span>
                    <div className="mt-4 py-4 px-6 bg-white border border-[#18181B]/10 rounded-lg flex items-center justify-between">
                      {logoUrlInput ? (
                        <SafeImage src={logoUrlInput} alt="AHUZA Logo" className="h-9 w-auto object-contain" />
                      ) : (
                        <span className="font-display text-3xl font-semibold tracking-[0.18em] text-[#18181B]">
                          {cmsDraft.brandName || 'AHUZA'}
                        </span>
                      )}
                      <span className="text-xs text-[#71717A]">Women · Men · Casual & Everyday Fashion</span>
                    </div>
                  </div>

                  <div className="bg-[#18181B] border border-white/10 rounded-xl p-6 text-white">
                    <span className="text-[11px] font-mono-num uppercase text-[#FDBA74]">
                      LIVE DARK FOOTER PREVIEW
                    </span>
                    <div className="mt-4">
                      <div className="font-display text-3xl font-semibold tracking-[0.18em]">
                        {cmsDraft.brandName || 'AHUZA'}
                      </div>
                      <p className="font-display italic text-sm text-[#FDBA74] mt-1">
                        “{cmsDraft.tagline}”
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: COUPONS & OFFERS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-3xl font-semibold">Promotional Coupons</h2>
                <p className="text-xs text-[#52525B]">
                  Create discount codes for festive and everyday campaigns.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                <form
                  onSubmit={handleCreateCoupon}
                  className="lg:col-span-4 bg-white border border-[#18181B]/10 rounded-xl p-5 space-y-3 h-fit"
                >
                  <h3 className="font-display text-xl font-semibold">Add Coupon</h3>
                  <div>
                    <label className="block font-semibold mb-1">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="FESTIVE15"
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold mb-1">Type</label>
                      <select
                        value={couponType}
                        onChange={(e) => setCouponType(e.target.value as 'flat' | 'percentage')}
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                      >
                        <option value="flat">Flat ₹ Off</option>
                        <option value="percentage">% Percentage</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Value</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={couponValue}
                        onChange={(e) => setCouponValue(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Minimum Order Value (₹)</label>
                    <input
                      type="number"
                      required
                      value={couponMinOrder}
                      onChange={(e) => setCouponMinOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#18181B] text-white font-semibold rounded-lg"
                  >
                    Create Coupon
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white border border-[#18181B]/10 rounded-xl p-5 space-y-3">
                  <h3 className="font-display text-xl font-semibold">Active Coupons</h3>
                  <div className="divide-y divide-[#18181B]/10">
                    {ownerCoupons.map((cp) => (
                      <div key={cp.id} className="py-3 flex items-center justify-between">
                        <div>
                          <span className="font-mono-num font-bold text-sm text-[#9A3412]">
                            {cp.code}
                          </span>
                          <span className="ml-2 text-[#52525B]">
                            {cp.discountType === 'flat'
                              ? `₹${cp.discountValue} OFF`
                              : `${cp.discountValue}% OFF`}{' '}
                            (Min order ₹{cp.minOrderAmount})
                          </span>
                          <p className="text-[11px] text-[#71717A]">{cp.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(cp.id)}
                          className="text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: STORE TELEMETRY & ANALYTICS CONVERSION FUNNEL */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-3xl font-semibold">
                      Marketing & Data Analytics Studio
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#9A3412]/10 text-[#9A3412] font-semibold border border-[#9A3412]/20">
                      Owner Only
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] mt-0.5">
                    Privacy-conscious aggregate store telemetry across Visitors, Views, Cart, Checkout, and Purchase.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {(['today', '7d', '30d', '90d'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAnalyticsRange(r)}
                      className={`px-3 py-1.5 rounded-md font-semibold uppercase ${
                        analyticsRange === r
                          ? 'bg-[#18181B] text-white'
                          : 'bg-white border border-[#18181B]/15 text-[#52525B]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Funnel Visualization */}
              <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-xl font-semibold">
                  Marketing Funnel: Visitors → Product Views → Add to Cart → Checkout → Purchase
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  {(analyticsData?.funnel || []).map((step: any, idx: number) => (
                    <div
                      key={step.stage}
                      className="p-4 rounded-xl bg-[#F9F8F6] border border-[#18181B]/10 space-y-1"
                    >
                      <span className="text-[11px] font-mono-num text-[#9A3412]">STAGE 0{idx + 1}</span>
                      <div className="font-semibold text-[#18181B]">{step.stage}</div>
                      <div className="font-mono-num text-2xl font-bold text-[#18181B]">
                        {step.count}
                      </div>
                      <div className="text-[11px] text-[#71717A] font-mono-num">
                        {step.rateFromPrevious}% step conversion
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                {[
                  { label: 'Total Visitors', val: analyticsData?.summary?.totalVisitors ?? 0 },
                  { label: 'Unique Visitors', val: analyticsData?.summary?.uniqueVisitors ?? 0 },
                  { label: 'Product Views', val: analyticsData?.summary?.productViews ?? 0 },
                  {
                    label: 'Add-to-Cart Rate',
                    val: `${analyticsData?.summary?.addToCartRate ?? 0}%`,
                  },
                  {
                    label: 'Conversion Rate',
                    val: `${analyticsData?.summary?.conversionRate ?? 0}%`,
                  },
                  {
                    label: 'Avg Order Value',
                    val: `₹${analyticsData?.summary?.averageOrderValue ?? 0}`,
                  },
                  { label: 'Return Rate', val: `${analyticsData?.summary?.returnRate ?? 0}%` },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-1"
                  >
                    <span className="text-[#71717A]">{metric.label}</span>
                    <div className="font-mono-num text-2xl font-bold text-[#18181B]">
                      {metric.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 12: DIRECT UPI & UTR RECONCILIATION LEDGER */}
          {activeTab === 'upi' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-3xl font-semibold">
                      Direct UPI & Bank UTR Ledger
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-800 font-semibold border border-emerald-500/20">
                      Merchant VPA
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] mt-0.5">
                    Real-time transaction log for Direct UPI orders (GPay, PhonePe, Paytm, BHIM). Inspect 12-digit NPCI Bank UTRs and reconcile against merchant bank statements.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#FAF8F5] border border-[#18181B]/15 px-3 py-1.5 rounded-lg text-xs font-mono-num flex items-center gap-2">
                    <span className="text-[#71717A]">Merchant VPA:</span>
                    <strong className="text-[#9A3412]">ahuzawear@upi</strong>
                  </div>
                  <button
                    type="button"
                    onClick={fetchOwnerDashboardData}
                    className="p-2 bg-white border border-[#18181B]/15 hover:bg-[#F9F8F6] rounded-lg text-xs flex items-center gap-1.5 font-medium cursor-pointer"
                    title="Refresh Ledger"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingOwnerData ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-1">
                  <span className="text-[#71717A]">Total UPI Volume</span>
                  <div className="font-mono-num text-2xl font-bold text-[#18181B]">
                    ₹{ownerUpiPayments
                      .filter((p) => p.paymentStatus === 'SUCCESS')
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-emerald-700">Verified & Settled</span>
                </div>

                <div className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-1">
                  <span className="text-[#71717A]">Pending Reconciliations</span>
                  <div className="font-mono-num text-2xl font-bold text-amber-600">
                    {ownerUpiPayments.filter((p) => p.paymentStatus === 'PENDING').length}
                  </div>
                  <span className="text-[10px] text-amber-700">Awaiting UTR / Match</span>
                </div>

                <div className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-1">
                  <span className="text-[#71717A]">Verified Orders</span>
                  <div className="font-mono-num text-2xl font-bold text-emerald-700">
                    {ownerUpiPayments.filter((p) => p.paymentStatus === 'SUCCESS').length}
                  </div>
                  <span className="text-[10px] text-[#71717A]">Confirmed & Dispatched</span>
                </div>

                <div className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-1">
                  <span className="text-[#71717A]">Expired Sessions</span>
                  <div className="font-mono-num text-2xl font-bold text-[#71717A]">
                    {ownerUpiPayments.filter((p) => p.paymentStatus === 'EXPIRED').length}
                  </div>
                  <span className="text-[10px] text-[#71717A]">15-min Window Closed</span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-[#18181B]/10 pb-3 text-xs">
                {(['ALL', 'PENDING', 'SUCCESS', 'EXPIRED', 'CANCELLED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setUpiFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      upiFilter === st
                        ? 'bg-[#18181B] text-white'
                        : 'bg-white border border-[#18181B]/10 text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    {st === 'ALL' ? 'All Payments' : st}
                    <span className="ml-1.5 font-mono-num text-[11px] opacity-75">
                      (
                      {st === 'ALL'
                        ? ownerUpiPayments.length
                        : ownerUpiPayments.filter((p) => p.paymentStatus === st).length}
                      )
                    </span>
                  </button>
                ))}
              </div>

              {/* Payments List */}
              <div className="bg-white border border-[#18181B]/10 rounded-xl overflow-hidden shadow-xs">
                {ownerUpiPayments.filter((p) => upiFilter === 'ALL' || p.paymentStatus === upiFilter).length === 0 ? (
                  <div className="p-12 text-center text-[#71717A] text-xs space-y-2">
                    <Smartphone className="w-8 h-8 mx-auto opacity-40" />
                    <p>No UPI payments match the selected filter ({upiFilter}).</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#18181B]/8">
                    {ownerUpiPayments
                      .filter((p) => upiFilter === 'ALL' || p.paymentStatus === upiFilter)
                      .map((pay) => (
                        <div
                          key={pay.id}
                          className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#FDFCFB] transition-colors"
                        >
                          <div className="space-y-1.5 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-num font-bold text-sm text-[#18181B]">
                                {pay.internalOrderId}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono-num font-semibold ${
                                  pay.paymentStatus === 'SUCCESS'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : pay.paymentStatus === 'PENDING'
                                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                                    : pay.paymentStatus === 'EXPIRED'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {pay.paymentStatus}
                              </span>
                              <span className="text-[11px] text-[#71717A] font-mono-num">
                                Ref: {pay.transactionRef}
                              </span>
                              <span className="text-[11px] text-[#71717A]">
                                App: <strong className="capitalize">{pay.selectedUpiApp || 'QR'}</strong>
                              </span>
                            </div>

                            <div className="text-[#52525B]">
                              Customer: <strong>{pay.customerName}</strong> ({pay.customerPhone} · {pay.customerEmail})
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px]">
                              <span>
                                Bank UTR (12-Digit):{' '}
                                {pay.utrNumber ? (
                                  <strong className="font-mono-num text-[#9A3412] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#18181B]/15">
                                    {pay.utrNumber}
                                  </strong>
                                ) : (
                                  <em className="text-[#A1A1AA]">Not yet submitted</em>
                                )}
                              </span>

                              {pay.payerUpiId && (
                                <span>
                                  Payer VPA: <strong className="font-mono-num">{pay.payerUpiId}</strong>
                                </span>
                              )}

                              <span className="text-[#71717A]">
                                Created: {new Date(pay.createdAt).toLocaleString('en-IN')}
                              </span>

                              {pay.verifiedAt && (
                                <span className="text-emerald-700 font-medium">
                                  Verified: {new Date(pay.verifiedAt).toLocaleString('en-IN')} (by {pay.verifiedBy})
                                </span>
                              )}
                            </div>

                            {pay.verificationNotes && (
                              <div className="text-[11px] text-[#71717A] italic bg-[#F9F8F6] p-2 rounded border border-[#18181B]/5">
                                Note: {pay.verificationNotes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="font-mono-num font-bold text-lg text-[#18181B]">
                                ₹{pay.amount.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-[#71717A]">Direct Merchant VPA</div>
                            </div>

                            {pay.paymentStatus === 'PENDING' && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={Boolean(reconcileActionLoading)}
                                  onClick={() => handleReconcileUpi(pay.internalOrderId, 'APPROVE')}
                                  className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{reconcileActionLoading === pay.internalOrderId ? '...' : 'Approve & Settle'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={Boolean(reconcileActionLoading)}
                                  onClick={() => handleReconcileUpi(pay.internalOrderId, 'REJECT')}
                                  className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-semibold cursor-pointer transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 13: GOOGLE APPS SCRIPT WEBHOOK SETTINGS & TESTING PANEL */}
          {activeTab === 'webhook' && (
            <AdminWebhookSettingsPanel token={token || ''} showToast={showToast} />
          )}

          {/* TAB 14: AI MARKETING AUTOMATION & ZAPIER-ALTERNATIVE DASHBOARD */}
          {(activeTab === 'automation' || activeTab === 'marketing') && (
            <MarketingAutomationDashboard token={token || ''} showToast={showToast} />
          )}
        </main>
      </div>

      {/* Cloth Image Editor Modal for Owner */}
      {clothEditorProduct && (
        <ClothImageEditorModal
          product={clothEditorProduct}
          isOpen={Boolean(clothEditorProduct)}
          onClose={() => setClothEditorProduct(null)}
          onSaved={(updated) => {
            setClothEditorProduct(null);
            refreshCatalog();
            if (editingProduct && editingProduct.id === updated.id) {
              setEditingProduct(updated);
            }
          }}
        />
      )}
    </div>
  );
};
