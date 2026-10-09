/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { StoreProvider } from './context/StoreContext';
import {
  AboutAndContactPage,
  AccountAndOrdersPage,
  AuthPage,
  CartPage,
  CheckoutPage,
  OrderTrackingPage,
  QuickCheckoutPage,
  ReturnsAndRefundsPage,
  WhyAhuzaPage,
  WishlistPage,
} from './pages/CheckoutAndAccountPages';
import { OwnerStudioPage } from './pages/OwnerStudioPages';
import {
  CollectionPage,
  HomePage,
  ProductDetailsPage,
} from './pages/StorefrontPages';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <ScrollToTop />
        <Layout>
          <Routes>
            {/* 1. Home & Collections */}
            <Route path="/" element={<HomePage />} />
            <Route path="/women" element={<CollectionPage presetGender="women" />} />
            <Route path="/men" element={<CollectionPage presetGender="men" />} />
            <Route path="/product/:id" element={<ProductDetailsPage />} />
            <Route path="/search" element={<CollectionPage />} />

            {/* 2. Cart, Wishlist & Checkout */}
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/quick-checkout" element={<QuickCheckoutPage />} />
            <Route path="/api-checkout" element={<QuickCheckoutPage />} />

            {/* 3. Customer Authentication & Account */}
            <Route path="/login" element={<AuthPage initialMode="login" />} />
            <Route path="/signup" element={<AuthPage initialMode="signup" />} />
            <Route path="/account" element={<AccountAndOrdersPage defaultTab="profile" />} />
            <Route path="/orders" element={<AccountAndOrdersPage defaultTab="orders" />} />
            <Route path="/track-order" element={<OrderTrackingPage />} />
            <Route path="/returns" element={<ReturnsAndRefundsPage />} />

            {/* 4. Brand Storytelling & Policies */}
            <Route path="/why-ahuza" element={<WhyAhuzaPage />} />
            <Route path="/about" element={<AboutAndContactPage page="about" />} />
            <Route path="/contact" element={<AboutAndContactPage page="contact" />} />
            <Route
              path="/privacy-policy"
              element={<AboutAndContactPage page="policy" policyType="privacy" />}
            />
            <Route
              path="/terms"
              element={<AboutAndContactPage page="policy" policyType="terms" />}
            />
            <Route
              path="/shipping-policy"
              element={<AboutAndContactPage page="policy" policyType="shipping" />}
            />
            <Route
              path="/cancellation-policy"
              element={<AboutAndContactPage page="policy" policyType="cancellation" />}
            />
            <Route
              path="/return-policy"
              element={<AboutAndContactPage page="policy" policyType="return" />}
            />

            {/* 5. Role-Protected Owner Studio */}
            <Route path="/owner" element={<OwnerStudioPage />} />
            <Route path="/owner-studio" element={<OwnerStudioPage />} />

            {/* Fallback to Home */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Layout>
      </StoreProvider>
    </BrowserRouter>
  );
}
