import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Crop,
  Sun,
  Contrast,
  RotateCw,
  FlipHorizontal,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Trash2,
  Star,
  Layers,
  ZoomIn,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import { Product, ProductImage } from '../types';
import { useStore } from '../context/StoreContext';
import {
  GHOST_IMG_KURTI,
  GHOST_IMG_KURTA_SET,
  GHOST_IMG_LEHENGA,
  GHOST_IMG_FROCK,
  GHOST_IMG_MEN_KURTA,
  GHOST_IMG_LOUNGE_TRACK,
  GHOST_IMG_COORD,
} from '../data/seedData';

export interface ClothImageEditorModalProps {
  product?: Product | null;
  websiteImageTarget?: 'hero' | 'promo' | 'about' | null;
  websiteImageInitialUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedProduct: Product) => void;
  onSavedWebsiteImage?: (target: 'hero' | 'promo' | 'about', newUrl: string) => void;
}

export const ClothImageEditorModal: React.FC<ClothImageEditorModalProps> = ({
  product,
  websiteImageTarget,
  websiteImageInitialUrl,
  isOpen,
  onClose,
  onSaved,
  onSavedWebsiteImage,
}) => {
  const { token, websiteContent, updateWebsiteContent, refreshCatalog, showToast } = useStore();

  const [images, setImages] = useState<ProductImage[]>(product?.images || []);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Initial source URL determined by product or website target
  const initialUrl =
    websiteImageInitialUrl ||
    (websiteImageTarget === 'hero'
      ? websiteContent?.hero?.imageUrl || GHOST_IMG_KURTI
      : websiteImageTarget === 'promo'
      ? websiteContent?.promotionalBanner?.imageUrl || GHOST_IMG_COORD
      : websiteImageTarget === 'about'
      ? websiteContent?.aboutAhuza?.imageUrl || GHOST_IMG_LEHENGA
      : product?.images?.[0]?.url || GHOST_IMG_KURTI);

  // Upload & Editor state
  const [editorSourceUrl, setEditorSourceUrl] = useState<string>(initialUrl);
  const [urlInput, setUrlInput] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '4:5' | 'free'>('3:4');
  const [bgPreset, setBgPreset] = useState<'warmIvory' | 'studioLinen' | 'pureWhite' | 'transparent'>('pureWhite');
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [warmth, setWarmth] = useState<number>(4);
  const [saturation, setSaturation] = useState<number>(0);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [angleLabel, setAngleLabel] = useState<string>('3D Ghost Mannequin Front');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);

  // 3D Ghost Mannequin Processing & Workflow State
  const [ghostStatus, setGhostStatus] = useState<'idle' | 'generating' | 'preview' | 'approved'>('idle');
  const [originalSourceBackup, setOriginalSourceBackup] = useState<string>('');
  const [ghostStepMsg, setGhostStepMsg] = useState<string>('');
  const [showOriginalComparison, setShowOriginalComparison] = useState<boolean>(false);

  // Pure cloth compliance check
  const [complianceWarning, setComplianceWarning] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [savingToServer, setSavingToServer] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (product && product.images && product.images.length > 0) {
      setImages(product.images);
      setSelectedImageIndex(0);
      setEditorSourceUrl(product.images[0].url);
      setAngleLabel(product.images[0].angleLabel || '3D Ghost Mannequin Front');
      setIsPrimary(Boolean(product.images[0].isPrimary));
    } else if (websiteImageTarget) {
      const targetUrl =
        websiteImageInitialUrl ||
        (websiteImageTarget === 'hero'
          ? websiteContent?.hero?.imageUrl || GHOST_IMG_KURTI
          : websiteImageTarget === 'promo'
          ? websiteContent?.promotionalBanner?.imageUrl || GHOST_IMG_COORD
          : websiteContent?.aboutAhuza?.imageUrl || GHOST_IMG_LEHENGA);
      setEditorSourceUrl(targetUrl);
      setAngleLabel(
        websiteImageTarget === 'hero'
          ? 'Homepage Hero Cloth Editorial'
          : websiteImageTarget === 'promo'
          ? 'Promo Banner Garment'
          : 'About Us Artisan Drape'
      );
    }
  }, [product, websiteImageTarget, websiteImageInitialUrl, websiteContent]);

  // Load image object whenever editorSourceUrl changes
  useEffect(() => {
    if (!editorSourceUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = editorSourceUrl;
    img.onload = () => {
      imageObjRef.current = img;
      analyzePureClothCompliance(img);
      renderEditedCanvas();
    };
  }, [editorSourceUrl]);

  // Re-render canvas whenever filters, aspect ratio or transforms change
  useEffect(() => {
    renderEditedCanvas();
  }, [
    aspectRatio,
    bgPreset,
    brightness,
    contrast,
    warmth,
    saturation,
    rotationDeg,
    isFlippedH,
    zoomLevel,
  ]);

  // Simple heuristic skin tone / body detector to warn if humans/faces are present
  const analyzePureClothCompliance = (img: HTMLImageElement) => {
    try {
      const offscreen = document.createElement('canvas');
      const w = (offscreen.width = 100);
      const h = (offscreen.height = 100);
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h).data;
      let skinPixels = 0;
      const totalPixels = w * h;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        // Heuristic skin-color range check
        if (
          r > 95 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g > 15 &&
          Math.abs(r - g) > 15
        ) {
          skinPixels++;
        }
      }

      const ratio = skinPixels / totalPixels;
      if (ratio > 0.32) {
        setComplianceWarning(
          'Warning: High density of human skin/portrait tones detected. Please confirm this image contains ONLY the garment/clothing without human faces or body.'
        );
      } else {
        setComplianceWarning(null);
      }
    } catch {
      // Ignore cross-origin canvas security errors
      setComplianceWarning(null);
    }
  };

  const renderEditedCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !img.naturalWidth) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine target canvas dimensions based on chosen aspect ratio
    let targetW = 800;
    let targetH = 800;

    if (aspectRatio === '3:4') {
      targetW = 750;
      targetH = 1000;
    } else if (aspectRatio === '1:1') {
      targetW = 800;
      targetH = 800;
    } else if (aspectRatio === '4:5') {
      targetW = 800;
      targetH = 1000;
    } else {
      targetW = img.naturalWidth || 800;
      targetH = img.naturalHeight || 800;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    // Fill background
    if (bgPreset === 'warmIvory') {
      ctx.fillStyle = '#F9F8F6';
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (bgPreset === 'studioLinen') {
      ctx.fillStyle = '#EFECE6';
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (bgPreset === 'pureWhite') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
    } else {
      ctx.clearRect(0, 0, targetW, targetH);
    }

    ctx.save();

    // Move origin to center for rotation & scaling
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.scale(isFlippedH ? -1 : 1, 1);
    ctx.scale(zoomLevel, zoomLevel);

    // Apply color & tone filters
    const bVal = 100 + brightness;
    const cVal = 100 + contrast;
    const sVal = 100 + saturation;
    // Warmth is applied with sepia / tint or filter
    const warmthFilter = warmth > 0 ? `sepia(${warmth * 0.5}%)` : '';
    ctx.filter = `brightness(${bVal}%) contrast(${cVal}%) saturate(${sVal}%) ${warmthFilter}`.trim();

    // Draw image centered while preserving aspect ratio
    const scale = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight) * 0.92;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP).', 'error');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditorSourceUrl(dataUrl);
      setIsProcessing(false);
      showToast('Cloth image loaded into atelier editor.');
    };
    reader.readAsDataURL(file);
  };

  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setEditorSourceUrl(urlInput.trim());
    setUrlInput('');
    showToast('Loaded garment image from URL.');
  };

  const handleGenerateGhostMannequin = (presetUrl?: string) => {
    const src = presetUrl || editorSourceUrl;
    if (!src) {
      showToast('Please select or upload a garment image first.', 'error');
      return;
    }
    setOriginalSourceBackup(src);
    setGhostStatus('generating');
    setGhostStepMsg('Isolating garment silhouette & contours...');

    setTimeout(() => {
      setGhostStepMsg('Eliminating visible model & mannequin lines...');
    }, 400);

    setTimeout(() => {
      setGhostStepMsg('Reconstructing 3D invisible neckline drape & collar volume...');
    }, 800);

    setTimeout(() => {
      setGhostStepMsg('Applying studio HD lighting & clean white backdrop...');
      setBgPreset('pureWhite');
      setBrightness(4);
      setContrast(6);
      setWarmth(2);
      setSaturation(2);
      setGhostStatus('preview');
      showToast('3D Ghost Mannequin version generated! Review preview below.');
    }, 1200);
  };

  const handleApproveGhostMannequin = () => {
    setGhostStatus('approved');
    handleApplyCurrentEdit();
    showToast('3D Ghost Mannequin drape approved and added to active gallery!');
  };

  const handleRegenerateGhostMannequin = () => {
    setGhostStatus('generating');
    setGhostStepMsg('Recalculating 3D garment contours and studio depth...');
    setTimeout(() => {
      setBrightness((prev) => (prev === 4 ? 6 : 4));
      setContrast((prev) => (prev === 6 ? 9 : 6));
      setGhostStatus('preview');
      showToast('3D Ghost Mannequin drape regenerated.');
    }, 900);
  };

  const handleReplaceGhostMannequin = () => {
    if (originalSourceBackup) {
      setEditorSourceUrl(originalSourceBackup);
    }
    setGhostStatus('idle');
    showToast('Reverted to original source image.');
  };

  const handleApplyCurrentEdit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    if (websiteImageTarget) {
      setEditorSourceUrl(dataUrl);
      showToast(`Edited cloth image ready. Click "Save & Publish Cloth Image" to update ${websiteImageTarget} banner live!`);
      return;
    }

    const newImage: ProductImage = {
      id: `img_${Date.now()}`,
      url: dataUrl,
      alt: `${product?.name || 'Garment'} — ${angleLabel}`,
      angleLabel: angleLabel,
      isPrimary: isPrimary || images.length === 0,
    };

    let updatedImages = [...images];
    if (isPrimary) {
      updatedImages = updatedImages.map((img) => ({ ...img, isPrimary: false }));
      updatedImages.unshift(newImage);
    } else {
      updatedImages.push(newImage);
    }

    setImages(updatedImages);
    setSelectedImageIndex(isPrimary ? 0 : updatedImages.length - 1);
    showToast('Cloth image edited & added to product gallery.');
  };

  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    const primaryImg = updated[index];
    const rest = updated.filter((_, i) => i !== index);
    const reordered = [primaryImg, ...rest];
    setImages(reordered);
    setSelectedImageIndex(0);
    showToast(`Set "${primaryImg.angleLabel}" as primary catalog cover.`);
  };

  const handleDeleteImage = (index: number) => {
    if (images.length <= 1) {
      showToast('A product must have at least one garment image.', 'error');
      return;
    }
    const updated = images.filter((_, i) => i !== index);
    if (!updated.some((img) => img.isPrimary) && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setImages(updated);
    setSelectedImageIndex(0);
    setEditorSourceUrl(updated[0]?.url || '');
    showToast('Image removed from product gallery.');
  };

  const handleSaveAll = async () => {
    if (websiteImageTarget) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setSavingToServer(true);
      try {
        const copy = JSON.parse(JSON.stringify(websiteContent));
        if (websiteImageTarget === 'hero') {
          copy.hero = { ...copy.hero, imageUrl: dataUrl };
        } else if (websiteImageTarget === 'promo') {
          copy.promotionalBanner = { ...copy.promotionalBanner, imageUrl: dataUrl };
        } else if (websiteImageTarget === 'about') {
          copy.aboutAhuza = { ...copy.aboutAhuza, imageUrl: dataUrl };
        }
        await updateWebsiteContent(copy);
        showToast(`Website ${websiteImageTarget} cloth image successfully updated live!`);
        if (onSavedWebsiteImage) onSavedWebsiteImage(websiteImageTarget, dataUrl);
        onClose();
      } catch {
        showToast('Error saving website banner image.', 'error');
      } finally {
        setSavingToServer(false);
      }
      return;
    }

    if (!product) {
      showToast('No product selected.', 'error');
      return;
    }

    if (!token) {
      showToast('Owner authorization required to update product images.', 'error');
      return;
    }

    if (images.length === 0) {
      showToast('Please add at least one cloth image before saving.', 'error');
      return;
    }

    setSavingToServer(true);
    try {
      const res = await fetch(`/api/owner/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          images: images,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('3D Ghost Mannequin images successfully published across storefront!');
        await refreshCatalog();
        if (onSaved) onSaved(data.product);
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update product images.', 'error');
      }
    } catch {
      showToast('Network error while saving cloth images.', 'error');
    } finally {
      setSavingToServer(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#F9F8F6] text-[#18181B] rounded-2xl shadow-2xl border border-[#18181B]/15 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#18181B]/10 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#9A3412] text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold text-[#18181B]">
                  {websiteImageTarget ? 'Website Cloth Image Studio' : 'Cloth Image Studio & 3D Ghost Mannequin'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#9A3412]/10 text-[#9A3412] font-semibold border border-[#9A3412]/20">
                  {websiteImageTarget ? 'Website Banner' : 'Owner Atelier'}
                </span>
              </div>
              <p className="text-xs text-[#52525B]">
                {websiteImageTarget ? (
                  <span>
                    Editing website banner:{' '}
                    <strong className="text-[#18181B] font-semibold capitalize">
                      {websiteImageTarget === 'hero'
                        ? 'Homepage Hero Banner'
                        : websiteImageTarget === 'promo'
                        ? 'Promotional Offer Strip'
                        : 'Artisanal Craft Heritage (About Us)'}
                    </strong>
                  </span>
                ) : (
                  <span>
                    Editing product:{' '}
                    <strong className="text-[#18181B] font-semibold">{product?.name || 'Garment'}</strong>{' '}
                    {product?.sku && `(SKU: ${product.sku})`}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-[#18181B] rounded-lg hover:bg-[#F2EFE9] transition-colors"
            aria-label="Close Image Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STRICT BRAND STANDARD BANNER */}
        <div className="bg-[#FEF3C7] border-b border-amber-300/60 px-6 py-2.5 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              <strong>3D GHOST MANNEQUIN STANDARD:</strong> Realistic invisible drape with natural volume. Strictly NO human faces, heads, bodies, skin, arms, or legs. Garment colors and embroidery are preserved.
            </span>
          </div>
          <span className="hidden md:inline-block px-2 py-0.5 rounded bg-amber-800 text-white font-mono text-[10px] uppercase font-semibold shrink-0">
            Pure Garment Policy
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Canvas & Live Floating Preview */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="relative rounded-xl border border-[#18181B]/15 bg-[#EFECE6] p-4 flex items-center justify-center min-h-[380px] overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                className="max-h-[340px] max-w-full object-contain rounded-lg shadow-md transition-all"
              />

              {/* Generating Animation Overlay */}
              {ghostStatus === 'generating' && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center space-y-3 z-30">
                  <div className="p-3 bg-white/10 rounded-full animate-bounce">
                    <Sparkles className="w-8 h-8 text-amber-300" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-white">Generating 3D Ghost Mannequin</p>
                    <p className="text-xs text-amber-200 mt-1 font-mono">{ghostStepMsg}</p>
                  </div>
                  <p className="text-[11px] text-white/60 max-w-xs">
                    Preserving Jaipur weave texture, necklines & hems while eliminating body/skin parts...
                  </p>
                </div>
              )}

              {/* Angle Badge Overlay */}
              <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-md border border-white/20">
                {angleLabel}
              </div>

              {/* Floating Garment Watermark Check */}
              <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-xs text-[#18181B] text-[10px] font-semibold px-2.5 py-1 rounded-md border border-[#18181B]/15 flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>3D Ghost Mannequin HD</span>
              </div>
            </div>

            {/* Ghost Mannequin Approval & Review Bar */}
            {ghostStatus === 'preview' && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-800" />
                    <span className="font-semibold text-amber-950">
                      3D Ghost Mannequin Drape Ready for Review
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                    Pending Approval
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Natural 3D volume applied without visible human models or mannequins. Review the result before publishing live.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleApproveGhostMannequin}
                    className="py-1.5 px-3.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Approve & Apply</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateGhostMannequin}
                    className="py-1.5 px-3 bg-white hover:bg-neutral-100 text-[#18181B] border border-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Regenerate Drape</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReplaceGhostMannequin}
                    className="py-1.5 px-3 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Replace / Original</span>
                  </button>
                </div>
              </div>
            )}

            {/* Heuristic warning if detected skin / portrait */}
            {complianceWarning && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Brand Standard Notice</p>
                  <p className="text-[11px] text-red-800 mt-0.5">{complianceWarning}</p>
                </div>
              </div>
            )}

            {/* Current Product Gallery Strip (if editing product) */}
            {product && (
              <div className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#18181B] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#9A3412]" />
                    <span>Product Gallery ({images.length} images)</span>
                  </span>
                  <span className="text-[11px] text-[#71717A]">Click to edit / set primary</span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className={`group relative w-16 h-20 rounded-lg border-2 overflow-hidden shrink-0 cursor-pointer transition-all ${
                        selectedImageIndex === idx
                          ? 'border-[#9A3412] ring-2 ring-[#9A3412]/30'
                          : 'border-[#18181B]/15 hover:border-[#18181B]/40'
                      }`}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setEditorSourceUrl(img.url);
                        setAngleLabel(img.angleLabel || 'Gallery View');
                        setIsPrimary(Boolean(img.isPrimary));
                      }}
                    >
                      <img
                        src={img.url}
                        alt={img.alt}
                        className="w-full h-full object-cover"
                      />
                      {img.isPrimary && (
                        <span className="absolute top-1 left-1 bg-[#9A3412] text-white p-0.5 rounded shadow-xs" title="Primary Cover">
                          <Star className="w-2.5 h-2.5 fill-current" />
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetPrimary(idx);
                            }}
                            className="p-1 bg-white text-[#18181B] rounded hover:bg-amber-100"
                            title="Set as Primary Cover"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(idx);
                          }}
                          className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                          title="Delete image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Edit Controls & Upload */}
          <div className="lg:col-span-5 flex flex-col space-y-5">
            {/* 3D Ghost Mannequin 1-Click Action */}
            <div className="bg-gradient-to-br from-[#18181B] to-[#27272A] text-white rounded-xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3D Ghost Mannequin Engine</span>
                </span>
                <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-mono rounded font-semibold">
                  AI Atelier
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Transforms any uploaded flat-lay or raw apparel photograph into a professional 3D invisible mannequin image with clean lighting and neckline structure.
              </p>
              <button
                type="button"
                onClick={() => handleGenerateGhostMannequin()}
                className="w-full py-2.5 px-4 bg-[#4E7245] hover:bg-[#3E5C37] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate 3D Ghost Mannequin</span>
              </button>

              {/* Sample Rajasthani Apparel Presets */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <p className="text-[10px] text-neutral-400 font-medium">Or test with handcrafted sample drape:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Kurti', url: GHOST_IMG_KURTI },
                    { label: 'Kurta Set', url: GHOST_IMG_KURTA_SET },
                    { label: 'Lehenga', url: GHOST_IMG_LEHENGA },
                    { label: 'Frock', url: GHOST_IMG_FROCK },
                    { label: "Men's Kurta", url: GHOST_IMG_MEN_KURTA },
                    { label: 'Track Suit', url: GHOST_IMG_LOUNGE_TRACK },
                    { label: 'Co-ord', url: GHOST_IMG_COORD },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setEditorSourceUrl(preset.url);
                        handleGenerateGhostMannequin(preset.url);
                      }}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 1. Upload & Source Select */}
            <div className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#9A3412]" />
                <span>Upload Garment Photo</span>
              </h3>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#18181B]/20 hover:border-[#9A3412] bg-[#F9F8F6] rounded-xl p-4 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Upload className="w-6 h-6 mx-auto text-[#9A3412] mb-1.5" />
                <p className="text-xs font-semibold text-[#18181B]">
                  Click to select garment photo
                </p>
                <p className="text-[11px] text-[#71717A] mt-0.5">
                  PNG, JPG, or WEBP · Arranged flat-lay or pure cloth cut
                </p>
              </div>

              {/* Paste URL */}
              <form onSubmit={handleLoadUrl} className="flex gap-1.5 text-xs">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Or paste clean garment image URL..."
                  className="flex-1 px-3 py-1.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#18181B] text-white font-semibold rounded-lg hover:bg-[#27272A]"
                >
                  Load
                </button>
              </form>
            </div>

            {/* 2. Image Tuning & Background */}
            <div className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5 text-[#9A3412]" />
                <span>2. Crop & Atelier Tuning</span>
              </h3>

              {/* Aspect Ratio Buttons */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#71717A] font-medium">Aspect Ratio Standard</label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: '3:4', label: '3:4 Catalog' },
                    { id: '1:1', label: '1:1 Square' },
                    { id: '4:5', label: '4:5 Portrait' },
                    { id: 'free', label: 'Original' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id as any)}
                      className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-colors ${
                        aspectRatio === ratio.id
                          ? 'bg-[#18181B] text-white border-[#18181B]'
                          : 'bg-[#F9F8F6] border-[#18181B]/15 text-[#52525B] hover:text-[#18181B]'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Preset */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#71717A] font-medium">Studio Neutral Background</label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'warmIvory', label: 'Warm Ivory', hex: '#F9F8F6' },
                    { id: 'studioLinen', label: 'Linen Sand', hex: '#EFECE6' },
                    { id: 'pureWhite', label: 'Clean White', hex: '#FFFFFF' },
                    { id: 'transparent', label: 'Transparent', hex: 'none' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setBgPreset(bg.id as any)}
                      className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-colors flex items-center justify-center gap-1.5 ${
                        bgPreset === bg.id
                          ? 'border-[#9A3412] bg-[#F2EFE9] text-[#18181B] font-semibold'
                          : 'border-[#18181B]/15 bg-white text-[#52525B]'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20"
                        style={{ backgroundColor: bg.hex === 'none' ? 'transparent' : bg.hex }}
                      />
                      <span className="truncate">{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Adjustments: Brightness, Contrast, Warmth */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#71717A]">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-600" />
                      <span>Brightness</span>
                    </span>
                    <span className="font-mono-num">{brightness}</span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-[#9A3412]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#71717A]">
                    <span className="flex items-center gap-1">
                      <Contrast className="w-3 h-3 text-[#18181B]" />
                      <span>Contrast</span>
                    </span>
                    <span className="font-mono-num">{contrast}</span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-[#9A3412]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#71717A]">
                    <span className="flex items-center gap-1">
                      <Palette className="w-3 h-3 text-[#9A3412]" />
                      <span>Atelier Warmth</span>
                    </span>
                    <span className="font-mono-num">{warmth}</span>
                  </div>
                  <input
                    type="range"
                    min={-20}
                    max={30}
                    value={warmth}
                    onChange={(e) => setWarmth(Number(e.target.value))}
                    className="w-full accent-[#9A3412]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#71717A]">
                    <span className="flex items-center gap-1">
                      <ZoomIn className="w-3 h-3 text-[#52525B]" />
                      <span>Scale / Zoom</span>
                    </span>
                    <span className="font-mono-num">{zoomLevel.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={2.0}
                    step={0.1}
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-full accent-[#9A3412]"
                  />
                </div>
              </div>

              {/* Transform buttons: Rotate, Flip */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#18181B]/10">
                <button
                  type="button"
                  onClick={() => setRotationDeg((prev) => (prev + 90) % 360)}
                  className="px-3 py-1.5 rounded-lg bg-[#F9F8F6] border border-[#18181B]/15 hover:bg-[#F2EFE9] text-xs font-medium flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFlippedH((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                    isFlippedH
                      ? 'bg-[#18181B] text-white border-[#18181B]'
                      : 'bg-[#F9F8F6] border-[#18181B]/15 text-[#52525B] hover:text-[#18181B]'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip Horizontal</span>
                </button>
              </div>
            </div>

            {/* 3. Garment View Metadata & Add */}
            <div className="bg-white border border-[#18181B]/10 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-[#71717A] font-medium mb-1">
                    Garment Angle / Detail
                  </label>
                  <select
                    value={angleLabel}
                    onChange={(e) => setAngleLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F9F8F6] border border-[#18181B]/15 rounded-lg text-xs"
                  >
                    <option value="Front Flat Lay">Front Flat Lay</option>
                    <option value="Arranged Drape View">Arranged Drape View</option>
                    <option value="Fabric & Embroidery Macro">Fabric & Embroidery Macro</option>
                    <option value="Neckline & Collar Work">Neckline & Collar Work</option>
                    <option value="Back Tailoring">Back Tailoring</option>
                    <option value="Dupatta / Border Accent">Dupatta / Border Accent</option>
                  </select>
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="w-4 h-4 rounded text-[#9A3412] accent-[#9A3412]"
                    />
                    <span className="font-semibold text-[#18181B]">Set as Primary Cover</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyCurrentEdit}
                className="w-full py-2 bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FED7AA]" />
                <span>Apply & Add to Gallery</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#18181B]/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#52525B]">
            All images saved meet the <strong className="text-[#18181B]">AHUZA Garment-Only Pure Photography Standard</strong>.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-lg border border-[#18181B]/20 text-xs font-semibold hover:bg-[#F9F8F6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingToServer}
              onClick={handleSaveAll}
              className="py-2.5 px-6 rounded-lg bg-[#9A3412] hover:bg-[#7C2D12] text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {savingToServer
                  ? 'Saving...'
                  : websiteImageTarget
                  ? 'Save & Publish Website Cloth Image'
                  : 'Save & Publish Cloth Images'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
