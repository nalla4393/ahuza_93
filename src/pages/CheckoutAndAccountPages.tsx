import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Heart,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Truck,
  Upload,
} from 'lucide-react';
import { DocumentHead } from '../components/Layout';
import { SafeImage } from '../components/SafeImage';
import { ThreeFashionCanvas } from '../components/ThreeFashionCanvas';
import { useStore } from '../context/StoreContext';
import { Address, Order, OrderStatus, Payment, Refund, ReturnRequest } from '../types';
import { ProductCard } from './StorefrontPages';
import { generateInvoicePdf } from '../utils/generateInvoicePdf';
import { DirectUpiPaymentModal, UpiPaymentOrderData } from '../components/DirectUpiPaymentModal';
import { ApiIntegrationCheckoutForm } from '../components/ApiIntegrationCheckoutForm';

export const OrderTimelineVisual: React.FC<{ order: Order; onRequestReturn?: () => void }> = ({
  order,
  onRequestReturn,
}) => {
  // Map internal order status into the 4 canonical customer milestones:
  // 1. Order Placed, 2. Shipped, 3. Out for Delivery, 4. Delivered
  let stepIndex = 0;
  if (['Shipped'].includes(order.status)) {
    stepIndex = 1;
  } else if (['Out for Delivery'].includes(order.status)) {
    stepIndex = 2;
  } else if (['Delivered'].includes(order.status)) {
    stepIndex = 3;
  } else if (['Pending', 'Confirmed', 'Packed', 'Paid'].includes(order.status)) {
    stepIndex = 0;
  }

  const isSpecialStatus = [
    'Cancellation Requested',
    'Cancelled',
    'Return Requested',
    'Return Approved',
    'Return Picked Up',
    'Refund Processing',
    'Refunded',
  ].includes(order.status);

  const milestones = [
    { label: 'Order Placed', desc: 'Verified & Packed' },
    { label: 'Shipped', desc: 'Dispatched via Express' },
    { label: 'Out for Delivery', desc: 'With Courier Agent' },
    { label: 'Delivered', desc: 'Package Handed Over' },
  ];

  return (
    <div className="space-y-4">
      {isSpecialStatus && (
        <div className="px-4 py-2.5 bg-[#EBF2E8] border border-[#4E7245]/30 rounded-xl text-xs text-[#2F472B] font-medium flex items-center justify-between">
          <span>Current Lifecycle State: <strong>{order.status}</strong></span>
          <span className="text-[11px] bg-white/70 px-2 py-0.5 rounded border border-[#4E7245]/20 font-mono">
            Updated Real-Time
          </span>
        </div>
      )}

      {/* 4 Core Real-Time Milestones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {milestones.map((m, idx) => {
          const isDone = !isSpecialStatus && idx <= stepIndex;
          const isCurrent = !isSpecialStatus && idx === stepIndex;
          return (
            <div
              key={m.label}
              className={`p-3.5 rounded-xl border text-xs transition-all relative overflow-hidden ${
                isCurrent
                  ? 'bg-[#EBF2E8] border-[#4E7245] shadow-xs ring-1 ring-[#4E7245]/20 text-[#1E293B]'
                  : isDone
                  ? 'bg-[#4E7245] text-white border-[#4E7245]'
                  : 'bg-[#F8FAF7] text-[#64748B] border-[#1E293B]/10'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`font-mono-num text-[10px] font-bold ${isDone && !isCurrent ? 'text-[#D1E7DD]' : 'text-[#4E7245]'}`}>
                  0{idx + 1}
                </span>
                {isDone && <CheckCircle2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#4E7245]' : 'text-white'}`} />}
              </div>
              <p className="font-semibold text-[13px]">{m.label}</p>
              <p className={`text-[11px] mt-0.5 ${isDone && !isCurrent ? 'text-[#E2ECE0]' : 'text-[#64748B]'}`}>
                {m.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Delivery Timelines & Tracking Info */}
      {order.shipment && (
        <div className="p-3.5 bg-[#F4F7F2] border border-[#4E7245]/20 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 text-[#334155]">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#4E7245]" />
            <span>Courier: <strong className="text-[#1E293B]">{order.shipment.courierName}</strong></span>
            <span aria-hidden="true">·</span>
            <span>AWB: <strong className="font-mono text-[#4E7245]">{order.shipment.trackingNumber}</strong></span>
          </div>
          <div>
            <span>Estimated Delivery: <strong className="text-[#1E293B]">{order.shipment.estimatedDelivery}</strong></span>
          </div>
        </div>
      )}

      {/* Detailed Chronological Log */}
      <div className="pt-2 space-y-2 border-t border-[#1E293B]/10 text-xs">
        <p className="font-semibold text-[#1E293B] text-[11px] uppercase tracking-wider">Live Tracking Timeline:</p>
        {order.timeline.map((entry, idx) => (
          <div key={idx} className="flex items-start justify-between gap-4 text-[#64748B]">
            <div>
              <span className="font-semibold text-[#1E293B]">{entry.status}</span> — {entry.note}
              {entry.location && <span className="text-[#4E7245] font-medium"> ({entry.location})</span>}
            </div>
            <span className="font-mono-num text-[11px] shrink-0 text-[#94A3B8]">
              {new Date(entry.timestamp).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 6. WISHLIST PAGE (/wishlist)
// ============================================================================
export const WishlistPage: React.FC = () => {
  const { user, wishlist, toggleWishlist, moveWishlistToCart, showToast } = useStore();

  const handleMoveAllToCart = () => {
    wishlist.forEach((w) => {
      if (w.product) moveWishlistToCart(w.product.id);
    });
    showToast('All saved items moved to shopping bag!');
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 space-y-8">
      <DocumentHead title="My Saved Wishlist — Ahuza" />
      <div className="border-b border-[#1E293B]/10 pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[#4E7245] font-semibold uppercase tracking-wider">Saved Everyday Wardrobe</p>
          <h1 className="font-display text-4xl font-semibold text-[#1E293B] mt-1">My Wishlist</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Keep track of pure cotton Kurtis, Sets, and Men’s Kurtas under ₹2,000 for effortless purchase.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono-num text-xs font-semibold px-2.5 py-1 bg-[#EBF2E8] text-[#4E7245] rounded-lg border border-[#4E7245]/20">
            {wishlist.length} saved items
          </span>
          {wishlist.length > 0 && (
            <button
              type="button"
              onClick={handleMoveAllToCart}
              className="px-4 py-1.5 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              Move All to Bag
            </button>
          )}
        </div>
      </div>

      {!user ? (
        <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#EBF2E8] text-[#4E7245] flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-[#1E293B]">
            Sign In to View Your Saved Wishlist
          </h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
            Your saved pieces persist across devices when logged into your AHUZA account. Save favorites and move them to cart with a single click.
          </p>
          <Link
            to="/login?redirect=/wishlist"
            className="inline-block px-7 py-3 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Sign In to Continue
          </Link>
        </div>
      ) : wishlist.length === 0 ? (
        <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-14 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#F4F7F2] text-[#4E7245] flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-[#1E293B]">Your Wishlist is Empty</h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
            Browse our everyday Kurtis, Kurta Sets with Dupatta, and Men’s Kurtas under ₹2,000 and click the heart icon on any product to save it here.
          </p>
          <Link
            to="/women"
            className="inline-block px-7 py-3 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Explore Collections
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {wishlist.map(
            (w) =>
              w.product && (
                <div
                  key={w.id}
                  className="bg-white border border-[#1E293B]/10 rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md"
                >
                  <Link to={`/product/${w.product.id}`} className="aspect-[3/4] bg-[#F4F7F2] block relative overflow-hidden group">
                    <SafeImage
                      src={w.product.images[0]?.url}
                      alt={w.product.name}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                  </Link>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-xs text-[#64748B]">{w.product.categories.join(' · ')}</p>
                      <Link
                        to={`/product/${w.product.id}`}
                        className="text-base font-semibold text-[#1E293B] hover:text-[#4E7245] block mt-0.5 line-clamp-1 transition-colors"
                      >
                        {w.product.name}
                      </Link>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-mono-num text-sm font-semibold text-[#1E293B]">
                          ₹{w.product.discountPrice.toLocaleString('en-IN')}
                        </span>
                        {w.product.price > w.product.discountPrice && (
                          <span className="font-mono-num text-xs text-[#94A3B8] line-through">
                            ₹{w.product.price.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-[#4E7245] bg-[#EBF2E8] px-1.5 py-0.2 rounded">
                          Under ₹2,000
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1E293B]/10">
                      <button
                        type="button"
                        onClick={() => moveWishlistToCart(w.product!.id)}
                        className="py-2.5 px-3 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#A3D9A5]" />
                        <span>Move to Bag</span>
                      </button>
                      <Link
                        to={`/product/${w.product!.id}`}
                        className="py-2.5 px-3 bg-[#F4F7F2] hover:bg-[#EBF2E8] text-[#1E293B] text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#4E7245]" />
                        <span>View Details</span>
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(w.product!)}
                      className="text-xs text-[#64748B] hover:text-red-700 flex items-center gap-1 transition-colors pt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Remove from Wishlist</span>
                    </button>
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 7. CART PAGE (/cart)
// ============================================================================
export const CartPage: React.FC = () => {
  const { cart, updateCartQuantity, removeFromCart, applyCoupon } = useStore();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState(cart.couponCode || '');
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const hasOutOfStock = cart.items.some((i) => !i.product || i.product.stock <= 0);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await applyCoupon(couponInput);
    setCouponMsg(res.message);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 space-y-8">
      <DocumentHead title="Shopping Bag" />
      <div className="border-b border-[#18181B]/10 pb-5">
        <h1 className="font-display text-4xl font-semibold text-[#18181B]">Your Shopping Bag</h1>
        <p className="text-xs text-[#52525B] mt-1">
          Complimentary express delivery across India on orders above ₹999
        </p>
      </div>

      {cart.items.length === 0 ? (
        <div className="bg-white border border-[#18181B]/10 rounded-xl p-14 text-center space-y-4">
          <ShoppingBag className="w-10 h-10 text-[#9A3412] mx-auto" />
          <h2 className="font-display text-3xl font-semibold text-[#18181B]">Your bag is empty</h2>
          <p className="text-xs text-[#52525B] max-w-md mx-auto">
            Browse our Women’s and Men’s everyday collections—every piece is crafted in breathable fabrics and priced strictly under ₹2,000.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/women" className="px-6 py-2.5 bg-[#18181B] text-white text-xs font-semibold rounded-lg">
              Shop Women
            </Link>
            <Link to="/men" className="px-6 py-2.5 bg-[#9A3412] text-white text-xs font-semibold rounded-lg">
              Shop Men
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#18181B]/10 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <SafeImage
                    src={item.product?.images[0]?.url}
                    alt={item.product?.name}
                    className="w-20 h-24 object-cover rounded border border-[#18181B]/10 shrink-0"
                  />
                  <div className="space-y-1">
                    <Link
                      to={`/product/${item.productId}`}
                      className="text-base font-semibold text-[#1E293B] hover:text-[#4E7245] transition-colors"
                    >
                      {item.product?.name}
                    </Link>
                    <p className="text-xs text-[#64748B]">
                      SKU: <span className="font-mono-num">{item.product?.sku}</span> · Size{' '}
                      <strong className="text-[#1E293B]">{item.size}</strong> · Color <strong className="text-[#1E293B]">{item.color}</strong>
                    </p>
                    <p className="text-xs text-[#64748B]">{item.product?.fabric}</p>
                    {item.product && item.product.stock <= 0 && (
                      <p className="text-xs text-red-700 font-semibold">
                        Currently Out of Stock — Please remove to proceed
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  <div className="flex items-center border border-[#1E293B]/15 rounded-xl bg-[#F8FAF7]">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      className="p-2 text-[#1E293B] hover:text-[#4E7245]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 font-mono-num text-xs font-semibold text-[#1E293B]">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      className="p-2 text-[#1E293B] hover:text-[#4E7245]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[90px]">
                    <p className="font-mono-num text-sm font-semibold text-[#1E293B]">
                      ₹{((item.product?.discountPrice || 0) * item.quantity).toLocaleString('en-IN')}
                    </p>
                    {item.product && item.product.price > item.product.discountPrice && (
                      <p className="font-mono-num text-xs text-[#94A3B8] line-through">
                        ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-[#94A3B8] hover:text-red-700 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4 bg-white border border-[#1E293B]/10 rounded-2xl p-6 space-y-5 h-fit shadow-xs">
            <h2 className="font-display text-2xl font-semibold text-[#1E293B]">Order Summary</h2>

            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <label className="block text-xs text-[#64748B]">Promotional Coupon (Try AHUZA10 or FIRST150)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 text-xs font-mono-num bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-xl whitespace-nowrap transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponMsg && <p className="text-xs text-[#4E7245] font-medium">{couponMsg}</p>}
            </form>

            <div className="space-y-2.5 text-xs pt-3 border-t border-[#1E293B]/10">
              <div className="flex justify-between text-[#64748B]">
                <span>Subtotal (MRP)</span>
                <span className="font-mono-num text-[#1E293B]">₹{cart.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#4E7245] font-semibold">
                <span>Product Discount</span>
                <span className="font-mono-num">-₹{cart.productDiscount.toLocaleString('en-IN')}</span>
              </div>
              {cart.couponDiscount > 0 && (
                <div className="flex justify-between text-[#4E7245] font-semibold">
                  <span>Coupon Discount ({cart.couponCode})</span>
                  <span className="font-mono-num">-₹{cart.couponDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-[#64748B]">
                <span>Shipping (Express India)</span>
                <span className="font-mono-num">
                  {cart.shipping === 0 ? 'FREE' : `₹${cart.shipping}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold text-[#1E293B] pt-3 border-t border-[#1E293B]/10">
                <span>Grand Total</span>
                <span className="font-mono-num text-[#4E7245]">₹{cart.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={hasOutOfStock}
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 px-5 bg-[#4E7245] hover:bg-[#375330] disabled:opacity-50 text-white text-xs font-semibold tracking-wider rounded-xl transition-colors shadow-xs"
            >
              {hasOutOfStock ? 'REMOVE OUT-OF-STOCK ITEMS TO PROCEED' : 'PROCEED TO SECURE CHECKOUT'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 8. CHECKOUT & SERVER-SIDE RAZORPAY PAYMENT GATEWAY (/checkout)
// ============================================================================
export const CheckoutPage: React.FC = () => {
  const { user, token, cart, refreshCatalog, trackEvent, showToast } = useStore();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+91 ');
  const [line1, setLine1] = useState(user?.addresses[0]?.line1 || '');
  const [city, setCity] = useState(user?.addresses[0]?.city || 'Mumbai');
  const [stateName, setStateName] = useState(user?.addresses[0]?.state || 'Maharashtra');
  const [postalCode, setPostalCode] = useState(user?.addresses[0]?.postalCode || '400013');
  const [paymentMethod, setPaymentMethod] = useState<Payment['method']>('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'generic'>('gpay');
  const [upiOrderData, setUpiOrderData] = useState<UpiPaymentOrderData | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<'cart' | 'quick_sku'>('cart');

  const [gatewayModal, setGatewayModal] = useState<{
    open: boolean;
    razorpayOrderId: string;
    amount: number;
    isDemoMode: boolean;
    demoGatewayPayload?: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };
  } | null>(null);

  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent('checkout_start');
  }, [trackEvent]);

  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.name);
      setPhone((prev) => (prev && prev !== '+91 ' ? prev : user.phone || '+91 98201 12026'));
      if (user.addresses[0]) {
        setLine1(user.addresses[0].line1);
        setCity(user.addresses[0].city);
        setStateName(user.addresses[0].state);
        setPostalCode(user.addresses[0].postalCode);
      }
    }
  }, [user]);

  if (!user || !token) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <Lock className="w-10 h-10 text-[#4E7245] mx-auto" />
        <h1 className="font-display text-3xl font-semibold text-[#1E293B]">
          Sign In to Complete Your Checkout
        </h1>
        <p className="text-xs text-[#64748B]">
          Please sign in or create an account so we can link your order, payment verification receipt, and live shipment tracking.
        </p>
        <Link
          to="/login?redirect=/checkout"
          className="inline-block px-7 py-3 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          Sign In / Register
        </Link>
      </div>
    );
  }

  if (confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-14 space-y-8">
        <DocumentHead title={`Order Confirmed ${confirmedOrder.orderNumber}`} />
        <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-8 space-y-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-[#1E293B]/10 pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#2F472B] bg-[#EBF2E8] px-3 py-1 rounded-full border border-[#4E7245]/20">
                <CheckCircle2 className="w-4 h-4 text-[#4E7245]" />
                <span>Payment Verified Server-Side · Order Confirmed</span>
              </div>
              <h1 className="font-display text-4xl font-semibold text-[#1E293B]">
                Thank You, {confirmedOrder.customerName}
              </h1>
              <p className="text-xs text-[#64748B]">
                Order ID:{' '}
                <strong className="font-mono-num text-[#1E293B]">{confirmedOrder.orderNumber}</strong>
                {confirmedOrder.payment.utrNumber ? (
                  <> · Bank UTR: <span className="font-mono-num font-semibold text-[#1E293B]">{confirmedOrder.payment.utrNumber}</span> (Direct UPI Verified)</>
                ) : (
                  <> · Ref: <span className="font-mono-num">{confirmedOrder.payment.razorpayPaymentId || confirmedOrder.payment.id}</span></>
                )}
                {confirmedOrder.payment.isDemoMode && ' (DEMO MODE)'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => generateInvoicePdf(confirmedOrder)}
                className="py-2.5 px-4 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#A3D9A5]" />
                <span>Download Invoice PDF</span>
              </button>
              <Link
                to="/orders"
                className="py-2.5 px-4 bg-[#F8FAF7] hover:bg-[#EBF2E8] text-[#1E293B] border border-[#1E293B]/15 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors"
              >
                View in My Orders
              </Link>
            </div>
          </div>

          <OrderTimelineVisual order={confirmedOrder} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#18181B]/10 text-xs">
            <div>
              <h3 className="font-semibold text-[#18181B] mb-1">Delivery Address</h3>
              <p className="text-[#52525B]">
                {confirmedOrder.shippingAddress.fullName} ({confirmedOrder.shippingAddress.phone})
                <br />
                {confirmedOrder.shippingAddress.line1}, {confirmedOrder.shippingAddress.city},{' '}
                {confirmedOrder.shippingAddress.state} — {confirmedOrder.shippingAddress.postalCode}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#18181B] mb-1">Courier & Dispatch</h3>
              <p className="text-[#52525B]">
                {confirmedOrder.shipment.courierName}
                <br />
                AWB Tracking: <strong className="font-mono-num">{confirmedOrder.shipment.trackingNumber}</strong>
                <br />
                Estimated Delivery: {confirmedOrder.shipment.estimatedDelivery}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleInitiateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const addressPayload: Address = {
        id: `addr_${Date.now()}`,
        label: 'Primary',
        fullName,
        phone,
        line1,
        city,
        state: stateName,
        postalCode,
        isDefault: true,
      };

      if (paymentMethod === 'UPI') {
        const res = await fetch('/api/upi/create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            shippingAddress: addressPayload,
            selectedUpiApp,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Could not initiate UPI payment order.', 'error');
          return;
        }

        setUpiOrderData({
          internalOrderId: data.internalOrderId,
          transactionRef: data.transactionRef,
          amount: data.amount,
          currency: data.currency,
          merchantUPIId: data.merchantUPIId,
          merchantName: data.merchantName,
          upiUri: data.upiUri,
          qrCodeDataUrl: data.qrCodeDataUrl,
          deepLinks: data.deepLinks,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
          sessionTtlMinutes: data.sessionTtlMinutes || 15,
        });
        return;
      }

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shippingAddress: addressPayload,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not initiate payment order.', 'error');
        return;
      }

      setGatewayModal({
        open: true,
        razorpayOrderId: data.razorpayOrderId,
        amount: data.amount,
        isDemoMode: data.isDemoMode,
        demoGatewayPayload: data.demoGatewayPayload,
      });
    } catch {
      showToast('Network error while creating payment order.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPaymentOnServer = async () => {
    if (!gatewayModal || !gatewayModal.demoGatewayPayload) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(gatewayModal.demoGatewayPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Payment verification failed.', 'error');
        return;
      }
      setGatewayModal(null);
      setConfirmedOrder(data.order);
      await refreshCatalog();
      showToast(`Order ${data.order.orderNumber} confirmed!`);
    } catch {
      showToast('Error verifying payment on server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 space-y-8">
      <DocumentHead title="Secure Direct UPI Checkout — AHUZA" />
      <div className="border-b border-[#18181B]/10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-[#18181B]">Secure Checkout</h1>
          <p className="text-xs text-[#52525B] mt-1">
            Direct Merchant UPI payment (GPay, PhonePe, Paytm, BHIM) · Server-verified via NPCI Bank UTR
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-mono-num font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            DIRECT UPI ACTIVE
          </span>
        </div>
      </div>

      {/* Checkout Mode Selector */}
      <div className="flex items-center gap-2 bg-[#F2EFE9] p-1.5 rounded-xl w-fit text-xs font-semibold">
        <button
          type="button"
          onClick={() => setCheckoutMode('cart')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            checkoutMode === 'cart'
              ? 'bg-white text-[#18181B] shadow-xs'
              : 'text-[#71717A] hover:text-[#18181B]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Shopping Bag Checkout ({cart.items.length} items)</span>
        </button>
        <button
          type="button"
          onClick={() => setCheckoutMode('quick_sku')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            checkoutMode === 'quick_sku'
              ? 'bg-[#18181B] text-white shadow-xs'
              : 'text-[#71717A] hover:text-[#18181B]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FED7AA]" />
          <span>Quick SKU & Webhook Checkout</span>
        </button>
      </div>

      {checkoutMode === 'quick_sku' ? (
        <div className="max-w-2xl mx-auto py-2">
          <ApiIntegrationCheckoutForm
            onOrderCompleted={(data) => {
              if (data.order) {
                setConfirmedOrder(data.order);
              }
            }}
          />
        </div>
      ) : (
      <form onSubmit={handleInitiateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#18181B]">
              01. Shipping Address (India)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#52525B] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[#52525B] mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[#52525B] mb-1">Flat, Building, Street Address *</label>
                <input
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="e.g., Flat 402, Gulmohar Terrace, Koregaon Park"
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[#52525B] mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#52525B] mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[#52525B] mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                02. Payment Method
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold">
                Direct UPI · 0% Gateway Fee
              </span>
            </div>

            {/* Direct UPI Box - Primary Recommended Option */}
            <div
              onClick={() => setPaymentMethod('UPI')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                paymentMethod === 'UPI'
                  ? 'border-[#9A3412] bg-[#FAF8F5]'
                  : 'border-[#18181B]/15 bg-white hover:border-[#18181B]/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === 'UPI' ? 'border-[#9A3412]' : 'border-[#A1A1AA]'
                    }`}
                  >
                    {paymentMethod === 'UPI' && <div className="w-2.5 h-2.5 bg-[#9A3412] rounded-full" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#18181B] flex items-center gap-2">
                      <span>Pay with UPI</span>
                      <span className="text-[10px] bg-[#9A3412] text-white px-1.5 py-0.5 rounded font-mono font-medium">
                        RECOMMENDED
                      </span>
                    </h3>
                    <p className="text-xs text-[#52525B] mt-0.5">
                      Pay using Google Pay, PhonePe, Paytm, BHIM, or Scan & Pay via any bank UPI application.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono-num font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Instant & Direct
                  </span>
                </div>
              </div>

              {/* Supported UPI Apps Pills */}
              <div className="mt-3.5 pt-3 border-t border-[#18181B]/10 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#71717A] font-medium mr-1">Choose App:</span>
                {[
                  { id: 'gpay', name: 'Google Pay', badge: 'Google Pay' },
                  { id: 'phonepe', name: 'PhonePe', badge: 'PhonePe' },
                  { id: 'paytm', name: 'Paytm', badge: 'Paytm' },
                  { id: 'bhim', name: 'BHIM UPI', badge: 'BHIM' },
                  { id: 'generic', name: 'Other Bank Apps', badge: 'Other UPI Apps' },
                ].map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentMethod('UPI');
                      setSelectedUpiApp(app.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      paymentMethod === 'UPI' && selectedUpiApp === app.id
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-white text-[#18181B] border-[#18181B]/15 hover:border-[#18181B]/40'
                    }`}
                  >
                    <span>{app.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Other Payment Options */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] text-[#71717A] font-medium block">Other Payment Options:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Credit Card', 'Debit Card', 'Net Banking', 'Wallet'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-colors cursor-pointer ${
                      paymentMethod === m
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-[#F9F8F6] text-[#18181B] border-[#18181B]/15 hover:border-[#18181B]/40'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#FAF8F5] border border-[#18181B]/10 rounded-lg p-3 text-[11px] text-[#52525B] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
              <span>
                <strong>Direct UPI Gateway:</strong> Orders are verified server-side with standard NPCI 12-digit Bank UTR confirmation. No third-party gateway surcharge or payment deduction lockups.
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-5 h-fit">
          <h2 className="font-display text-2xl font-semibold text-[#18181B]">Order Summary</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs gap-3">
                <div className="truncate">
                  <span className="font-semibold text-[#18181B]">{item.product?.name}</span>
                  <span className="text-[#52525B]">
                    {' '}
                    × {item.quantity} ({item.size}, {item.color})
                  </span>
                </div>
                <span className="font-mono-num font-semibold shrink-0">
                  ₹{((item.product?.discountPrice || 0) * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs pt-3 border-t border-[#18181B]/10">
            <div className="flex justify-between text-[#52525B]">
              <span>Subtotal (MRP)</span>
              <span className="font-mono-num">₹{cart.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Total Savings</span>
              <span className="font-mono-num">
                -₹{(cart.productDiscount + cart.couponDiscount).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-[#52525B]">
              <span>Shipping</span>
              <span className="font-mono-num">{cart.shipping === 0 ? 'FREE' : `₹${cart.shipping}`}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-[#18181B] pt-2 border-t border-[#18181B]/10">
              <span>Payable Amount</span>
              <span className="font-mono-num">₹{cart.grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || cart.items.length === 0}
            className="w-full py-3.5 px-5 bg-[#9A3412] hover:bg-[#7C2D12] disabled:opacity-50 text-white text-xs font-semibold tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            {paymentMethod === 'UPI' ? <Smartphone className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            <span>
              {submitting
                ? 'Generating Payment Request...'
                : paymentMethod === 'UPI'
                ? `Pay ₹${cart.grandTotal.toLocaleString('en-IN')} with UPI (GPay, PhonePe, Paytm, QR)`
                : `Pay ₹${cart.grandTotal.toLocaleString('en-IN')} via ${paymentMethod}`}
            </span>
          </button>
        </div>
      </form>
      )}

      {/* Direct UPI Modal with QR Code, App Deep Links & Bank UTR Verification */}
      {upiOrderData && (
        <DirectUpiPaymentModal
          open={Boolean(upiOrderData)}
          onClose={() => setUpiOrderData(null)}
          orderData={upiOrderData}
          token={token}
          showToast={showToast}
          onPaymentSuccess={async (order) => {
            setUpiOrderData(null);
            setConfirmedOrder(order);
            await refreshCatalog();
            showToast(`Order ${order.orderNumber} confirmed!`);
          }}
          onPaymentCancel={() => {
            setUpiOrderData(null);
          }}
        />
      )}

      {/* Legacy Gateway Modal */}
      {gatewayModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 border border-[#18181B]/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#18181B]/10 pb-3">
              <div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-mono-num font-semibold">
                  GATEWAY DEMO
                </span>
                <h3 className="font-display text-2xl font-semibold text-[#18181B] mt-1">
                  AHUZA Apparel Checkout
                </h3>
              </div>
              <span className="font-mono-num text-xl font-semibold text-[#9A3412]">
                ₹{gatewayModal.amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-[#F9F8F6] p-3.5 rounded-lg border border-[#18181B]/10 text-xs space-y-1">
              <p>
                Server Order ID:{' '}
                <strong className="font-mono-num">{gatewayModal.razorpayOrderId}</strong>
              </p>
              <p>Selected Method: <strong>{paymentMethod}</strong></p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={handleVerifyPaymentOnServer}
                className="flex-1 py-3 px-4 bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-semibold rounded-lg"
              >
                {submitting ? 'Verifying...' : 'Authorize & Verify'}
              </button>
              <button
                type="button"
                onClick={() => setGatewayModal(null)}
                className="py-3 px-4 bg-[#F2EFE9] text-[#18181B] text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 9 & 10. LOGIN (/login) & SIGN UP (/signup) + FORGOT PASSWORD
// ============================================================================
export const AuthPage: React.FC<{ initialMode: 'login' | 'signup' }> = ({ initialMode }) => {
  const { login, signup, loginWithGoogle, websiteContent, showToast } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/account';

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Forgot/Reset password state
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (!res.ok) setError(res.error || 'Login failed');
        else navigate(res.user?.role === 'owner' && redirectTo === '/account' ? '/owner' : redirectTo);
      } else if (mode === 'signup') {
        const res = await signup(name, email, phone, password);
        if (!res.ok) setError(res.error || 'Registration failed');
        else navigate(redirectTo);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setResetSent(true);
    if (data.demoResetCode) {
      setResetCode(data.demoResetCode);
    }
    showToast('Verification code dispatched.');
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetCode, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not reset password');
      return;
    }
    showToast('Password updated! Please sign in.');
    setMode('login');
    setResetSent(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <DocumentHead title={mode === 'login' ? 'Sign In' : 'Create Account'} />
      <div className="bg-white border border-[#18181B]/10 rounded-xl p-8 space-y-6">
        <div className="text-center space-y-1.5">
          <p className="font-display text-3xl font-semibold text-[#18181B]">{websiteContent.brandName}</p>
          <p className="text-xs text-[#9A3412] italic">“{websiteContent.tagline}”</p>
          <h1 className="font-display text-2xl font-semibold text-[#18181B] pt-2">
            {mode === 'login'
              ? 'Sign In to Your Account'
              : mode === 'signup'
              ? 'Create Your AHUZA Account'
              : 'Reset Your Password'}
          </h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {mode === 'forgot' ? (
          !resetSent ? (
            <form onSubmit={handleSendResetCode} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#52525B] mb-1">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#18181B] text-white font-semibold rounded-lg"
              >
                Send Verification Code
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-[#52525B] hover:text-[#18181B]"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirmResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#52525B] mb-1">Verification Code</label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[#52525B] mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#9A3412] text-white font-semibold rounded-lg"
              >
                Save New Password
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[#52525B] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ananya Deshmukh"
                      className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[#52525B] mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98230 44510"
                      className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-[#52525B] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[#52525B]">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[#9A3412] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-[#4E7245] hover:bg-[#375330] text-white font-semibold rounded-xl transition-colors shadow-xs"
              >
                {busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              {mode === 'login' && (
                <div className="pt-2 border-t border-[#1E293B]/10 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('nallagondarosy@gmail.com');
                      setPassword('AhuzaOwner@2026');
                    }}
                    className="w-full py-2 px-3 bg-[#EBF2E8] hover:bg-[#D5E5CF] text-[#2F472B] font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-[#4E7245]/20 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#4E7245]" />
                    <span>Quick Fill: Store Owner (Rosy Nallagonda)</span>
                  </button>
                </div>
              )}
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#1E293B]/10" />
              <span className="flex-shrink mx-3 text-[11px] text-[#64748B]">OR</span>
              <div className="flex-grow border-t border-[#1E293B]/10" />
            </div>

            <button
              type="button"
              onClick={async () => {
                const res = await loginWithGoogle();
                if (res.ok) {
                  navigate(res.user?.role === 'owner' ? '/owner' : redirectTo);
                } else if (res.error) {
                  setError(res.error);
                }
              }}
              className="w-full py-2.5 px-4 bg-[#F8FAF7] hover:bg-[#EBF2E8] text-[#1E293B] text-xs font-semibold rounded-xl border border-[#1E293B]/15 transition-colors"
            >
              Continue with Google (Firebase Auth)
            </button>

            {/* Quick Demo Credentials for Instant Testing */}
            <div className="pt-3 border-t border-[#1E293B]/10 space-y-2 text-[11px] text-[#64748B]">
              <p className="font-semibold text-[#1E293B]">Instant Demo Sign-In:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await login('ananya@example.com', 'Customer@2026');
                    if (res.ok) navigate('/account');
                  }}
                  className="py-1.5 px-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-lg hover:border-[#4E7245] hover:text-[#4E7245] text-[#1E293B] font-medium transition-colors"
                >
                  Demo Customer
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await login('nallagondarosy@gmail.com', 'AhuzaOwner@2026');
                    if (res.ok) navigate('/owner?tab=analytics');
                  }}
                  className="py-1.5 px-2.5 bg-[#EBF2E8] border border-[#4E7245]/20 rounded-lg hover:bg-[#D5E5CF] text-[#2F472B] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <BarChart3 className="w-3 h-3 text-[#4E7245]" />
                  <span>Owner & Analytics</span>
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-[#64748B] pt-2">
              {mode === 'login' ? (
                <>
                  New to AHUZA?{' '}
                  <Link to="/signup" className="text-[#4E7245] font-semibold hover:underline">
                    Create an Account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link to="/login" className="text-[#4E7245] font-semibold hover:underline">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 11 & 12. MY ACCOUNT (/account) & MY ORDERS (/orders)
// ============================================================================
export const AccountAndOrdersPage: React.FC<{ defaultTab?: 'profile' | 'orders' }> = ({
  defaultTab = 'profile',
}) => {
  const { user, token, products, wishlist, logout, updateProfile } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>(defaultTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnsList, setReturnsList] = useState<ReturnRequest[]>([]);
  const [refundsList, setRefundsList] = useState<Refund[]>([]);

  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!token) return;
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');

    Promise.all([
      fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/returns', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([ordData, retData]) => {
        if (Array.isArray(ordData.orders)) setOrders(ordData.orders);
        if (Array.isArray(retData.returns)) setReturnsList(retData.returns);
        if (Array.isArray(retData.refunds)) setRefundsList(retData.refunds);
      })
      .catch(() => {});
  }, [token, user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold text-[#1E293B]">Please Sign In</h1>
        <Link
          to="/login"
          className="inline-block px-7 py-3 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          Sign In to My Account
        </Link>
      </div>
    );
  }

  const recentlyViewed = products.filter((p) =>
    (user.recentlyViewedProductIds || []).includes(p.id)
  );

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 space-y-8">
      <DocumentHead title={activeTab === 'orders' ? 'My Orders' : 'My Account'} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B]/10 pb-5">
        <div>
          <p className="text-xs text-[#4E7245] font-semibold uppercase tracking-wider">
            {user.role === 'owner' ? 'AHUZA Founder / Owner Account' : 'Verified Customer Account'}
          </p>
          <h1 className="font-display text-4xl font-semibold text-[#1E293B] mt-1">{user.name}</h1>
          <p className="text-xs text-[#64748B]">{user.email}</p>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'owner' && (
            <Link
              to="/owner?tab=analytics"
              className="py-2 px-4 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#A3D9A5]" />
              <span>Owner Studio & Analytics</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="py-2 px-4 bg-[#F4F7F2] hover:bg-[#EBF2E8] text-[#1E293B] text-xs font-semibold rounded-xl border border-[#1E293B]/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Exclusive Owner Management & Analytics Banner - Visible ONLY to Store Owner */}
      {user.role === 'owner' && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#2F472B] via-[#375330] to-[#4E7245] text-white border border-[#4E7245]/40 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-white text-[#2F472B] text-[10px] font-mono font-semibold uppercase tracking-wider">
                Verified Store Owner
              </span>
              <span className="text-xs text-[#D1E7DD]">Real-Time Store Operations & Telemetry</span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-white">
              AHUZA Owner Studio & Marketing Data Analytics
            </h2>
            <p className="text-xs text-[#D1E7DD] max-w-2xl leading-relaxed">
              Access the exclusive command center: live conversion funnel (Visitors → Views → Cart → Checkout → Purchase), order dispatch ledger, return approvals, discount coupons, and ₹2,000 price ceiling controls.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/owner?tab=analytics"
              className="py-2.5 px-5 bg-white hover:bg-[#F4F7F2] text-[#2F472B] text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02]"
            >
              <BarChart3 className="w-4 h-4 text-[#4E7245]" />
              <span>Open Marketing & Data Analytics</span>
            </Link>
            <Link
              to="/owner?tab=overview"
              className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors"
            >
              <span>Full Studio Overview</span>
            </Link>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-[#F4F7F2] p-1.5 rounded-xl w-fit border border-[#1E293B]/10">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'profile' ? 'bg-white text-[#1E293B] shadow-2xs font-semibold' : 'text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Profile, Addresses & Recently Viewed
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'orders' ? 'bg-white text-[#1E293B] shadow-2xs font-semibold' : 'text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          My Orders & Timeline ({orders.length})
        </button>
        <Link
          to="/returns"
          className="px-4 py-2 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#1E293B] transition-colors"
        >
          Returns & Refunds ({returnsList.length})
        </Link>
      </div>

      {activeTab === 'profile' ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfile({ name: editName, phone: editPhone });
              }}
              className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4 text-xs"
            >
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                Personal Information
              </h2>
              <div>
                <label className="block text-[#52525B] mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[#52525B] mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-[#18181B] text-white font-semibold rounded-lg"
              >
                Save Changes
              </button>
            </form>

            {/* Saved Addresses */}
            <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-4 text-xs">
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">Saved Addresses</h2>
              {user.addresses.length === 0 ? (
                <p className="text-[#52525B]">
                  Your shipping address will be saved automatically on your next checkout.
                </p>
              ) : (
                user.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3.5 bg-[#F9F8F6] border border-[#18181B]/10 rounded-lg space-y-1"
                  >
                    <p className="font-semibold text-[#18181B]">
                      {addr.fullName} · {addr.label}
                    </p>
                    <p className="text-[#52525B]">
                      {addr.line1}, {addr.city}, {addr.state} — {addr.postalCode}
                    </p>
                    <p className="font-mono-num text-[#52525B]">{addr.phone}</p>
                  </div>
                ))
              )}
            </div>

            {/* Account Summary */}
            <div className="bg-white border border-[#18181B]/10 rounded-xl p-6 space-y-3 text-xs">
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                Activity Summary
              </h2>
              <div className="flex justify-between py-2 border-b border-[#18181B]/8">
                <span className="text-[#52525B]">Total Orders</span>
                <span className="font-mono-num font-semibold">{orders.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#18181B]/8">
                <span className="text-[#52525B]">Saved Wishlist Items</span>
                <span className="font-mono-num font-semibold">{wishlist.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#18181B]/8">
                <span className="text-[#52525B]">Active Return/Refund Requests</span>
                <span className="font-mono-num font-semibold">{returnsList.length}</span>
              </div>
              <Link to="/returns" className="inline-block text-[#9A3412] font-semibold pt-2 hover:underline">
                Manage Cancellations, Returns & Refunds →
              </Link>
            </div>
          </div>

          {recentlyViewed.length > 0 && (
            <div className="space-y-5">
              <h2 className="font-display text-3xl font-semibold text-[#18181B]">
                Recently Viewed Products
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {recentlyViewed.slice(0, 3).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="bg-white border border-[#18181B]/10 rounded-xl p-12 text-center space-y-3">
              <Package className="w-10 h-10 text-[#9A3412] mx-auto" />
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">No orders yet</h2>
              <Link
                to="/women"
                className="inline-block px-5 py-2 bg-[#18181B] text-white text-xs font-semibold rounded-lg"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white border border-[#1E293B]/10 rounded-2xl p-6 space-y-6 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E293B]/10 pb-4">
                  <div>
                    <span className="font-mono-num text-sm font-semibold text-[#1E293B]">
                      {ord.orderNumber}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      {' '}
                      · Placed on {new Date(ord.createdAt).toLocaleDateString('en-IN')} · Total:{' '}
                      <strong className="font-mono-num text-[#4E7245]">
                        ₹{ord.totalAmount.toLocaleString('en-IN')}
                      </strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => generateInvoicePdf(ord)}
                      className="py-1.5 px-3 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      title={`Download Invoice PDF for order ${ord.orderNumber}`}
                    >
                      <Download className="w-3.5 h-3.5 text-[#A3D9A5]" />
                      <span>Download Invoice</span>
                    </button>
                    <Link
                      to={`/returns?orderId=${ord.orderNumber}`}
                      className="py-1.5 px-3 bg-[#F4F7F2] hover:bg-[#EBF2E8] text-[#1E293B] border border-[#1E293B]/10 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Request Return / Cancel
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ord.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-xs bg-[#F8FAF7] p-2.5 rounded-xl border border-[#1E293B]/10">
                      <SafeImage
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-14 h-16 object-cover rounded-lg border border-[#1E293B]/10 shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-[#1E293B]">{item.productName}</p>
                        <p className="text-[#64748B]">
                          Size {item.size} · {item.color} · Qty {item.quantity}
                        </p>
                        <p className="font-mono-num font-semibold text-[#4E7245]">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <OrderTimelineVisual order={ord} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 13. ORDER TRACKING PAGE (/track-order)
// ============================================================================
export const OrderTrackingPage: React.FC = () => {
  const { user, token, showToast } = useStore();
  const [orderNumber, setOrderNumber] = useState('AHZ-2026-000001');
  const [contact, setContact] = useState('ananya@example.com');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Return / Replacement modal inside order tracking
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnType, setReturnType] = useState<'Return' | 'Replacement'>('Replacement');
  const [returnReason, setReturnReason] = useState('Size Exchange / Fit Preference');
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);

  const handleTrack = async (e?: React.FormEvent, customOrderNum?: string, customContact?: string) => {
    if (e) e.preventDefault();
    const ordToTrack = customOrderNum || orderNumber;
    const contactToTrack = customContact || contact;

    setLoading(true);
    setError(null);
    setReturnSuccessMsg(null);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: ordToTrack, contact: contactToTrack }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrackedOrder(null);
        setError(data.error || 'Could not locate order.');
      } else {
        setTrackedOrder(data.order);
      }
    } catch (err: any) {
      setError(err.message || 'Error tracking shipment.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (num: string, mail: string) => {
    setOrderNumber(num);
    setContact(mail);
    handleTrack(undefined, num, mail);
  };

  const handleSubmitReturnRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackedOrder) return;
    setSubmittingReturn(true);
    try {
      const res = await fetch('/api/orders/return-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderNumber: trackedOrder.orderNumber,
          contact: trackedOrder.customerEmail || contact,
          type: returnType,
          reason: returnReason,
          details: returnNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReturnSuccessMsg(data.message || `${returnType} request submitted successfully!`);
        showToast(`${returnType} request recorded for ${trackedOrder.orderNumber}!`, 'success');
        if (data.order) {
          setTrackedOrder(data.order);
        }
        setReturnModalOpen(false);
        setReturnNotes('');
      } else {
        showToast(data.error || 'Failed to submit request', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error submitting request', 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-14 space-y-8">
      <DocumentHead title="Track Your Order — Ahuza" />
      
      <div className="space-y-2 border-b border-[#1E293B]/10 pb-5">
        <p className="text-xs text-[#4E7245] font-semibold uppercase tracking-wider">
          Real-Time Shipment & Courier Status
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#1E293B]">
          Track Your Ahuza Order
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] max-w-xl leading-relaxed">
          Follow your parcel from cutting table to your doorstep. View live courier milestones and easily request size exchanges or returns if eligible.
        </p>

        {/* Quick Sample Orders for 1-Click Testing */}
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#64748B]">Recent / Sample Orders:</span>
          <button
            type="button"
            onClick={() => handleQuickSelect('AHZ-2026-000001', 'ananya@example.com')}
            className="px-2.5 py-1 bg-[#EBF2E8] hover:bg-[#D5E5CF] text-[#2F472B] font-mono text-[11px] rounded-md transition-colors border border-[#4E7245]/20 font-semibold"
          >
            AHZ-2026-000001 (Confirmed)
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('AHZ-2026-000002', 'ananya@example.com')}
            className="px-2.5 py-1 bg-[#EBF2E8] hover:bg-[#D5E5CF] text-[#2F472B] font-mono text-[11px] rounded-md transition-colors border border-[#4E7245]/20 font-semibold"
          >
            AHZ-2026-000002 (Shipped)
          </button>
        </div>
      </div>

      {/* Tracking Form */}
      <form
        onSubmit={(e) => handleTrack(e)}
        className="bg-white border border-[#1E293B]/10 rounded-2xl p-6 sm:p-8 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 items-end text-xs"
      >
        <div>
          <label className="block text-[#334155] font-medium mb-1">Ahuza Order ID</label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. AHZ-2026-000001"
            className="w-full px-3.5 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl font-mono-num text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[#334155] font-medium mb-1">Registered Email / Mobile</label>
          <input
            type="text"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="ananya@example.com or mobile"
            className="w-full px-3.5 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="py-2.5 px-6 bg-[#4E7245] hover:bg-[#375330] text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Locating Parcel...' : 'Track Shipment'}</span>
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {returnSuccessMsg && (
        <div className="p-4 bg-[#EBF2E8] border border-[#4E7245]/30 rounded-xl text-xs text-[#2F472B] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4E7245] shrink-0" />
          <span>{returnSuccessMsg}</span>
        </div>
      )}

      {/* Tracked Order Result Card */}
      {trackedOrder && (
        <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]/10">
            <div>
              <span className="text-xs text-[#4E7245] font-semibold uppercase tracking-wider">Live Package Status</span>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1E293B]">
                Order {trackedOrder.orderNumber}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Recipient: <strong className="text-[#1E293B]">{trackedOrder.customerName}</strong> ({trackedOrder.customerEmail})
              </p>
            </div>

            {/* Quick Action: Request Return or Replacement Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReturnModalOpen((prev) => !prev)}
                className="py-2 px-4 bg-[#EBF2E8] hover:bg-[#D5E5CF] text-[#2F472B] text-xs font-semibold rounded-xl border border-[#4E7245]/30 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#4E7245]" />
                <span>Request Return / Replacement</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F8FAF7] border border-[#1E293B]/10 text-xs">
            <div>
              <span className="text-[#64748B] block">Courier Partner</span>
              <strong className="text-[#1E293B]">{trackedOrder.shipment?.courierName || 'Blue Dart Express'}</strong>
            </div>
            <div>
              <span className="text-[#64748B] block">AWB Tracking #</span>
              <strong className="font-mono text-[#4E7245]">{trackedOrder.shipment?.trackingNumber || 'BLUEDART-88219'}</strong>
            </div>
            <div>
              <span className="text-[#64748B] block">Estimated Delivery</span>
              <strong className="text-[#1E293B]">{trackedOrder.shipment?.estimatedDelivery || 'Within 2-3 business days'}</strong>
            </div>
            <div>
              <span className="text-[#64748B] block">Order Total</span>
              <strong className="font-mono text-[#1E293B]">₹{trackedOrder.totalAmount.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* The 4 Real-Time Status Updates: Order Placed -> Shipped -> Out for Delivery -> Delivered */}
          <OrderTimelineVisual order={trackedOrder} />

          {/* Items in This Package */}
          <div className="pt-4 border-t border-[#1E293B]/10 space-y-3">
            <h3 className="font-semibold text-xs text-[#1E293B] uppercase tracking-wider">Garments in this Shipment:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trackedOrder.items.map((item) => (
                <div key={item.id} className="p-3 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 flex items-center gap-3 text-xs">
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-12 h-14 object-cover rounded-lg shrink-0 border border-[#1E293B]/10"
                  />
                  <div>
                    <p className="font-semibold text-[#1E293B] line-clamp-1">{item.productName}</p>
                    <p className="text-[#64748B]">Size {item.size} · {item.color} · Qty {item.quantity}</p>
                    <p className="font-mono font-semibold text-[#4E7245]">₹{item.unitPrice.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Return / Replacement Form Card */}
          {returnModalOpen && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#F4F7F2] to-white border border-[#4E7245]/30 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#4E7245]/20 pb-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-[#4E7245]" />
                  <h3 className="font-display text-xl font-semibold text-[#1E293B]">
                    Request Return or Replacement
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="text-[#64748B] hover:text-[#1E293B] text-xs"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmitReturnRequest} className="space-y-4 text-xs">
                {/* Type Selector (Return vs Replacement) */}
                <div>
                  <label className="block text-[#334155] font-medium mb-1.5">Resolution Preference</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReturnType('Replacement')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        returnType === 'Replacement'
                          ? 'bg-[#4E7245] text-white border-[#4E7245] font-semibold shadow-xs'
                          : 'bg-white text-[#334155] border-[#1E293B]/15 hover:border-[#4E7245]'
                      }`}
                    >
                      <p className="font-semibold text-sm">Replacement</p>
                      <p className={`text-[11px] mt-0.5 ${returnType === 'Replacement' ? 'text-[#D1E7DD]' : 'text-[#64748B]'}`}>
                        Exchange for a different size or fit
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnType('Return')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        returnType === 'Return'
                          ? 'bg-[#4E7245] text-white border-[#4E7245] font-semibold shadow-xs'
                          : 'bg-white text-[#334155] border-[#1E293B]/15 hover:border-[#4E7245]'
                      }`}
                    >
                      <p className="font-semibold text-sm">Return for Refund</p>
                      <p className={`text-[11px] mt-0.5 ${returnType === 'Return' ? 'text-[#D1E7DD]' : 'text-[#64748B]'}`}>
                        Full settlement back to original payment
                      </p>
                    </button>
                  </div>
                </div>

                {/* Reason Selector */}
                <div>
                  <label className="block text-[#334155] font-medium mb-1">Reason for {returnType}</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
                  >
                    <option value="Size Exchange / Fit Preference">Size Exchange / Fit Preference</option>
                    <option value="Color / Fabric Variation">Color / Fabric Variation</option>
                    <option value="Damaged or Defective Item">Damaged or Defective Item</option>
                    <option value="Received Incorrect Item">Received Incorrect Item</option>
                    <option value="Changed Mind Before Dispatch">Changed Mind Before Dispatch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#334155] font-medium mb-1">Additional Comments (Optional)</label>
                  <textarea
                    rows={2}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Provide details such as requested new size or specific reason..."
                    className="w-full px-3.5 py-2 bg-white border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#1E293B]/15 text-[#334155] hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReturn}
                    className="px-6 py-2.5 bg-[#4E7245] hover:bg-[#375330] text-white font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    {submittingReturn ? 'Submitting...' : `Confirm ${returnType} Request`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 14. RETURNS, CANCELLATIONS & REFUNDS PAGE (/returns)
// ============================================================================
export const ReturnsAndRefundsPage: React.FC = () => {
  const { user, token, showToast } = useStore();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [returnsList, setReturnsList] = useState<ReturnRequest[]>([]);
  const [refundsList, setRefundsList] = useState<Refund[]>([]);

  const [selectedOrderId, setSelectedOrderId] = useState(searchParams.get('orderId') || '');
  const [reqType, setReqType] = useState<'Return' | 'Cancellation'>('Return');
  const [reason, setReason] = useState('Size Exchange / Fit Preference');
  const [details, setDetails] = useState('');
  const [supportingImageUrl, setSupportingImageUrl] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/returns', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([ordData, retData]) => {
        if (Array.isArray(ordData.orders)) {
          setOrders(ordData.orders);
          if (!selectedOrderId && ordData.orders[0]) {
            setSelectedOrderId(ordData.orders[0].orderNumber);
          }
        }
        if (Array.isArray(retData.returns)) setReturnsList(retData.returns);
        if (Array.isArray(retData.refunds)) setRefundsList(retData.refunds);
      })
      .catch(() => {});
  }, [token]);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId: selectedOrderId,
        type: reqType,
        reason,
        details,
        supportingImageUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not submit request.', 'error');
      return;
    }
    setReturnsList((prev) => [data.returnRequest, ...prev]);
    setRefundsList((prev) => [data.refund, ...prev]);
    setDetails('');
    showToast(`${reqType} request submitted for ${selectedOrderId}.`);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 space-y-10">
      <DocumentHead title="Returns, Cancellations & Refunds" />
      <div className="border-b border-[#1E293B]/10 pb-5">
        <p className="text-xs text-[#4E7245] font-semibold uppercase tracking-wider">14-Day Easy Returns & Instant Cancellations</p>
        <h1 className="font-display text-4xl font-semibold text-[#1E293B] mt-1">
          Returns, Cancellations & Refund Status
        </h1>
      </div>

      {!user ? (
        <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-10 text-center space-y-3 shadow-xs">
          <p className="text-sm font-semibold text-[#1E293B]">
            Please sign in to submit a return or cancellation request and track refund settlement.
          </p>
          <Link
            to="/login?redirect=/returns"
            className="inline-block px-7 py-3 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <form
            onSubmit={handleSubmitReturn}
            className="lg:col-span-5 bg-white border border-[#1E293B]/10 rounded-2xl p-6 space-y-4 text-xs h-fit shadow-xs"
          >
            <h2 className="font-display text-2xl font-semibold text-[#1E293B]">
              Submit Return or Cancellation
            </h2>

            <div>
              <label className="block text-[#64748B] mb-1">Select Order</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl font-mono-num text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.orderNumber}>
                    {o.orderNumber} — ₹{o.totalAmount} ({o.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['Return', 'Cancellation'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReqType(t)}
                  className={`py-2 rounded-xl font-semibold border transition-colors ${
                    reqType === t
                      ? 'bg-[#4E7245] text-white border-[#4E7245]'
                      : 'bg-[#F8FAF7] text-[#1E293B] border-[#1E293B]/15 hover:border-[#4E7245]'
                  }`}
                >
                  Request {t}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[#64748B] mb-1">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
              >
                <option value="Size Exchange / Fit Preference">Size Exchange / Fit Preference</option>
                <option value="Changed Mind Before Dispatch">Changed Mind Before Dispatch</option>
                <option value="Color / Shade Variation">Color / Shade Variation</option>
                <option value="Damaged or Incorrect Item">Damaged or Incorrect Item</option>
              </select>
            </div>

            <div>
              <label className="block text-[#64748B] mb-1">Additional Notes</label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us how we can assist..."
                className="w-full px-3 py-2 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#64748B] mb-1">Supporting Photo URL (Optional)</label>
              <input
                type="text"
                value={supportingImageUrl}
                onChange={(e) => setSupportingImageUrl(e.target.value)}
                placeholder="https://... or upload reference"
                className="w-full px-3 py-2 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#4E7245] hover:bg-[#375330] text-white font-semibold rounded-xl transition-colors shadow-xs"
            >
              Submit {reqType} Request
            </button>
          </form>

          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#1E293B]">
              Your Request & Refund Ledger
            </h2>
            {returnsList.length === 0 ? (
              <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-8 text-xs text-[#64748B] shadow-xs">
                No return or cancellation requests found.
              </div>
            ) : (
              returnsList.map((ret) => {
                const linkedRefund = refundsList.find((rf) => rf.returnRequestId === ret.id);
                return (
                  <div
                    key={ret.id}
                    className="bg-white border border-[#1E293B]/10 rounded-2xl p-5 space-y-3 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-[#1E293B]/10 pb-3">
                      <div>
                        <span className="font-mono-num font-semibold text-[#1E293B]">
                          {ret.orderNumber}
                        </span>{' '}
                        · <strong>{ret.type}</strong> · {ret.reason}
                      </div>
                      <span className="font-semibold text-[#4E7245]">Status: {ret.status}</span>
                    </div>
                    {ret.details && <p className="text-[#64748B]">{ret.details}</p>}
                    {ret.ownerNote && (
                      <p className="text-[#1E293B] bg-[#EBF2E8] p-2.5 rounded-xl border border-[#4E7245]/20">
                        <strong>Ahuza Care Team Note:</strong> {ret.ownerNote}
                      </p>
                    )}
                    {linkedRefund && (
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[#52525B]">
                        <span>
                          Refund Amount:{' '}
                          <strong className="font-mono-num text-[#18181B]">
                            ₹{linkedRefund.amount.toLocaleString('en-IN')}
                          </strong>
                        </span>
                        <span>
                          Refund State: <strong className="text-[#18181B]">{linkedRefund.status}</strong>{' '}
                          {linkedRefund.providerConfirmed
                            ? '(Provider Confirmed)'
                            : '(Awaiting Banking Settlement Confirmation)'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 15, 16, 17, 18-22: WHY AHUZA, ABOUT, CONTACT, AND POLICY PAGES
// ============================================================================
export const WhyAhuzaPage: React.FC = () => {
  const { websiteContent } = useStore();
  const [activeScene, setActiveScene] = useState(0);

  return (
    <div className="bg-[#18181B] text-[#F9F8F6] min-h-screen py-14">
      <DocumentHead
        title="Why Ahuza — 3D Interactive Experience"
        description="Fashion should feel effortless. Explore AHUZA's 3D interactive brand experience."
      />
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 space-y-12">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs text-[#FDBA74] font-semibold tracking-wider">
            CINEMATIC 3D INTERACTIVE PRESENTATION · {websiteContent.brandName}
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-semibold text-white">
            “{websiteContent.whyAhuza.narrativeHeadline}”
          </h1>
          <p className="font-display italic text-2xl text-[#D6C7B2]">“{websiteContent.tagline}”</p>
          <p className="text-sm sm:text-base text-[#D4D4D8] leading-relaxed">
            {websiteContent.whyAhuza.narrativeSubtext}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-[#27272A] via-[#1E1E22] to-[#18181B] p-8 sm:p-12 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="font-mono text-xs font-semibold text-[#FED7AA] tracking-wider uppercase">
                  CRAFT & TRANSPARENCY PILLAR 0{activeScene + 1}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#9A3412] text-white">
                  {websiteContent.whyAhuza.scenes[activeScene]?.metricLabel}
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="font-display text-3xl sm:text-4xl font-semibold text-white">
                  {websiteContent.whyAhuza.scenes[activeScene]?.title}
                </h3>
                <p className="text-sm sm:text-base text-[#D4D4D8] leading-relaxed">
                  {websiteContent.whyAhuza.scenes[activeScene]?.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-xs text-[#FED7AA] font-mono font-semibold">100% Breathable Weave</p>
                  <p className="text-xs text-white/70">60s Combed Jaipur Mulmul & Chanderi Silk Blend</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-xs text-[#FED7AA] font-mono font-semibold">Honest Price Cap</p>
                  <p className="text-xs text-white/70">Every piece strictly between ₹499 and ₹1,999</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {websiteContent.whyAhuza.scenes.map((scene, idx) => (
              <div
                key={scene.id}
                onClick={() => setActiveScene(idx)}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  activeScene === idx
                    ? 'bg-white/10 border-[#FDBA74]'
                    : 'bg-white/4 border-white/10 hover:bg-white/8'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#FDBA74] font-mono-num">
                  <span>CHAPTER {scene.stepNumber}</span>
                  <span>{scene.metricLabel}</span>
                </div>
                <h2 className="font-display text-2xl font-semibold text-white mt-1">{scene.title}</h2>
                <p className="text-xs text-[#D4D4D8] mt-2 leading-relaxed">{scene.description}</p>
              </div>
            ))}

            <div className="pt-4">
              <Link
                to="/women"
                className="inline-block py-3.5 px-8 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold tracking-wider rounded-xl transition-colors shadow-sm"
              >
                {websiteContent.whyAhuza.ctaText}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AboutAndContactPage: React.FC<{ page: 'about' | 'contact' | 'policy'; policyType?: string }> = ({
  page,
  policyType,
}) => {
  const { websiteContent, showToast } = useStore();
  const [contactSubject, setContactSubject] = useState('Order & Sizing Assistance');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  if (page === 'about') {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-16 space-y-16">
        <DocumentHead title="About Ahuza — Where Fashion Meets Passion" />

        {/* Brand Story Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EBF2E8] border border-[#4E7245]/20 text-xs text-[#4E7245] font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#4E7245]" />
            <span>OUR STORY & PHILOSOPHY · AHUZA</span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold text-[#1E293B]">
            {websiteContent.aboutAhuza.headline || 'Where Fashion Meets Passion'}
          </h1>
          <p className="font-display italic text-2xl sm:text-3xl text-[#4E7245]">
            “{websiteContent.tagline || 'Everyday Indian Fashion Under ₹2,000'}”
          </p>
          <p className="text-sm sm:text-base text-[#334155] leading-relaxed">
            {websiteContent.aboutAhuza.storyParagraph1}
          </p>
        </div>

        {/* High-End Imagery Blocks (Stand on Aesthetic) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#1E293B]/10 shadow-md bg-white">
            {websiteContent.aboutAhuza?.imageUrl ? (
              <>
                <SafeImage
                  src={websiteContent.aboutAhuza.imageUrl}
                  alt="Artisanal Handloom Weaving at Ahuza"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#A3D9A5]">Rajasthan Artisan Heritage</p>
                  <p className="text-sm font-semibold">60s Combed Jaipur Mulmul & Chanderi Weaves</p>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#EBF2E8] text-[#4E7245]">
                <p className="font-display text-xl font-semibold text-[#1E293B]">Authentic Rajasthani Craftsmanship</p>
                <p className="text-xs text-[#4E7245] mt-1">100% Pure Indian Handloom Weaves</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-3xl font-semibold text-[#1E293B]">
              Why We Cap Every Garment Under ₹2,000
            </h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              {websiteContent.aboutAhuza.storyParagraph2}
            </p>
            <div className="p-5 rounded-2xl bg-[#EBF2E8]/60 border border-[#4E7245]/20 space-y-2">
              <h3 className="font-semibold text-sm text-[#2F472B]">Direct Weaver Partnerships</h3>
              <p className="text-xs text-[#334155] leading-relaxed">
                By bypassing multi-layered distributors and inflated department-store markups, we work directly with master artisan clusters across Rajasthan and Madhya Pradesh to deliver honest, luxury-grade fabrics straight to your wardrobe.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Pillars What Makes Ahuza Unique */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <div className="p-6 bg-white border border-[#1E293B]/10 rounded-2xl shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2E8] text-[#4E7245] flex items-center justify-center font-bold">
              01
            </div>
            <h3 className="font-semibold text-base text-[#1E293B]">Pure Natural Weaves</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Featherweight 60s Jaipur mulmul, textured Khadi, and breathable cotton-slub designed for all-day comfort in tropical weather.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#1E293B]/10 rounded-2xl shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2E8] text-[#4E7245] flex items-center justify-center font-bold">
              02
            </div>
            <h3 className="font-semibold text-base text-[#1E293B]">Honest Price Cap</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Every single piece in our boutique is strictly priced between ₹499 and ₹1,999. Zero sudden checkout surcharges or inflated tags.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#1E293B]/10 rounded-2xl shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2E8] text-[#4E7245] flex items-center justify-center font-bold">
              03
            </div>
            <h3 className="font-semibold text-base text-[#1E293B]">Everyday Wearability</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              From work-from-home mornings to festive family gatherings, our silhouettes are made to flatter effortlessly wash after wash.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#1E293B]/10 rounded-2xl shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2E8] text-[#4E7245] flex items-center justify-center font-bold">
              04
            </div>
            <h3 className="font-semibold text-base text-[#1E293B]">Care & 14-Day Returns</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Hassle-free size replacements, doorstep courier reverse pickup, and dedicated human customer support responding within 24 hours.
            </p>
          </div>
        </div>

        {/* The Craftsmanship Promise Banner */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#2F472B] via-[#375330] to-[#4E7245] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-md">
          <div className="space-y-2 max-w-xl">
            <h2 className="font-display text-3xl font-semibold text-white">
              The AHUZA Craftsmanship & Price Promise
            </h2>
            <p className="text-xs sm:text-sm text-[#D1E7DD] leading-relaxed">
              {websiteContent.aboutAhuza.craftsmanshipPromise}
            </p>
          </div>
          <Link
            to="/women"
            className="py-3 px-8 bg-white hover:bg-[#F4F7F2] text-[#2F472B] text-xs font-semibold tracking-wider rounded-xl transition-colors whitespace-nowrap shadow-sm"
          >
            Explore Collections
          </Link>
        </div>
      </div>
    );
  }

  if (page === 'contact') {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-16 space-y-12">
        <DocumentHead title="Contact Ahuza Care — Customer Support" />

        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF2E8] border border-[#4E7245]/20 text-xs text-[#4E7245] font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#4E7245]" />
            <span>WE ARE HERE TO HELP · 24-HOUR COMMITMENT</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#1E293B]">
            Contact AHUZA Care
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
            Have questions about fabric care, sizing charts, live order tracking, or return requests? Our dedicated team is ready to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Company Details Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
              <h2 className="font-display text-2xl font-semibold text-[#1E293B]">
                Customer Support Desk
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3 text-[#334155]">
                  <MapPin className="w-5 h-5 text-[#4E7245] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#1E293B] text-[13px] mb-0.5">Atelier & Studio Location</strong>
                    <p className="text-[#64748B] leading-relaxed">
                      Ahuza Atelier & Design Studio, 4th Cross, 17th Main, Sector 4, HSR Layout, Bengaluru, Karnataka 560102, India
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-[#334155]">
                  <Mail className="w-5 h-5 text-[#4E7245] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#1E293B] text-[13px] mb-0.5">Support Email</strong>
                    <a href="mailto:care@ahuza.com" className="text-[#4E7245] hover:underline font-mono text-[13px]">
                      care@ahuza.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-[#334155]">
                  <Phone className="w-5 h-5 text-[#4E7245] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#1E293B] text-[13px] mb-0.5">Phone & WhatsApp Concierge</strong>
                    <a href="tel:+919823044510" className="text-[#4E7245] hover:underline font-mono text-[13px]">
                      +91 98230 44510
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-[#334155]">
                  <Clock className="w-5 h-5 text-[#4E7245] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#1E293B] text-[13px] mb-0.5">Operating Hours</strong>
                    <p className="text-[#64748B]">Monday – Saturday: 9:00 AM – 8:00 PM IST</p>
                    <p className="text-[#64748B]">Sunday: 10:00 AM – 6:00 PM IST</p>
                  </div>
                </div>
              </div>

              {/* Direct Care Commitment */}
              <div className="p-4 bg-[#EBF2E8] border border-[#4E7245]/20 rounded-xl text-xs text-[#2F472B] space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#4E7245]" />
                  <span>Direct Care Guarantee</span>
                </p>
                <p className="text-[#334155] leading-relaxed">
                  If you face any issues beyond our automated tracking tools, our care team reaches you within 24 hours of reporting.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form Column with Light Green Submit Button */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="font-display text-2xl font-semibold text-[#1E293B] mb-2">
                Send Us a Message
              </h2>
              <p className="text-xs text-[#64748B] mb-6">
                Fill in your details below and we will respond directly to your email or WhatsApp.
              </p>

              {contactSubmitted ? (
                <div className="p-8 text-center bg-[#EBF2E8] rounded-xl border border-[#4E7245]/30 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#4E7245] mx-auto" />
                  <h3 className="font-display text-2xl font-semibold text-[#1E293B]">
                    Message Received!
                  </h3>
                  <p className="text-xs text-[#334155] max-w-sm mx-auto">
                    Thank you, {contactName || 'Valued Customer'}. Our Ahuza Care team has received your message and will get back to you within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactSubmitted(false)}
                    className="mt-3 px-5 py-2 bg-[#4E7245] text-white text-xs font-semibold rounded-lg"
                  >
                    Send Another Note
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    showToast('Your message has been received by Ahuza Care.');
                    setContactSubmitted(true);
                  }}
                  className="space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#334155] font-medium mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Priya Nair"
                        className="w-full px-3.5 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#334155] font-medium mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="priya@example.com"
                        className="w-full px-3.5 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#334155] font-medium mb-1">Subject</label>
                    <select
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
                    >
                      <option value="Order & Sizing Assistance">Order & Sizing Assistance</option>
                      <option value="Shipment & Delivery Timeline">Shipment & Delivery Timeline</option>
                      <option value="Returns & Replacements">Returns & Replacements</option>
                      <option value="Custom Stitching / Wholesale">Custom Stitching / Bulk Inquiry</option>
                      <option value="Other Feedback">Other Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#334155] font-medium mb-1">Your Message</label>
                    <textarea
                      rows={5}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Please share your query or order details with us..."
                      className="w-full px-3.5 py-2.5 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-xl text-[#1E293B] focus:border-[#4E7245] focus:outline-none"
                    />
                  </div>

                  {/* Light Green Submit Button */}
                  <button
                    type="submit"
                    className="w-full sm:w-auto py-3 px-8 bg-[#4E7245] hover:bg-[#375330] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send Message to Ahuza Care</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Policy Pages (Privacy, Terms, Shipping, Cancellation, Return & Refund)
  const policyMap: Record<string, { title: string; body: string }> = {
    privacy: { title: 'Privacy Policy & Data Protection', body: websiteContent.policies.privacyPolicy },
    terms: { title: 'Terms & Conditions', body: websiteContent.policies.termsAndConditions },
    shipping: { title: 'Shipping Policy', body: websiteContent.policies.shippingPolicy },
    cancellation: { title: 'Cancellation Policy', body: websiteContent.policies.cancellationPolicy },
    return: { title: 'Return & Replacement Policy', body: websiteContent.policies.returnRefundPolicy || websiteContent.policies.returnReplacementPolicy || '' },
  };
  const activePolicy = policyMap[policyType || 'privacy'] || policyMap.privacy;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16 space-y-6">
      <DocumentHead title={activePolicy.title} />
      <div className="border-b border-[#1E293B]/10 pb-4">
        <p className="text-xs text-[#4E7245] font-semibold uppercase tracking-wider">Ahuza Official Store Policy</p>
        <h1 className="font-display text-4xl font-semibold text-[#1E293B] mt-1">{activePolicy.title}</h1>
      </div>
      <div className="bg-white border border-[#1E293B]/10 rounded-2xl p-8 text-sm text-[#334155] leading-relaxed whitespace-pre-line shadow-2xs">
        {activePolicy.body}
      </div>
    </div>
  );
};

// ============================================================================
// 16. DEDICATED API INTEGRATION & QUICK SKU CHECKOUT (/quick-checkout)
// ============================================================================
export const QuickCheckoutPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 space-y-6">
      <DocumentHead title="Direct SKU API Checkout — AHUZA" />
      <div className="space-y-1">
        <span className="text-xs font-semibold text-[#9A3412] uppercase tracking-wider font-mono">
          E-Commerce Integration Suite
        </span>
        <h1 className="font-display text-4xl font-semibold text-[#18181B]">
          Direct SKU Checkout
        </h1>
        <p className="text-xs text-[#52525B]">
          Submit an order by entering customer email, product SKU, and quantity. Every order is automatically packaged into JSON and forwarded to your Google Apps Script webhook.
        </p>
      </div>

      <ApiIntegrationCheckoutForm />
    </div>
  );
};

