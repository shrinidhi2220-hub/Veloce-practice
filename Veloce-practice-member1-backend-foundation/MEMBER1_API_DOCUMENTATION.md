# VELOCE Online Store — API Contract

**Version:** 1.0  
**Status:** Updated for the Member 1 backend branch after the latest auth, admin, consent and rewards work on 18 November 2026.  
**Audience:** Members 1–4 (INFINEX)

> This document describes the current code, not every feature in the project vision. Items marked **Not implemented / not verified** must not be presented to judges or teammates as working.

## 1. Base URLs and conventions

- Local backend: `http://localhost:3000`
- API prefix: `/api`
- Health endpoint: `GET /health`
- JSON request bodies: send `Content-Type: application/json` for `POST` and `PATCH`.
- Currency examples use INR (₹).
- Guest carts are identified by a client-generated `sessionId`. Keep that ID for the customer's shopping session.

## 2. Health

### `GET /health`

No request body.

Observed response:

```json
{
  "status": "OK",
  "timestamp": "2026-11-18T11:09:41.544Z",
  "service": "VELOCE Backend API"
}
```

This checks that Express is responding; it does not, by itself, prove the database is healthy. Server startup tests the database connection and aborts startup if the database is unavailable.

## 3. Products

### `GET /api/products`

Returns active products. Supported query parameters in the current controller:

| Parameter | Meaning | Example |
|---|---|---|
| `q` | Case-insensitive substring search in name, description or brand | `?q=keyboard` |
| `category` | Exact category match | `?category=Electronics` |
| `city` | Exact city match | `?city=Bagalkot` |
| `minPrice` | Inclusive lower price bound | `?minPrice=1000` |
| `maxPrice` | Inclusive upper price bound | `?maxPrice=2000` |
| `page` | Page number; default `1` | `?page=1` |
| `limit` | Page size; default `20` | `?limit=20` |

Filters can be combined:

`GET /api/products?q=keyboard&category=Electronics&city=Bengaluru&minPrice=1000&maxPrice=5000&page=1&limit=20`

Observed response shape:

```json
{
  "success": true,
  "data": [
    {
      "id": "veloce-demo-001",
      "name": "Wireless Bluetooth Headphones",
      "description": "Wireless headphones with clear sound and comfortable design.",
      "category": "Electronics",
      "brand": "SoundPro",
      "city": "Bengaluru",
      "price": 1999,
      "wholesalePrice": 1799,
      "wholesaleQty": 10,
      "stock": 15,
      "images": []
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Verified behavior:** normal `keyboard` search, category, city, price-range and combined category/city filters were exercised successfully.

**Behavior and limitations:**
- This is substring matching, not typo-tolerant/fuzzy search. `keybord` returned no results.
- `page` must be a positive integer (maximum 1,000,000); `limit` must be a positive integer (maximum 100). Price bounds must be non-negative numbers, and `minPrice` cannot exceed `maxPrice`. Invalid filters return HTTP 400.
- `q` is limited to 200 characters; `category` and `city` are limited to 100 characters.
- Category and city matching are exact string matches.

### `GET /api/products/:id`

Returns one product with up to 10 most recent reviews, including each review author's `id` and `name`.

Example: `GET /api/products/veloce-demo-001`

Success shape: `{ "success": true, "data": { ...product, "reviews": [...] } }`.

Unknown ID returns HTTP 404 with `Product not found`.

**Implementation note:** this lookup uses `findUnique` and does not filter out inactive products, unlike the product-list endpoint.

## 4. Cart

The cart is keyed by `sessionId`. A guest does not need a user account to use these endpoints.

### `POST /api/cart` — Add quantity to cart

Request:

```json
{
  "sessionId": "guest-session-123",
  "productId": "veloce-demo-008",
  "quantity": 2
}
```

- `sessionId`: required non-empty string, maximum 128 characters.
- `productId`: required non-empty string.
- `quantity`: optional positive safe integer; defaults to `1`.
- If the product is already in the cart, the requested quantity is **added** to the existing quantity.
- The backend rejects inactive/unknown products and checks the combined quantity against available stock.
- The cart row is locked during the mutation transaction so cart mutations and checkout can serialize on that cart.
- Response includes item `unitPrice`, `totalPrice` and cart `total`.
- Wholesale price applies when that item's quantity reaches `wholesaleQty`.

Example success shape:

```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "id": "cart-id",
    "sessionId": "guest-session-123",
    "items": [
      {
        "productId": "veloce-demo-008",
        "quantity": 2,
        "unitPrice": 499,
        "totalPrice": 998,
        "product": {
          "id": "veloce-demo-008",
          "name": "Insulated Water Bottle",
          "price": 499,
          "wholesalePrice": 399,
          "wholesaleQty": 10,
          "stock": 50,
          "images": []
        }
      }
    ],
    "total": 998
  }
}
```

Typical errors: HTTP 400 invalid identifiers/quantity, inactive product or insufficient stock; HTTP 404 unknown product.

### `GET /api/cart/:sessionId` — Retrieve cart

Example: `GET /api/cart/guest-session-123`

Returns cart items with server-calculated wholesale pricing and total. A missing cart returns:

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 0
  }
}
```

### `PATCH /api/cart/:sessionId/items/:productId` — Set absolute quantity

Request:

```json
{
  "quantity": 10
}
```

This **sets** quantity to 10; it does not add 10. The item must already exist. Quantity must be a positive safe integer and cannot exceed current stock. The endpoint locks the cart row inside a transaction and returns recalculated item pricing and cart total.

Example response shape:

```json
{
  "success": true,
  "message": "Cart item quantity updated",
  "data": {
    "items": [
      {
        "quantity": 10,
        "unitPrice": 399,
        "totalPrice": 3990
      }
    ],
    "total": 3990
  }
}
```

Observed stock error:

```json
{
  "success": false,
  "message": "Insufficient stock. Available stock: 50, requested: 51"
}
```

### `DELETE /api/cart/:sessionId/items/:productId` — Remove cart item

No request body. Removes the item from the matching cart, then returns the updated cart with recalculated item pricing and total.

### Cart behavior and limitation

A cart does not reserve stock. Stock must be checked again and decremented transactionally at order placement. The current cart controller validates quantity and stock for add/update operations; test removal and concurrent cart mutations as part of integration QA.

## 5. Orders and COD checkout

### `POST /api/orders` — Place an order

This is a state-changing operation. The controller:

1. Requires a valid `sessionId` (maximum 128 characters).
2. Allows only COD (`paymentMethod` defaults to `COD`).
3. Validates the shipping address.
4. Locks the cart row with `SELECT ... FOR UPDATE`.
5. Loads the cart and recalculates prices/wholesale eligibility on the server.
6. Rechecks product availability and stock.
7. Creates the order and order items inside a Prisma transaction.
8. Conditionally decrements stock, creates inventory events and clears the cart in the same transaction.

Request:

```json
{
  "sessionId": "guest-session-123",
  "paymentMethod": "COD",
  "shippingAddress": {
    "fullName": "Demo Customer",
    "phone": "9999999999",
    "addressLine1": "Test Address",
    "addressLine2": "Optional apartment or landmark",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560001",
    "country": "India"
  }
}
```

Required shipping fields: `fullName`, `phone`, `addressLine1`, `city`, `state`, `postalCode`, `country`. `addressLine2` is optional. Text lengths are bounded in the controller; phone is checked for 7–15 digits after removing non-digits; postal code must have at least 3 characters. Client-submitted prices and totals are not accepted as order inputs.

Success response (actual example from the test order):

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "id": "c4d29dc4-3af3-464f-9cb1-2d305cb0df1e",
    "orderNumber": "ORD-1794995051418-P5U3H41G8",
    "status": "CONFIRMED",
    "totalAmount": 17990,
    "paymentMethod": "COD",
    "items": [
      {
        "productId": "veloce-demo-001",
        "quantity": 10,
        "unitPrice": 1799,
        "totalPrice": 17990
      }
    ]
  }
}
```

Known validation/error outcomes:

| HTTP status | Meaning / message |
|---|---|
| 400 | Invalid/missing session ID, unsupported payment method, invalid shipping address, invalid item quantity, or unavailable product |
| 409 | Empty/already checked-out cart, insufficient/changed stock, or transaction conflict |

The successful checkout was verified: 10 headphones at ₹1,799 each, order total ₹17,990, stock reduced from 25 to 15, one `STOCK_DECREASED` event created, and cart emptied.

**Authentication note:** the controller associates an order with the authenticated user when a user is signed in. Guest checkout remains possible with `userId: null`. The created-order response is the confirmation payload for guest checkout.

### `GET /api/orders/:id` — Retrieve own order

Requires a valid customer JWT. The endpoint returns only an order belonging to the authenticated user. Guest order retrieval by order ID is not implemented; do not expose an unauthenticated lookup based only on an order ID.

### `GET /api/orders/admin` — List orders (ADMIN)

Requires an ADMIN JWT. Use this endpoint for the admin order-management screen; do not use it from the public storefront.

### `PATCH /api/orders/admin/:id/status` — Advance order status (ADMIN)

Requires an ADMIN JWT. The backend enforces the allowed sequence:

`CONFIRMED → PROCESSING → SHIPPED → DELIVERED`

Skipping a stage is rejected with HTTP 409 and the allowed next status. Cancellation is not enabled because stock-restoration handling is not implemented. Send the target status in the JSON body using the `status` field, for example `{"status":"PROCESSING"}`.

## 6. Inventory events

### `GET /api/inventory/events`

Returns latest inventory events first, with pagination.

Query parameters:

| Parameter | Meaning |
|---|---|
| `page` | Positive page number; default `1` |
| `limit` | Page size from 1 to 100; default `20` |
| `productId` | Exact product ID filter |
| `eventType` | Exact event type filter (maximum 60 characters) |
| `orderId` | Exact order ID filter |

Example:

`GET /api/inventory/events?productId=veloce-demo-001&eventType=STOCK_DECREASED`

Verified response example:

```json
{
  "success": true,
  "data": [
    {
      "id": "978b1937-e598-444c-90df-6719f3c5eef3",
      "productId": "veloce-demo-001",
      "eventType": "STOCK_DECREASED",
      "quantity": 10,
      "previousStock": 25,
      "newStock": 15,
      "orderId": "c4d29dc4-3af3-464f-9cb1-2d305cb0df1e",
      "metadata": {
        "orderNumber": "ORD-1794995051418-P5U3H41G8"
      },
      "createdAt": "2026-11-18T09:44:11.825Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Security:** this endpoint is ADMIN-only in the current backend. Send the ADMIN bearer token. Do not expose inventory events to unauthenticated customers.

## 7. Authentication

### `POST /api/auth/register`

Creates a customer account. Send `name`, `email`, `password`, and optional
`phone`, `city`, and `referralCode`. The backend hashes the password; never
store or log plaintext passwords. Each customer receives a referral code.
Registering with a valid referral code awards 100 points to the referrer and
50 points to the new customer as part of the registration transaction. An
invalid supplied referral code returns HTTP 400.

### `POST /api/auth/login`

Authenticates a registered user and returns an authentication token and user information. Use the returned token for protected endpoints:

```http
Authorization: Bearer <JWT>
```

### `GET /api/auth/me` and `PATCH /api/auth/me`

Both require customer authentication. `GET` returns the authenticated profile.
`PATCH` updates optional `name`, `phone`, and `city` fields; identity and role
are always taken from the token. The profile includes the customer's
`referralCode`.

Authentication endpoints have rate limiting. Current limits are environment-dependent: stricter in production and more permissive in development. Do not hard-code a limit into frontend behavior.

**Important:** ADMIN-only endpoints require a token belonging to a user with the `ADMIN` role. A customer token must receive HTTP 403 on admin actions.

## 8. Reviews

### `GET /api/reviews/:productId` — List product reviews

Public endpoint. Example: `GET /api/reviews/veloce-demo-001`. Returns reviews newest first, including public author information (author ID and name).

### `POST /api/reviews` — Create a review

Requires customer authentication. The request body contains `productId`, `rating` and optional `comment`:

```json
{
  "productId": "veloce-demo-001",
  "rating": 5,
  "comment": "Good product"
}
```

The backend takes the reviewer identity from the authenticated token (`req.user.id`); do not send or trust a client-supplied `userId`. Rating must be from 1 to 5. A customer can review a product only if the database contains a matching order item for that customer with order status `CONFIRMED`. A duplicate review for the same product/customer returns HTTP 409.

**Current rule:** verified-purchase validation uses `CONFIRMED`; it does not yet require `DELIVERED` status.

## 9. Resale listings

### `POST /api/resale` — Submit a resale listing

Requires customer authentication. The backend associates the listing with `req.user.id`; do not send a trusted `userId` from the browser. Current listing fields include `productName`, `description`, `condition`, `askingPrice`, `city` and optional `images`. New listings enter `PENDING` status and are not shown in the public approved-listing feed.

### `GET /api/resale` — List approved resale listings

Public endpoint. Returns approved listings only, newest first (up to 50).

### `PATCH /api/resale/:id/purchase` — Place a resale COD order

Requires customer authentication. Send a `shippingAddress` object with
`fullName`, `phone`, `addressLine1`, `city`, `state`, `postalCode`, and
`country`. Only an approved listing can be purchased, and sellers cannot buy
their own listing. A transaction marks the listing sold and creates one
cash-on-delivery resale order. It does not collect payment online.

### `GET /api/resale/admin/listings` — Admin listing queue

Requires ADMIN authentication. Supports status filtering and pagination. Use this route to review pending submissions.

### `PATCH /api/resale/admin/listings/:id/approve` — Approve a listing (ADMIN)

Requires ADMIN authentication. Only a `PENDING` listing can be approved. A repeated or invalid transition returns HTTP 409.

### `PATCH /api/resale/admin/listings/:id/reject` — Reject a listing (ADMIN)

Requires ADMIN authentication. Only a `PENDING` listing can be rejected. A repeated or invalid transition returns HTTP 409. A rejected listing is not returned by the public listing endpoint. A structured rejection-reason field is not currently supported.

## 10. Surprise Agent

### `POST /api/surprise` — Create a surprise request

Requires customer authentication. Current request fields include `recipientName`, `recipientPhone`, optional `message` and optional `productId`. The backend associates the request with the authenticated customer; do not supply a trusted `userId` from the client. New requests start in `PENDING` status.

Treat recipient names, phone numbers and messages as private personal information.

### `GET /api/surprise` — List the authenticated customer's requests

Requires customer authentication. The backend identifies the customer from the JWT. Do not pass a different customer's `userId` in a query string.

### `GET /api/surprise/admin` — Admin surprise queue

Requires ADMIN authentication. Supports a `status` filter, for example `GET /api/surprise/admin?status=PENDING`.

### `PATCH /api/surprise/admin/:id/status` — Update request status (ADMIN)

Requires ADMIN authentication. Supported workflow:

- `PENDING` → `PROCESSING` or `REJECTED`
- `PROCESSING` → `COMPLETED` or `REJECTED`

Invalid state transitions are rejected. Send the new status in the JSON body using the `status` field.

## 11. Consent

### `GET /api/consent` — Get the authenticated customer's consent settings

Requires customer authentication. Returns consent records belonging to the signed-in user only.

### `PUT /api/consent/:dataType` — Grant or revoke a data-sharing consent

Requires customer authentication. The `dataType` is part of the URL (for example, `PROFILE_DATA`). The request includes a boolean `isConsent` value:

```json
{
  "isConsent": true
}
```

Use `false` to revoke consent. The backend records grant/revocation timestamps (`grantedAt` and `revokedAt`) and scopes the record to the authenticated customer. Do not allow the frontend to submit another user's ID.

## 12. Rewards

### `GET /api/rewards/me` — Get the authenticated customer's rewards

Requires customer authentication. Returns the customer's total points and reward ledger entries. The customer identity is taken from the JWT.

### `POST /api/rewards/game/play` — Play the daily reward game

Requires customer authentication. The server chooses the outcome; clients
cannot submit a win. Each customer can play once per UTC day. A win awards 25
points; a loss is recorded with 0 points. Repeated plays return HTTP 409.

### `POST /api/rewards/admin/award` — Award points (ADMIN)

Requires ADMIN authentication. The award includes the target `userId`, positive `points`, an `action` and a unique `reference`. Example structure:

```json
{
  "userId": "customer-user-id",
  "points": 100,
  "action": "PURCHASE_REWARD",
  "reference": "ORDER-REFERENCE-123"
}
```

The reference is required. The database enforces uniqueness for the `(userId, action, reference)` combination, preventing duplicate awards for the same event, including concurrent duplicate requests. A duplicate returns HTTP 409. Only administrators can award points.

## 13. Admin and access-control summary

| Endpoint | Access |
|---|---|
| `GET /health` | Public |
| `GET /api/products`, `GET /api/products/:id` | Public |
| `/api/cart` routes | Guest session ID; no account required |
| `POST /api/orders` | Guest checkout allowed; COD only |
| `GET /api/orders/:id` | Authenticated owner only |
| `/api/auth/register`, `/api/auth/login` | Public, rate-limited |
| `GET /api/inventory/events` | ADMIN |
| `/api/orders/admin...` | ADMIN |
| `/api/resale/admin...` | ADMIN |
| `/api/surprise/admin...` | ADMIN |
| `GET /api/rewards/me` | Authenticated customer |
| `POST /api/rewards/admin/award` | ADMIN |
| `/api/consent...` | Authenticated customer, own records only |
| `GET /api/reviews/:productId` | Public |
| `POST /api/reviews` | Authenticated customer |
| `POST /api/resale` | Authenticated customer |
| `GET /api/resale` | Public, approved listings only |
| `/api/surprise` customer routes | Authenticated customer, own records only |

## 14. Route summary by team

| Method | Endpoint | Purpose | Primary owner |
|---|---|---|---|
| `GET` | `/health` | Backend health | M1 |
| `POST` | `/api/auth/register` | Customer registration | M1 |
| `POST` | `/api/auth/login` | Customer/admin login | M1 |
| `GET` / `PATCH` | `/api/auth/me` | Read/update own profile | M1 / M2 |
| `GET` | `/api/products` | Product list/search/filters | M1; M3 extends search |
| `GET` | `/api/products/:id` | Product details and recent reviews | M1 / M2 |
| `POST` | `/api/cart` | Add quantity to cart | M1 / M2 |
| `GET` | `/api/cart/:sessionId` | Read cart | M1 / M2 |
| `PATCH` | `/api/cart/:sessionId/items/:productId` | Set cart quantity | M1 / M2 |
| `DELETE` | `/api/cart/:sessionId/items/:productId` | Remove cart item | M1 / M2 |
| `POST` | `/api/orders` | COD checkout | M1 / M2 |
| `GET` | `/api/orders/:id` | Read own order | M1 / M2 |
| `GET` / `PATCH` | `/api/orders/admin...` | Admin order management | M1 |
| `GET` | `/api/inventory/events` | Admin inventory event feed | M1 / M3 |
| `GET` / `POST` | `/api/reviews...` | Product reviews | M4 |
| `GET` / `POST` | `/api/resale...` | Resale listings | M4 |
| `PATCH` | `/api/resale/:id/purchase` | Place resale COD order | M4 |
| `GET` / `PATCH` | `/api/resale/admin...` | Admin resale moderation | M1 / M4 |
| `GET` / `POST` | `/api/surprise...` | Customer surprise requests | M4 |
| `GET` / `PATCH` | `/api/surprise/admin...` | Admin surprise queue | M1 / M4 |
| `GET` / `PUT` | `/api/consent...` | Customer consent controls | M1 / M4 |
| `GET` | `/api/rewards/me` | Customer reward balance/history | M4 |
| `POST` | `/api/rewards/game/play` | Daily reward game | M4 |
| `POST` | `/api/rewards/admin/award` | Admin reward award | M1 / M4 |

## 15. Team integration guide

- **Member 1 — Technical lead/backend:** owns database schema, migrations, API contracts, authentication/authorization, transactions, deployment configuration and final integration.
- **Member 2 — Frontend:** consumes product, cart and COD checkout routes. Persist a stable guest `sessionId` for the shopping session. Do not calculate authoritative prices or order totals in the browser.
- **Member 3 — Search/wholesale/live inventory:** extends product search and wholesale experience. Existing search is substring-based, not typo tolerant. Inventory events are admin-only; expose a safe customer-facing inventory view separately if required.
- **Member 4 — Circular shopping/engagement/QA:** consumes reviews, resale, surprise, consent and reward routes. Customer endpoints must use the signed-in identity, and admin moderation/award endpoints must remain restricted to ADMIN.

## 16. Local development

Backend:

```powershell
cd E:\VELOCE\veloce-store\backend
npm run dev
```

Frontend (when running): `http://localhost:5173`  
Backend: `http://localhost:3000`

Suggested Vite public API base variable: `VITE_API_BASE_URL=http://localhost:3000`. Never put database credentials, JWT signing secrets or private API keys in a `VITE_*` variable.

## 17. Current limitations and integration checklist

1. Fuzzy/typo-tolerant search is not implemented/verified (`keybord` returned no results); Member 3 owns that extension.
2. COD is the only supported checkout method. Payment gateway integration is intentionally out of scope for this MVP.
3. Guest order lookup after checkout is not implemented. Use the immediate checkout response for the confirmation screen.
4. Review verified-purchase logic currently accepts `CONFIRMED` orders; consider whether production policy should require `DELIVERED`.
5. Test the rate limiter's 429 behavior and use a shared store such as Redis before running multiple production instances.
6. Monetary fields in the Prisma schema currently use `Float`; assess Prisma `Decimal` and a tested migration before production financial use.
7. Continue monitoring Prisma connection-pool usage and transaction reliability. Do not increase pool limits without diagnosing connection usage.
8. Aiven connection settings used an IP during troubleshooting. Restore hostname-based TLS identity verification with the Aiven CA before production; `sslmode=require` over a raw IP should not be treated as hostname verification.
9. Kafka and OpenSearch are target architecture components, not confirmed integrated by these API tests. Do not claim them as working until the team verifies the integration.
10. Run tests for all customer and admin flows after each member's branch is merged. Verify that an ordinary customer token receives HTTP 403 from every ADMIN endpoint.
11. Never commit `.env`, database credentials, JWT secrets, private keys, or local certificates. Keep `.env.example` limited to placeholder values.
12. Do not run a seed or setup script that deletes existing records unless its behavior has been reviewed and the database is backed up.

---

**Document maintenance:** This contract reflects the currently reported Member 1 implementation as of 18 November 2026. Before changing an endpoint, notify the consuming member and update this file in the same pull request. If the implementation differs from an example here, the code and a verified API response take precedence; update the contract rather than relying on guessed fields.
