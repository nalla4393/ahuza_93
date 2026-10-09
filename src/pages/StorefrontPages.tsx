import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Box,
  ChevronRight,
  Eye,
  Filter,
  Heart,
  Play,
  RotateCcw,
  Ruler,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  X,
  ZoomIn,
  Bell,
  BellRing,
  Check,
  Package,
} from 'lucide-react';
import { DocumentHead } from '../components/Layout';
import { SafeImage } from '../components/SafeImage';
import { ThreeFashionCanvas } from '../components/ThreeFashionCanvas';
import { StyleFinderQuiz } from '../components/StyleFinderQuiz';
import { ClothImageEditorModal } from '../components/ClothImageEditorModal';
import { RestockAlertModal } from '../components/RestockAlertModal';
import { useStore } from '../context/StoreContext';
import { Product, Review } from '../types';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { user, addToCart, toggleWishlist, isInWishlist } = useStore();
  const [clothEditorOpen, setClothEditorOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const wished = isInWishlist(product.id);
  const savingsPercent =
    product.price > product.discountPrice
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : 0;

  return (
    <article className="group bg-white border border-[#1E293B]/10 rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md relative">
      <div className="relative aspect-[3/4] bg-[#F4F7F2] overflow-hidden">
        {user?.role === 'owner' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setClothEditorOpen(true);
            }}
            className="absolute top-3 left-3 z-20 p-1.5 px-2 rounded-md bg-[#1E293B]/85 hover:bg-[#4E7245] text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs transition-colors border border-white/20"
            title="Owner: Edit Cloth Images"
          >
            <Sparkles className="w-3 h-3 text-[#A3D9A5]" />
            <span className="hidden sm:inline">Edit Cloth</span>
          </button>
        )}

        <Link to={`/product/${product.id}`} className="block w-full h-full">
          <SafeImage
            src={product.images[0]?.url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
          />
        </Link>

        {/* Quick Add to Wishlist Button */}
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-[#1E293B] shadow-xs transition-all hover:scale-110"
          aria-label={wished ? 'Remove from Wishlist' : 'Add to Wishlist'}
          title={wished ? 'Saved in Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`w-4 h-4 transition-colors ${wished ? 'fill-[#4E7245] text-[#4E7245]' : 'text-[#64748B] hover:text-[#4E7245]'}`} />
        </button>

        {/* Quick Action Overlay (View + Add to Bag) */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <Link
            to={`/product/${product.id}`}
            className="flex-1 py-2 px-3 bg-[#1E293B]/90 hover:bg-[#1E293B] backdrop-blur-xs text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-[#A3D9A5]" />
            <span>Quick View</span>
          </Link>
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={() => addToCart(product)}
            className="py-2 px-3.5 bg-[#4E7245] hover:bg-[#375330] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {product.stock > 0 ? '+ Add to Bag' : 'Sold Out'}
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] truncate">
            <span className="capitalize">{product.gender}</span>
            <span aria-hidden="true">·</span>
            <span>{product.categories[0]}</span>
            {product.isNewArrival && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#4E7245] font-semibold bg-[#EBF2E8] px-1.5 py-0.2 rounded text-[10px]">New Arrival</span>
              </>
            )}
            {!product.isNewArrival && product.isBestSeller && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#1E293B] font-semibold">Bestseller</span>
              </>
            )}
          </div>

          <Link
            to={`/product/${product.id}`}
            className="mt-1 block text-base font-semibold text-[#1E293B] hover:text-[#4E7245] transition-colors line-clamp-1"
          >
            {product.name}
          </Link>

          <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">{product.fabric}</p>
        </div>

        <div className="pt-2.5 border-t border-[#1E293B]/8 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono-num text-[15px] font-semibold text-[#1E293B]">
              ₹{product.discountPrice.toLocaleString('en-IN')}
            </span>
            {product.price > product.discountPrice && (
              <>
                <span className="font-mono-num text-xs text-[#94A3B8] line-through">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                <span className="font-mono-num text-xs text-[#4E7245] font-semibold bg-[#EBF2E8] px-1.5 py-0.2 rounded">
                  -{savingsPercent}%
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-[#64748B] font-mono-num">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{product.rating.toFixed(1)}</span>
          </div>
        </div>

        {product.gender === 'men' && (
          <div className="pt-2 border-t border-[#1E293B]/8 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRestockModalOpen(true);
              }}
              className="text-[11px] text-[#4E7245] hover:text-[#375330] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Bell className="w-3 h-3 text-[#4E7245]" />
              <span>Notify when stock arrives</span>
            </button>
            <span className="text-[10px] text-[#64748B] font-mono">Pure Cotton</span>
          </div>
        )}
      </div>

      {clothEditorOpen && (
        <ClothImageEditorModal
          product={product}
          isOpen={clothEditorOpen}
          onClose={() => setClothEditorOpen(false)}
        />
      )}

      {restockModalOpen && (
        <RestockAlertModal
          isOpen={restockModalOpen}
          onClose={() => setRestockModalOpen(false)}
          product={product}
        />
      )}
    </article>
  );
};

export const HomePage: React.FC = () => {
  const { products, websiteContent, showToast } = useStore();
  const navigate = useNavigate();

  const [activeCollectionTab, setActiveCollectionTab] = useState<
    'featured' | 'new' | 'bestsellers' | 'under999' | 'under1499' | 'under2000'
  >('featured');
  const [activeWhyScene, setActiveWhyScene] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const filteredTabProducts = useMemo(() => {
    switch (activeCollectionTab) {
      case 'new':
        return products.filter((p) => p.isNewArrival);
      case 'bestsellers':
        return products.filter((p) => p.isBestSeller);
      case 'under999':
        return products.filter((p) => p.discountPrice <= 999);
      case 'under1499':
        return products.filter((p) => p.discountPrice <= 1499);
      case 'under2000':
        return products.filter((p) => p.discountPrice <= 2000);
      default:
        return products.filter((p) => p.isFeatured);
    }
  }, [products, activeCollectionTab]);

  const womenPreview = useMemo(() => products.filter((p) => p.gender === 'women').slice(0, 3), [products]);
  const menPreview = useMemo(() => products.filter((p) => p.gender === 'men').slice(0, 3), [products]);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    showToast('Thank you for joining the AHUZA Atelier Journal!');
    setNewsletterEmail('');
  };

  return (
    <div>
      <DocumentHead
        title={`${websiteContent.brandName} – ${websiteContent.tagline}`}
        description={websiteContent.seo.defaultDescription}
      />

      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#F2F6F0] via-[#F8FAF7] to-[#F8FAF7] border-b border-[#1E293B]/10 overflow-hidden">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF2E8] border border-[#4E7245]/20 text-xs text-[#4E7245] font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#4E7245]" />
              <span>Indian Contemporary Everyday Fashion</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">Strictly Under ₹2,000 INR</span>
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#1E293B]">
                {websiteContent.hero.heading}
              </h1>
              <p className="font-display italic text-2xl sm:text-3xl text-[#4E7245]">
                “{websiteContent.hero.tagline}”
              </p>
            </div>

            <p className="text-base sm:text-lg text-[#334155] max-w-xl leading-relaxed">
              {websiteContent.hero.subheading} Breathable Jaipur mulmul Kurtis, Chanderi Kurta Sets with Dupatta, Everyday Lehengas, and tailored Men’s Kurtas—crafted for daily confidence and priced honestly between{' '}
              <span className="font-mono-num font-semibold text-[#1E293B]">₹499</span> and{' '}
              <span className="font-mono-num font-semibold text-[#1E293B]">₹1,999</span>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!websiteContent.hero.hideCtaWomen && (
                <Link
                  to="/women"
                  className="py-3 px-7 bg-black hover:bg-neutral-800 text-white text-xs font-semibold tracking-wider rounded-lg transition-all shadow-sm ring-1 ring-white/10 whitespace-nowrap cursor-pointer"
                >
                  {websiteContent.hero.ctaWomen || 'Shop Women’s'}
                </Link>
              )}
              {!websiteContent.hero.hideCtaMen && (
                <Link
                  to="/men"
                  className="py-3 px-6 bg-black hover:bg-neutral-800 text-white text-xs font-semibold tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {websiteContent.hero.ctaMen || 'Shop Men’s'}
                </Link>
              )}
              {!websiteContent.hero.hideCtaExplore && (
                <a
                  href="#curated-collections"
                  className="py-3 px-5 bg-white hover:bg-[#F2F6F0] text-black border border-black/20 text-xs font-semibold tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {websiteContent.hero.ctaExplore || 'Explore All'}
                </a>
              )}
            </div>

            <div className="pt-6 border-t border-[#1E293B]/10 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-mono-num text-lg font-semibold text-[#1E293B]">₹499 – ₹1,999</p>
                <p className="text-[#64748B]">Strict ₹2,000 Price Cap</p>
              </div>
              <div>
                <p className="font-mono-num text-lg font-semibold text-[#1E293B]">Artisanal Weaves</p>
                <p className="text-[#64748B]">100% Breathable Jaipur Cottons</p>
              </div>
              <div>
                <p className="font-mono-num text-lg font-semibold text-[#1E293B]">14-Day Returns</p>
                <p className="text-[#64748B]">Free Express Delivery Across India</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            {websiteContent.hero.imageUrl === '' ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#1E293B]/10 bg-gradient-to-br from-[#EBF2E8] via-white to-[#EBF2E8] aspect-[16/11] shadow-xl p-8 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="px-3 py-1 rounded-full bg-[#4E7245]/15 text-[#4E7245] text-xs font-semibold uppercase tracking-wider">
                    Minimalist Aesthetic
                  </span>
                  <h3 className="font-display text-3xl font-semibold text-[#1E293B]">
                    {websiteContent.hero.heading}
                  </h3>
                  <p className="text-sm text-[#4E7245] font-display italic">
                    “{websiteContent.hero.tagline}”
                  </p>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Hero photograph removed. You can restore or upload a new image anytime via the "Edit Website" panel.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1E293B]/10 flex items-center justify-between">
                  <span className="text-xs text-[#64748B] font-mono">100% Pure Indian Handloom Weaves</span>
                  <Link
                    to="/women"
                    className="py-2.5 px-5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Explore Catalog
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#1E293B]/10 bg-white aspect-[16/11] shadow-xl group">
                <SafeImage
                  src={websiteContent.hero.imageUrl || '/src/assets/images/ahuza_sage_hero_1791449084537.jpg'}
                  alt="AHUZA Campaign Editorial"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white">
                  <div>
                    <p className="text-xs font-semibold">Handcrafted Pure Rajasthan Weaves</p>
                    <p className="text-[11px] text-white/85">
                      60s Mulmul, airy Chanderi, and textured Khadi · Strictly under ₹2,000
                    </p>
                  </div>
                  <Link
                    to="/women"
                    className="py-2 px-4 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#A3D9A5]" />
                    <span>Shop Collection</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CURATED COLLECTIONS & PRICE-TIER EDIT */}
      <section id="curated-collections" className="max-w-[1360px] mx-auto px-4 sm:px-8 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[#4E7245] font-semibold tracking-wide uppercase">Curated Everyday Wardrobe</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1E293B] mt-1">
              Explore by Collection & Price Edit
            </h2>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#EBF2E8]/70 rounded-xl overflow-x-auto border border-[#4E7245]/20">
            {[
              { id: 'featured', label: websiteContent.collectionTitles.featured },
              { id: 'new', label: websiteContent.collectionTitles.newArrivals },
              { id: 'bestsellers', label: websiteContent.collectionTitles.bestSellers },
              { id: 'under999', label: 'Under ₹999' },
              { id: 'under1499', label: 'Under ₹1,499' },
              { id: 'under2000', label: 'Under ₹2,000' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCollectionTab(tab.id as typeof activeCollectionTab)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  activeCollectionTab === tab.id
                    ? 'bg-[#4E7245] text-white shadow-xs'
                    : 'text-[#334155] hover:text-[#1E293B] hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredTabProducts.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* PROMOTIONAL BANNER & SPECIAL OFFER STRIP */}
      {!websiteContent.promotionalBanner?.hideBanner && (
        <section className="max-w-[1360px] mx-auto px-4 sm:px-8 py-6">
          <div className="bg-black text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-neutral-800 relative overflow-hidden">
            <div className="space-y-1.5 text-center md:text-left z-10">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-[#4E7245] text-white font-semibold tracking-wider">
                Limited Time Promo
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-white">
                {websiteContent.promotionalBanner?.headline || 'Handloom Festival Savings'}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 max-w-xl">
                {websiteContent.promotionalBanner?.subtext || 'Use exclusive coupon code at checkout for additional savings on all orders under ₹2,000.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0 z-10">
              {websiteContent.promotionalBanner?.code && (
                <div className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-xl flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Coupon:</span>
                  <span className="font-mono text-sm font-bold text-amber-300 tracking-wider">
                    {websiteContent.promotionalBanner.code}
                  </span>
                </div>
              )}
              <Link
                to="/women"
                className="py-2.5 px-6 bg-[#4E7245] hover:bg-[#3E5C37] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs whitespace-nowrap cursor-pointer"
              >
                Claim Offer
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* WOMEN'S & MEN'S DEPARTMENT SHOWCASES */}
      <section className="bg-white border-y border-[#1E293B]/10 py-16">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 space-y-16">
          <div className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-[#4E7245] font-semibold uppercase tracking-wider">Women’s Everyday & Festive Edit</p>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1E293B] mt-1">
                  Kurtis · Frocks · Kurta Sets with Dupatta · Lehengas · Loungewear
                </h2>
              </div>
              <Link
                to="/women"
                className="text-xs font-semibold text-[#1E293B] hover:text-[#4E7245] flex items-center gap-1 whitespace-nowrap transition-colors"
              >
                <span>View All Women’s</span>
                <ArrowRight className="w-4 h-4 text-[#4E7245]" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {womenPreview.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>

          <div className="space-y-6 pt-8 border-t border-[#1E293B]/10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-[#4E7245] font-semibold uppercase tracking-wider">Men’s Contemporary Staples</p>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1E293B] mt-1">
                  Slub Cotton Kurtas · Casual Wear · Night Suits · Track Suits
                </h2>
              </div>
              <Link
                to="/men"
                className="text-xs font-semibold text-[#1E293B] hover:text-[#4E7245] flex items-center gap-1 whitespace-nowrap transition-colors"
              >
                <span>View All Men’s</span>
                <ArrowRight className="w-4 h-4 text-[#4E7245]" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {menPreview.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE GEMINI-POWERED STYLE FINDER QUIZ */}
      <StyleFinderQuiz />

      {/* WHY AHUZA — 3D INTERACTIVE EXPERIENCE */}
      <section className="bg-[#18181B] text-[#F9F8F6] py-20">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="text-xs text-[#FDBA74] font-semibold tracking-wide">
              WHY AHUZA? · 3D INTERACTIVE STORY
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold text-white">
              “{websiteContent.whyAhuza.narrativeHeadline}”
            </h2>
            <p className="text-sm sm:text-base text-[#D4D4D8] leading-relaxed">
              {websiteContent.whyAhuza.narrativeSubtext}
            </p>

            <div className="space-y-3 pt-2">
              {websiteContent.whyAhuza.scenes.map((scene, idx) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setActiveWhyScene(idx)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    activeWhyScene === idx
                      ? 'bg-white/10 border-[#FDBA74]'
                      : 'bg-white/3 border-white/10 hover:bg-white/6'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {scene.stepNumber}. {scene.title}
                    </span>
                    <span className="font-mono-num text-xs text-[#FDBA74] shrink-0">{scene.metricLabel}</span>
                  </div>
                  {activeWhyScene === idx && (
                    <p className="text-xs text-[#D4D4D8] mt-2 leading-relaxed">{scene.description}</p>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate('/why-ahuza')}
                className="py-3 px-6 bg-[#9A3412] hover:bg-[#7C2D12] text-white text-xs font-semibold tracking-wider rounded-lg transition-colors whitespace-nowrap"
              >
                {websiteContent.whyAhuza.ctaText}
              </button>
              <span className="font-display italic text-lg text-[#D6C7B2]">
                “{websiteContent.tagline}”
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {websiteContent.whyAhuza.scenes.map((scene, idx) => (
              <div
                key={scene.id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FED7AA]/40 hover:bg-white/10 transition-all space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-[#FED7AA]">
                    <span>0{idx + 1}</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#9A3412] text-white">
                      {scene.metricLabel}
                    </span>
                  </div>
                  <h4 className="font-display text-lg font-semibold text-white mt-2 leading-snug">
                    {scene.title}
                  </h4>
                  <p className="text-xs text-[#D4D4D8] mt-1 leading-relaxed">
                    {scene.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#FED7AA]">
                  <span>Jaipur Craft Standard</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VERIFIED CUSTOMER REVIEWS & NEWSLETTER */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-8 py-16 space-y-16">
        <div className="space-y-8">
          <div>
            <p className="text-xs text-[#9A3412] font-semibold">Verified Buyer Voices</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B] mt-1">
              Loved Across India for Everyday Comfort
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Ananya Deshmukh',
                role: 'Architect · Pune, Maharashtra',
                item: 'Ahuza Cotton Everyday Kurti (₹799)',
                quote:
                  'Before AHUZA, everyday office kurtis under ₹1,000 meant stiff polyester blends. The 60s Jaipur mulmul Kurti stays breathable through 9-hour site visits, with impeccable tailoring and fall.',
              },
              {
                name: 'Meera Nair',
                role: 'University Lecturer · Kochi, Kerala',
                item: 'Ahuza Cotton Kurta Set with Dupatta (₹1,499)',
                quote:
                  'Getting a complete 3-piece Chanderi cotton suit with a handloom organza dupatta at ₹1,499 is extraordinary. Washed it three times already—zero color bleed and zero shrinkage.',
              },
              {
                name: 'Rohan Kulkarni',
                role: 'Product Designer · Bengaluru, Karnataka',
                item: 'Ahuza Casual Cotton Kurta (₹799)',
                quote:
                  'The Indigo Slate slub khadi kurta fits like a tailored shirt. Clean mandarin collar, deep side pockets, and delivered to Bengaluru in 48 hours with live tracking.',
              },
            ].map((t) => (
              <blockquote
                key={t.name}
                className="bg-white border border-[#18181B]/10 rounded-lg p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-[#27272A] leading-relaxed">“{t.quote}”</p>
                </div>
                <footer className="pt-3 border-t border-[#18181B]/10 text-xs">
                  <p className="font-semibold text-[#18181B]">{t.name}</p>
                  <p className="text-[#52525B]">{t.role}</p>
                  <p className="text-[#9A3412] font-medium mt-0.5">Verified Purchase · {t.item}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>

        <div className="bg-[#F2EFE9] border border-[#18181B]/10 rounded-xl p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
              Join the AHUZA Everyday Dispatch
            </h3>
            <p className="text-xs sm:text-sm text-[#52525B]">
              Receive early access to new Jaipur block-print drops, seasonal Kurta Sets under ₹1,499, and exclusive member coupon codes.
            </p>
          </div>
          <form onSubmit={handleNewsletter} className="w-full lg:w-auto flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              className="px-4 py-2.5 bg-white border border-[#18181B]/20 rounded-lg text-sm min-w-[260px] focus:outline-none focus:border-[#9A3412]"
            />
            <button
              type="submit"
              className="py-2.5 px-6 bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export const CollectionPage: React.FC<{ presetGender?: 'women' | 'men' }> = ({ presetGender }) => {
  const { products, categories } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryText = searchParams.get('q') || '';
  const initialMaxPrice = Number(searchParams.get('maxPrice')) || 2000;
  const initialCat = searchParams.get('category') || 'All';

  const [selectedGender, setSelectedGender] = useState<'all' | 'women' | 'men'>(presetGender || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [maxPrice, setMaxPrice] = useState<number>(Math.min(2000, initialMaxPrice));
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating'>('featured');
  const [menRestockModalOpen, setMenRestockModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (presetGender) {
      setSelectedGender(presetGender);
      setSelectedCategory('All');
    }
  }, [presetGender]);

  const genderCategories = useMemo(() => {
    if (selectedGender === 'women') return categories.filter((c) => c.gender === 'women');
    if (selectedGender === 'men') return categories.filter((c) => c.gender === 'men');
    return categories;
  }, [categories, selectedGender]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.status === 'Published' && p.discountPrice <= maxPrice);

    if (selectedGender !== 'all') {
      list = list.filter((p) => p.gender === selectedGender || p.gender === 'unisex');
    }
    if (selectedCategory !== 'All') {
      list = list.filter((p) =>
        p.categories.some((c) => c.toLowerCase() === selectedCategory.toLowerCase())
      );
    }
    if (selectedSize) {
      list = list.filter((p) => p.sizes.includes(selectedSize));
    }
    if (selectedColor) {
      list = list.filter((p) =>
        p.colors.some((c) => c.name.toLowerCase().includes(selectedColor.toLowerCase()))
      );
    }
    if (inStockOnly) {
      list = list.filter((p) => p.stock > 0);
    }
    if (queryText.trim()) {
      const terms = queryText.trim().toLowerCase().split(/\s+/);
      list = list.filter((p) => {
        const hay = [
          p.name,
          p.sku,
          p.fabric,
          p.description,
          p.gender,
          ...p.categories,
          ...p.colors.map((c) => c.name),
          ...p.searchKeywords,
        ]
          .join(' ')
          .toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    }

    if (sortBy === 'price_asc') list = [...list].sort((a, b) => a.discountPrice - b.discountPrice);
    if (sortBy === 'price_desc') list = [...list].sort((a, b) => b.discountPrice - a.discountPrice);
    if (sortBy === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);

    return list;
  }, [products, selectedGender, selectedCategory, maxPrice, selectedSize, selectedColor, inStockOnly, queryText, sortBy]);

  const pageHeading =
    presetGender === 'women'
      ? "Women's Everyday & Casual Collection"
      : presetGender === 'men'
      ? "Men's Everyday & Casual Collection"
      : queryText
      ? `Search Results for “${queryText}”`
      : 'All AHUZA Collections';

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-10 space-y-8">
      <DocumentHead
        title={pageHeading}
        description={`Shop ${pageHeading} at AHUZA. Every piece priced under ₹2,000 INR with premium everyday comfort.`}
      />

      <div className="space-y-2 border-b border-[#18181B]/10 pb-6">
        <nav className="flex items-center gap-1.5 text-xs text-[#52525B]">
          <Link to="/" className="hover:text-[#18181B]">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#18181B] font-medium">{pageHeading}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
          <div>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold text-[#18181B]">{pageHeading}</h1>
            <p className="text-xs sm:text-sm text-[#52525B] mt-1">
              Showing <span className="font-mono-num font-semibold text-[#18181B]">{filteredProducts.length}</span> designs · Maximum Brand Price Ceiling:{' '}
              <span className="font-mono-num font-semibold text-[#9A3412]">₹2,000 INR</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-[#52525B]">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 bg-white border border-[#18181B]/15 rounded-lg text-xs font-semibold text-[#18181B]"
            >
              <option value="featured">Featured & Curated</option>
              <option value="price_asc">Price: Low to High (₹499 → ₹1,999)</option>
              <option value="price_desc">Price: High to Low (≤ ₹2,000)</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>

        {(selectedGender === 'men' || presetGender === 'men') && (
          <div className="mt-4 bg-[#9A3412]/8 border border-[#9A3412]/20 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#9A3412]/15 text-[#9A3412]">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs sm:text-sm text-[#18181B]">
                  Men's Artisanal Handloom Stock Alert
                </p>
                <p className="text-xs text-[#52525B]">
                  Limited Jaipur artisanal slub cotton &amp; khadi batches. Get priority alerts when fresh inventory arrives.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMenRestockModalOpen(true)}
              className="py-2.5 px-4 bg-[#9A3412] hover:bg-[#7C2D12] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notify me when stock arrives</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'All'
                ? 'bg-[#18181B] text-white'
                : 'bg-[#F2EFE9] text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            All Categories
          </button>
          {genderCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat.name
                  ? 'bg-[#18181B] text-white'
                  : 'bg-[#F2EFE9] text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-6 bg-white border border-[#18181B]/10 rounded-lg p-5 h-fit">
          <div className="flex items-center justify-between border-b border-[#18181B]/10 pb-3">
            <span className="text-xs font-semibold text-[#18181B] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#9A3412]" />
              <span>Refine Collection</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setMaxPrice(2000);
                setSelectedSize('');
                setSelectedColor('');
                setInStockOnly(false);
                if (queryText) setSearchParams({});
              }}
              className="text-xs text-[#9A3412] hover:underline"
            >
              Reset All
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#18181B]">Max Price Ceiling</span>
              <span className="font-mono-num font-semibold text-[#9A3412]">
                Up to ₹{maxPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min={499}
              max={2000}
              step={100}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#9A3412]"
            />
            <div className="flex justify-between text-[11px] font-mono-num text-[#71717A]">
              <span>₹499</span>
              <span>₹999</span>
              <span>₹1,499</span>
              <span>₹2,000 Max</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#18181B]">Size</span>
            <div className="flex flex-wrap gap-1.5">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize((prev) => (prev === sz ? '' : sz))}
                  className={`w-9 h-8 rounded text-xs font-mono-num font-semibold border transition-colors ${
                    selectedSize === sz
                      ? 'bg-[#18181B] text-white border-[#18181B]'
                      : 'bg-[#F9F8F6] text-[#18181B] border-[#18181B]/15 hover:border-[#18181B]'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#18181B]">Color Family</label>
            <input
              type="text"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              placeholder="e.g. Sage, Terracotta, Indigo..."
              className="w-full px-3 py-1.5 text-xs bg-[#F9F8F6] border border-[#18181B]/15 rounded-md"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#18181B] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="accent-[#9A3412] rounded"
            />
            <span>In-Stock Ready to Ship Only</span>
          </label>
        </aside>

        <div className="lg:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-[#18181B]/10 rounded-lg p-12 text-center space-y-3">
              <p className="font-display text-2xl font-semibold text-[#18181B]">
                No matching designs found for these filters
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setMaxPrice(2000);
                  setSelectedSize('');
                  setSelectedColor('');
                }}
                className="px-5 py-2.5 bg-[#18181B] text-white text-xs font-semibold rounded-lg"
              >
                Show All Designs Under ₹2,000
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Men's Collection Restock Alert Modal */}
      {menRestockModalOpen && (
        <RestockAlertModal
          isOpen={menRestockModalOpen}
          onClose={() => setMenRestockModalOpen(false)}
          categoryName="Men's Collection"
        />
      )}
    </div>
  );
};

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    products,
    user,
    token,
    addToCart,
    toggleWishlist,
    isInWishlist,
    updateProfile,
    trackEvent,
    showToast,
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeMediaTab, setActiveMediaTab] = useState<'gallery' | '360'>('gallery');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string }>({
    name: 'Standard',
    hex: '#9A3412',
  });
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [quantity, setQuantity] = useState<number>(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [clothEditorOpen, setClothEditorOpen] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  // Price Drop Alert State
  const [priceAlertModalOpen, setPriceAlertModalOpen] = useState(false);
  const [priceAlertStatus, setPriceAlertStatus] = useState<{
    active: boolean;
    targetPrice?: number;
    alertId?: string;
  } | null>(null);
  const [priceAlertEmail, setPriceAlertEmail] = useState('');
  const [targetPriceInput, setTargetPriceInput] = useState<number>(0);
  const [priceAlertPreference, setPriceAlertPreference] = useState<'any_drop' | 'below_target'>('any_drop');
  const [priceAlertLoading, setPriceAlertLoading] = useState(false);
  const [priceAlertFeedback, setPriceAlertFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Men's Stock Arrival Alert State
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockAlertStatus, setRestockAlertStatus] = useState<{ active: boolean; alertId?: string } | null>(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLocation, setReviewLocation] = useState('Mumbai, Maharashtra');

  useEffect(() => {
    async function loadProductDetail() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          setReviews(data.reviews || []);
          setRelated(data.related || []);
          setSelectedColor(data.product.colors[0] || { name: 'Standard', hex: '#9A3412' });
          setSelectedSize(data.product.sizes[1] || data.product.sizes[0] || 'M');
          trackEvent('product_view', { productId: data.product.id });
          if (user) {
            updateProfile({ recentlyViewedProductId: data.product.id });
          }
        } else {
          const localMatch = products.find((p) => p.id === id);
          setProduct(localMatch || null);
        }
      } catch {
        const localMatch = products.find((p) => p.id === id);
        setProduct(localMatch || null);
      } finally {
        setLoading(false);
      }
    }
    loadProductDetail();
  }, [id]);

  // Load existing price drop alert for this user/email
  useEffect(() => {
    if (!product) return;
    setTargetPriceInput(Math.max(100, Math.round(product.discountPrice * 0.9)));
    const candidateEmail = user?.email || localStorage.getItem('ahuza_alert_email') || '';
    if (candidateEmail) {
      setPriceAlertEmail(candidateEmail);
      fetch(`/api/products/${product.id}/price-drop-alerts/me?email=${encodeURIComponent(candidateEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.alert && data.alert.status === 'active') {
            setPriceAlertStatus({
              active: true,
              targetPrice: data.alert.targetPrice,
              alertId: data.alert.id,
            });
          } else {
            setPriceAlertStatus(null);
          }
        })
        .catch(() => {});

      // Check stock arrival alert status
      fetch(`/api/products/${product.id}/restock-alerts/me?email=${encodeURIComponent(candidateEmail)}&size=${encodeURIComponent(selectedSize)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.alert && data.alert.status === 'pending') {
            setRestockAlertStatus({ active: true, alertId: data.alert.id });
          } else {
            setRestockAlertStatus(null);
          }
        })
        .catch(() => {});
    }
  }, [product, selectedSize, user, token]);

  const handleSavePriceAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    const cleanEmail = priceAlertEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setPriceAlertFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setPriceAlertLoading(true);
    setPriceAlertFeedback(null);
    try {
      const res = await fetch(`/api/products/${product.id}/price-drop-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: cleanEmail,
          targetPrice: priceAlertPreference === 'below_target' ? targetPriceInput : product.discountPrice - 1,
          preference: priceAlertPreference,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate alert.');
      }
      localStorage.setItem('ahuza_alert_email', cleanEmail);
      setPriceAlertStatus({
        active: true,
        targetPrice: data.alert?.targetPrice || targetPriceInput,
        alertId: data.alert?.id,
      });
      setPriceAlertFeedback({
        type: 'success',
        message: `Alert activated! We will notify you at ${cleanEmail} if the price decreases.`,
      });
      showToast('Price drop alert activated!', 'success');
      setTimeout(() => {
        setPriceAlertModalOpen(false);
      }, 1600);
    } catch (err: any) {
      setPriceAlertFeedback({ type: 'error', message: err.message || 'Error setting price drop alert.' });
    } finally {
      setPriceAlertLoading(false);
    }
  };

  const handleCancelPriceAlert = async () => {
    if (!priceAlertStatus?.alertId) return;
    setPriceAlertLoading(true);
    try {
      await fetch(`/api/price-drop-alerts/${priceAlertStatus.alertId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setPriceAlertStatus(null);
      setPriceAlertFeedback({ type: 'success', message: 'Price drop alert cancelled.' });
      showToast('Price drop alert cancelled', 'info');
      setTimeout(() => setPriceAlertModalOpen(false), 1200);
    } catch {
      setPriceAlertFeedback({ type: 'error', message: 'Failed to cancel alert.' });
    } finally {
      setPriceAlertLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
          <div className="lg:col-span-7 aspect-[4/5] bg-[#E5DFD5] rounded-xl" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-8 bg-[#E5DFD5] rounded w-3/4" />
            <div className="h-6 bg-[#E5DFD5] rounded w-1/3" />
            <div className="h-32 bg-[#E5DFD5] rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold text-[#18181B]">Product Currently Unavailable</h1>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-[#18181B] text-white text-xs font-semibold rounded-lg"
        >
          Return to Storefront
        </Link>
      </div>
    );
  }

  const wished = isInWishlist(product.id);
  const savingsAmount = Math.max(0, product.price - product.discountPrice);
  const savingsPercent =
    product.price > product.discountPrice ? Math.round((savingsAmount / product.price) * 100) : 0;

  const handleBuyNow = async () => {
    if (product.stock <= 0) {
      showToast('This item is out of stock.', 'error');
      return;
    }
    await addToCart(product, selectedSize, selectedColor.name, quantity, false);
    navigate('/checkout');
  };

  const handleShare = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) {
      showToast('Please sign in to post a verified review.', 'info');
      return;
    }
    const res = await fetch(`/api/products/${product.id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
        authorLocation: reviewLocation,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setReviews((prev) => [data.review, ...prev]);
      setProduct(data.product);
      setReviewTitle('');
      setReviewComment('');
      showToast('Thank you! Your review has been published.');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8 space-y-16">
      <DocumentHead
        title={product.seoTitle || product.name}
        description={product.seoDescription || product.description}
      />

      <nav className="flex items-center gap-1.5 text-xs text-[#52525B] overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-[#18181B]">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <Link
          to={product.gender === 'men' ? '/men' : '/women'}
          className="hover:text-[#18181B] capitalize"
        >
          {product.gender}’s Collection
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[#18181B] font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-4">
          {/* Owner Mode: Pure Cloth Image Management Banner */}
          {user?.role === 'owner' && (
            <div className="bg-[#18181B] text-white p-3 rounded-xl border border-[#FED7AA]/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-xs text-[#FED7AA]">Owner Studio Active:</span>
                <span className="text-xs text-white/90">Pure Cloth Images (No Body/Faces Standard)</span>
              </div>
              <button
                type="button"
                onClick={() => setClothEditorOpen(true)}
                className="py-1.5 px-3 bg-[#9A3412] hover:bg-[#7C2D12] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-[#FED7AA]/30 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FED7AA]" />
                <span>Upload & Edit Cloth Images</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#18181B]/10 p-2.5 rounded-lg">
            <div className="flex items-center gap-1 bg-[#F2EFE9] p-1 rounded-md">
              <button
                type="button"
                onClick={() => setActiveMediaTab('gallery')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeMediaTab === 'gallery' ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#52525B]'
                }`}
              >
                Studio Gallery
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('360')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeMediaTab === '360' ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#52525B]'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-[#9A3412]" />
                <span>360° 3D Form</span>
              </button>
            </div>
          </div>

          <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white border border-[#18181B]/10">
            {activeMediaTab === 'gallery' && (
              <div
                onClick={() => setIsZoomed((prev) => !prev)}
                className="w-full h-full relative cursor-zoom-in overflow-hidden"
              >
                <SafeImage
                  src={product.images[activeImageIndex]?.url || product.images[0]?.url}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100'
                  }`}
                />
                <div className="absolute bottom-4 right-4 bg-black/65 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 pointer-events-none">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{isZoomed ? 'Click to Reset Zoom' : 'Click to Zoom Weave'}</span>
                </div>
              </div>
            )}

            {activeMediaTab === '360' && (
              <ThreeFashionCanvas
                mode="garment360"
                colorHex={selectedColor.hex}
                drapeType={product.drapeType}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-[#18181B]/10 rounded-xl p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2 border-b border-[#18181B]/10 pb-5">
            <div className="flex items-center justify-between text-xs text-[#71717A]">
              <span>
                SKU: <strong className="font-mono-num text-[#18181B]">{product.sku}</strong> · {product.categories.join(' / ')}
              </span>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 text-[#52525B] hover:text-[#18181B]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B]">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 text-xs text-[#52525B]">
              <div className="flex items-center gap-1 text-amber-500 font-mono-num font-semibold">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-[#18181B]">{product.rating.toFixed(1)}</span>
              </div>
              <span>·</span>
              <span>{product.reviewCount} Verified Reviews</span>
              <span>·</span>
              <span className={product.stock > 0 ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                {product.stock > 0 ? `In Stock (${product.stock} units)` : 'Out of Stock'}
              </span>
              {product.gender === 'men' && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setRestockModalOpen(true)}
                    className="text-[#9A3412] hover:text-[#7C2D12] underline underline-offset-2 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Bell className="w-3 h-3 text-[#9A3412]" />
                    <span>Notify when stock arrives</span>
                  </button>
                </>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-baseline gap-3">
              <span className="font-mono-num text-3xl font-semibold text-[#18181B]">
                ₹{product.discountPrice.toLocaleString('en-IN')}
              </span>
              {product.price > product.discountPrice && (
                <>
                  <span className="font-mono-num text-base text-[#71717A] line-through">
                    MRP ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  <span className="font-mono-num text-xs font-semibold text-[#9A3412]">
                    Save ₹{savingsAmount} ({savingsPercent}% OFF)
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={() => setPriceAlertModalOpen(true)}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[#9A3412]/30 text-[#9A3412] hover:bg-[#9A3412]/5 transition-colors"
                title="Notify me when price drops"
              >
                {priceAlertStatus?.active ? (
                  <>
                    <BellRing className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-800 font-semibold">Alert Set (≤₹{priceAlertStatus.targetPrice})</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-[#9A3412]" />
                    <span>Notify on Price Drop</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="text-xs text-[#52525B] block">
              Color: <strong className="text-[#18181B]">{selectedColor.name}</strong>
            </span>
            <div className="flex flex-wrap gap-2.5">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                    selectedColor.name === c.name
                      ? 'border-[#18181B] bg-[#F2EFE9] font-semibold'
                      : 'border-[#18181B]/15 bg-white'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#52525B]">
                Select Indian Size: <strong className="text-[#18181B]">{selectedSize}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSizeChartOpen(true)}
                className="text-[#9A3412] font-semibold flex items-center gap-1 hover:underline"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size Chart</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`w-11 h-10 rounded-lg font-mono-num text-xs font-semibold border ${
                    selectedSize === sz
                      ? 'bg-[#18181B] text-white border-[#18181B]'
                      : 'bg-[#F9F8F6] text-[#18181B] border-[#18181B]/15'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#18181B]/20 rounded-lg bg-[#F9F8F6]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2.5 text-sm font-semibold"
                >
                  -
                </button>
                <span className="px-3 font-mono-num text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock || 1, q + 1))}
                  className="px-3 py-2.5 text-sm font-semibold"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => addToCart(product, selectedSize, selectedColor.name, quantity, true)}
                className="flex-1 py-3 px-5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-50 text-white text-xs font-semibold tracking-wider rounded-lg flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{product.stock > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className="p-3 rounded-lg border border-[#18181B]/20"
                aria-label="Save to Wishlist"
              >
                <Heart className={`w-4 h-4 ${wished ? 'fill-[#9A3412] text-[#9A3412]' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={handleBuyNow}
                className="py-3 px-6 bg-[#9A3412] hover:bg-[#7C2D12] disabled:opacity-50 text-white text-xs font-semibold tracking-wider rounded-lg whitespace-nowrap flex-1"
              >
                BUY NOW
              </button>
              <button
                type="button"
                onClick={() => setPriceAlertModalOpen(true)}
                className={`py-3 px-4 rounded-lg text-xs font-semibold tracking-wider flex items-center justify-center gap-1.5 transition-colors border ${
                  priceAlertStatus?.active
                    ? 'border-emerald-600/30 bg-emerald-50 text-emerald-800'
                    : 'border-[#18181B]/20 bg-white hover:bg-[#F9F8F6] text-[#18181B]'
                }`}
              >
                {priceAlertStatus?.active ? (
                  <>
                    <BellRing className="w-4 h-4 text-emerald-700" />
                    <span className="truncate">ALERT ACTIVE</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-[#9A3412]" />
                    <span className="truncate">NOTIFY ON PRICE DROP</span>
                  </>
                )}
              </button>
            </div>

            {/* Men's Collection Stock Arrival Notification Button */}
            {product.gender === 'men' && (
              <button
                type="button"
                onClick={() => setRestockModalOpen(true)}
                className={`w-full py-3 px-4 rounded-lg text-xs font-semibold tracking-wider flex items-center justify-center gap-2 transition-colors border cursor-pointer ${
                  restockAlertStatus?.active
                    ? 'border-emerald-600/30 bg-emerald-50 text-emerald-800'
                    : 'border-[#9A3412]/30 bg-[#9A3412]/5 hover:bg-[#9A3412]/10 text-[#9A3412]'
                }`}
              >
                <Package className="w-4 h-4 text-[#9A3412]" />
                <span>
                  {restockAlertStatus?.active
                    ? 'RESTOCK PRIORITY ALERT ACTIVE (WE WILL NOTIFY YOU)'
                    : 'NOTIFY ME WHEN STOCK ARRIVES'}
                </span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-[#18181B]/10 space-y-3 text-xs">
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit PIN code"
                className="flex-1 px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg font-mono-num"
              />
              <button
                type="button"
                onClick={() =>
                  setPincodeStatus(
                    pincode.length === 6
                      ? `Express Delivery available to PIN ${pincode}: ${product.deliveryEstimateDays}`
                      : 'Please enter a valid 6-digit Indian PIN code.'
                  )
                }
                className="px-4 py-2 bg-[#18181B] text-white font-semibold rounded-lg"
              >
                Check
              </button>
            </div>
            {pincodeStatus && <p className="text-emerald-700 font-medium">{pincodeStatus}</p>}
            <div className="space-y-1.5 text-[#52525B]">
              <p className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#9A3412]" />
                <span>{product.deliveryEstimateDays}</span>
              </p>
              <p className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#9A3412]" />
                <span>{product.returnWindowDays}-Day Easy Return & Exchange</span>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#9A3412]" />
                <span>{product.fabric}</span>
              </p>
            </div>
            <p className="text-[#52525B] pt-2 leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {sizeChartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181B]/10 pb-3">
              <h3 className="font-display text-2xl font-semibold text-[#18181B]">AHUZA Size Chart</h3>
              <button onClick={() => setSizeChartOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <table className="w-full text-left text-xs font-mono-num">
              <thead>
                <tr className="border-b border-[#18181B]/15">
                  <th className="py-2">Size</th>
                  <th className="py-2">Bust/Chest</th>
                  <th className="py-2">Waist</th>
                  <th className="py-2">Hip</th>
                  <th className="py-2">Length</th>
                </tr>
              </thead>
              <tbody>
                {product.sizeChart.map((r) => (
                  <tr key={r.size} className="border-b border-[#18181B]/8">
                    <td className="py-2 font-semibold">{r.size}</td>
                    <td className="py-2">{r.bustOrChestInches}</td>
                    <td className="py-2">{r.waistInches}</td>
                    <td className="py-2">{r.hipInches}</td>
                    <td className="py-2">{r.lengthInches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Reviews */}
      <section className="pt-10 border-t border-[#18181B]/10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-3xl font-semibold text-[#18181B]">
            Customer Reviews ({reviews.length})
          </h2>
          <form
            onSubmit={handleSubmitReview}
            className="bg-white border border-[#18181B]/10 rounded-lg p-5 space-y-3 text-xs"
          >
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Review headline"
              className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-md"
            />
            <textarea
              rows={3}
              required
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience with fabric and fit..."
              className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#18181B]/15 rounded-md"
            />
            <button
              type="submit"
              className="py-2 px-4 bg-[#18181B] text-white font-semibold rounded-lg"
            >
              Submit Review
            </button>
          </form>
        </div>
        <div className="lg:col-span-7 space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-white border border-[#18181B]/10 rounded-lg p-5 space-y-1.5 text-xs">
              <p className="font-semibold text-[#18181B]">{rev.title}</p>
              <p className="text-[#27272A]">{rev.comment}</p>
              <p className="text-[#71717A]">
                {rev.authorName} · {rev.authorLocation}
              </p>
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="pt-10 border-t border-[#18181B]/10 space-y-6">
          <h2 className="font-display text-3xl font-semibold text-[#18181B]">Related Designs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Cloth Image Editor Modal for Owner */}
      {clothEditorOpen && product && (
        <ClothImageEditorModal
          product={product}
          isOpen={clothEditorOpen}
          onClose={() => setClothEditorOpen(false)}
          onSaved={(updated) => setProduct(updated)}
        />
      )}

      {/* Stock Arrival / Restock Alert Modal */}
      {restockModalOpen && product && (
        <RestockAlertModal
          isOpen={restockModalOpen}
          onClose={() => setRestockModalOpen(false)}
          product={product}
          defaultSize={selectedSize}
        />
      )}

      {/* Price Drop Alert Modal */}
      {priceAlertModalOpen && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#18181B]/10 relative space-y-4">
            <button
              type="button"
              onClick={() => {
                setPriceAlertModalOpen(false);
                setPriceAlertFeedback(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-[#71717A] hover:text-[#18181B] rounded-lg hover:bg-[#F4F4F5]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#9A3412]/10 rounded-xl text-[#9A3412]">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-[#18181B]">
                  Price Drop Alert
                </h3>
                <p className="text-xs text-[#71717A]">
                  We'll email you the moment the price decreases.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#18181B]/10 flex items-center gap-3">
              <SafeImage
                src={product.images[0]?.url}
                alt={product.name}
                className="w-14 h-16 object-cover rounded-lg"
              />
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-semibold text-[#18181B] truncate">{product.name}</p>
                <p className="text-[#71717A] font-mono-num">Current: <span className="font-bold text-[#18181B]">₹{product.discountPrice.toLocaleString('en-IN')}</span></p>
                <p className="text-[11px] text-[#9A3412]">AHUZA Direct Artisan Price Cap</p>
              </div>
            </div>

            {priceAlertFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  priceAlertFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {priceAlertFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{priceAlertFeedback.message}</span>
              </div>
            )}

            {priceAlertStatus?.active ? (
              <div className="space-y-4 pt-1">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Alert is currently active!
                  </p>
                  <p className="text-emerald-800">
                    We will send an alert to <span className="font-mono font-medium">{priceAlertEmail}</span> if the price drops to or below <strong className="font-mono">₹{priceAlertStatus.targetPrice}</strong>.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={priceAlertLoading}
                    onClick={handleCancelPriceAlert}
                    className="flex-1 py-2.5 px-4 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    {priceAlertLoading ? 'Cancelling...' : 'Cancel Alert'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceAlertModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Keep Alert
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSavePriceAlert} className="space-y-3.5 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">
                    Email Address to Notify
                  </label>
                  <input
                    type="email"
                    required
                    value={priceAlertEmail}
                    onChange={(e) => setPriceAlertEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg text-xs text-[#18181B] focus:outline-hidden focus:border-[#9A3412]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#18181B]">
                    Alert Trigger
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPriceAlertPreference('any_drop')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        priceAlertPreference === 'any_drop'
                          ? 'border-[#9A3412] bg-[#9A3412]/5 font-semibold text-[#9A3412]'
                          : 'border-[#18181B]/15 bg-white text-[#52525B]'
                      }`}
                    >
                      <p>Any Price Drop</p>
                      <p className="text-[10px] text-[#71717A] mt-0.5">Below ₹{product.discountPrice}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceAlertPreference('below_target')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        priceAlertPreference === 'below_target'
                          ? 'border-[#9A3412] bg-[#9A3412]/5 font-semibold text-[#9A3412]'
                          : 'border-[#18181B]/15 bg-white text-[#52525B]'
                      }`}
                    >
                      <p>Custom Target</p>
                      <p className="text-[10px] text-[#71717A] mt-0.5">Specify maximum price</p>
                    </button>
                  </div>
                </div>

                {priceAlertPreference === 'below_target' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#18181B]">
                      Notify me when price drops below (₹)
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={product.discountPrice - 1}
                      value={targetPriceInput}
                      onChange={(e) => setTargetPriceInput(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg text-xs font-mono-num text-[#18181B]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={priceAlertLoading}
                  className="w-full py-3 bg-[#9A3412] hover:bg-[#7C2D12] disabled:opacity-50 text-white text-xs font-semibold tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <BellRing className="w-4 h-4" />
                  <span>{priceAlertLoading ? 'Setting Alert...' : 'SET PRICE DROP ALERT'}</span>
                </button>

                <p className="text-[11px] text-[#71717A] text-center">
                  Zero spam. We will only email you if the price drops.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
