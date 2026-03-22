# How Each Graded Requirement Is Implemented

> This document maps every graded item from the rubric to the exact files that implement it, with concise explanations suitable for a professor walk-through.

---

## MP1 — Product/Service CRUD + Photo Upload/Camera (20 pts)

### What was required
Full CRUD (Create, Read, Update, Delete) for products/services. Users must be able to upload a photo or use the device camera.

### How it was integrated

**Backend**
- **Model**: `backend/models/Product.js` — Mongoose schema with `name`, `price`, `category`, `image` (Cloudinary `url` + `public_id`), `images[]` array, `stock`, `isActive` (soft delete).
- **Admin CRUD controller**: `backend/controllers/adminProductController.js` — Handles create, update, delete. Uses **Multer** to receive multipart image uploads and streams them to **Cloudinary**. The upload middleware lives in `backend/middleware/uploadProductImage.js`.
- **Public read controller**: `backend/controllers/productController.js` — `listProducts()` (paginated, filterable) and `getProduct()` for the storefront.
- **Routes**: `backend/routes/adminProductRoutes.js` (admin-protected) and `backend/routes/productRoutes.js` (public).

**Frontend**
- **Admin screen**: `frontend/screens/admin/ProductCrudScreen.js` — A full form for creating/editing products. Has two image source buttons:
  - 📷 **Camera** → calls `ImagePicker.launchCameraAsync()` from `expo-image-picker`
  - 🖼️ **Gallery** → calls `ImagePicker.launchImageLibraryAsync()` with multi-select (up to 5 images)
- Image previews appear in the form and can be individually removed before saving.

### ELI5
> Think of it like an admin panel for a Shopee-style store. The admin fills out a form (name, price, category), takes a photo or picks one from their phone gallery, and hits "Create." The image goes to Cloudinary (cloud storage), the product data goes to MongoDB. They can edit or delete products any time.

---

## MP2 — User Functions (15 pts base / 20 pts with social login)

### What was required
- User login/registration, update user profile, upload or take a photo (15 pts).
- Google/Facebook login (20 pts).

### How it was integrated

**Backend**
- **Model**: `backend/models/User.js` — Stores `firebaseUid`, `email`, `displayName`, `photoURL`, `photoPublicId`, `role` (0 = user, 1 = admin), `pushTokens[]`.
- **Auth controller**: `backend/controllers/authController.js` — `createSession()` receives a Firebase-verified user, creates/updates the MongoDB user via `userSync.js`, issues an **app-level JWT**, and saves the device push token.
- **Auth middleware**: `backend/middleware/requireFirebaseAuth.js` — Verifies the Firebase ID token on every protected request.
- **Profile controller**: `backend/controllers/userController.js` — Profile fetch/update. Avatar upload uses `backend/middleware/uploadAvatarImage.js` (Multer → Cloudinary).

**Frontend**
- **Login screen**: `frontend/screens/user/Login.js` — Email/password login via `signInWithEmailAndPassword` (Firebase Auth). **Google sign-in** uses `@react-native-google-signin/google-signin`, gets an ID token, then calls `signInWithCredential` with a `GoogleAuthProvider.credential`.
- **Register screen**: `frontend/screens/user/Register.js` — Email/password registration via Firebase `createUserWithEmailAndPassword`.
- **Profile screen**: `frontend/screens/user/ProfileScreen.js` — Edit display name, upload/change avatar via camera or gallery.
- **Auth context**: `frontend/context/store/auth.js` — Wraps Firebase `onAuthStateChanged`, manages `currentUser`, `accountProfile`, session syncing.
- **Firebase client**: `frontend/modules/firebase/client.js` — Initializes the Firebase app with project config.

### ELI5
> When you tap "Sign in," the app talks to Firebase (Google's auth service). Firebase checks your email/password or Google account and gives back a token. The app sends that token to our backend, which either creates a new user in MongoDB or finds the existing one, then gives back a JWT. For Google login specifically: the phone opens a Google sign-in popup → gets an ID token → Firebase verifies it → same flow as above.

---

## MP3 — Review Ratings (20 pts)

### What was required
Users can leave a review/rating only on **verified purchased** products. Users can update their own reviews.

### How it was integrated

**Backend**
- **Model**: `backend/models/Review.js` — Links to `User`, `Product`, and `Order`. Has a **unique compound index** on `(user, product)` so one review per user per product. Fields: `rating` (1–5), `comment`, `isActive` (soft delete).
- **Purchase verification**: `backend/services/reviewEligibilityService.js` — `findEligibleCompletedOrderId()` queries for an order where `user = userId`, `status = "completed"`, and `items.product = productId`. If no such order exists, the review is **blocked with a 403 error**.
- **Controller**: `backend/controllers/reviewController.js` — `createReview()` calls the eligibility check before allowing a review. `updateReview()` verifies ownership (`review.user === currentUser`). Also includes profanity filtering. After create/update/delete, `recalculateProductRatings()` aggregates the new average.
- **Routes**: `backend/routes/reviewRoutes.js` — CRUD endpoints, all Firebase-auth protected.

**Frontend**
- **Review editor**: `frontend/screens/user/ReviewEditorScreen.js` — Star rating picker + comment text area. Dispatches `createReview` or `updateReview` thunks.
- **Product reviews list**: `frontend/screens/shop/ProductReviewsScreen.js` — Shows all reviews for a product with sort/filter options.
- **Redux slice**: `frontend/redux/slices/reviewSlice.js` — Manages `productReviews`, `myReviews`, `myReviewByProductId`. Thunks: `fetchProductReviews`, `fetchMyReviews`, `createReview`, `updateReview`, `deleteReview`.

### ELI5
> Before you can write a review, the backend checks: "Has this user actually bought this product AND has the order been marked as completed?" If not, the server says "No, you can't review this." If yes, you rate 1–5 stars, write a comment, and submit. You can only edit your own reviews. The product's average rating updates automatically.

---

## MP4 — SQLite Cart (20 pts)

### What was required
Save cart contents in **SQLite** before checkout. Restore items when the app is opened. Delete contents after checkout.

### How it was integrated

**Frontend**
- **SQLite cart actions**: `frontend/redux/actions/cartActions.native.js` — This is the **native-only** implementation (React Native uses `.native.js` file resolution). It uses `expo-sqlite` to:
  - **Create table**: `cart_items` with columns `product_id`, `name`, `price`, `quantity`, etc.
  - **`initializeCart()`**: Called on app launch (in `MainNavigator.js` line 663). Reads all rows from SQLite → dispatches to Redux.
  - **`addToCart()`**: Uses `INSERT ... ON CONFLICT DO UPDATE` (upsert) so adding the same product increments quantity.
  - **`updateCartItemQuantity()`**: Updates the SQLite row. If quantity ≤ 0, deletes the row.
  - **`clearCartAfterCheckout()`**: Runs `DELETE FROM cart_items` to wipe the table after a successful order.
- **Web fallback**: `frontend/redux/actions/cartActions.js` — In-memory cart for web/Expo Go (no SQLite).
- **Reducer**: `frontend/redux/reducers/cartItems.js` — Old-school Redux reducer with `CART_SET_ITEMS`, `CART_SET_LOADING`, etc.
- **Constants**: `frontend/redux/constant.js` — Action type strings.
- **Cart screen**: `frontend/screens/cart/CartScreen.js` — Displays items from Redux store, quantity +/- buttons, remove button.
- **Checkout screen**: `frontend/screens/checkout/CheckoutScreen.js` — After successful order creation, dispatches `clearCartAfterCheckout()`.

### ELI5
> When you add something to your cart, it gets saved to a tiny database file (SQLite) on your phone. If you force-close the app and reopen it, the cart is still there because it reads from that database on startup. After you check out and the order is created, the database table is wiped clean.

---

## Term Test — Transactions + Status + Push Notifications + Deep Link (35 pts)

### What was required
- Completed transaction (10 pts)
- Update status of transaction (5 pts)
- Send a push notification after the status update (10 pts)
- Click on the notification to view the order details (10 pts)

### How it was integrated

**Backend**
- **Order model**: `backend/models/Order.js` — Status lifecycle: `pending → paid → shipped → completed`.
- **Create order**: `backend/controllers/orderController.js` — `createOrder()` runs inside a **MongoDB transaction** (session). Validates stock, decrements it atomically, calculates totals, creates the order.
- **Admin update status**: `backend/controllers/adminOrderController.js` — `updateOrderStatus()` enforces forward-only transitions via `canMoveToStatus()`. After saving the new status, it calls `sendOrderStatusPush()`.
- **Push notification service**: `backend/services/pushNotificationService.js` — `sendOrderStatusPush()` constructs the Expo push payload with `data: { type: "order-status", orderId, status }` and sends it via `expo-server-sdk`. It also **removes stale/invalid tokens** from the user's `pushTokens[]` array.
- **Admin routes**: `backend/routes/orderRoutes.js` — `PUT /orders/:id/status` protected by `requireAdmin` middleware.

**Frontend**
- **Push token registration**: `frontend/shared/utils/notifications.js` — `registerForPushNotificationsAsync()` gets the Expo push token. The token is sent to the backend during `createSession()`.
- **Notification tap handler**: `frontend/shared/utils/notifications.js` — `subscribeToOrderNotificationPress()` listens for notification taps, reads `data.orderId`, and calls a callback.
- **Deep link wiring**: `frontend/shared/navigation/MainNavigator.js`:
  - Line 672–682: Configures notification behavior and subscribes to notification taps.
  - Line 654–657: `openOrderDetailsFromNotification()` navigates to the `OrderDetails` stack screen with the order ID.
  - Line 75–91: Deep link config maps `orders/:id` to the `OrderDetails` screen.
- **Order details screen**: `frontend/screens/user/OrderDetailsScreen.js` — Displays full order info (items, status, contact, total).
- **Admin order management**: `frontend/screens/admin/OrderManagementScreen.js` — Admin can change order status via dropdown.

### ELI5
> When a customer checks out, an order is created with status "pending." The admin can then update it to "paid," "shipped," or "completed." Each time the status changes, the server sends a push notification to the customer's phone saying "Your order is now shipped." When the customer taps that notification, the app opens directly to that order's detail page — that's the deep link.

---

## Quiz 1 — Search/Filters (15 pts)

### What was required
Search function. Filter products by **category and price range**.

### How it was integrated

**Backend**
- **Product controller**: `backend/controllers/productController.js` — `listProducts()` accepts query params:
  - `q` → MongoDB `$text` search on `name` and `description` (text indexes defined in the Product schema)
  - `category` → `$in` filter, supports multiple categories
  - `minPrice` / `maxPrice` → `$gte` / `$lte` on `price`
  - `sort` → `price_asc`, `price_desc`, `newest`, `rating`
- **Compound index**: `backend/models/Product.js` line 89 — `{ category: 1, price: 1 }` for efficient filtered queries.

**Frontend**
- **Search screen**: `frontend/screens/shop/SearchScreen.js` — Text search bar. Dispatches `fetchProductsSearch` thunk with query and filter params.
- **Filter screen**: `frontend/screens/shop/FilterScreen.js` — Category checkboxes + min/max price inputs. Passes filters back to the search screen.
- **Search results**: `frontend/screens/shop/SearchResultsScreen.js` — Displays filtered results with infinite scroll pagination.
- **Redux thunk**: `frontend/redux/slices/productSlice.js` — `fetchProductsSearch` async thunk calls the backend search endpoint.
- **Search navigator**: `frontend/shared/navigation/SearchNavigator.js` — Stack navigator for Search → Filter → Results flow.

### ELI5
> There's a search bar where you type keywords like "bag." Behind the scenes, the backend uses MongoDB text search. You can also open a filter panel to pick categories (e.g., "Electronics") and set a price range (e.g., $10–$50). The backend combines all these filters into one database query and returns matching products.

---

## Quiz 2 — Notifications (15 pts)

### What was required
Send push notifications about product promotions/discounts (10 pts). View the details of the notification (5 pts).

### How it was integrated

**Backend**
- **Wishlist discount notifications**: `backend/services/wishlistNotificationService.js` — When products on a user's wishlist go on sale, it sends a push notification.
- **Push service**: `backend/services/pushNotificationService.js` — `sendWishlistDiscountPush()` constructs a payload like `"Bag, Shoes +2 more are now on sale 🎉"` with `data: { type: "wishlist-discount" }`.

**Frontend**
- **Notification handler**: `frontend/shared/utils/notifications.js` — `subscribeToWishlistNotificationPress()` listens for taps on wishlist-type notifications and navigates to the wishlist screen.
- **Deep link**: `frontend/shared/navigation/MainNavigator.js` line 659–661 and 676–677 — Wires up the wishlist notification press handler to navigate to the wishlist screen where users can view the discounted items.
- **Wishlist screen**: `frontend/screens/user/WishlistScreen.js` — Displays wishlisted products with current prices/discounts visible.

### ELI5
> If a product you wishlisted goes on sale, you get a push notification saying "Your wishlisted item is now on sale 🎉." Tapping it opens the app to your wishlist where you can see the discount and add it to cart.

---

## Quiz 3 — Redux on Order, Product, and Review (15 pts)

### What was required
Apply Redux on order, product, and review functions.

### How it was integrated

**Redux Store**: `frontend/redux/store.js` — Configures the store with all slice reducers:
```js
reducer: {
  cart: cartItems,      // legacy reducer
  products,             // productSlice
  orders,               // orderSlice
  reviews,              // reviewSlice
  adminReviews,         // adminReviewSlice
  wishlist,             // wishlistSlice
}
```

### Product Redux — `frontend/redux/slices/productSlice.js`
- **State**: `search` (items, loading, pagination, lastQuery, lastFilters) + `detailsById` (cached product details).
- **Async thunks**: `fetchProductsSearch`, `fetchProductDetail` — Call API utilities then Redux handles `pending/fulfilled/rejected` automatically.
- **Sync reducers**: `resetProductSearch`, `primeProductDetail`.
- **Used by**: `SearchScreen.js`, `SingleProductScreen.js` — Components call `dispatch(fetchProductsSearch(...))` and read from `useSelector(state => state.products.search)`.

### Order Redux — `frontend/redux/slices/orderSlice.js`
- **State**: `myOrders[]`, `adminOrders[]`, `selectedOrder`, loading/error flags per operation.
- **Async thunks**: `fetchMyOrders`, `fetchOrderDetails`, `createOrder`, `fetchAdminOrders`, `updateAdminOrderStatus`.
- **Sync reducers**: `clearOrderError`, `clearCreateSuccessOrder`, `setSelectedOrderFromNotification`.
- **Used by**: `OrdersScreen.js`, `OrderDetailsScreen.js`, `CheckoutScreen.js`, `OrderManagementScreen.js`.

### Review Redux — `frontend/redux/slices/reviewSlice.js`
- **State**: `productReviews` (keyed by product ID), `myReviews[]`, `myReviewByProductId`, loading/submitting/deleting flags.
- **Async thunks**: `fetchProductReviews`, `fetchMyReviews`, `fetchMyReviewForProduct`, `createReview`, `updateReview`, `deleteReview`.
- **Sync reducers**: `clearReviewError`, `resetReviewsState`.
- **Used by**: `ProductReviewsScreen.js`, `ReviewEditorScreen.js`, `SingleProductScreen.js`.

### Why slices instead of separate action/reducer files?
Redux Toolkit's `createSlice` is the **official recommended pattern**. It auto-generates action creators and action types from the `reducers` object. Splitting them into separate files would be reverting to the old boilerplate pattern. The cart is the only feature using the legacy pattern (separate `actions/`, `reducers/`, `constant.js`) because it has special SQLite integration needs.

### ELI5
> Redux is like a central whiteboard for the whole app. Instead of each screen fetching its own data and keeping it privately, everything goes through the Redux store. When you load products, the data lands in `state.products`. When you place an order, it updates `state.orders`. When you write a review, it updates `state.reviews`. Any screen that needs this data just reads from the whiteboard — no duplicate fetching, no out-of-sync screens.

---

## Unit 1 — User Interface with Drawer (20 pts)

### What was required
Drawer-based navigation UI design.

### How it was integrated

**Frontend**
- **Navigation setup**: `frontend/shared/navigation/MainNavigator.js` — Uses `@react-navigation/drawer` to create **two separate drawers**:
  - **Shop drawer** (`ShopDrawer.Navigator`, line 611) — Routes: Home, Search, Cart, Wishlist, Profile, My Orders, Login, Register. Custom drawer content with user avatar, role label, and cart badge.
  - **Admin drawer** (`AdminDrawer.Navigator`, line 555) — Routes: Dashboard, Users, Products, Discounts, Categories, Reviews, Orders. Has a "Back to Shop" footer link.
- **Custom drawer content**: `ShopDrawerContent` (line 247) and `AdminDrawerContent` (line 356) — Fully custom UI with avatar header, nav items with icons and badges, footer with sign-out.
- **Custom header bar**: `DrawerHeader_Bar` (line 443) — Replaces the default header with a hamburger menu button + cart icon with badge.
- **Root navigator**: Stack navigator wraps Auth, Root (shop drawer), AdminDashboard (admin drawer), and modal screens (Product, Checkout, OrderDetails, ReviewEditor).

### ELI5
> Instead of a tab bar at the bottom, the app uses a slide-out menu (drawer) from the left side. You tap the hamburger icon (☰) or swipe from the left edge. The drawer shows your avatar, name, and links to Home, Search, Cart, Orders, etc. Admins get a separate drawer with management pages. Both drawers are fully custom-styled, not the default gray React Navigation drawer.

---

## Unit 2 — Backend: JWT + Push Token Management (20 pts)

### What was required
Node backend functions. JWT tokens stored using Expo SecureStore. Push notification tokens saved on user model. Update/remove stale tokens.

### How it was integrated

**Backend — JWT**
- **JWT issuance**: `backend/utils/appJwt.js` — `issueAppJwt(user)` signs a JWT with the user's ID and role using `jsonwebtoken`.
- **JWT verification**: `backend/middleware/requireFirebaseAuth.js` — Verifies Firebase ID tokens on incoming requests. The app-level JWT is issued during `createSession()` in `authController.js`.
- **Auth route**: `backend/routes/authRoutes.js` — `POST /v1/auth/session` receives the Firebase token + push token, returns a session JWT.

**Frontend — SecureStore**
- **Auth context**: `frontend/context/store/auth.js` — After successful Firebase sign-in, the session JWT is stored using `expo-secure-store` for persistence across app restarts.

**Backend — Push Token Management**
- **User model**: `backend/models/User.js` — `pushTokens: { type: [String], default: [] }` stores an array of Expo push tokens.
- **Token saving**: `backend/controllers/authController.js` line 44–48 — On each login/session creation, the push token is added to `pushTokens[]` if not already present. Capped at 10 tokens max (`.slice(-10)`).
- **Stale token removal**: `backend/services/pushNotificationService.js` line 135–148 — After sending push notifications, the service checks Expo's receipt responses. If a `DeviceNotRegistered` error is returned, that token is removed from the user's `pushTokens[]` array and the user document is saved. Invalid token formats are also cleaned up (line 63–66).

### ELI5
> When you log in, the app gets a "pass" (JWT) from the server and locks it in a secure vault on your phone (SecureStore). Every time the app talks to the server, it shows this pass. For push notifications: the app generates a unique push address (token) and sends it to the server during login. The server saves it. When sending a notification, if a token is expired or the user uninstalled the app, the server detects the failure and deletes that stale token so it doesn't keep trying.
