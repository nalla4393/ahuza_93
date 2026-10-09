/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads in security_spec.md are rejected with PERMISSION_DENIED.
 */

export interface SecurityPayloadTest {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityPayloadTest[] = [
  {
    id: 1,
    name: 'Price Ceiling Bypass (> 2000 INR)',
    collection: 'products',
    docId: 'prod_expensive',
    operation: 'create',
    auth: { uid: 'admin_1', email: 'nallagondarosy@gmail.com', email_verified: true },
    payload: {
      sku: 'AHZ-EXP-001',
      name: 'Overpriced Kurti',
      gender: 'women',
      category: 'Kurtis',
      description: 'Should be blocked by 2000 INR rule',
      fabric: 'Cotton',
      color: 'Red',
      price: 2500,
      discountPrice: 2100,
      stock: 10,
      status: 'Published',
      imageUrl: '/img.jpg',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection (isAdmin: true)',
    collection: 'users',
    docId: 'user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'customer@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Sneaky User',
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoofing',
    collection: 'products',
    docId: 'prod_spoof',
    operation: 'create',
    auth: { uid: 'spoof_1', email: 'nallagondarosy@gmail.com', email_verified: false },
    payload: {
      sku: 'AHZ-SPF-001',
      name: 'Spoofed Product',
      gender: 'women',
      category: 'Kurtis',
      description: 'Valid description',
      fabric: 'Cotton',
      color: 'Blue',
      price: 999,
      discountPrice: 799,
      stock: 5,
      status: 'Published',
      imageUrl: '/img.jpg',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-User PII Read on /users/user_A/private/info',
    collection: 'users/user_A/private',
    docId: 'info',
    operation: 'get',
    auth: { uid: 'user_B', email: 'userb@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Order Creation',
    collection: 'orders',
    docId: 'ord_spoof_1',
    operation: 'create',
    auth: { uid: 'user_A', email: 'usera@example.com', email_verified: true },
    payload: {
      orderNumber: 'AHZ-2026-000099',
      userId: 'user_B',
      totalAmount: 999,
      status: 'Pending',
      shippingSummary: 'Mumbai 400001',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Wishlist Item (Non-existent Product)',
    collection: 'wishlists',
    docId: 'wish_orphan_1',
    operation: 'create',
    auth: { uid: 'user_A', email: 'usera@example.com', email_verified: true },
    payload: {
      userId: 'user_A',
      productId: 'non_existent_product_999',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Mutation on Cancelled Order',
    collection: 'orders',
    docId: 'ord_cancelled_1',
    operation: 'update',
    auth: { uid: 'user_A', email: 'usera@example.com', email_verified: true },
    payload: {
      status: 'Confirmed',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery on Review',
    collection: 'reviews',
    docId: 'rev_forged_1',
    operation: 'create',
    auth: { uid: 'user_A', email: 'usera@example.com', email_verified: true },
    payload: {
      productId: 'prod_1',
      userId: 'user_A',
      authorName: 'Asha',
      rating: 5,
      comment: 'Great kurti!',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning with Invalid Characters',
    collection: 'wishlists',
    docId: 'invalid$id#with!symbols',
    operation: 'create',
    auth: { uid: 'user_A', email: 'usera@example.com', email_verified: true },
    payload: {
      userId: 'user_A',
      productId: 'prod_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unauthorized Customer Order Status Escalation to Paid',
    collection: 'orders',
    docId: 'ord_pending_1',
    operation: 'update',
    auth: { uid: 'user_A', email: 'usera@example.com', email_verified: true },
    payload: {
      status: 'Paid',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unbounded String DoW on Review Comment (>1000 chars)',
    collection: 'reviews',
    docId: 'rev_huge_1',
    operation: 'create',
    auth: { uid: 'user_A', email: 'usera@example.com', email_verified: true },
    payload: {
      productId: 'prod_1',
      userId: 'user_A',
      authorName: 'Asha',
      rating: 5,
      comment: 'A'.repeat(1500),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Cross-User Order List Scraping',
    collection: 'orders',
    docId: '*',
    operation: 'list',
    auth: { uid: 'user_A', email: 'usera@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
