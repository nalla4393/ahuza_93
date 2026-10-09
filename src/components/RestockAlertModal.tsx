import React, { useState, useEffect } from 'react';
import { X, Package, Bell, Check, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { SafeImage } from './SafeImage';

interface RestockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  categoryName?: string;
  defaultSize?: string;
}

export const RestockAlertModal: React.FC<RestockAlertModalProps> = ({
  isOpen,
  onClose,
  product,
  categoryName = "Men's Collection",
  defaultSize = 'M',
}) => {
  const { user, token, showToast } = useStore();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const savedEmail = user?.email || localStorage.getItem('ahuza_alert_email') || '';
      setEmail(savedEmail);
      if (defaultSize) setSelectedSize(defaultSize);
      if (product && product.colors.length > 0) {
        setSelectedColor(product.colors[0].name);
      }
      setIsSuccess(false);
      setErrorMsg(null);
    }
  }, [isOpen, user, defaultSize, product]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const targetProductId = product?.id || 'prod-m-kurta-007'; // Fallback to flagship men's kurta

    try {
      const res = await fetch(`/api/products/${targetProductId}/restock-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: cleanEmail,
          phone: phone.trim() || undefined,
          selectedSize: selectedSize || undefined,
          selectedColor: selectedColor || undefined,
          categoryName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to register restock alert.');
      }

      localStorage.setItem('ahuza_alert_email', cleanEmail);
      setIsSuccess(true);
      showToast('Stock arrival notification confirmed!', 'success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to set restock alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const availableSizes = product?.sizes && product.sizes.length > 0
    ? product.sizes
    : ['S', 'M', 'L', 'XL', 'XXL'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#18181B]/10 relative space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#71717A] hover:text-[#18181B] rounded-lg hover:bg-[#F4F4F5] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#9A3412]/10 rounded-xl text-[#9A3412]">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-[#18181B]">
              Notify When Stock Arrives
            </h3>
            <p className="text-xs text-[#71717A]">
              Men’s Artisanal Jaipur Handloom Collection
            </p>
          </div>
        </div>

        {/* Product preview if present */}
        {product ? (
          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#18181B]/10 flex items-center gap-3">
            <SafeImage
              src={product.images[0]?.url}
              alt={product.name}
              className="w-14 h-16 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0 text-xs">
              <p className="font-semibold text-[#18181B] truncate">{product.name}</p>
              <p className="text-[#71717A] font-mono-num">
                Price: <span className="font-bold text-[#18181B]">₹{product.discountPrice.toLocaleString('en-IN')}</span>
              </p>
              <p className="text-[11px] text-[#9A3412] font-mono">100% Breathable Khadi &amp; Slub</p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#18181B]/10 text-xs text-[#52525B] space-y-1">
            <p className="font-semibold text-[#18181B] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#9A3412]" />
              <span>Men's Handloom Restock Priority List</span>
            </p>
            <p className="text-[11px] text-[#71717A]">
              Our artisanal men's kurtas, slub shirts, and lounge sets are loomed in small batches. Be first to know when the fresh dye batch arrives.
            </p>
          </div>
        )}

        {/* Feedback Banner */}
        {errorMsg && (
          <div className="p-3 rounded-lg text-xs bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2.5 animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h4 className="font-semibold text-emerald-900 text-sm">
              You're on the Priority Stock Alert List!
            </h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              We'll send an instant email to <strong className="font-mono">{email}</strong> the moment fresh stock arrives at our atelier.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {/* Preferred Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18181B] flex items-center justify-between">
                <span>Select Desired Size</span>
                <span className="text-[11px] text-[#71717A] font-normal">Choose your fit</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                      selectedSize === s
                        ? 'border-[#9A3412] bg-[#9A3412] text-white shadow-xs'
                        : 'border-[#18181B]/15 bg-white text-[#18181B] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedSize('Any Size')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    selectedSize === 'Any Size'
                      ? 'border-[#9A3412] bg-[#9A3412] text-white shadow-xs'
                      : 'border-[#18181B]/15 bg-white text-[#18181B] hover:bg-[#FAF8F5]'
                  }`}
                >
                  Any Size
                </button>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#18181B]">
                Email Address for Restock Alert
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg text-xs text-[#18181B] focus:outline-hidden focus:border-[#9A3412]"
              />
            </div>

            {/* Optional Phone / WhatsApp */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#18181B] flex items-center justify-between">
                <span>WhatsApp / Mobile (Optional)</span>
                <span className="text-[11px] text-[#71717A] font-normal">Instant SMS/WhatsApp</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9550582277"
                className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg text-xs text-[#18181B] focus:outline-hidden focus:border-[#9A3412]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#9A3412] hover:bg-[#7C2D12] disabled:opacity-50 text-white text-xs font-semibold tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Bell className="w-4 h-4" />
              <span>{loading ? 'Subscribing...' : 'NOTIFY ME WHEN STOCK ARRIVES'}</span>
            </button>

            <p className="text-[11px] text-[#71717A] text-center">
              We respect your inbox. You will only receive a notification when this item is restocked.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
