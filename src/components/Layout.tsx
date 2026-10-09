import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Heart,
  Info,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  User as UserIcon,
  X,
  Zap,
  Mail,
  Send,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Package,
  Edit3,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SafeImage } from './SafeImage';
import { StylistSupportChat } from './StylistSupportChat';
import { WebsiteLiveContentEditorModal, EditorSection } from './WebsiteLiveContentEditorModal';
import { AuthModal } from './AuthModal';

export const DocumentHead: React.FC<{
  title?: string;
  description?: string;
  productSchema?: Record<string, unknown>;
}> = ({ title, description, productSchema }) => {
  const { websiteContent } = useStore();
  const location = useLocation();

  useEffect(() => {
    const pageTitle = title
      ? `${title} | ${websiteContent.brandName}`
      : websiteContent.seo.defaultTitle || 'AHUZA – Where Fashion Meets Passion';
    const pageDesc = description || websiteContent.seo.defaultDescription;

    document.title = pageTitle;

    const setMeta = (selector: string, attr: string, val: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.includes('property=')) {
          el.setAttribute('property', selector.split('"')[1]);
        } else {
          el.setAttribute('name', selector.split('"')[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    setMeta('meta[name="description"]', 'content', pageDesc);
    setMeta('meta[property="og:title"]', 'content', pageTitle);
    setMeta('meta[property="og:description"]', 'content', pageDesc);
    setMeta('meta[name="twitter:title"]', 'content', pageTitle);
    setMeta('meta[name="twitter:description"]', 'content', pageDesc);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + location.pathname;

    let schemaScript = document.getElementById('dynamic-product-schema') as HTMLScriptElement | null;
    if (productSchema) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = 'dynamic-product-schema';
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(productSchema);
    } else if (schemaScript) {
      schemaScript.remove();
    }
  }, [title, description, productSchema, websiteContent, location.pathname]);

  return null;
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    websiteContent,
    cart,
    wishlist,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateCartQuantity,
    removeFromCart,
    toasts,
    dismissToast,
    trackEvent,
    showToast,
  } = useStore();

  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [footerEmail, setFooterEmail] = useState('');
  const [footerSubscribed, setFooterSubscribed] = useState(false);
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);
  const [contentEditorSection, setContentEditorSection] = useState<EditorSection>('header');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchBarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    trackEvent('page_view', { landingPage: location.pathname });
  }, [location.pathname, trackEvent]);

  const totalBagCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      trackEvent('search', { searchQuery: searchInput.trim() });
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
      setSearchBarOpen(false);
    }
  };

  // If we are on /owner, render children directly without customer storefront chrome
  if (location.pathname.startsWith('/owner')) {
    return (
      <>
        {children}
        {/* Toast Notifications */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border bg-[#18181B] text-white border-white/15 text-xs"
            >
              <div className="flex items-center gap-2">
                {t.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : t.type === 'info' ? (
                  <Info className="w-4 h-4 text-amber-300 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{t.text}</span>
              </div>
              <button onClick={() => dismissToast(t.id)} className="text-white/60 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F6] text-[#18181B]">
      {/* Exclusive Owner Executive Bar — Visible ONLY to Verified Store Owner */}
      {user?.role === 'owner' && (
        <div className="bg-[#18181B] text-white border-b border-[#FED7AA]/25 px-4 sm:px-8 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-[#FED7AA]">Owner Studio Active:</span>
            <span className="text-white/90">{user.name} ({user.email})</span>
            <span className="px-1.5 py-0.5 rounded bg-[#9A3412] text-[10px] uppercase font-mono font-bold text-white">
              Owner Role
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/owner?tab=automation"
              className="px-3 py-1 rounded bg-[#9A3412] hover:bg-[#7C2D12] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors border border-[#FED7AA]/30 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Automations (Zapier)</span>
            </Link>
            <Link
              to="/owner?tab=analytics"
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white/90 text-xs flex items-center gap-1 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#FED7AA]" />
              <span>Telemetry KPIs</span>
            </Link>
            <Link
              to="/owner?tab=webhook"
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white/90 text-xs transition-colors"
            >
              Apps Script Webhook
            </Link>
            <Link
              to="/owner?tab=orders"
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white/90 text-xs transition-colors"
            >
              Orders & Returns
            </Link>
          </div>
        </div>
      )}

      {/* Slim Dismissible Announcement Bar (<= 36px height) */}
      {!announcementDismissed && websiteContent.announcementBar && !websiteContent.hideAnnouncementBar && (
        <div className="bg-[#18181B] text-[#F9F8F6] px-4 py-1.5 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setContentEditorSection('header');
                setIsContentEditorOpen(true);
              }}
              className="text-[#A3D9A5] hover:text-white flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
              title="Edit Header Copy & Announcement"
            >
              <Edit3 className="w-3 h-3" />
              <span className="hidden sm:inline">Edit Header</span>
            </button>
          </div>
          <p className="truncate text-center font-medium tracking-wide flex-1 px-2">{websiteContent.announcementBar}</p>
          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            className="text-white/70 hover:text-white p-0.5 shrink-0"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Strict 3-Zone Top Bar Contract Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#1E293B]/10 shadow-xs">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single Element Brand Wordmark (or Uploaded Brand Logo) */}
          <Link
            to="/"
            className="font-display text-2xl sm:text-3xl font-semibold tracking-wider text-[#1E293B] hover:text-[#4E7245] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            {websiteContent.logoUrl ? (
              <img
                src={websiteContent.logoUrl}
                alt={websiteContent.brandName}
                referrerPolicy="no-referrer"
                className="h-8 w-auto object-contain"
              />
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#4E7245] inline-block" />
                <span>{websiteContent.brandName || 'AHUZA'}</span>
              </>
            )}
          </Link>

          {/* Zone 2: Clean Text Navigation Links with Subtle Sage Underlines */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#334155]">
            <Link
              to="/women"
              className="hover:text-[#4E7245] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
            >
              {websiteContent.headerNavLabels.women}
            </Link>
            <Link
              to="/men"
              className="hover:text-[#4E7245] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
            >
              {websiteContent.headerNavLabels.men}
            </Link>
            <Link
              to="/why-ahuza"
              className="hover:text-[#4E7245] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
            >
              {websiteContent.headerNavLabels.whyAhuza}
            </Link>
            <Link
              to="/about"
              className="hover:text-[#4E7245] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className="hover:text-[#4E7245] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
            >
              Contact Us
            </Link>
            <Link
              to="/track-order"
              className="hover:text-[#4E7245] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
            >
              {websiteContent.headerNavLabels.trackOrder}
            </Link>
          </nav>

          {/* Zone 3: Primary Storefront Actions (Search, Wishlist, Cart Bag, Account) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Inline Quick Search (Desktop) */}
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search kurti, kurta, fabric..."
                className="w-48 lg:w-56 pl-8 pr-3 py-1.5 text-xs bg-[#F4F7F2] hover:bg-[#EBF2E8] focus:bg-white text-[#1E293B] rounded-full border border-[#4E7245]/20 focus:border-[#4E7245] focus:outline-none transition-all placeholder:text-[#64748B]"
              />
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 pointer-events-none" />
            </form>

            <button
              type="button"
              onClick={() => setSearchBarOpen((prev) => !prev)}
              className="sm:hidden p-2 text-[#1E293B] hover:text-[#4E7245] transition-colors"
              aria-label="Search products"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Icon with Counter Badge */}
            <Link
              to="/wishlist"
              className="p-2 text-[#1E293B] hover:text-[#4E7245] transition-colors relative flex items-center"
              aria-label="Wishlist"
              title="Saved Wishlist"
            >
              <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-[#4E7245] fill-[#4E7245]/20' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#4E7245] text-white font-mono-num text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart Bag Icon with Counter Badge */}
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="px-3.5 py-1.5 bg-[#1E293B] hover:bg-[#4E7245] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-xs"
              aria-label="Open Shopping Bag"
            >
              <ShoppingBag className="w-4 h-4 text-[#A3D9A5]" />
              <span>Bag</span>
              <span className="font-mono-num font-bold bg-white/20 px-1.5 py-0.2 rounded text-[11px]">
                {totalBagCount}
              </span>
            </button>

            {/* Customer Account / Sign In */}
            <Link
              to={user ? '/account' : '/login'}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E293B] hover:text-[#4E7245] bg-[#F4F7F2] hover:bg-[#EBF2E8] border border-[#4E7245]/20 rounded-lg transition-colors whitespace-nowrap"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#4E7245]" />
              <span>{user ? user.name.split(' ')[0] : 'Sign In'}</span>
            </Link>

            {/* Prominent Header-to-Footer Edit Option Button */}
            <button
              type="button"
              onClick={() => {
                setContentEditorSection('header');
                setIsContentEditorOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              title="Edit Website Copy, Images & Buttons from Header to Footer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#A3D9A5]" />
              <span className="hidden sm:inline">Edit Website</span>
            </button>

            {/* Exclusive Owner Studio Button - Visible ONLY to Store Owner */}
            {user?.role === 'owner' && (
              <Link
                to="/owner?tab=analytics"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#1E293B] hover:bg-[#4E7245] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors border border-emerald-400/30"
                title="Open Owner Studio"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#A3D9A5]" />
                <span>Owner</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 text-[#1E293B]"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expandable Search Bar (Mobile) */}
        {searchBarOpen && (
          <div className="sm:hidden border-t border-[#1E293B]/10 bg-white px-4 py-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#64748B]" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search kurtis, sets, lehengas..."
                className="flex-1 text-sm bg-transparent focus:outline-none text-[#1E293B]"
                autoFocus
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#4E7245] hover:bg-[#3E5C37] text-white text-xs font-semibold rounded-md whitespace-nowrap"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#1E293B]/10 bg-white px-6 py-5 space-y-3 shadow-lg">
            <div className="flex flex-col space-y-2.5 text-sm font-medium text-[#1E293B]">
              <Link to="/women" className="py-1 hover:text-[#4E7245]">
                Women’s Collection
              </Link>
              <Link to="/men" className="py-1 hover:text-[#4E7245]">
                Men’s Collection
              </Link>
              <Link to="/why-ahuza" className="py-1 hover:text-[#4E7245]">
                Why Ahuza (Story & Weaves)
              </Link>
              <Link to="/about" className="py-1 hover:text-[#4E7245]">
                About Us
              </Link>
              <Link to="/contact" className="py-1 hover:text-[#4E7245]">
                Contact Us
              </Link>
              <Link to="/track-order" className="py-1 hover:text-[#4E7245]">
                Track Order
              </Link>
              <Link to="/returns" className="py-1 hover:text-[#4E7245]">
                Return & Replacement
              </Link>
              <Link to="/wishlist" className="py-1 hover:text-[#4E7245] flex items-center justify-between">
                <span>Wishlist</span>
                <span className="font-mono-num font-semibold text-[#4E7245]">({wishlist.length})</span>
              </Link>
              <div className="pt-2 border-t border-[#1E293B]/10 flex items-center justify-between">
                <Link to={user ? '/account' : '/login'} className="text-xs font-semibold text-[#4E7245]">
                  {user ? `My Account (${user.name})` : 'Sign In / Create Account'}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Slide-Over Shopping Bag Drawer */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#F9F8F6] h-full flex flex-col shadow-2xl border-l border-[#18181B]/10">
            <div className="px-6 py-4 bg-white border-b border-[#18181B]/10 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#18181B]">Your Shopping Bag</h2>
                <p className="text-xs text-[#52525B]">
                  {totalBagCount} {totalBagCount === 1 ? 'item' : 'items'} · Every item strictly ≤ ₹2,000
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-2 text-[#52525B] hover:text-[#18181B]"
                aria-label="Close bag drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cart.items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <ShoppingBag className="w-10 h-10 text-[#9A3412]/60 mb-3" />
                <p className="font-display text-2xl text-[#18181B]">Your bag is currently empty</p>
                <p className="text-xs text-[#52525B] mt-1 max-w-xs">
                  Explore our breathable everyday Kurtis, Kurta Sets with Dupatta, and Men’s Kurtas starting at ₹499.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('/women');
                  }}
                  className="mt-5 px-5 py-2.5 bg-[#18181B] text-white text-xs font-semibold rounded-lg"
                >
                  Explore Collections
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#18181B]/10 rounded-lg p-3.5 flex items-start gap-3.5"
                    >
                      <SafeImage
                        src={item.product?.images[0]?.url}
                        alt={item.product?.name}
                        className="w-16 h-20 object-cover rounded shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/product/${item.productId}`}
                          onClick={() => setIsCartDrawerOpen(false)}
                          className="text-sm font-semibold text-[#18181B] hover:text-[#9A3412] truncate block"
                        >
                          {item.product?.name}
                        </Link>
                        <p className="text-xs text-[#52525B] mt-0.5">
                          Size {item.size} · {item.color}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-[#18181B]/15 rounded-md">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="p-1 text-[#52525B] hover:text-[#18181B]"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-xs font-mono-num font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="p-1 text-[#52525B] hover:text-[#18181B]"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-right">
                            <span className="font-mono-num text-sm font-semibold text-[#18181B]">
                              ₹{((item.product?.discountPrice || 0) * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-[#71717A] hover:text-red-700 p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-white border-t border-[#18181B]/10 space-y-3">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#52525B]">
                      <span>Total MRP</span>
                      <span className="font-mono-num">₹{cart.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {cart.productDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>AHUZA Everyday Savings</span>
                        <span className="font-mono-num">-₹{cart.productDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#52525B]">
                      <span>Shipping</span>
                      <span className="font-mono-num">
                        {cart.shipping === 0 ? 'FREE' : `₹${cart.shipping}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-[#18181B] pt-2 border-t border-[#18181B]/10">
                      <span>Grand Total</span>
                      <span className="font-mono-num">₹{cart.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartDrawerOpen(false);
                        navigate('/cart');
                      }}
                      className="py-2.5 px-4 bg-[#F2EFE9] hover:bg-[#E5DFD5] text-[#18181B] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      View Full Bag
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartDrawerOpen(false);
                        navigate('/checkout');
                      }}
                      className="py-2.5 px-4 bg-[#4E7245] hover:bg-[#3E5C37] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-xs"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border bg-[#18181B] text-white border-white/15 text-xs"
          >
            <div className="flex items-center gap-2">
              {t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : t.type === 'info' ? (
                <Info className="w-4 h-4 text-amber-300 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{t.text}</span>
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-white/60 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Unified AI Stylist & Customer Support Concierge Chatbot */}
      <StylistSupportChat />

      {/* Storefront Footer with Newsletter & Social Icons */}
      <footer className="bg-[#1E293B] text-[#F8FAF7] border-t border-white/10 mt-20">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
            {/* Col 1: Brand Wordmark & Mission */}
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="font-display text-3xl font-semibold tracking-wider text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#A3D9A5] inline-block" />
                <span>{websiteContent.brandName || 'AHUZA'}</span>
              </Link>
              <p className="font-display italic text-lg text-[#D1E7DD]">“{websiteContent.tagline}”</p>
              <p className="text-xs text-[#94A3B8] max-w-sm leading-relaxed">
                {websiteContent.footer.aboutSnippet}
              </p>
              <div className="pt-2 text-xs text-[#94A3B8] space-y-1.5">
                <p>{websiteContent.footer.studioAddress}</p>
                <p>
                  <a href={`mailto:${websiteContent.footer.contactEmail}`} className="hover:text-white transition-colors">
                    {websiteContent.footer.contactEmail}
                  </a>
                  {' · '}
                  <a href={`tel:${websiteContent.footer.contactPhone}`} className="hover:text-white transition-colors">
                    {websiteContent.footer.contactPhone}
                  </a>
                </p>
                <p>{websiteContent.footer.hours}</p>
                <p className="text-[#A3D9A5] text-[11px] font-medium flex items-center gap-1.5 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A3D9A5] animate-ping" />
                  <span>Support committed to respond within 24 hours</span>
                </p>
              </div>
            </div>

            {/* Col 2: Quick Links - Collections */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-[#D1E7DD]">Collections</h3>
              <ul className="space-y-2 text-xs text-[#CBD5E1]">
                <li>
                  <Link to="/women" className="hover:text-[#A3D9A5] transition-colors">
                    Women’s Collection
                  </Link>
                </li>
                <li>
                  <Link to="/men" className="hover:text-[#A3D9A5] transition-colors">
                    Men’s Collection
                  </Link>
                </li>
                <li>
                  <Link to="/search?maxPrice=999" className="hover:text-[#A3D9A5] transition-colors">
                    Under ₹999 Edit
                  </Link>
                </li>
                <li>
                  <Link to="/search?maxPrice=1499" className="hover:text-[#A3D9A5] transition-colors">
                    Under ₹1,499 Edit
                  </Link>
                </li>
                <li>
                  <Link to="/why-ahuza" className="hover:text-[#A3D9A5] transition-colors">
                    Why Ahuza (Weaves & Craft)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Customer Care */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-[#D1E7DD]">Customer Care</h3>
              <ul className="space-y-2 text-xs text-[#CBD5E1]">
                <li>
                  <Link to="/account" className="hover:text-[#A3D9A5] transition-colors">
                    My Account
                  </Link>
                </li>
                <li>
                  <Link to="/orders" className="hover:text-[#A3D9A5] transition-colors">
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to="/track-order" className="hover:text-[#A3D9A5] transition-colors">
                    Order Tracking
                  </Link>
                </li>
                <li>
                  <Link to="/wishlist" className="hover:text-[#A3D9A5] transition-colors">
                    Saved Wishlist
                  </Link>
                </li>
                <li>
                  <Link to="/returns" className="hover:text-[#A3D9A5] transition-colors">
                    Returns & Replacements
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[#A3D9A5] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#A3D9A5] transition-colors">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Newsletter Signup */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-[#D1E7DD]">Join the Newsletter</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Subscribe for private textile drops, seasonal style edits, and everyday fashion under ₹2,000.
              </p>
              {footerSubscribed ? (
                <div className="p-3 bg-[#4E7245]/30 border border-[#A3D9A5]/40 rounded-lg text-xs text-[#A3D9A5] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#A3D9A5]" />
                  <span>Welcome to the Ahuza Journal!</span>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (footerEmail.trim()) {
                      showToast('Thank you for subscribing to the Ahuza Journal!');
                      setFooterSubscribed(true);
                      setFooterEmail('');
                    }
                  }}
                  className="space-y-2"
                >
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={footerEmail}
                      onChange={(e) => setFooterEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#A3D9A5] transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-[#4E7245] hover:bg-[#3E5C37] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Subscribe to Journal</span>
                  </button>
                </form>
              )}

              {/* Social Media Icons */}
              <div className="pt-2">
                <p className="text-[11px] text-[#94A3B8] uppercase font-semibold mb-2">Follow Our Story</p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#4E7245] text-white flex items-center justify-center transition-colors"
                    aria-label="Ahuza on Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#4E7245] text-white flex items-center justify-center transition-colors"
                    aria-label="Ahuza on Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#4E7245] text-white flex items-center justify-center transition-colors"
                    aria-label="Ahuza on Twitter"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#4E7245] text-white flex items-center justify-center transition-colors"
                    aria-label="Ahuza on YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright, Edit Option and Policy Links */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
            <p>{websiteContent.footer.copyrightText || '© 2026 AHUZA. All rights reserved.'}</p>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => {
                  setContentEditorSection('footer');
                  setIsContentEditorOpen(true);
                }}
                className="text-[#A3D9A5] hover:text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Header to Footer</span>
              </button>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Use
              </Link>
              <Link to="/shipping-policy" className="hover:text-white transition-colors">
                Shipping Policy
              </Link>
              <Link to="/return-policy" className="hover:text-white transition-colors">
                Return Policy
              </Link>
              <Link to="/cancellation-policy" className="hover:text-white transition-colors">
                Cancellation Policy
              </Link>
              <Link to="/owner" className="text-[#A3D9A5] hover:underline transition-colors font-medium">
                Owner Studio
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Header-to-Footer Quick Edit Launcher */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          type="button"
          onClick={() => {
            setContentEditorSection('header');
            setIsContentEditorOpen(true);
          }}
          className="group px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-full shadow-2xl border border-white/20 flex items-center gap-2 text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
          title="Edit Header text to Footer text & delete images or buttons"
        >
          <span className="p-1 rounded-full bg-[#4E7245] text-white">
            <Edit3 className="w-3.5 h-3.5" />
          </span>
          <span>Edit Header to Footer</span>
        </button>
      </div>

      {/* Live Content & Image Editor Modal */}
      <WebsiteLiveContentEditorModal
        isOpen={isContentEditorOpen}
        onClose={() => setIsContentEditorOpen(false)}
        defaultSection={contentEditorSection}
      />
    </div>
  );
};
