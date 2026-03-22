#Changes

3/16 - 8:00 PM
- Google auth (still not working, auth unauthorized)
- firebase auth (normal sign in method)

3/16 - 11:50 pm
- reimplement dev previews for components
- simplified some imports for App.js, AuthScreen.js, and ShopScreen
- replace deprecated SafeAreaView with react-native-safe-area-context
- add indexes to the rest of the component types for simpler imports
- fix style utils to fix text color issues for the banner eybrow and subtitle text
- set onboarding screen as default

3/17 - 8:50 am
- add tabnav component
- redesign authpage
- added screen component for safe area on all screens
- ShopScreen layout and design (static)
- added ProductCard component
- add tabbar to most screens for navigation (only home tab has routing)
- adjusted some components

3/17 - 11:00 pm
- added main navigation for proper react-navigation
- fixed safe area causing screen content jittering
- ScrollList adjustments
- change color tokens of some components
- add filled icon versions for the rest of the bottom tab bar when active
- reorganize auth and shop related files in frontend
- remove some gitkeep files
- add product model


3/18 - 7:20 am
- admin user management added
- admin product CRUD
- admin category CRUD
- admin user management
- auth check redirect to specificed role screen
- admin uses react-drawer
- admin product CRUD search filter
- placeholder for dashboard, reviews, and order
- regex form validation for both product and category CRUD
- Existing bugs:
- whitespace above the user management, and dashboard screen (check Product CRUD for proper implementation)

3/18 - 5:05 pm
refactor(api): versioning, rate limiting, pagination, new endpoints
- add /v1/ prefix to all route files
- add rate limiting in server.js (global + auth-specific)
- standardize error response structure across all controllers
- add pagination and filtering to adminProductController.js and adminUserController.js
- fix 401/403 split across requireFirebaseAuth.js and requireAdmin.js
- add public routes: products, orders, reviews, push (new route + controller + model files)
- register new routes in server.js

3/18 - 9:00 pm
- Added SearchScreen, SearchResultsScreen, and FilterScreen
- search flow with query submission, autocomplete, and recent searches
- search by keyword and filter by category
- backend search with query params (q, category, minPrice, maxPrice, sort)
- filter using with draft state, apply/reset behavior (full-screen filter UI)
- navigation flow between search, results, and filter screens
- empty/no-results state when no items are returned is not found

missing:
- trending tags still use placeholder/static products (no logic for it yet)
- no pagination/infinite scroll


3/19 - 1:17 pm
- shop page made dynamic
- removed bottom tab bar in shop page
- react-drawer is now being utilized in shop page
- temporarily removed trending in search (no computation logic as for what is defined as "Trending")
- currency changed from JPY to PHP
- SQLite cart functionality
- SQLite cart uses redux
- auth check is refactord to /context
- UI fixes
- SingleProduct Screen
- Orders management (Haven't tested notification)
- My_Orders screen
- Order details screen
- Transaction could be done however push notif isn't tested yet
- Infinite scroll 12 per batch both home page and search page
- new dependencies (do npm install on both directories)

3/19 - 7:50 pm
- UI adjustments

3/20 - 2:30 am
- add image carousel in shop screen
- reorder elements in shop screen
- add user route
- add uploadAvatar middleware
- add user controller
- Profile screen with avatar, display name, and order count
- Avatar upload
- change name

use existing logic/code
- Order count fetch from backend via getMyOrdersCount
- Toast notifications for success/error states
- Form validation and busy states


3/20 - 3:27 PM
- Push notification in order transaction
- Must be in npx expo run:android
- use two devices(one physical connected through adb using wired connection) and one emulator
- commands to run:
- npx expo prebuild --clean
- npx expo run:android --device (select your android phone)
- open another terminal
- npx expo run:android --device (select your android studio)
- one must be a user, one must be an admin
- google service.json in root folder
- ameame-shop-...json in root folde
- transaction ACID fix

3/20 - 8:35 pm
- user reviews (rating and comment) on products (complete transaction)
- kebab button. edit/delete (soft delete) review on order details or product detail screen
- resetReviewsState action in review slice to clear “You reviewed this item” tag on logout
- admin review moderation (soft delete and permanent)
- sort and filter reviews for moderation
- set discount and batch set discount for product
- push notif on discount if in user wishlist
set in backend env
WISHLIST_NOTIFY_BATCH_MINUTES=5
WISHLIST_NOTIFY_COOLDOWN_HOURS=1
# show up to n items in notif then "+n more" at the end if it exceeds
WISHLIST_NOTIFY_MAX_ITEMS=3
WISHLIST_NOTIFY_DEDUP_HOURS=24
# determines if the discount is significant enough to notify user
WISHLIST_DISCOUNT_SIGNIFICANT_PERCENT=10

issues:
cart and checkout does not calculate discount


# 3/21 - 10:00 AM
- Reviews form validation with bad-words filter package
- Profile screen form validation
- Profile screen slight UI fix
- Multiple product image upload
- Proudct Details reflect multiple product images
- Removed deprecated folders /development, /shared/development, /context
# Haven't fixed
- cart and checkout does not calculate discount
- /Admin/ReviewsManagement - Product categories shows ?1, ?2, (Does not properly fetch)
# If possbile do the following
- Seperate screen for discount feature
# Still missing in the project
- Google Login
# PLEASE DO QA

3/21 5:55 pm
- separate screen for applying discounts in batch
- discount price/amount recalculation in cart and checkout
- fix ? in reviews management by replacing all unicode stars with phosphor icons (categories are in chips via the accordion dropdown)

3/21 - 6 PM
- added google sigin

3/22 - 8 AM
- Slight UI changes
- Please do QA

3/22 12:55 pm
- improve admin ui
- some changes to user ui
- add revenue graph to admin dashboard
- change stars to yellow in product details and review
- dynamic banner on shop screen. show highest discount on category and applies filters to results after pressing shop button
- change lightning icon to shopping bag icon
- higher prio for out of stock tag against discount tag
- add rating to product card