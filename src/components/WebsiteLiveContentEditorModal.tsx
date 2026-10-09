import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  FileText,
  Sliders,
  Type,
  Layout as LayoutIcon,
  ShieldCheck,
  Mail,
  RotateCcw,
  PlusCircle,
  Eye,
  Check,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { WebsiteContent } from '../types';
import { SafeImage } from './SafeImage';

interface WebsiteLiveContentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: EditorSection;
}

export type EditorSection = 'header' | 'hero' | 'collections' | 'about' | 'contact' | 'footer' | 'policies';

const DEFAULT_HERO_IMAGE = '/src/assets/images/ahuza_sage_hero_1791449084537.jpg';
const DEFAULT_ABOUT_IMAGE = '/src/assets/images/ahuza_about_craft_1791449099774.jpg';

export const WebsiteLiveContentEditorModal: React.FC<WebsiteLiveContentEditorModalProps> = ({
  isOpen,
  onClose,
  defaultSection = 'header',
}) => {
  const { websiteContent, updateWebsiteContent, showToast } = useStore();
  const [draft, setDraft] = useState<WebsiteContent>(websiteContent);
  const [activeSection, setActiveSection] = useState<EditorSection>(defaultSection);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (websiteContent) {
      setDraft(JSON.parse(JSON.stringify(websiteContent)));
    }
  }, [websiteContent, isOpen]);

  useEffect(() => {
    if (defaultSection) {
      setActiveSection(defaultSection);
    }
  }, [defaultSection]);

  if (!isOpen) return null;

  const handleSaveAndPublish = async () => {
    setSaving(true);
    try {
      await updateWebsiteContent(draft);
      showToast('Website content updated and published live from header to footer!');
      onClose();
    } catch {
      showToast('Error saving website content.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = (fieldPath: 'logo' | 'hero' | 'about' | 'promo') => {
    setDraft((prev) => {
      const copy = { ...prev };
      if (fieldPath === 'logo') {
        copy.logoUrl = '';
      } else if (fieldPath === 'hero') {
        copy.hero = { ...copy.hero, imageUrl: '' };
      } else if (fieldPath === 'about') {
        copy.aboutAhuza = { ...copy.aboutAhuza, imageUrl: '' };
      } else if (fieldPath === 'promo') {
        copy.promotionalBanner = { ...copy.promotionalBanner, imageUrl: '' };
      }
      return copy;
    });
    showToast(`Image deleted. Click "Publish Changes Live" to apply across the store.`);
  };

  const handleRestoreDefaultImage = (fieldPath: 'hero' | 'about') => {
    setDraft((prev) => {
      const copy = { ...prev };
      if (fieldPath === 'hero') {
        copy.hero = { ...copy.hero, imageUrl: DEFAULT_HERO_IMAGE };
      } else if (fieldPath === 'about') {
        copy.aboutAhuza = { ...copy.aboutAhuza, imageUrl: DEFAULT_ABOUT_IMAGE };
      }
      return copy;
    });
    showToast(`Default image restored. Click "Publish Changes Live" to apply.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white text-[#18181B] rounded-2xl shadow-2xl border border-[#18181B]/15 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#18181B] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold text-white">
                  Header-to-Footer Website Editor
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#4E7245] text-white font-semibold">
                  Live Visual Editor
                </span>
              </div>
              <p className="text-xs text-white/70">
                Edit header, hero, collections, about, contact & footer texts · Delete images & buttons with direct delete controls.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-6 py-2.5 bg-[#F8FAF7] border-b border-[#1E293B]/10 flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'header', label: '1. Header & Nav', icon: LayoutIcon },
            { id: 'hero', label: '2. Hero & CTA Buttons', icon: ImageIcon },
            { id: 'collections', label: '3. Collections & Promo', icon: Sliders },
            { id: 'about', label: '4. About Us & Craft', icon: FileText },
            { id: 'contact', label: '5. Contact & Support', icon: Mail },
            { id: 'footer', label: '6. Footer & Social', icon: Type },
            { id: 'policies', label: '7. Policies & Returns', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as EditorSection)}
                className={`py-2 px-3.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white text-[#334155] border border-[#1E293B]/10 hover:bg-[#EBF2E8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body: Editor Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* ========================================================= */}
          {/* 1. HEADER & NAVIGATION SECTION */}
          {/* ========================================================= */}
          {activeSection === 'header' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-1">
                <h3 className="font-semibold text-sm text-[#1E293B] flex items-center gap-2">
                  <LayoutIcon className="w-4 h-4 text-black" />
                  <span>Header Top Announcement Strip, Brand Identity & Nav Links</span>
                </h3>
                <p className="text-[#64748B]">
                  Edit the announcement bar copy, brand wordmark, tagline, and navigation bar link labels.
                </p>
              </div>

              {/* Announcement Bar with DELETE BUTTON */}
              <div className="p-4 bg-white border border-[#1E293B]/15 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#1E293B] text-xs">
                    Top Announcement Bar Text
                  </label>
                  <div className="flex items-center gap-2">
                    {draft.hideAnnouncementBar ? (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, hideAnnouncementBar: false })}
                        className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Restore Announcement Bar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, hideAnnouncementBar: true })}
                        className="px-2.5 py-1 bg-black hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Delete announcement bar from header"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Announcement Bar</span>
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  disabled={draft.hideAnnouncementBar}
                  value={draft.announcementBar || ''}
                  onChange={(e) => setDraft({ ...draft, announcementBar: e.target.value })}
                  placeholder="e.g. Complimentary Express Shipping Across India on Orders Above ₹999..."
                  className={`w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/20 rounded-xl text-[#1E293B] focus:border-black focus:outline-none ${
                    draft.hideAnnouncementBar ? 'opacity-40 bg-slate-100 cursor-not-allowed' : ''
                  }`}
                />
                <p className="text-[11px] text-[#64748B]">
                  {draft.hideAnnouncementBar
                    ? 'Announcement bar is currently DELETED / HIDDEN from the header.'
                    : 'Displays in solid dark slate strip at the very top of every storefront page.'}
                </p>
              </div>

              {/* Brand Wordmark & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">
                    Brand Name / Wordmark Text
                  </label>
                  <input
                    type="text"
                    value={draft.brandName || ''}
                    onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/20 rounded-xl text-[#1E293B] focus:border-black focus:outline-none font-semibold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">
                    Brand Tagline / Motto
                  </label>
                  <input
                    type="text"
                    value={draft.tagline || ''}
                    onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/20 rounded-xl text-[#1E293B] focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Brand Logo Image with DELETE IMAGE BUTTON */}
              <div className="p-4 bg-white border border-[#1E293B]/15 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#1E293B] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-black" />
                    <span>Custom Brand Logo Image (Optional)</span>
                  </label>
                  {draft.logoUrl ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteImage('logo')}
                      className="px-3 py-1 bg-black hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Logo Image</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#64748B]">Using clean text wordmark</span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {draft.logoUrl ? (
                    <div className="p-2 border border-[#1E293B]/10 rounded-lg bg-[#F8FAF7] max-h-16 flex items-center">
                      <SafeImage src={draft.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                    </div>
                  ) : (
                    <div className="p-2.5 border border-dashed border-[#1E293B]/20 rounded-lg bg-[#F8FAF7] text-[11px] text-[#64748B]">
                      No custom logo image set. Using clean typographic wordmark "{draft.brandName}".
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={draft.logoUrl || ''}
                      onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })}
                      placeholder="Enter logo image URL (or delete to use text logo)..."
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs text-[#1E293B] focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Menu Link Labels */}
              <div className="space-y-3">
                <h4 className="font-semibold text-[#1E293B] uppercase tracking-wider text-[11px]">
                  Header Navigation Link Labels
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#64748B] mb-1">Women's Collection Link</label>
                    <input
                      type="text"
                      value={draft.headerNavLabels?.women || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          headerNavLabels: { ...draft.headerNavLabels, women: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1">Men's Collection Link</label>
                    <input
                      type="text"
                      value={draft.headerNavLabels?.men || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          headerNavLabels: { ...draft.headerNavLabels, men: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1">Why Ahuza (Brand Story)</label>
                    <input
                      type="text"
                      value={draft.headerNavLabels?.whyAhuza || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          headerNavLabels: { ...draft.headerNavLabels, whyAhuza: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1">About Us Link</label>
                    <input
                      type="text"
                      value={draft.headerNavLabels?.about || 'About Us'}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          headerNavLabels: { ...draft.headerNavLabels, about: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1">Contact Us Link</label>
                    <input
                      type="text"
                      value={draft.headerNavLabels?.contact || 'Contact Us'}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          headerNavLabels: { ...draft.headerNavLabels, contact: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1">Track Order Link</label>
                    <input
                      type="text"
                      value={draft.headerNavLabels?.trackOrder || 'Track Order'}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          headerNavLabels: { ...draft.headerNavLabels, trackOrder: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. HERO BANNER, TEXT & CTA BUTTONS SECTION */}
          {/* ========================================================= */}
          {activeSection === 'hero' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-1">
                <h3 className="font-semibold text-sm text-[#1E293B] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-black" />
                  <span>Homepage Hero Banner, Headline & Action Buttons</span>
                </h3>
                <p className="text-[#64748B]">
                  Edit hero headings, description copy, CTA buttons, and editorial image with direct delete options.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Hero Main Heading</label>
                  <input
                    type="text"
                    value={draft.hero?.heading || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hero: { ...draft.hero, heading: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/20 rounded-xl text-[#1E293B] focus:border-black focus:outline-none font-semibold text-base font-display"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">
                    Hero Subtitle / Value Tagline
                  </label>
                  <input
                    type="text"
                    value={draft.hero?.tagline || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hero: { ...draft.hero, tagline: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/20 rounded-xl text-[#1E293B] focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">
                    Hero Descriptive Paragraph
                  </label>
                  <textarea
                    rows={3}
                    value={draft.hero?.subheading || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hero: { ...draft.hero, subheading: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/20 rounded-xl text-[#1E293B] focus:border-black focus:outline-none"
                  />
                </div>

                {/* Hero CTA Buttons with DEDICATED DELETE BUTTONS */}
                <div className="p-4 bg-white border border-[#1E293B]/15 rounded-xl space-y-4">
                  <h4 className="font-semibold text-xs text-[#1E293B] uppercase tracking-wider">
                    Hero Call-to-Action Buttons
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Primary Button */}
                    <div className="p-3 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[#1E293B]">Primary Button</span>
                        {draft.hero?.hideCtaWomen ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                hero: { ...draft.hero, hideCtaWomen: false },
                              })
                            }
                            className="text-[10px] text-black font-semibold hover:underline cursor-pointer"
                          >
                            + Restore Button
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                hero: { ...draft.hero, hideCtaWomen: true },
                              })
                            }
                            className="p-1 bg-black hover:bg-red-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Delete Primary CTA Button"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Button</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        disabled={draft.hero?.hideCtaWomen}
                        value={draft.hero?.ctaWomen || ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            hero: { ...draft.hero, ctaWomen: e.target.value },
                          })
                        }
                        placeholder="Button text..."
                        className={`w-full px-2.5 py-1.5 bg-white border border-[#1E293B]/20 rounded-lg text-xs ${
                          draft.hero?.hideCtaWomen ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>

                    {/* Secondary Button */}
                    <div className="p-3 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[#1E293B]">Secondary Button</span>
                        {draft.hero?.hideCtaMen ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                hero: { ...draft.hero, hideCtaMen: false },
                              })
                            }
                            className="text-[10px] text-black font-semibold hover:underline cursor-pointer"
                          >
                            + Restore Button
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                hero: { ...draft.hero, hideCtaMen: true },
                              })
                            }
                            className="p-1 bg-black hover:bg-red-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Delete Secondary CTA Button"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Button</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        disabled={draft.hero?.hideCtaMen}
                        value={draft.hero?.ctaMen || ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            hero: { ...draft.hero, ctaMen: e.target.value },
                          })
                        }
                        placeholder="Button text..."
                        className={`w-full px-2.5 py-1.5 bg-white border border-[#1E293B]/20 rounded-lg text-xs ${
                          draft.hero?.hideCtaMen ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>

                    {/* Explore Button */}
                    <div className="p-3 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[#1E293B]">Explore Button</span>
                        {draft.hero?.hideCtaExplore ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                hero: { ...draft.hero, hideCtaExplore: false },
                              })
                            }
                            className="text-[10px] text-black font-semibold hover:underline cursor-pointer"
                          >
                            + Restore Button
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                hero: { ...draft.hero, hideCtaExplore: true },
                              })
                            }
                            className="p-1 bg-black hover:bg-red-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Delete Explore Button"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Button</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        disabled={draft.hero?.hideCtaExplore}
                        value={draft.hero?.ctaExplore || 'EXPLORE COLLECTION'}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            hero: { ...draft.hero, ctaExplore: e.target.value },
                          })
                        }
                        placeholder="Button text..."
                        className={`w-full px-2.5 py-1.5 bg-white border border-[#1E293B]/20 rounded-lg text-xs ${
                          draft.hero?.hideCtaExplore ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Hero Editorial Photography with DEDICATED DELETE IMAGE BUTTON */}
                <div className="p-4 bg-white border border-[#1E293B]/15 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-[#1E293B]">
                        Hero Banner Editorial Image
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        Backdrop photograph for the main storefront banner.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {draft.hero?.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteImage('hero')}
                          className="px-3.5 py-2 bg-black hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Hero Image</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestoreDefaultImage('hero')}
                          className="px-3.5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore Default Image</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="sm:col-span-1 aspect-[16/9] sm:aspect-[4/3] rounded-xl overflow-hidden border border-[#1E293B]/15 bg-[#F8FAF7] relative">
                      {draft.hero?.imageUrl ? (
                        <SafeImage
                          src={draft.hero.imageUrl}
                          alt="Hero Photography"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#EBF2E8] text-[#4E7245]">
                          <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                          <span className="font-semibold text-xs">Image Deleted</span>
                          <span className="text-[10px] text-[#64748B]">Showing clean minimalist sage background</span>
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="block text-[11px] font-semibold text-[#64748B]">
                        Image Asset URL or Path
                      </label>
                      <input
                        type="text"
                        value={draft.hero?.imageUrl || ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            hero: { ...draft.hero, imageUrl: e.target.value },
                          })
                        }
                        placeholder="Paste image URL (or click Delete Hero Image)..."
                        className="w-full px-3 py-2 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-lg text-xs font-mono"
                      />
                      <p className="text-[11px] text-[#64748B]">
                        Click "Delete Hero Image" to remove image backdrop, or paste any custom high-resolution photo URL.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. COLLECTIONS & PROMOTIONAL BANNER SECTION */}
          {/* ========================================================= */}
          {activeSection === 'collections' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-1">
                <h3 className="font-semibold text-sm text-[#1E293B] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-black" />
                  <span>Curated Collection Titles & Promotional Banner</span>
                </h3>
                <p className="text-[#64748B]">
                  Edit section titles across product grids and manage the promotional discount strip with delete option.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">
                    Featured Collection Title
                  </label>
                  <input
                    type="text"
                    value={draft.collectionTitles?.featured || 'Featured Collections'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        collectionTitles: { ...draft.collectionTitles, featured: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">
                    New Arrivals Section Title
                  </label>
                  <input
                    type="text"
                    value={draft.collectionTitles?.newArrivals || 'New Arrivals'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        collectionTitles: { ...draft.collectionTitles, newArrivals: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">
                    Best Sellers Section Title
                  </label>
                  <input
                    type="text"
                    value={draft.collectionTitles?.bestSellers || 'Best Sellers'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        collectionTitles: { ...draft.collectionTitles, bestSellers: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">
                    Under ₹999 Edit Title
                  </label>
                  <input
                    type="text"
                    value={draft.collectionTitles?.under999 || 'Under ₹999 Store'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        collectionTitles: { ...draft.collectionTitles, under999: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                  />
                </div>
              </div>

              {/* Promotional Strip with DELETE BANNER BUTTON */}
              <div className="p-5 bg-white border border-[#1E293B]/15 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-[#1E293B]">
                      Promotional Banner & Coupon Strip
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Displays special coupon savings and seasonal discount announcements.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {draft.promotionalBanner?.hideBanner ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            promotionalBanner: { ...draft.promotionalBanner, hideBanner: false },
                          })
                        }
                        className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Restore Promo Banner</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            promotionalBanner: { ...draft.promotionalBanner, hideBanner: true },
                          })
                        }
                        className="px-3 py-1.5 bg-black hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Promo Banner</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#64748B] mb-1">Promo Headline</label>
                    <input
                      type="text"
                      disabled={draft.promotionalBanner?.hideBanner}
                      value={draft.promotionalBanner?.headline || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          promotionalBanner: { ...draft.promotionalBanner, headline: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1">Promo Coupon Code</label>
                    <input
                      type="text"
                      disabled={draft.promotionalBanner?.hideBanner}
                      value={draft.promotionalBanner?.code || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          promotionalBanner: {
                            ...draft.promotionalBanner,
                            code: e.target.value.toUpperCase(),
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#64748B] mb-1">Promo Subtext / Offer Details</label>
                  <input
                    type="text"
                    disabled={draft.promotionalBanner?.hideBanner}
                    value={draft.promotionalBanner?.subtext || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        promotionalBanner: { ...draft.promotionalBanner, subtext: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. ABOUT US & BRAND STORY SECTION */}
          {/* ========================================================= */}
          {activeSection === 'about' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-1">
                <h3 className="font-semibold text-sm text-[#1E293B] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-black" />
                  <span>About Us, Brand Story & Artisanal Craft Photography</span>
                </h3>
                <p className="text-[#64748B]">
                  Edit the core story of Ahuza, direct weaver partnerships, and craftsmanship image with delete button.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">About Story Headline</label>
                <input
                  type="text"
                  value={draft.aboutAhuza?.headline || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      aboutAhuza: { ...draft.aboutAhuza, headline: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/20 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Brand Narrative (Paragraph 1)
                </label>
                <textarea
                  rows={3}
                  value={draft.aboutAhuza?.storyParagraph1 || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      aboutAhuza: { ...draft.aboutAhuza, storyParagraph1: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Weaver Partnerships & Price Cap (Paragraph 2)
                </label>
                <textarea
                  rows={3}
                  value={draft.aboutAhuza?.storyParagraph2 || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      aboutAhuza: { ...draft.aboutAhuza, storyParagraph2: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Craftsmanship & Fair Price Promise
                </label>
                <textarea
                  rows={2}
                  value={draft.aboutAhuza?.craftsmanshipPromise || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      aboutAhuza: { ...draft.aboutAhuza, craftsmanshipPromise: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                />
              </div>

              {/* Craftsmanship Image with DEDICATED DELETE BUTTON */}
              <div className="p-4 bg-white border border-[#1E293B]/15 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-[#1E293B]">
                      Artisanal Craftsmanship Showcase Image
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Featured in About Us page and Why Ahuza storytelling section.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {draft.aboutAhuza?.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteImage('about')}
                        className="px-3.5 py-2 bg-black hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Craft Image</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRestoreDefaultImage('about')}
                        className="px-3.5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Restore Default Image</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#1E293B]/15 bg-[#F8FAF7]">
                    {draft.aboutAhuza?.imageUrl ? (
                      <SafeImage
                        src={draft.aboutAhuza.imageUrl}
                        alt="Artisanal Weaving"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#EBF2E8] text-[#4E7245]">
                        <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                        <span className="font-semibold text-xs">Image Deleted</span>
                        <span className="text-[10px] text-[#64748B]">Clean minimalist state</span>
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-[11px] font-semibold text-[#64748B]">
                      Image Asset Path / URL
                    </label>
                    <input
                      type="text"
                      value={draft.aboutAhuza?.imageUrl || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          aboutAhuza: { ...draft.aboutAhuza, imageUrl: e.target.value },
                        })
                      }
                      placeholder="Enter craft photo URL (or click Delete Craft Image)..."
                      className="w-full px-3 py-2 bg-[#F8FAF7] border border-[#1E293B]/15 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. CONTACT US & CUSTOMER SUPPORT SECTION */}
          {/* ========================================================= */}
          {activeSection === 'contact' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-1">
                <h3 className="font-semibold text-sm text-[#1E293B] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-black" />
                  <span>Company Details, Studio Location & Care Hours</span>
                </h3>
                <p className="text-[#64748B]">
                  Update customer support contact coordinates displayed on the Contact Us page and footer.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Atelier & Studio Physical Location
                </label>
                <input
                  type="text"
                  value={draft.footer?.studioAddress || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      footer: { ...draft.footer, studioAddress: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-[#1E293B]/20 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Support Email</label>
                  <input
                    type="email"
                    value={draft.footer?.contactEmail || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, contactEmail: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E293B] mb-1">Support Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={draft.footer?.contactPhone || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, contactPhone: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={draft.footer?.hours || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      footer: { ...draft.footer, hours: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. FOOTER, COPYRIGHT & SOCIAL LINKS SECTION */}
          {/* ========================================================= */}
          {activeSection === 'footer' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-1">
                <h3 className="font-semibold text-sm text-[#1E293B] flex items-center gap-2">
                  <Type className="w-4 h-4 text-black" />
                  <span>Storefront Footer Blurb, Copyright Notice & Social Links</span>
                </h3>
                <p className="text-[#64748B]">
                  Manage the exact footer text copy, newsletter visibility with delete button, and social channels.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Footer Brand Mission Blurb (About Snippet)
                </label>
                <textarea
                  rows={2}
                  value={draft.footer?.aboutSnippet || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      footer: { ...draft.footer, aboutSnippet: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Footer Copyright Line
                </label>
                <input
                  type="text"
                  value={draft.footer?.copyrightText || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      footer: { ...draft.footer, copyrightText: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                />
              </div>

              {/* Newsletter section with DELETE BUTTON */}
              <div className="p-4 bg-white border border-[#1E293B]/15 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-[#1E293B]">
                    Footer Newsletter Subscription Block
                  </h4>
                  <p className="text-[11px] text-[#64748B]">
                    {draft.footer?.hideNewsletter
                      ? 'Newsletter block is currently DELETED / HIDDEN from the footer.'
                      : 'Allows customers to subscribe for Jaipur handloom drop alerts.'}
                  </p>
                </div>

                {draft.footer?.hideNewsletter ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, hideNewsletter: false },
                      })
                    }
                    className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    + Restore Newsletter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        footer: { ...draft.footer, hideNewsletter: true },
                      })
                    }
                    className="px-3 py-1.5 bg-black hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Newsletter</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-white border border-[#1E293B]/10 rounded-xl space-y-3">
                <h4 className="font-semibold text-xs text-[#1E293B] uppercase tracking-wider">
                  Social Media Handles
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#64748B] mb-1">Instagram URL</label>
                    <input
                      type="text"
                      value={draft.footer?.socialLinks?.instagram || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          footer: {
                            ...draft.footer,
                            socialLinks: { ...draft.footer.socialLinks, instagram: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1">Pinterest URL</label>
                    <input
                      type="text"
                      value={draft.footer?.socialLinks?.pinterest || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          footer: {
                            ...draft.footer,
                            socialLinks: { ...draft.footer.socialLinks, pinterest: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1">YouTube URL</label>
                    <input
                      type="text"
                      value={draft.footer?.socialLinks?.youtube || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          footer: {
                            ...draft.footer,
                            socialLinks: { ...draft.footer.socialLinks, youtube: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. POLICIES & RETURN WINDOW RULES */}
          {/* ========================================================= */}
          {activeSection === 'policies' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F8FAF7] rounded-xl border border-[#1E293B]/10 space-y-1">
                <h3 className="font-semibold text-sm text-[#1E293B] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>Customer Policies, Return Window & Shipping Guidelines</span>
                </h3>
                <p className="text-[#64748B]">
                  Update returns policy text, refund terms, and guaranteed reverse pickup window.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Standard Return Window (Days)
                </label>
                <input
                  type="number"
                  min={7}
                  max={30}
                  value={draft.policies?.returnWindowDays || 14}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      policies: { ...draft.policies, returnWindowDays: Number(e.target.value) },
                    })
                  }
                  className="w-32 px-3 py-2 bg-white border border-[#1E293B]/20 rounded-xl font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Shipping Policy Summary
                </label>
                <textarea
                  rows={3}
                  value={draft.policies?.shippingPolicy || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      policies: { ...draft.policies, shippingPolicy: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E293B] mb-1">
                  Returns, Replacement & Cancellation Terms
                </label>
                <textarea
                  rows={4}
                  value={draft.policies?.returnReplacementPolicy || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      policies: { ...draft.policies, returnReplacementPolicy: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#1E293B]/20 rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: Action Buttons (All in sleek solid black) */}
        <div className="px-6 py-4 bg-[#F8FAF7] border-t border-[#1E293B]/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>Changes persist immediately across storefront, header, hero, images, and footer.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 bg-white hover:bg-slate-100 text-[#18181B] border border-[#1E293B]/15 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAndPublish}
              className="py-2.5 px-6 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Publishing Changes...' : 'Publish Changes Live'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
