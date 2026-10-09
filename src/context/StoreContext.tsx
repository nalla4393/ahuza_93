import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  doc,
  googleProvider,
  handleFirestoreError,
  OperationType,
  serverTimestamp,
  setDoc,
  signInWithPopup,
  signOut,
} from '../firebase';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_WEBSITE_CONTENT,
} from '../data/seedData';
import {
  Cart,
  Category,
  Product,
  User,
  WebsiteContent,
  WishlistItem,
} from '../types';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  user: User | null;
  token: string | null;
  authLoading: boolean;
  products: Product[];
  categories: Category[];
  websiteContent: WebsiteContent;
  cart: Cart;
  wishlist: WishlistItem[];
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User> & { recentlyViewedProductId?: string }) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  refreshContent: (preview?: boolean) => Promise<void>;
  addToCart: (product: Product, size?: string, color?: string, quantity?: number, openDrawer?: boolean) => Promise<void>;
  updateCartQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  toggleWishlist: (product: Product) => Promise<void>;
  moveWishlistToCart: (productId: string, size?: string, color?: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  updateWebsiteContent: (newContent: WebsiteContent) => Promise<boolean>;
  trackEvent: (
    type: 'page_view' | 'product_view' | 'add_to_cart' | 'wishlist_add' | 'checkout_start' | 'purchase' | 'search',
    meta?: { productId?: string; searchQuery?: string; landingPage?: string }
  ) => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const LOCAL_TOKEN_KEY = 'ahuza_auth_token_v1';
const LOCAL_GUEST_CART_KEY = 'ahuza_guest_cart_v1';
const LOCAL_CUSTOM_CONTENT_KEY = 'ahuza_custom_website_content_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LOCAL_TOKEN_KEY));
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContent>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CUSTOM_CONTENT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_WEBSITE_CONTENT;
  });

  const [cart, setCart] = useState<Cart>({
    id: 'guest_cart',
    userId: 'guest',
    items: [],
    subtotal: 0,
    productDiscount: 0,
    couponDiscount: 0,
    shipping: 0,
    grandTotal: 0,
  });
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `tst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const trackEvent = useCallback(
    (
      type: 'page_view' | 'product_view' | 'add_to_cart' | 'wishlist_add' | 'checkout_start' | 'purchase' | 'search',
      meta?: { productId?: string; searchQuery?: string; landingPage?: string }
    ) => {
      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          productId: meta?.productId,
          searchQuery: meta?.searchQuery,
          landingPage: meta?.landingPage || window.location.pathname,
          deviceType: isMobile ? 'Mobile (Android)' : 'Desktop',
        }),
      }).catch(() => {});
    },
    []
  );

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.categories)) setCategories(data.categories);
      }
    } catch {
      // Fallback to seeded catalog
    }
  }, []);

  const refreshContent = useCallback(
    async (preview = false) => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`/api/content${preview ? '?preview=true' : ''}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.content) setWebsiteContent(data.content);
          if (Array.isArray(data.categories)) setCategories(data.categories);
        }
      } catch {
        // Keep default content
      }
    },
    [token]
  );

  const fetchUserCartAndWishlist = useCallback(async (activeToken: string) => {
    try {
      const [cartRes, wishRes] = await Promise.all([
        fetch('/api/cart', { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch('/api/wishlist', { headers: { Authorization: `Bearer ${activeToken}` } }),
      ]);
      if (cartRes.ok) {
        const cData = await cartRes.json();
        if (cData.cart) setCart(cData.cart);
      }
      if (wishRes.ok) {
        const wData = await wishRes.json();
        if (Array.isArray(wData.items)) setWishlist(wData.items);
      }
    } catch {
      // Ignore network error
    }
  }, []);

  // Recompute guest cart from localStorage when not logged in
  const syncGuestCart = useCallback(
    (guestItems: Cart['items']) => {
      let mrpSubtotal = 0;
      let sellingSubtotal = 0;
      const enriched = guestItems
        .map((item) => {
          const prod = products.find((p) => p.id === item.productId && p.status === 'Published');
          if (!prod) return null;
          mrpSubtotal += prod.price * item.quantity;
          sellingSubtotal += prod.discountPrice * item.quantity;
          return { ...item, product: prod };
        })
        .filter(Boolean) as Cart['items'];

      const productDiscount = Math.max(0, mrpSubtotal - sellingSubtotal);
      const shipping = enriched.length === 0 ? 0 : sellingSubtotal >= 999 ? 0 : 79;
      setCart({
        id: 'guest_cart',
        userId: 'guest',
        items: enriched,
        subtotal: mrpSubtotal,
        productDiscount,
        couponDiscount: 0,
        shipping,
        grandTotal: sellingSubtotal + shipping,
      });
      localStorage.setItem(LOCAL_GUEST_CART_KEY, JSON.stringify(enriched));
    },
    [products]
  );

  useEffect(() => {
    refreshCatalog();
    refreshContent();
  }, [refreshCatalog, refreshContent]);

  useEffect(() => {
    async function verifyStoredToken() {
      if (!token) {
        try {
          const savedGuest = localStorage.getItem(LOCAL_GUEST_CART_KEY);
          if (savedGuest) {
            syncGuestCart(JSON.parse(savedGuest));
          }
        } catch {
          // Ignore
        }
        setAuthLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          await fetchUserCartAndWishlist(token);
        } else {
          localStorage.removeItem(LOCAL_TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch {
        // Keep offline state
      } finally {
        setAuthLoading(false);
      }
    }
    verifyStoredToken();
  }, [token, fetchUserCartAndWishlist, syncGuestCart]);

  // Sync Firebase user profile to Firestore with split PII isolation when signed in with Firebase Auth
  const syncFirebaseUserToFirestore = async (fbUid: string, name: string, email: string, phone: string) => {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const safeName = (name || 'AHUZA Shopper').slice(0, 100);
    const safeEmail = (email || '').slice(0, 254);
    const safePhone = (phone || '').slice(0, 20);
    try {
      await setDoc(
        doc(db, 'users', fbUid),
        {
          uid: fbUid,
          displayName: safeName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', fbUid, 'private', 'info'),
        {
          uid: fbUid,
          email: safeEmail,
          phone: safePhone,
          defaultAddress: 'India',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, `users/${fbUid}`);
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Login failed' };
      }
      localStorage.setItem(LOCAL_TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchUserCartAndWishlist(data.token);
      showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Network error while signing in. Please try again.' };
    }
  };

  const signup = async (name: string, email: string, phone: string, password: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Sign up failed' };
      }
      localStorage.setItem(LOCAL_TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchUserCartAndWishlist(data.token);
      showToast(`Welcome to AHUZA, ${data.user.name.split(' ')[0]}!`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while creating account.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      await syncFirebaseUserToFirestore(
        fbUser.uid,
        fbUser.displayName || 'AHUZA Member',
        fbUser.email || '',
        fbUser.phoneNumber || ''
      );

      const res = await fetch('/api/auth/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName,
          phone: fbUser.phoneNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Google sign-in failed' };
      }
      localStorage.setItem(LOCAL_TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchUserCartAndWishlist(data.token);
      showToast(`Signed in as ${data.user.name}`);
      return { ok: true, user: data.user };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled.';
      return { ok: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth).catch(() => {});
    } finally {
      localStorage.removeItem(LOCAL_TOKEN_KEY);
      setToken(null);
      setUser(null);
      setWishlist([]);
      syncGuestCart([]);
      showToast('You have been signed out.', 'info');
    }
  };

  const updateProfile = async (updates: Partial<User> & { recentlyViewedProductId?: string }) => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (!updates.recentlyViewedProductId) {
          showToast('Account profile updated.');
        }
      }
    } catch {
      showToast('Failed to update profile.', 'error');
    }
  };

  const addToCart = async (
    product: Product,
    size?: string,
    color?: string,
    quantity = 1,
    openDrawer = true
  ) => {
    if (product.stock <= 0 || product.status !== 'Published') {
      showToast('This item is currently out of stock.', 'error');
      return;
    }
    const chosenSize = size || product.sizes[0] || 'M';
    const chosenColor = color || product.colors[0]?.name || 'Standard';

    trackEvent('add_to_cart', { productId: product.id });

    if (token && user) {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          size: chosenSize,
          color: chosenColor,
          quantity,
        }),
      });
      const data = await res.json();
      if (res.ok && data.cart) {
        setCart(data.cart);
        if (openDrawer) setIsCartDrawerOpen(true);
        showToast(`Added ${product.name} (${chosenSize}) to your bag.`);
      } else {
        showToast(data.error || 'Could not add item to bag.', 'error');
      }
    } else {
      const current = [...cart.items];
      const existing = current.find(
        (i) => i.productId === product.id && i.size === chosenSize && i.color === chosenColor
      );
      if (existing) {
        existing.quantity = Math.min(product.stock, existing.quantity + quantity);
      } else {
        current.push({
          id: `guest_ci_${Date.now()}`,
          productId: product.id,
          size: chosenSize,
          color: chosenColor,
          quantity,
          product,
        });
      }
      syncGuestCart(current);
      if (openDrawer) setIsCartDrawerOpen(true);
      showToast(`Added ${product.name} (${chosenSize}) to your bag.`);
    }
  };

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    if (token && user) {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data.cart);
      }
    } else {
      const updated =
        quantity <= 0
          ? cart.items.filter((i) => i.id !== itemId)
          : cart.items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
      syncGuestCart(updated);
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (token && user) {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data.cart);
        showToast('Item removed from bag.', 'info');
      }
    } else {
      syncGuestCart(cart.items.filter((i) => i.id !== itemId));
      showToast('Item removed from bag.', 'info');
    }
  };

  const applyCoupon = async (code: string) => {
    if (!token || !user) {
      return { ok: false, message: 'Please sign in to apply a promotional coupon.' };
    }
    const res = await fetch('/api/cart/apply-coupon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (res.ok && data.cart) {
      setCart(data.cart);
      showToast(data.message || 'Coupon applied!');
      return { ok: true, message: data.message || 'Coupon applied!' };
    }
    return { ok: false, message: data.error || 'Invalid coupon code.' };
  };

  const toggleWishlist = async (product: Product) => {
    if (!token || !user) {
      showToast('Please sign in to save items to your persistent wishlist.', 'info');
      return;
    }
    const res = await fetch('/api/wishlist/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId: product.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setWishlist(data.items || []);
      if (data.action === 'added') {
        trackEvent('wishlist_add', { productId: product.id });
        showToast(`${product.name} saved to your Wishlist.`);
      } else {
        showToast(`${product.name} removed from your Wishlist.`, 'info');
      }
    }
  };

  const moveWishlistToCart = async (productId: string, size?: string, color?: string) => {
    if (!token || !user) return;
    const res = await fetch('/api/wishlist/move-to-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId, size, color }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.cart) setCart(data.cart);
      if (data.wishlistItems) setWishlist(data.wishlistItems);
      setIsCartDrawerOpen(true);
      showToast('Moved from Wishlist to your Shopping Bag!');
    } else {
      showToast(data.error || 'Could not move item to bag.', 'error');
    }
  };

  const isInWishlist = useCallback(
    (productId: string) => wishlist.some((w) => w.productId === productId),
    [wishlist]
  );

  const updateWebsiteContent = useCallback(
    async (newContent: WebsiteContent) => {
      setWebsiteContent(newContent);
      try {
        localStorage.setItem(LOCAL_CUSTOM_CONTENT_KEY, JSON.stringify(newContent));
      } catch {}

      try {
        await fetch('/api/content', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content: newContent }),
        });
      } catch {}
      return true;
    },
    [token]
  );

  return (
    <StoreContext.Provider
      value={{
        user,
        token,
        authLoading,
        products,
        categories,
        websiteContent,
        cart,
        wishlist,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        toasts,
        showToast,
        dismissToast,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateProfile,
        refreshCatalog,
        refreshContent,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        applyCoupon,
        toggleWishlist,
        moveWishlistToCart,
        isInWishlist,
        updateWebsiteContent,
        trackEvent,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
