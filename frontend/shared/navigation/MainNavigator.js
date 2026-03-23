import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeftIcon,
  HeartIcon,
  HouseIcon,
  ListIcon,
  MagnifyingGlassIcon,
  SealPercentIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SignInIcon,
  SparkleIcon,
  UserIcon,
  UserPlusIcon,
} from 'phosphor-react-native';

import ShopScreen                  from '../../screens/shop/ShopScreen';
import CartScreen                  from '../../screens/cart/CartScreen';
import CheckoutScreen              from '../../screens/checkout/CheckoutScreen';
import AuthScreen                  from '../../screens/auth/AuthScreen';
import OrdersScreen                from '../../screens/user/OrdersScreen';
import OrderDetailsScreen          from '../../screens/user/OrderDetailsScreen';
import ProfileScreen               from '../../screens/user/ProfileScreen';
import WishlistScreen              from '../../screens/user/WishlistScreen';
import AdminUserManagementScreen   from '../../screens/admin/AdminUserManagementScreen';
import AdminDashboardHomeScreen    from '../../screens/admin/AdminDashboardHomeScreen';
import ProductCrudScreen           from '../../screens/admin/ProductCrudScreen';
import ProductDiscountBatchScreen  from '../../screens/admin/ProductDiscountBatchScreen';
import CategoryCrudScreen          from '../../screens/admin/CategoryCrudScreen';
import ReviewsManagementScreen     from '../../screens/admin/ReviewsManagementScreen';
import ReviewDetailScreen          from '../../screens/admin/ReviewDetailScreen';
import OrderManagementScreen       from '../../screens/admin/OrderManagementScreen';
import SearchNavigator             from './SearchNavigator';
import SingleProductScreen         from '../../screens/shop/SingleProductScreen';
import ProductReviewsScreen       from '../../screens/shop/ProductReviewsScreen';
import ReviewEditorScreen          from '../../screens/user/ReviewEditorScreen';
import { useAuth }                 from '../../context/store/auth';
import { initializeCart }          from '../../redux/actions/cartActions';
import { resetReviewsState }       from '../../redux/slices/reviewSlice';
import { resetWishlistState }      from '../../redux/slices/wishlistSlice';
import Toast                       from '../components/statusFeedback/Toast';
import { showToast, subscribeToast } from '../utils/toastBus';
import Avatar                      from '@components/display/Avatar';
import {
  configureNotificationBehavior,
  handleInitialOrderNotification,
  subscribeToOrderNotificationPress,
  handleInitialWishlistNotification,
  subscribeToWishlistNotificationPress,
} from '../utils/notifications';

import { useColors } from '@colors/colorContext';
import { rgb }       from '@styles/styleUtils';
import { makeTypeStyles } from '@typography/scale';
import { fonts }     from '@typography/fonts';

// ─── Deep-link config (unchanged) ────────────────────────────────────────────

export const linking = {
  prefixes: ['ameame://', 'https://ameame.com'],
  config: {
    screens: {
      Root: {
        screens: {
          home:   'shop',
          orders: 'orders',
          Auth:   'auth',
        },
      },
      Product:      'product/:id',
      OrderDetails: 'orders/:id',
      Auth:         'auth',
    },
  },
};

const Stack      = createNativeStackNavigator();
const AdminDrawer = createDrawerNavigator();
const ShopDrawer  = createDrawerNavigator();

// ─── Avatar initials helper ───────────────────────────────────────────────────

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '??';
}

function selectCartQuantity(state) {
  return (state.cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

// ─── Custom drawer header (avatar + name + role) ──────────────────────────────

const DrawerHeader = React.memo(function DrawerHeader({ displayName, roleLabel, isAdmin, photoURL }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  const initials = getInitials(displayName);

  return (
    <View
      style={[
        s.drawerHeader,
        { borderBottomColor: rgb(tokens['--border-neutral-weak']) },
      ]}
    >
      {/* Avatar tile */}
      <View style={s.avatarWrap}>
        <Avatar
          size="md"
          image={photoURL || undefined}
          initials={initials}
          colorScheme={isAdmin ? 'dark' : 'neutral'}
        />
      </View>

      <Text style={[type.label, s.drawerName]} numberOfLines={1}>
        {displayName}
      </Text>
      <Text
        style={[
          type.caption,
          {
            color: isAdmin
              ? rgb(tokens['--text-warning-primary'])
              : rgb(tokens['--text-neutral-tertiary']),
            marginTop: 1,
          },
        ]}
      >
        {roleLabel}
      </Text>
    </View>
  );
});

// ─── Drawer nav item ──────────────────────────────────────────────────────────

const DrawerNavItem = React.memo(function DrawerNavItem({ label, icon, focused, badge, onPress }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.navItem,
        focused && { backgroundColor: rgb(tokens['--surface-neutral-primary']) },
        pressed && !focused && { opacity: 0.7 },
      ]}
    >
      <View
        style={[
          s.navIcon,
          { color: focused
              ? rgb(tokens['--icon-neutral-primary'])
              : rgb(tokens['--icon-neutral-secondary']) },
        ]}
      >
        {icon}
      </View>

      <Text
        style={[
          type.bodyBase,
          s.navLabel,
          {
            color: focused
              ? rgb(tokens['--text-neutral-primary'])
              : rgb(tokens['--text-neutral-secondary']),
            fontFamily: focused ? fonts.ui.medium : fonts.ui.regular,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {badge > 0 ? (
        <View
          style={[
            s.navBadge,
            { backgroundColor: rgb(tokens['--surface-error-primary']) },
          ]}
        >
          <Text
            style={[
              s.navBadgeText,
              { color: rgb(tokens['--shared-text-on-filled']) },
            ]}
          >
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

// ─── Drawer footer item ───────────────────────────────────────────────────────

const DrawerFooterItem = React.memo(function DrawerFooterItem({ label, icon, onPress, danger }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.footerItem, pressed && { opacity: 0.7 }]}
    >
      <View style={s.navIcon}>{icon}</View>
      <Text
        style={[
          type.bodySm,
          {
            color: danger
              ? rgb(tokens['--text-error-primary'])
              : rgb(tokens['--text-neutral-secondary']),
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// ─── Shop drawer content ──────────────────────────────────────────────────────

function ShopDrawerContent({ cartQuantity, ...props }) {
  const tokens      = useColors();
  const insets      = useSafeAreaInsets();
  const { currentUser, accountProfile, signOutUser } = useAuth();

  const displayName = accountProfile?.displayName || currentUser?.displayName || currentUser?.email || 'Guest';
  const photoURL = accountProfile?.photoURL || currentUser?.photoURL || '';
  const isAdmin     = accountProfile?.role === 1;
  const roleLabel   = isAdmin ? 'Admin' : currentUser ? 'User' : 'Not signed in';
  const activeRoute = props.state?.routeNames?.[props.state?.index];

  const primaryIconColor = rgb(tokens['--icon-neutral-primary']);
  const secondaryIconColor = rgb(tokens['--icon-neutral-secondary']);

  const navItems = useMemo(
    () => [
      { name: 'home',     label: 'Home',      icon: (f) => <HouseIcon           size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'search',   label: 'Search',    icon: (f) => <MagnifyingGlassIcon size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'cart',     label: 'Cart',      icon: (f) => <ShoppingCartIcon    size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} />, badge: cartQuantity },
      { name: 'wishlist', label: 'Wishlist',  icon: (f) => <HeartIcon           size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'orders',   label: 'My Orders', icon: (f) => <ListIcon            size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'profile',  label: 'Profile',   icon: (f) => <UserIcon            size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
    ],
    [cartQuantity, primaryIconColor, secondaryIconColor]
  );

  const openAuth = useCallback(
    (mode) => {
      props.navigation.getParent()?.navigate('Auth', { screen: 'auth', params: { mode } });
    },
    [props.navigation]
  );

  return (
    <DrawerContentScrollView
      {...props}
      scrollEnabled={false}
      contentContainerStyle={[
        s.drawerContainer,
        { backgroundColor: rgb(tokens['--base-canvas']) },
      ]}
    >
      <DrawerHeader
        displayName={displayName}
        roleLabel={roleLabel}
        isAdmin={isAdmin}
        photoURL={photoURL}
      />

      {/* Nav items */}
      <View style={s.navList}>
        {navItems.map((item) => {
          const focused = activeRoute === item.name;
          return (
            <DrawerNavItem
              key={item.name}
              label={item.label}
              icon={item.icon(focused)}
              focused={focused}
              badge={item.badge}
              onPress={() => props.navigation.navigate(item.name)}
            />
          );
        })}
      </View>

      {/* Footer */}
      <View
        style={[
          s.drawerFooter,
          { 
            borderTopColor: rgb(tokens['--border-neutral-weak']),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {currentUser ? (
          <>
            {isAdmin ? (
              <DrawerFooterItem
                label="Admin Dashboard"
                icon={<SparkleIcon size={18} color={rgb(tokens['--icon-neutral-secondary'])} />}
                onPress={() => props.navigation.getParent()?.navigate('AdminDashboard')}
              />
            ) : null}
            <DrawerFooterItem
              label="Log out"
              danger
              icon={<SignInIcon size={18} color={rgb(tokens['--text-error-primary'])} />}
              onPress={async () => {
                await signOutUser();
                props.navigation.navigate('home');
              }}
            />
          </>
        ) : (
          <>
            <DrawerFooterItem
              label="Sign in"
              icon={<SignInIcon size={18} color={rgb(tokens['--icon-neutral-secondary'])} />}
              onPress={() => openAuth('login')}
            />
            <DrawerFooterItem
              label="Register"
              icon={<UserPlusIcon size={18} color={rgb(tokens['--icon-neutral-secondary'])} />}
              onPress={() => openAuth('register')}
            />
          </>
        )}
      </View>
    </DrawerContentScrollView>
  );
}

// ─── Admin drawer content ─────────────────────────────────────────────────────

function AdminDrawerContent(props) {
  const tokens    = useColors();
  const insets    = useSafeAreaInsets();
  const { currentUser, accountProfile, signOutUser } = useAuth();

  const displayName = accountProfile?.displayName || currentUser?.displayName || currentUser?.email || 'Admin';
  const photoURL = accountProfile?.photoURL || currentUser?.photoURL || '';
  const activeRoute = props.state?.routeNames?.[props.state?.index];

  const primaryIconColor = rgb(tokens['--icon-neutral-primary']);
  const secondaryIconColor = rgb(tokens['--icon-neutral-secondary']);

  const navItems = useMemo(
    () => [
      { name: 'DashboardHome',    label: 'Dashboard',     icon: (f) => <HouseIcon           size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'UserManagement',   label: 'Users',         icon: (f) => <UserIcon            size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'ProductCrud',      label: 'Products',      icon: (f) => <ShoppingBagIcon     size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'ProductDiscounts', label: 'Discounts',     icon: (f) => <SealPercentIcon    size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'CategoryCrud',     label: 'Categories',    icon: (f) => <MagnifyingGlassIcon size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'ReviewsManagement',label: 'Reviews',       icon: (f) => <SparkleIcon         size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'OrderManagement',  label: 'Orders',        icon: (f) => <ListIcon            size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
      { name: 'AdminProfile',     label: 'Profile',       icon: (f) => <UserIcon            size={20} color={f ? primaryIconColor : secondaryIconColor} weight={f ? 'fill' : 'regular'} /> },
    ],
    [primaryIconColor, secondaryIconColor]
  );

  return (
    <DrawerContentScrollView
      {...props}
      scrollEnabled={false}
      contentContainerStyle={[
        s.drawerContainer,
        { backgroundColor: rgb(tokens['--base-canvas']) },
      ]}
    >
      <DrawerHeader
        displayName={displayName}
        roleLabel="Admin"
        isAdmin
        photoURL={photoURL}
      />

      <View style={s.navList}>
        {navItems.map((item) => {
          const focused = activeRoute === item.name;
          return (
            <DrawerNavItem
              key={item.name}
              label={item.label}
              icon={item.icon(focused)}
              focused={focused}
              onPress={() => props.navigation.navigate(item.name)}
            />
          );
        })}
      </View>

      <View
        style={[
          s.drawerFooter,
          { 
            borderTopColor: rgb(tokens['--border-neutral-weak']),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <DrawerFooterItem
          label="Back to Shop"
          icon={<ArrowLeftIcon size={18} color={rgb(tokens['--icon-neutral-secondary'])} />}
          onPress={() => props.navigation.getParent()?.replace('Root')}
        />
        <DrawerFooterItem
          label="Log out"
          danger
          icon={<SignInIcon size={18} color={rgb(tokens['--text-error-primary'])} />}
          onPress={async () => {
            await signOutUser();
            props.navigation.getParent()?.replace('Root');
          }}
        />
      </View>
    </DrawerContentScrollView>
  );
}

// ─── Custom header bar ────────────────────────────────────────────────────────
// Replaces the default React Navigation header with a design-system-styled bar.

const DrawerHeader_Bar = React.memo(function DrawerHeader_Bar({ navigation, cartQuantity, hideCart = false }) {
  const tokens = useColors();
  const insets = useSafeAreaInsets();

  const hamburgerIcon = useMemo(
    () => (
      <View style={s.headerIconBox}>
        <View style={[s.hamburgerLine, { backgroundColor: rgb(tokens['--icon-neutral-primary']) }]} />
        <View style={[s.hamburgerLine, { backgroundColor: rgb(tokens['--icon-neutral-primary']) }, s.hamburgerLineMid]} />
        <View style={[s.hamburgerLine, { backgroundColor: rgb(tokens['--icon-neutral-primary']) }]} />
      </View>
    ),
    [tokens]
  );

  return (
    <View
      style={[
        s.headerBar,
        {
          backgroundColor: rgb(tokens['--base-canvas']),
          borderBottomColor: rgb(tokens['--border-neutral-weak']),
          paddingTop: insets.top + 10, // Safe area + extra padding
        },
      ]}
    >
      {/* Hamburger */}
      <Pressable
        onPress={() => navigation.openDrawer()}
        hitSlop={8}
        style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.6 }]}
        accessibilityLabel="Open menu"
      >
        {hamburgerIcon}
      </Pressable>

      {/* Cart button with badge — hidden on admin screens */}
      {!hideCart && (
        <Pressable
          onPress={() => navigation.navigate('cart')}
          hitSlop={8}
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.6 }]}
          accessibilityLabel={`Cart${cartQuantity > 0 ? `, ${cartQuantity} items` : ''}`}
        >
          <ShoppingCartIcon
            size={22}
            color={rgb(tokens['--icon-neutral-primary'])}
          />
          {cartQuantity > 0 ? (
            <View
              style={[
                s.headerBadge,
                {
                  backgroundColor: rgb(tokens['--surface-error-primary']),
                  borderColor:     rgb(tokens['--base-canvas']),
                },
              ]}
            >
              <Text
                style={[
                  s.headerBadgeText,
                  { color: rgb(tokens['--shared-text-on-filled']) },
                ]}
              >
                {cartQuantity > 99 ? '99+' : cartQuantity}
              </Text>
            </View>
          ) : null}
        </Pressable>
      )}
    </View>
  );
});

// ─── Auth screen wrappers removed (AuthScreen is used in the drawer) ─────────

// ─── Admin drawer navigator ───────────────────────────────────────────────────

function AdminDashboardNavigator({ onBackToShop }) {
  const renderAdminDrawerContent = useCallback((props) => <AdminDrawerContent {...props} />, []);
  const adminScreenOptions = useCallback(
    ({ navigation }) => ({
      headerShown: true,
      drawerType: 'front',
      lazy: true,
      freezeOnBlur: true,
      header: () => <DrawerHeader_Bar navigation={navigation} cartQuantity={0} hideCart />,
    }),
    []
  );

  return (
    <AdminDrawer.Navigator
      initialRouteName="DashboardHome"
      drawerContent={renderAdminDrawerContent}
      screenOptions={adminScreenOptions}
    >
      <AdminDrawer.Screen name="DashboardHome"     options={{ title: 'Dashboard'  }} children={(p) => <AdminDashboardHomeScreen  {...p} onBackToShop={onBackToShop} />} />
      <AdminDrawer.Screen name="UserManagement"    options={{ title: 'Users'      }} children={(p) => <AdminUserManagementScreen {...p} onBackToShop={onBackToShop} />} />
      <AdminDrawer.Screen name="ProductCrud"       options={{ title: 'Products'   }} children={(p) => <ProductCrudScreen         {...p} onBackToShop={onBackToShop} />} />
      <AdminDrawer.Screen name="ProductDiscounts"  options={{ title: 'Batch Discounts' }} children={(p) => <ProductDiscountBatchScreen {...p} onBackToShop={onBackToShop} />} />
      <AdminDrawer.Screen name="CategoryCrud"      options={{ title: 'Categories' }} children={(p) => <CategoryCrudScreen        {...p} onBackToShop={onBackToShop} />} />
      <AdminDrawer.Screen name="ReviewsManagement" options={{ title: 'Reviews'    }} children={(p) => <ReviewsManagementScreen   {...p} onBackToShop={onBackToShop} />} />
      <AdminDrawer.Screen name="OrderManagement"   options={{ title: 'Orders'     }} children={(p) => <OrderManagementScreen     {...p} onBackToShop={onBackToShop} />} />
      <AdminDrawer.Screen name="AdminProfile"      options={{ title: 'Profile'    }} component={ProfileScreen} />
    </AdminDrawer.Navigator>
  );
}

// ─── Shop drawer navigator ────────────────────────────────────────────────────

function ShopDrawerNavigator({
  initialRouteName = 'home',
  authNoticeMessage = '',
  onDismissAuthNotice,
  onNotificationAuthResolved,
}) {
  const cartQuantity = useSelector(selectCartQuantity);

  const renderShopDrawerContent = useCallback(
    (props) => <ShopDrawerContent {...props} cartQuantity={cartQuantity} />,
    [cartQuantity]
  );

  const shopScreenOptions = useCallback(
    ({ navigation }) => ({
      headerShown: true,
      drawerType: 'front',
      lazy: true,
      freezeOnBlur: true,
      header: () => <DrawerHeader_Bar navigation={navigation} cartQuantity={cartQuantity} />,
    }),
    [cartQuantity]
  );

  return (
    <ShopDrawer.Navigator
      initialRouteName={initialRouteName}
      drawerContent={renderShopDrawerContent}
      screenOptions={shopScreenOptions}
    >
      <ShopDrawer.Screen name="home"     component={ShopScreen}      options={{ title: 'Home' }} />
      <ShopDrawer.Screen name="search"   component={SearchNavigator} options={{ title: 'Search' }} />
      <ShopDrawer.Screen name="cart"     component={CartScreen}      options={{ title: 'Cart' }} />
      <ShopDrawer.Screen name="wishlist" component={WishlistScreen}  options={{ title: 'Wishlist' }} />
      <ShopDrawer.Screen name="profile"  component={ProfileScreen}   options={{ title: 'Profile' }} />
      <ShopDrawer.Screen name="orders"   component={OrdersScreen}    options={{ title: 'My Orders' }} />
      <ShopDrawer.Screen
        name="auth"
        options={{ title: 'Sign in', drawerItemStyle: { display: 'none' } }}
        children={(props) => (
          <AuthScreen
            {...props}
            notificationAccessMessage={authNoticeMessage}
            onDismissNotificationAccessMessage={onDismissAuthNotice}
            onNotificationAuthResolved={onNotificationAuthResolved}
            onOpenShop={() => props.navigation.navigate('home')}
            onOpenAdmin={() => props.navigation.getParent()?.replace('AdminDashboard')}
          />
        )}
      />
    </ShopDrawer.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────

export default function MainNavigator() {
  const dispatch    = useDispatch();
  const { initialized, isAuthenticated, isAdmin, currentUser, signOutUser } = useAuth();
  const navigationRef = useRef(null);
  const pendingNotificationRef = useRef(null);
  const [authNoticeMessage, setAuthNoticeMessage] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'neutral' });

  const buildAuthNoticeMessage = useCallback((pendingPayload) => {
    const expectedEmail = String(pendingPayload?.recipientEmail || '').trim().toLowerCase();

    if (pendingPayload?.type === 'order-status') {
      if (expectedEmail) {
        return `Please sign in to ${expectedEmail} to view this order update.`;
      }

      return 'Please sign in to the account that placed this order to view the details.';
    }

    if (expectedEmail) {
      return `Please sign in to ${expectedEmail} to open this notification.`;
    }

    return 'Please sign in to the account that received this notification.';
  }, []);

  const canOpenNotificationForCurrentUser = useCallback((context) => {
    if (!currentUser) {
      return false;
    }

    const expectedUid = String(context?.recipientFirebaseUid || '').trim();
    const expectedEmail = String(context?.recipientEmail || '').trim().toLowerCase();
    const currentUid = String(currentUser?.uid || '').trim();
    const currentEmail = String(currentUser?.email || '').trim().toLowerCase();

    if (expectedUid && currentUid !== expectedUid) {
      return false;
    }

    if (!expectedUid && expectedEmail && currentEmail !== expectedEmail) {
      return false;
    }

    return true;
  }, [currentUser]);

  const queueNotificationAndPromptLogin = useCallback(async (pendingPayload) => {
    pendingNotificationRef.current = pendingPayload;
    const message = buildAuthNoticeMessage(pendingPayload);
    setAuthNoticeMessage(message);
    showToast(message, 'warning');

    const accountMismatchWhileLoggedIn =
      Boolean(currentUser) && !canOpenNotificationForCurrentUser(pendingPayload);

    if (accountMismatchWhileLoggedIn) {
      await signOutUser().catch(() => null);
    }

    navigationRef.current?.navigate?.('Auth');
  }, [buildAuthNoticeMessage, canOpenNotificationForCurrentUser, currentUser, signOutUser]);

  const tryResolvePendingNotification = useCallback(() => {
    if (!initialized || !currentUser) {
      return false;
    }

    const pendingNotification = pendingNotificationRef.current;
    if (!pendingNotification) {
      return false;
    }

    if (!canOpenNotificationForCurrentUser(pendingNotification)) {
      return false;
    }

    pendingNotificationRef.current = null;
    setAuthNoticeMessage('');

    if (pendingNotification.type === 'wishlist-discount') {
      navigationRef.current?.navigate?.('wishlist');
      return true;
    }

    if (pendingNotification.type === 'order-status' && pendingNotification.orderId) {
      navigationRef.current?.navigate?.('OrderDetails', { id: pendingNotification.orderId });
      return true;
    }

    return false;
  }, [canOpenNotificationForCurrentUser, currentUser, initialized]);

  const handleNotificationAuthResolved = useCallback(() => {
    tryResolvePendingNotification();
  }, [tryResolvePendingNotification]);

  const openOrderDetailsFromNotification = useCallback((context = {}) => {
    const normalizedOrderId = String(context?.orderId || '').trim();
    if (!normalizedOrderId) {
      return;
    }

    if (!initialized) {
      pendingNotificationRef.current = { ...context, type: 'order-status', orderId: normalizedOrderId };
      return;
    }

    if (!canOpenNotificationForCurrentUser(context)) {
      queueNotificationAndPromptLogin({
        ...context,
        type: 'order-status',
        orderId: normalizedOrderId,
      });
      return;
    }

    pendingNotificationRef.current = null;
    setAuthNoticeMessage('');
    navigationRef.current?.navigate?.('OrderDetails', { id: normalizedOrderId });
  }, [
    canOpenNotificationForCurrentUser,
    initialized,
    queueNotificationAndPromptLogin,
  ]);

  const openWishlistFromNotification = useCallback((context = {}) => {
    if (!initialized) {
      pendingNotificationRef.current = { ...context, type: 'wishlist-discount' };
      return;
    }

    if (!canOpenNotificationForCurrentUser(context)) {
      queueNotificationAndPromptLogin({ ...context, type: 'wishlist-discount' });
      return;
    }

    pendingNotificationRef.current = null;
    setAuthNoticeMessage('');
    navigationRef.current?.navigate?.('wishlist');
  }, [
    canOpenNotificationForCurrentUser,
    initialized,
    queueNotificationAndPromptLogin,
  ]);

  useEffect(() => { dispatch(initializeCart()); }, [dispatch]);

  useEffect(() => {
    const unsubscribe = subscribeToast(({ message, variant }) =>
      setToast({ visible: true, message, variant })
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    configureNotificationBehavior();
    handleInitialOrderNotification(openOrderDetailsFromNotification);
    const unsubscribe = subscribeToOrderNotificationPress(openOrderDetailsFromNotification);
    handleInitialWishlistNotification(openWishlistFromNotification);
    const unsubscribeWishlist = subscribeToWishlistNotificationPress(openWishlistFromNotification);
    return () => {
      unsubscribe();
      unsubscribeWishlist();
    };
  }, [openOrderDetailsFromNotification, openWishlistFromNotification]);

  useEffect(() => {
    if (!initialized || !currentUser) {
      return;
    }

    if (tryResolvePendingNotification()) {
      return;
    }

    const pendingNotification = pendingNotificationRef.current;
    if (!pendingNotification) {
      return;
    }

    if (!canOpenNotificationForCurrentUser(pendingNotification)) {
      queueNotificationAndPromptLogin(pendingNotification);
      return;
    }

    tryResolvePendingNotification();
  }, [
    canOpenNotificationForCurrentUser,
    initialized,
    queueNotificationAndPromptLogin,
    tryResolvePendingNotification,
  ]);

  useEffect(() => {
    if (!currentUser) {
      dispatch(resetReviewsState());
      dispatch(resetWishlistState());
    }
  }, [currentUser, dispatch]);

  return (
    <NavigationContainer ref={navigationRef} linking={linking} fallback={<></>}>
      <View style={{ flex: 1 }}>
        <Stack.Navigator initialRouteName="Root" screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Auth"
            children={(props) => (
              <ShopDrawerNavigator
                {...props}
                initialRouteName="auth"
                authNoticeMessage={authNoticeMessage}
                onDismissAuthNotice={() => setAuthNoticeMessage('')}
                onNotificationAuthResolved={handleNotificationAuthResolved}
              />
            )}
          />
          <Stack.Screen
            name="Root"
            children={(props) => (
              <ShopDrawerNavigator
                {...props}
                authNoticeMessage={authNoticeMessage}
                onDismissAuthNotice={() => setAuthNoticeMessage('')}
                onNotificationAuthResolved={handleNotificationAuthResolved}
              />
            )}
          />
          <Stack.Screen name="Product" component={SingleProductScreen} />
          <Stack.Screen
            name="ProductReviews"
            component={ProductReviewsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ReviewEditor"
            component={ReviewEditorScreen}
            options={{ headerShown: false, title: 'Write Review' }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{ headerShown: false, title: 'Checkout' }}
          />
          <Stack.Screen
            name="OrderDetails"
            component={OrderDetailsScreen}
            options={{ headerShown: false, title: 'Order Details' }}
          />
          <Stack.Screen
            name="AdminReviewDetail"
            component={ReviewDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AdminDashboard"
            children={(props) => (
              !initialized ? (
                <View style={{ flex: 1 }} />
              ) : isAuthenticated && isAdmin ? (
                <AdminDashboardNavigator
                  {...props}
                  onBackToShop={() => props.navigation.replace('Root')}
                />
              ) : (
                <ShopDrawerNavigator
                  {...props}
                  initialRouteName="auth"
                  authNoticeMessage={authNoticeMessage}
                  onDismissAuthNotice={() => setAuthNoticeMessage('')}
                  onNotificationAuthResolved={handleNotificationAuthResolved}
                />
              )
            )}
          />

        </Stack.Navigator>
        <Toast
          visible={toast.visible}
          message={toast.message}
          variant={toast.variant}
          position="top"
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </View>
    </NavigationContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Drawer container ──────────────────────────────────────────────────────
  drawerContainer: {
    flex:           1,
    paddingBottom:  0,
  },

  // ── Drawer header ─────────────────────────────────────────────────────────
  drawerHeader: {
    paddingHorizontal: 16,
    paddingTop:        52,   // clears status bar
    paddingBottom:     16,
    borderBottomWidth: 1,
  },
  avatarWrap: {
    marginBottom: 10,
  },
  drawerName: {
    fontSize:   14,
  },

  // ── Nav list ──────────────────────────────────────────────────────────────
  navList: {
    flex:             1,
    paddingHorizontal: 8,
    paddingTop:       8,
    gap:              2,
  },
  navItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius:   8,
  },
  navIcon: {
    width:          20,
    height:         20,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  navLabel: {
    flex:      1,
    fontSize:  14,
  },
  navBadge: {
    minWidth:         18,
    height:           18,
    borderRadius:     9,
    paddingHorizontal: 4,
    alignItems:       'center',
    justifyContent:   'center',
  },
  navBadgeText: {
    fontFamily: fonts.ui.bold,
    fontSize:   9,
  },

  // ── Drawer footer ─────────────────────────────────────────────────────────
  drawerFooter: {
    borderTopWidth:    1,
    paddingHorizontal: 8,
    paddingVertical:   10,
    gap:               2,
  },
  footerItem: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius:    8,
  },

  // ── Custom header bar ─────────────────────────────────────────────────────
  headerBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 14,
    paddingBottom:     10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width:          40,
    height:         40,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  // Hamburger icon — three lines
  headerIconBox: {
    width:  22,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    height:       2,
    borderRadius: 1,
    width:        '100%',
  },
  hamburgerLineMid: {
    width: '75%',
  },
  headerBadge: {
    position:         'absolute',
    top:              4,
    right:            2,
    minWidth:         16,
    height:           16,
    borderRadius:     8,
    paddingHorizontal: 3,
    borderWidth:      1.5,
    alignItems:       'center',
    justifyContent:   'center',
  },
  headerBadgeText: {
    fontFamily: fonts.ui.bold,
    fontSize:   9,
    lineHeight: 11,
  },
});
