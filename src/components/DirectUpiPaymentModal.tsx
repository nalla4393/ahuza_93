import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Clock,
  AlertTriangle,
  ShieldCheck,
  X,
  RefreshCw,
  Info,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { Order } from '../types';

export interface UpiPaymentOrderData {
  internalOrderId: string;
  transactionRef: string;
  amount: number;
  currency: string;
  merchantUPIId: string;
  merchantName: string;
  upiUri: string;
  qrCodeDataUrl: string;
  deepLinks: {
    generic: string;
    gpay: string;
    phonepe: string;
    paytm: string;
    bhim: string;
  };
  expiresAt: string;
  createdAt: string;
  sessionTtlMinutes: number;
}

interface DirectUpiPaymentModalProps {
  open: boolean;
  onClose: () => void;
  orderData: UpiPaymentOrderData;
  token: string;
  onPaymentSuccess: (order: Order) => void;
  onPaymentCancel: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const DirectUpiPaymentModal: React.FC<DirectUpiPaymentModalProps> = ({
  open,
  onClose,
  orderData,
  token,
  onPaymentSuccess,
  onPaymentCancel,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'apps' | 'upi_id'>('qr');
  const [selectedApp, setSelectedApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'generic'>('gpay');
  const [payerUpiId, setPayerUpiId] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(() => {
    const expires = new Date(orderData.expiresAt).getTime();
    const diff = Math.max(0, Math.floor((expires - Date.now()) / 1000));
    return diff || orderData.sessionTtlMinutes * 60;
  });
  const [isExpired, setIsExpired] = useState(false);
  const [appLaunched, setAppLaunched] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);

  // Detect if running on mobile device
  const isMobileDevice = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Automatically default mobile users to the "UPI Apps" tab
  useEffect(() => {
    if (isMobileDevice) {
      setActiveTab('apps');
    }
  }, [isMobileDevice]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const expires = new Date(orderData.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setTimeRemainingSeconds(diff);
      if (diff <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [orderData.expiresAt]);

  // Background status polling (checks every 4 seconds if payment was verified via another device or admin ledger)
  useEffect(() => {
    if (isExpired || !open) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/upi/status/${orderData.internalOrderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === 'SUCCESS' && data.order) {
            showToast('UPI Payment verified successfully!');
            onPaymentSuccess(data.order);
          } else if (data.paymentStatus === 'EXPIRED') {
            setIsExpired(true);
          }
        }
      } catch {
        // Ignore background polling errors
      }
    };

    pollingRef.current = window.setInterval(checkStatus, 4000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, isExpired, orderData.internalOrderId, token, onPaymentSuccess, showToast]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleLaunchUpiApp = (appKey: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'generic') => {
    setSelectedApp(appKey);
    setAppLaunched(true);
    const deepLink = orderData.deepLinks[appKey] || orderData.upiUri;

    // Trigger UPI intent / deep link
    window.location.href = deepLink;

    showToast(`Opening ${appKey.toUpperCase()} payment... Complete payment and enter the 12-digit UTR below.`);
  };

  const handleVerifyOnServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);

    const trimmedUtr = utrNumber.trim();
    if (!trimmedUtr) {
      setVerificationError('Please enter the 12-digit Bank UTR / UPI Reference Number from your payment app.');
      return;
    }

    if (!/^\d{12}$/.test(trimmedUtr)) {
      setVerificationError('Invalid format. Bank UTR / Reference must be exactly 12 numeric digits (e.g. 428912345678).');
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch('/api/upi/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internalOrderId: orderData.internalOrderId,
          transactionRef: orderData.transactionRef,
          utrNumber: trimmedUtr,
          payerUpiId: payerUpiId || undefined,
          selectedUpiApp: selectedApp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setVerificationError(data.error || 'Server-side verification failed. Please check your UTR number.');
        showToast(data.error || 'Payment verification failed', 'error');
        return;
      }

      showToast(`Payment Verified! Order ${data.order.orderNumber} confirmed.`);
      onPaymentSuccess(data.order);
    } catch {
      setVerificationError('Network error while verifying payment on server. Please check your connection.');
      showToast('Network error while verifying payment', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!confirm('Are you sure you want to cancel this pending UPI payment?')) return;
    setCancelling(true);
    try {
      await fetch('/api/upi/cancel-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internalOrderId: orderData.internalOrderId,
          transactionRef: orderData.transactionRef,
        }),
      });
      showToast('UPI payment session cancelled.');
      onPaymentCancel();
    } catch {
      onPaymentCancel();
    } finally {
      setCancelling(false);
    }
  };

  if (!open) return null;

  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTimerLow = timeRemainingSeconds < 180;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#18181B]/15 shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="bg-[#18181B] text-white p-5 sm:p-6 flex items-start justify-between relative">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-semibold tracking-wider uppercase">
                Direct UPI · Zero Extra Fee
              </span>
              <span className="text-[11px] text-[#A1A1AA] font-mono-num">
                {orderData.internalOrderId}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
              Ahuza Secure UPI Payment
            </h2>
            <p className="text-xs text-[#D4D4D8]">
              Pay directly to official merchant VPA:{' '}
              <strong className="text-white font-mono-num">{orderData.merchantUPIId}</strong>
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-bold font-mono-num text-[#FED7AA]">
              ₹{orderData.amount.toLocaleString('en-IN')}
            </div>
            {/* Live Expiry Timer */}
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono-num font-semibold mt-1 ${
                isExpired
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : isTimerLow
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-white/10 text-white/90'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{isExpired ? 'EXPIRED' : formattedTimer}</span>
            </div>
          </div>
        </div>

        {/* Security Banner: No credentials ever asked on website */}
        <div className="bg-[#FBF8F3] border-b border-[#18181B]/10 px-5 py-2.5 flex items-center justify-between text-[11px] text-[#713F12]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#9A3412] shrink-0" />
            <span>
              <strong>Bank-Grade Safety:</strong> Never enter UPI PIN, card number, or bank passwords on this website. Credentials are handled strictly inside your UPI banking app.
            </span>
          </div>
        </div>

        {isExpired ? (
          <div className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
            <h3 className="font-display text-2xl font-semibold text-[#18181B]">
              Payment Session Expired
            </h3>
            <p className="text-xs text-[#52525B] max-w-md mx-auto">
              The 15-minute secure payment window for this session has ended. To protect against delayed duplicate charges, please restart checkout to generate a fresh QR code.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onPaymentCancel}
                className="px-6 py-2.5 bg-[#18181B] text-white text-xs font-semibold rounded-lg hover:bg-[#27272A] transition-colors"
              >
                Return to Checkout & Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#F4F4F5] p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'qr'
                    ? 'bg-white text-[#18181B] font-semibold shadow-xs'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan & Pay (QR)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('apps')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'apps'
                    ? 'bg-white text-[#18181B] font-semibold shadow-xs'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pay via UPI App</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upi_id')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'upi_id'
                    ? 'bg-white text-[#18181B] font-semibold shadow-xs'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Pay using UPI ID</span>
              </button>
            </div>

            {/* TAB 1: Scan & Pay with QR Code */}
            {activeTab === 'qr' && (
              <div className="space-y-4">
                <div className="bg-[#FAF9F6] border border-[#18181B]/10 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative bg-white p-3 rounded-xl border border-[#18181B]/15 shadow-sm shrink-0">
                    <img
                      src={orderData.qrCodeDataUrl}
                      alt={`UPI Payment QR Code for ₹${orderData.amount}`}
                      className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                    />
                    <div className="text-[10px] text-center font-mono-num font-semibold text-[#52525B] mt-1.5">
                      Dynamic QR · ₹{orderData.amount.toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs w-full">
                    <div>
                      <h4 className="font-semibold text-[#18181B] text-sm">
                        Scan with ANY Indian UPI App
                      </h4>
                      <p className="text-[#52525B] text-[11px] mt-0.5">
                        Open Google Pay, PhonePe, Paytm, BHIM, Cred, or your bank's UPI app to scan this dynamic QR code.
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-[#18181B]/10 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#71717A]">Merchant VPA:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono-num font-semibold text-[#18181B]">
                            {orderData.merchantUPIId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(orderData.merchantUPIId, 'Merchant UPI ID')}
                            className="p-1 hover:bg-[#F4F4F5] rounded text-[#9A3412]"
                            title="Copy UPI ID"
                          >
                            {copiedField === 'Merchant UPI ID' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#71717A]">Merchant Name:</span>
                        <span className="font-semibold text-[#18181B]">
                          {orderData.merchantName} (Ahuza Apparel)
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#71717A]">Exact Amount:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono-num font-bold text-[#9A3412]">
                            ₹{orderData.amount.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(orderData.amount.toFixed(2), 'Amount')}
                            className="p-1 hover:bg-[#F4F4F5] rounded text-[#9A3412]"
                            title="Copy Amount"
                          >
                            {copiedField === 'Amount' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#71717A]">Reference:</span>
                        <span className="font-mono-num text-[10px] text-[#52525B]">
                          {orderData.transactionRef}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#52525B] flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-[#9A3412]" />
                      <span>Listening for server settlement confirmation in real time...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Pay via UPI App (Deep link on mobile or click on desktop) */}
            {activeTab === 'apps' && (
              <div className="space-y-4">
                <div className="text-xs text-[#52525B]">
                  Select your installed UPI application. On mobile devices, clicking will open your UPI app directly with all order details pre-filled.
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Google Pay */}
                  <button
                    type="button"
                    onClick={() => handleLaunchUpiApp('gpay')}
                    className="p-3 bg-[#F9F8F6] hover:bg-[#F4F1EA] border border-[#18181B]/15 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:border-[#18181B] group text-center cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-[#18181B]/10 flex items-center justify-center shadow-xs">
                      <span className="font-bold text-xs text-[#4285F4]">G</span>
                      <span className="font-bold text-xs text-[#EA4335]">P</span>
                      <span className="font-bold text-xs text-[#FBBC05]">a</span>
                      <span className="font-bold text-xs text-[#34A853]">y</span>
                    </div>
                    <span className="font-semibold text-xs text-[#18181B] group-hover:text-[#9A3412]">
                      Google Pay
                    </span>
                    <span className="text-[10px] text-[#71717A]">Tap to Open</span>
                  </button>

                  {/* PhonePe */}
                  <button
                    type="button"
                    onClick={() => handleLaunchUpiApp('phonepe')}
                    className="p-3 bg-[#F9F8F6] hover:bg-[#F4F1EA] border border-[#18181B]/15 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:border-[#18181B] group text-center cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#5F259F] text-white flex items-center justify-center shadow-xs font-bold text-xs">
                      पे
                    </div>
                    <span className="font-semibold text-xs text-[#18181B] group-hover:text-[#9A3412]">
                      PhonePe
                    </span>
                    <span className="text-[10px] text-[#71717A]">Tap to Open</span>
                  </button>

                  {/* Paytm */}
                  <button
                    type="button"
                    onClick={() => handleLaunchUpiApp('paytm')}
                    className="p-3 bg-[#F9F8F6] hover:bg-[#F4F1EA] border border-[#18181B]/15 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:border-[#18181B] group text-center cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#002E6E] text-[#00BAF2] flex items-center justify-center shadow-xs font-bold text-xs">
                      Paytm
                    </div>
                    <span className="font-semibold text-xs text-[#18181B] group-hover:text-[#9A3412]">
                      Paytm UPI
                    </span>
                    <span className="text-[10px] text-[#71717A]">Tap to Open</span>
                  </button>

                  {/* BHIM UPI */}
                  <button
                    type="button"
                    onClick={() => handleLaunchUpiApp('bhim')}
                    className="p-3 bg-[#F9F8F6] hover:bg-[#F4F1EA] border border-[#18181B]/15 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:border-[#18181B] group text-center cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#005B94] text-white flex items-center justify-center shadow-xs font-bold text-[10px]">
                      BHIM
                    </div>
                    <span className="font-semibold text-xs text-[#18181B] group-hover:text-[#9A3412]">
                      BHIM UPI
                    </span>
                    <span className="text-[10px] text-[#71717A]">Tap to Open</span>
                  </button>
                </div>

                {/* Any other UPI App */}
                <button
                  type="button"
                  onClick={() => handleLaunchUpiApp('generic')}
                  className="w-full py-2.5 px-4 bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#18181B]/10 rounded-lg text-xs font-semibold text-[#18181B] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-[#9A3412]" />
                  <span>Open Any Other Installed UPI / Banking App (Cred, SBI, HDFC, ICICI, etc.)</span>
                </button>

                {!isMobileDevice && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span>
                        Desktop browser detected. If clicking does not launch a desktop UPI handler, please switch to the <strong>“Scan & Pay (QR)”</strong> tab to scan with your phone, or copy the UPI ID below.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Pay using UPI ID (VPA) */}
            {activeTab === 'upi_id' && (
              <div className="space-y-4">
                <div className="bg-[#FAF9F6] border border-[#18181B]/10 rounded-xl p-4 space-y-3 text-xs">
                  <div>
                    <label className="block text-[#18181B] font-semibold mb-1">
                      Enter Your UPI ID (VPA)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={payerUpiId}
                        onChange={(e) => setPayerUpiId(e.target.value)}
                        placeholder="e.g., yourname@okhdfcbank or 9550582277@paytm"
                        className="flex-1 px-3 py-2 bg-white border border-[#18181B]/20 rounded-lg font-mono-num text-xs focus:outline-hidden focus:ring-1 focus:ring-[#9A3412]"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#52525B]">
                    Send <strong>₹{orderData.amount.toFixed(2)}</strong> from your UPI app ({payerUpiId || 'your UPI ID'}) to our merchant account:
                  </p>

                  <div className="flex items-center justify-between p-2.5 bg-white border border-[#18181B]/10 rounded-lg font-mono-num text-xs">
                    <div>
                      <span className="text-[#71717A]">Merchant VPA: </span>
                      <strong className="text-[#18181B]">{orderData.merchantUPIId}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(orderData.merchantUPIId, 'Merchant UPI ID')}
                      className="px-2.5 py-1 bg-[#18181B] text-white rounded text-[11px] font-semibold hover:bg-[#27272A] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SERVER-SIDE VERIFICATION WITH 12-DIGIT BANK UTR */}
            <div className="border-t border-[#18181B]/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#18181B] flex items-center gap-1.5">
                    <span>Step 2: Enter 12-Digit Bank UTR to Confirm</span>
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  </h3>
                  <p className="text-[11px] text-[#52525B]">
                    After completing the payment in your UPI app, enter the <strong>12-digit UTR / UPI Reference No.</strong> (e.g. 4289XXXXXXXX) shown on your payment receipt.
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyOnServer} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={utrNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setUtrNumber(val);
                        if (verificationError) setVerificationError(null);
                      }}
                      placeholder="12-digit UTR (e.g. 428912345678)"
                      className="w-full px-3.5 py-3 bg-[#F9F8F6] border border-[#18181B]/20 rounded-xl font-mono-num text-sm font-semibold tracking-wider text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-hidden focus:border-[#9A3412] focus:bg-white transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono-num text-[#71717A]">
                      {utrNumber.length}/12
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifying || utrNumber.length !== 12 || isExpired}
                    className="py-3 px-6 bg-[#9A3412] hover:bg-[#7C2D12] disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying with Server...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Confirm Order</span>
                      </>
                    )}
                  </button>
                </div>

                {verificationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{verificationError}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-[#18181B]/10 pt-4 text-xs">
              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={cancelling}
                className="text-[#71717A] hover:text-red-700 font-medium transition-colors cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Payment Session'}
              </button>

              <div className="text-[11px] text-[#71717A] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Server-Side by AHUZA Settlement Ledger</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
