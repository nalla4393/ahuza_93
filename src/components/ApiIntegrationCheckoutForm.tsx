import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  ShoppingBag,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Mail,
  Hash,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SafeImage } from './SafeImage';

export interface CheckoutFormProps {
  onOrderCompleted?: (orderData: any) => void;
  className?: string;
  defaultSku?: string;
  presetEmail?: string;
}

export const ApiIntegrationCheckoutForm: React.FC<CheckoutFormProps> = ({
  onOrderCompleted,
  className = '',
  defaultSku = 'AHZ-W-KRT-001',
  presetEmail = '',
}) => {
  const { products, user, showToast, refreshCatalog } = useStore();

  const [customerEmail, setCustomerEmail] = useState(
    presetEmail || user?.email || 'ananya.sharma@example.com'
  );
  const [sku, setSku] = useState(defaultSku);
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState(user?.name || 'Ananya Sharma');
  const [city, setCity] = useState(user?.addresses[0]?.city || 'Mumbai');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Find product from store catalog matching the SKU
  const matchedProduct = products.find(
    (p) =>
      p.sku.toUpperCase() === sku.toUpperCase() ||
      p.id.toUpperCase() === sku.toUpperCase()
  );

  const unitPrice = matchedProduct
    ? (matchedProduct.discountPrice || matchedProduct.price)
    : 799;
  const totalPrice = unitPrice * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = customerEmail.trim();
    const cleanSku = sku.trim().toUpperCase();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid customer email address.');
      return;
    }

    if (!cleanSku) {
      setErrorMessage('Please enter or select a valid product SKU.');
      return;
    }

    if (quantity < 1) {
      setErrorMessage('Quantity must be at least 1.');
      return;
    }

    setSubmitting(true);

    try {
      // Packaging form data into the exact JSON payload required by the backend
      const payload = {
        customer_email: cleanEmail,
        sku: cleanSku,
        quantity: quantity,
        shipping_address: {
          full_name: fullName.trim() || cleanEmail.split('@')[0],
          phone: '+91 98201 12026',
          city: city.trim() || 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400013',
        },
      };

      // Sending HTTP POST request to backend endpoint /api/checkout
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to process checkout. Please try again.');
        showToast(data.error || 'Checkout failed', 'error');
        return;
      }

      setCompletedOrder(data);
      showToast(`Order ${data.order_id} created successfully!`);
      await refreshCatalog();

      if (onOrderCompleted) {
        onOrderCompleted(data);
      }
    } catch (err: any) {
      const msg = err.message || 'Network error connecting to /api/checkout';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCompletedOrder(null);
    setErrorMessage(null);
    setQuantity(1);
  };

  return (
    <div className={`bg-white border border-[#18181B]/15 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {/* Header Banner */}
      <div className="bg-[#18181B] text-white p-5 sm:p-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#9A3412] text-white rounded text-[10px] font-mono uppercase tracking-wider font-semibold">
              API Checkout Form
            </span>
            <span className="text-[11px] text-[#A1A1AA] font-mono-num flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FED7AA]" />
              POST /api/checkout → Webhook Forward
            </span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-white">
            Direct SKU Checkout
          </h2>
          <p className="text-xs text-[#D4D4D8] mt-0.5">
            Submit customer orders instantly. The server packages and forwards the payload to Google Apps Script.
          </p>
        </div>

        <div className="hidden sm:block text-right">
          <div className="text-xs text-[#A1A1AA]">Order Est. Delivery</div>
          <div className="font-mono-num font-semibold text-emerald-400 text-sm">3 Business Days</div>
        </div>
      </div>

      {completedOrder ? (
        /* Order Confirmed State */
        <div className="p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-[#18181B] text-base">
                Order Confirmed & Webhook Dispatched!
              </h3>
              <p className="text-xs text-[#52525B]">
                Order <strong className="font-mono-num text-[#18181B]">{completedOrder.order_id}</strong> has been saved to the database and securely forwarded to your Google Apps Script Webhook.
              </p>
            </div>
          </div>

          {/* Webhook Status Details */}
          <div className="bg-[#FAF8F5] border border-[#18181B]/10 rounded-xl p-4 space-y-3 text-xs">
            <div className="font-semibold text-[#18181B] flex items-center justify-between border-b border-[#18181B]/10 pb-2">
              <span>Google Apps Script Webhook Status</span>
              {completedOrder.webhook_result?.skipped ? (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono-num text-[11px]">
                  SKIPPED (URL NOT SET)
                </span>
              ) : completedOrder.webhook_result?.success ? (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono-num text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  DELIVERED ({completedOrder.webhook_result?.latencyMs}ms)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono-num text-[11px] font-semibold">
                  FAILED ({completedOrder.webhook_result?.error || 'HTTP Error'})
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-num text-[11px]">
              <div>
                <span className="text-[#71717A] block">Order ID</span>
                <strong className="text-[#18181B]">{completedOrder.order_id}</strong>
              </div>
              <div>
                <span className="text-[#71717A] block">Customer Email</span>
                <strong className="text-[#18181B] truncate block">{completedOrder.customer_email}</strong>
              </div>
              <div>
                <span className="text-[#71717A] block">Product SKU</span>
                <strong className="text-[#18181B]">{completedOrder.sku}</strong>
              </div>
              <div>
                <span className="text-[#71717A] block">Quantity</span>
                <strong className="text-[#18181B]">{completedOrder.quantity} units</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-num text-[11px] pt-2 border-t border-[#18181B]/10">
              <div>
                <span className="text-[#71717A] block">Order Status</span>
                <span className="font-semibold text-emerald-700">{completedOrder.status}</span>
              </div>
              <div>
                <span className="text-[#71717A] block">Estimated Delivery</span>
                <span className="text-[#18181B]">{completedOrder.estimated_delivery_days} days</span>
              </div>
              <div>
                <span className="text-[#71717A] block">Is Delayed</span>
                <span className="text-[#18181B]">{completedOrder.is_delayed ? 'Yes' : 'No (On Track)'}</span>
              </div>
              <div>
                <span className="text-[#71717A] block">Total Amount</span>
                <strong className="text-[#9A3412]">₹{completedOrder.total_amount?.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {completedOrder.webhook_result?.message && (
              <div className="p-2.5 bg-white border border-[#18181B]/10 rounded-lg text-[11px] text-[#52525B]">
                <strong className="text-[#18181B]">Server Log:</strong> {completedOrder.webhook_result.message}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="py-2.5 px-5 bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Another Checkout</span>
            </button>

            <a
              href="/orders"
              className="py-2.5 px-4 bg-[#F2EFE9] hover:bg-[#E5DFD5] text-[#18181B] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <span>View in My Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        /* Checkout Form Form */
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="space-y-4">
            {/* 1. Customer Email */}
            <div>
              <label className="block text-xs font-semibold text-[#18181B] mb-1">
                Customer Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/20 rounded-xl text-xs font-mono-num text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-hidden focus:border-[#9A3412] focus:bg-white transition-colors"
                />
                <Mail className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-[#71717A] mt-1">
                The order confirmation and delivery status will be linked to this email address.
              </p>
            </div>

            {/* 2. Product SKU */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#18181B]">
                  Product SKU *
                </label>
                <span className="text-[11px] text-[#71717A]">
                  Select from catalog or enter custom SKU
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. AHZ-W-KRT-001"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/20 rounded-xl text-xs font-mono-num uppercase font-semibold text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-hidden focus:border-[#9A3412] focus:bg-white transition-colors"
                />
                <Hash className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Quick SKU Presets from Real Store Catalog */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-[#71717A] uppercase font-mono">Catalog Quick Pick:</span>
                {products.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSku(p.sku)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-num font-semibold border transition-colors cursor-pointer ${
                      sku.toUpperCase() === p.sku.toUpperCase()
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-white text-[#18181B] border-[#18181B]/15 hover:border-[#9A3412]'
                    }`}
                  >
                    {p.sku} (₹{p.discountPrice || p.price})
                  </button>
                ))}
              </div>
            </div>

            {/* Product Preview Card */}
            {matchedProduct && (
              <div className="p-3 bg-[#FAF8F5] border border-[#18181B]/10 rounded-xl flex items-center gap-3">
                <SafeImage
                  src={matchedProduct.images[0]?.url}
                  alt={matchedProduct.name}
                  className="w-14 h-16 object-cover rounded-lg border border-[#18181B]/10 shrink-0"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-semibold text-[#18181B] truncate">
                    {matchedProduct.name}
                  </div>
                  <div className="text-[11px] text-[#52525B]">
                    Fabric: {matchedProduct.fabric || '100% Breathable Cotton'} · Stock: {matchedProduct.stock} units
                  </div>
                  <div className="font-mono-num font-bold text-[#9A3412] mt-0.5">
                    ₹{unitPrice.toLocaleString('en-IN')}
                    {matchedProduct.price > unitPrice && (
                      <span className="text-[#71717A] line-through text-[10px] ml-1.5">
                        ₹{matchedProduct.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Quantity & Customer Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1">
                  Quantity *
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 border border-[#18181B]/20 rounded-l-xl bg-[#F9F8F6] hover:bg-[#F2EFE9] text-[#18181B] font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full h-10 text-center bg-white border-y border-[#18181B]/20 font-mono-num font-bold text-xs text-[#18181B] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 border border-[#18181B]/20 rounded-r-xl bg-[#F9F8F6] hover:bg-[#F2EFE9] text-[#18181B] font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#18181B]/20 rounded-xl text-xs text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-hidden focus:border-[#9A3412] focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary & Estimated Delivery */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#18181B]/10 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#52525B]">
              <span>Item Subtotal ({quantity} × ₹{unitPrice})</span>
              <span className="font-mono-num">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-[#52525B]">
              <span>Express Delivery (India)</span>
              <span className="font-mono-num text-emerald-700 font-semibold">Included</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-[#18181B] pt-2 border-t border-[#18181B]/10">
              <span>Payable Total</span>
              <span className="font-mono-num text-[#9A3412]">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 bg-[#9A3412] hover:bg-[#7C2D12] disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm tracking-wide"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing & Forwarding to Webhook...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Order to /api/checkout (₹{totalPrice.toLocaleString('en-IN')})</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Auto-forwarded to Google Apps Script
            </span>
            <span className="font-mono-num">
              Format: JSON Payload
            </span>
          </div>
        </form>
      )}
    </div>
  );
};
