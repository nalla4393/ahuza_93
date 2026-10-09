# AHUZA Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Price Ceiling Invariant**: No `Product` document can ever be created or updated with `price > 2000` or `discountPrice > 2000` or `price <= 0`.
2. **PII Split Isolation Invariant**: Customer PII (`email`, `phone`, `defaultAddress`) is stored exclusively in `/users/{userId}/private/{docId}` and is readable only by `isOwner(userId)` or `isAdmin()`.
3. **Owner Privilege Invariant**: Only verified admins (`isAdmin()`) can create, update, or delete `/products/{productId}`, `/content/{sectionId}`, or `/admins/{adminId}`.
4. **Relational Existence Invariant**: Every `WishlistItem`, `CartItem`, and `Review` creation must verify `exists(/databases/$(database)/documents/products/$(incoming().productId))`. Every `ReturnRequest` creation must verify that the parent `Order` exists and belongs to `request.auth.uid`.
5. **Terminal State Locking Invariant**: Once an `Order` reaches `Cancelled` or `Refunded`, or a `ReturnRequest` reaches `Completed` or `Rejected`, non-admin users cannot mutate its state.
6. **Temporal & Immutable Identity Invariant**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on creation and update; `userId` and `uid` fields must equal `request.auth.uid` and remain immutable.
7. **Query Enforcer Invariant**: `allow list` on `/wishlists`, `/carts`, `/orders`, and `/returns` strictly enforces `resource.data.userId == request.auth.uid || isAdmin()`. Blanket `isSignedIn()` list rules are prohibited.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Price Ceiling Bypass)**: Admin attempts to create a `Product` with `price: 2500` (above the ₹2,000 brand cap). -> `PERMISSION_DENIED`
2. **Payload 2 (Shadow Field Injection)**: Authenticated user creates `UserPublic` with an undeclared field `isAdmin: true`. -> `PERMISSION_DENIED`
3. **Payload 3 (Unverified Email Spoofing)**: Attacker with `email: "nallagondarosy@gmail.com"` but `email_verified: false` attempts to create a `Product`. -> `PERMISSION_DENIED`
4. **Payload 4 (Cross-User PII Read)**: Authenticated user `user_B` attempts `get` on `/users/user_A/private/info`. -> `PERMISSION_DENIED`
5. **Payload 5 (Identity Spoofing on Order)**: Authenticated user `user_A` attempts to create an `Order` with `userId: "user_B"`. -> `PERMISSION_DENIED`
6. **Payload 6 (Orphaned Wishlist Item)**: Authenticated user attempts to create a `WishlistItem` referencing a non-existent `productId`. -> `PERMISSION_DENIED`
7. **Payload 7 (Terminal State Mutation)**: Customer attempts to update an `Order` whose current status is `"Cancelled"` to `"Confirmed"`. -> `PERMISSION_DENIED`
8. **Payload 8 (Client Timestamp Forgery)**: Authenticated user attempts to create a `Review` with a backdated `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
9. **Payload 9 (ID Poisoning Attack)**: Attacker attempts to create a document with a 300-character or special-character document ID. -> `PERMISSION_DENIED`
10. **Payload 10 (Unauthorized Order Status Escalation)**: Customer attempts to update their own `Order` status to `"Paid"` or `"Delivered"` (only `"Cancellation Requested"` is allowed for customer action). -> `PERMISSION_DENIED`
11. **Payload 11 (Unbounded String DoW)**: Authenticated user attempts to create a `Review` with a 5,000-character `comment` (exceeding `maxLength: 1000`). -> `PERMISSION_DENIED`
12. **Payload 12 (Unauthorized List Scraping)**: Authenticated user `user_A` attempts to `list` `/orders` without filtering `userId == "user_A"`. -> `PERMISSION_DENIED`
