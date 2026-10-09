import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  ShoppingBag,
  Heart,
  Star,
  Compass,
  Layers,
  Palette,
  Sun,
  Crown,
  Coffee,
  Plane,
  Briefcase,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { SafeImage } from './SafeImage';

interface StyleFinderResult {
  personaTitle: string;
  personaSubtitle: string;
  personaDescription: string;
  stylingAdvice: string[];
  outfitComboSuggestion: string;
  recommendedProducts: (Product & {
    stylingTip?: string;
    matchReason?: string;
    matchScore?: number;
  })[];
  aiGenerated: boolean;
}

export const StyleFinderQuiz: React.FC = () => {
  const { addToCart, toggleWishlist, isInWishlist, showToast } = useStore();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<StyleFinderResult | null>(null);

  // Quiz Form State
  const [gender, setGender] = useState<'women' | 'men' | 'all'>('women');
  const [occasion, setOccasion] = useState<string>('Daily Work & College');
  const [silhouette, setSilhouette] = useState<string>('Straight Cut Kurti');
  const [fabricPreference, setFabricPreference] = useState<string>('100% Breathable Jaipur Mulmul');
  const [colorMood, setColorMood] = useState<string>('Earthy Terracotta & Indigo');
  const [budgetRange, setBudgetRange] = useState<string>('Under ₹2,000');

  const totalSteps = 5;

  const handleSubmitQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/style-finder/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: {
            gender,
            occasion,
            silhouette,
            fabricPreference,
            colorMood,
            budgetRange,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data: StyleFinderResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Style Finder Error:', err);
      showToast('Could not complete styling analysis. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setResult(null);
    setCurrentStep(1);
  };

  return (
    <section id="style-finder" className="relative py-16 px-4 sm:px-8 max-w-[1360px] mx-auto">
      {/* Background Decor Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#18181B] via-[#222226] to-[#18181B] text-[#F9F8F6] border border-white/10 p-6 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-[#C25E3A]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-[#9A3412]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#FED7AA] text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 fill-[#FED7AA]" />
            <span>GEMINI-POWERED AI STYLIST</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-semibold text-white tracking-tight">
            Find Your Signature Silhouette
          </h2>
          <p className="text-sm sm:text-base text-[#D4D4D8] leading-relaxed">
            Answer 5 quick styling questions. Our Gemini AI assistant will analyze your comfort, drape, and occasion preferences to curate a personalized capsule collection from our authentic Jaipur artisan catalogue.
          </p>
        </div>

        {/* ===================================================================== */}
        {/* VIEW 1: INTERACTIVE QUIZ QUESTIONS */}
        {/* ===================================================================== */}
        {!result && !loading && (
          <div className="relative z-10 max-w-2xl mx-auto mt-10 space-y-8">
            {/* Step Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/70 font-mono">
                <span>STEP {currentStep} OF {totalSteps}</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}% COMPLETED</span>
              </div>
              <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#9A3412] via-[#C25E3A] to-[#FED7AA] transition-all duration-300 rounded-full"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* STEP 1: GENDER / WARDROBE CATEGORY */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="font-display text-2xl font-semibold text-white text-center">
                  1. Who are you curating this look for?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  {[
                    {
                      id: 'women',
                      title: "Women's Collection",
                      subtitle: 'Kurtis, Anarkalis & Kurta Sets',
                      icon: Crown,
                    },
                    {
                      id: 'men',
                      title: "Men's Collection",
                      subtitle: 'Khadi Kurtas & Slub Shirts',
                      icon: Compass,
                    },
                    {
                      id: 'all',
                      title: 'All Silhouettes',
                      subtitle: 'Everyday Versatile Capsule',
                      icon: Layers,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGender(opt.id as any)}
                      className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        gender === opt.id
                          ? 'bg-[#9A3412] border-[#FED7AA] text-white shadow-lg scale-[1.02]'
                          : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      <opt.icon className="w-6 h-6 mb-3 text-[#FED7AA]" />
                      <div>
                        <p className="font-semibold text-sm">{opt.title}</p>
                        <p className="text-xs text-white/70 mt-0.5">{opt.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: PRIMARY OCCASION */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="font-display text-2xl font-semibold text-white text-center">
                  2. What occasion are you dressing for?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {[
                    {
                      title: 'Daily Work & College',
                      desc: 'Crisp, breathable, smart 14-hour comfort with deep pockets',
                      icon: Briefcase,
                    },
                    {
                      title: 'Festive Celebrations & Puja',
                      desc: 'Chanderi sheen, intricate gota zari trims & joyful grace',
                      icon: Crown,
                    },
                    {
                      title: 'Weekend Casual & Cafe',
                      desc: 'Airy, unstructured mulmul silhouettes for relaxed days',
                      icon: Coffee,
                    },
                    {
                      title: 'Travel & Vacations',
                      desc: 'Wrinkle-forgiving slub & quick-drying pure cottons',
                      icon: Plane,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.title}
                      type="button"
                      onClick={() => setOccasion(opt.title)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        occasion === opt.title
                          ? 'bg-[#9A3412] border-[#FED7AA] text-white shadow-lg'
                          : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <opt.icon className="w-5 h-5 text-[#FED7AA]" />
                        <p className="font-semibold text-sm">{opt.title}</p>
                      </div>
                      <p className="text-xs text-white/70 mt-1.5 pl-7.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: PREFERRED SILHOUETTE */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="font-display text-2xl font-semibold text-white text-center">
                  3. Which silhouette makes you feel most confident?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {[
                    {
                      title: 'Straight Cut Kurti',
                      desc: 'Streamlined, slimming profile with side slits & deep pocket',
                    },
                    {
                      title: 'Flared Anarkali & Angrakha',
                      desc: 'Regal volume, sweeping kalis & dramatic movement',
                    },
                    {
                      title: 'Kurta Set with Dupatta',
                      desc: 'Complete coordinated ensemble ready for instant elevation',
                    },
                    {
                      title: 'Short Tunic & Slub Shirt',
                      desc: 'Contemporary pairing over denims, trousers or palazzos',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.title}
                      type="button"
                      onClick={() => setSilhouette(opt.title)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        silhouette === opt.title
                          ? 'bg-[#9A3412] border-[#FED7AA] text-white shadow-lg'
                          : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      <p className="font-semibold text-sm">{opt.title}</p>
                      <p className="text-xs text-white/70 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: FABRIC & COMFORT */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="font-display text-2xl font-semibold text-white text-center">
                  4. Which pure fabric weave appeals to your skin?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {[
                    {
                      title: '100% Breathable Jaipur Mulmul',
                      desc: 'Featherlight 60s combed cotton. The antidote to Indian summer heat.',
                    },
                    {
                      title: 'Luxe Chanderi Cotton-Silk',
                      desc: 'Subtle royal sheen with metallic zari borders for festive shine.',
                    },
                    {
                      title: 'Textured Handloom Khadi',
                      desc: 'Organic earthy slub weave that gets softer with every wash.',
                    },
                    {
                      title: 'Lightweight Voile & Cotton Cambric',
                      desc: 'Crisp, opaque, structured everyday weaves that never stick.',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.title}
                      type="button"
                      onClick={() => setFabricPreference(opt.title)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        fabricPreference === opt.title
                          ? 'bg-[#9A3412] border-[#FED7AA] text-white shadow-lg'
                          : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      <p className="font-semibold text-sm">{opt.title}</p>
                      <p className="text-xs text-white/70 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: COLOR PALETTE & BUDGET */}
            {currentStep === 5 && (
              <div className="space-y-5 animate-fadeIn">
                <h3 className="font-display text-2xl font-semibold text-white text-center">
                  5. Choose your color aesthetic & budget
                </h3>

                <div className="space-y-2">
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">
                    Color Palette Mood
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        title: 'Earthy Terracotta & Indigo',
                        desc: 'Jaipur vegetable block-print dyes with warm ochre tones',
                        colorSwatch: ['#C25E3A', '#1E3A8A', '#D97706'],
                      },
                      {
                        title: 'Soft Pastels & Ivory Blooms',
                        desc: 'Peach, sage green, and unbleached off-white calmness',
                        colorSwatch: ['#FED7AA', '#A7F3D0', '#F5F5F4'],
                      },
                      {
                        title: 'Festive Marigold & Royal Wine',
                        desc: 'Deep ruby reds, rich mustard and jewel emeralds',
                        colorSwatch: ['#991B1B', '#EAB308', '#065F46'],
                      },
                      {
                        title: 'Minimalist Monochrome & Slate',
                        desc: 'Timeless jet blacks, crisp whites and textured greys',
                        colorSwatch: ['#18181B', '#E4E4E7', '#52525B'],
                      },
                    ].map((opt) => (
                      <button
                        key={opt.title}
                        type="button"
                        onClick={() => setColorMood(opt.title)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          colorMood === opt.title
                            ? 'bg-[#9A3412] border-[#FED7AA] text-white shadow-lg'
                            : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {opt.colorSwatch.map((c, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <p className="font-semibold text-xs">{opt.title}</p>
                        <p className="text-[11px] text-white/70 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">
                    Budget Preference (All Strictly Under ₹2,000)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'Under ₹999', label: 'Under ₹999' },
                      { id: '₹1,000 - ₹1,499', label: '₹1,000 - ₹1,499' },
                      { id: 'Full Atelier (≤ ₹2,000)', label: 'Up to ₹1,999' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBudgetRange(b.id)}
                        className={`py-2 px-3 rounded-lg border text-center transition-all ${
                          budgetRange === b.id
                            ? 'bg-white text-[#18181B] font-bold border-white'
                            : 'bg-white/5 text-white/80 border-white/15 hover:bg-white/10'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-white/15">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="px-4 py-2.5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => s + 1)}
                  className="px-6 py-2.5 bg-[#9A3412] hover:bg-[#7C2D12] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#9A3412] to-[#C25E3A] hover:brightness-110 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xl"
                >
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>Curate with Gemini AI</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* VIEW 2: LOADING ANALYSIS STATE */}
        {/* ===================================================================== */}
        {loading && (
          <div className="relative z-10 max-w-md mx-auto py-16 text-center space-y-4 animate-fadeIn">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-2 border-[#FED7AA]/20 border-t-[#FED7AA] animate-spin" />
              <Sparkles className="w-6 h-6 text-[#FED7AA] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-white">
              Gemini AI is Weaving Your Persona
            </h3>
            <p className="text-xs text-[#D4D4D8] leading-relaxed">
              Evaluating Rajasthan artisan weave densities, fabric breathability, and styling combinations from the live AHUZA collection...
            </p>
          </div>
        )}

        {/* ===================================================================== */}
        {/* VIEW 3: GEMINI AI RESULTS & CURATED COLLECTION */}
        {/* ===================================================================== */}
        {result && !loading && (
          <div className="relative z-10 max-w-4xl mx-auto mt-8 space-y-8 animate-fadeIn">
            {/* Style Persona Hero Card */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-wider text-[#FED7AA] font-bold">
                    PERSONALIZED STYLE PROFILE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="text-xs text-white/70 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Quiz</span>
                </button>
              </div>

              <div>
                <h3 className="font-display text-2xl sm:text-4xl font-semibold text-[#FED7AA]">
                  {result.personaTitle}
                </h3>
                <p className="text-sm font-medium text-white/90 mt-1 italic">
                  “{result.personaSubtitle}”
                </p>
                <p className="text-xs sm:text-sm text-[#D4D4D8] mt-2.5 leading-relaxed">
                  {result.personaDescription}
                </p>
              </div>

              {/* Outfit Combo Suggestion Callout */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/15 text-xs text-[#FED7AA] flex items-start gap-3">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="block text-white font-mono text-[11px] uppercase tracking-wide">
                    Gemini AI Outfit Combination
                  </strong>
                  <p className="mt-0.5 text-white/90">{result.outfitComboSuggestion}</p>
                </div>
              </div>

              {/* Everyday Styling Advice Bullets */}
              <div className="space-y-1.5 pt-2">
                <p className="font-mono text-[11px] uppercase tracking-wide text-white/60">
                  Expert Styling Notes:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
                  {result.stylingAdvice.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#FED7AA] mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Curated Product Collection Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-2xl font-semibold text-white">
                    Your Curated Capsule Pieces
                  </h4>
                  <p className="text-xs text-white/70">
                    Hand-selected from our catalogue · All strictly under ₹2,000
                  </p>
                </div>
                <span className="font-mono text-xs text-[#FED7AA] bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  {result.recommendedProducts.length} Items Selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {result.recommendedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl overflow-hidden border border-[#18181B]/10 text-[#18181B] flex flex-col justify-between shadow-xl group hover:shadow-2xl transition-all"
                  >
                    <div>
                      {/* Image Preview with Badge */}
                      <div className="relative aspect-[4/5] bg-[#FAF8F5] overflow-hidden">
                        <SafeImage
                          src={prod.images[0]?.url}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Match score badge */}
                        <div className="absolute top-3 left-3 bg-[#18181B]/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-white font-mono text-[10px] font-bold border border-white/20 flex items-center gap-1 shadow-md">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{prod.matchScore || 96}% MATCH</span>
                        </div>

                        {/* Quick wishlist button */}
                        <button
                          type="button"
                          onClick={() => toggleWishlist(prod)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-[#18181B] shadow-md transition-colors"
                          title="Save to Wishlist"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isInWishlist(prod.id)
                                ? 'fill-[#9A3412] text-[#9A3412]'
                                : 'text-[#18181B]'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Product Details */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-[#71717A]">
                          <span className="font-mono">{prod.fabric}</span>
                          <span className="font-semibold text-emerald-700">In Stock</span>
                        </div>

                        <Link
                          to={`/product/${prod.id}`}
                          className="font-semibold text-sm text-[#18181B] hover:text-[#9A3412] transition-colors line-clamp-1 block"
                        >
                          {prod.name}
                        </Link>

                        {/* Pricing */}
                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="font-mono-num font-bold text-base text-[#18181B]">
                            ₹{prod.discountPrice.toLocaleString('en-IN')}
                          </span>
                          {prod.price > prod.discountPrice && (
                            <span className="font-mono-num text-xs text-[#71717A] line-through">
                              ₹{prod.price.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        {/* AI Styling Tip Note */}
                        {prod.stylingTip && (
                          <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#18181B]/10 text-[11px] text-[#52525B] leading-relaxed">
                            <span className="font-semibold text-[#9A3412] block">
                              AI Styling Note:
                            </span>
                            {prod.stylingTip}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                      <Link
                        to={`/product/${prod.id}`}
                        className="py-2.5 px-3 border border-[#18181B]/20 hover:bg-[#FAF8F5] text-xs font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          const size = prod.sizes[0] || 'M';
                          const color = prod.colors[0]?.name || 'Standard';
                          addToCart(prod, size, color, 1, true);
                          showToast(`Added ${prod.name} to cart!`, 'success');
                        }}
                        className="py-2.5 px-3 bg-[#9A3412] hover:bg-[#7C2D12] text-white text-xs font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/15">
              <button
                type="button"
                onClick={resetQuiz}
                className="px-5 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Explore Another Style Vibe</span>
              </button>

              <Link
                to="/women"
                className="px-6 py-2.5 bg-[#9A3412] hover:bg-[#7C2D12] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg"
              >
                <span>Browse Full AHUZA Catalogue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
