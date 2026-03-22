import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { XIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from "phosphor-react-native";

import { useColors }      from "@colors/colorContext";
import { rgb }            from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts }          from "@typography/fonts";

import { useAuth }                  from "../../context/store/auth";
import { removeFromCart, updateCartItemQuantity } from "../../redux/actions/cartActions";

import Screen        from "@components/layout/Screen";
import NavBar        from "@components/navigation/NavBar";
import Divider       from "@components/layout/Divider";
import Button        from "@components/action/Button";
import IconButton    from "@components/action/IconButton";
import Badge         from "@components/display/Badge";
import ConfirmDialog from "@components/overlay/ConfirmDialog";
import Toast         from "@components/statusFeedback/Toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_PAD   = 16;
const SHIPPING_FLAT = 500;

function formatPrice(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH")}`;
}

// ─── CartItemRow ──────────────────────────────────────────────────────────────

function CartItemRow({ item, onIncrement, onDecrement, onRemove }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  const qty    = Number(item.quantity || 0);
  const atMin  = qty <= 1;
  const unitPrice = Number(item.price || 0);
  const lineTotal = unitPrice * qty;
  const originalUnitPrice = Number(item.originalPrice || unitPrice);
  const hasDiscount = originalUnitPrice > unitPrice;
  const originalLineTotal = originalUnitPrice * qty;

  const xIcon = useMemo(
    () => <XIcon size={14} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );
  const minusIcon = useMemo(
    () => (
      <MinusIcon
        size={12}
        weight="bold"
        color={rgb(atMin
          ? tokens["--icon-neutral-secondary"]
          : tokens["--icon-neutral-primary"]
        )}
      />
    ),
    [tokens, atMin]
  );
  const plusIcon = useMemo(
    () => <PlusIcon size={12} weight="bold" color={rgb(tokens["--icon-neutral-primary"])} />,
    [tokens]
  );

  return (
    <View style={s.itemRow}>
      {/* Thumbnail */}
      <View
        style={[
          s.itemImg,
          { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
        ]}
      >
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={s.itemImgFill}
            resizeMode="cover"
          />
        ) : null}
      </View>

      {/* Details — padded right so text never overlaps the × button */}
      <View style={s.itemInfo}>
        {item.brand ? (
          <Text
            style={[s.itemBrand, { color: rgb(tokens["--text-neutral-tertiary"]) }]}
            numberOfLines={1}
          >
            {item.brand}
          </Text>
        ) : null}

        <Text style={[type.label, s.itemName]} numberOfLines={2}>
          {item.name}
        </Text>

        {item.badge ? (
          <View style={s.itemBadgeWrap}>
            <Badge label={item.badge.label} variant={item.badge.variant} size="sm" />
          </View>
        ) : null}

        {/* Stepper + line total */}
        <View style={s.itemBottom}>
          <View
            style={[
              s.stepper,
              { borderColor: rgb(tokens["--border-neutral-secondary"]) },
            ]}
          >
            <IconButton
              icon={minusIcon}
              variant="ghost"
              size="sm"
              disabled={atMin}
              onPress={onDecrement}
              accessibilityLabel="Decrease quantity"
            />
            <Text
              style={[
                s.stepperVal,
                {
                  color:            rgb(tokens["--text-neutral-primary"]),
                  borderLeftColor:  rgb(tokens["--border-neutral-tertiary"]),
                  borderRightColor: rgb(tokens["--border-neutral-tertiary"]),
                },
              ]}
            >
              {qty}
            </Text>
            <IconButton
              icon={plusIcon}
              variant="ghost"
              size="sm"
              onPress={onIncrement}
              accessibilityLabel="Increase quantity"
            />
          </View>

          <View style={s.priceStack}>
            {hasDiscount ? (
              <Text
                style={[
                  s.originalTotal,
                  { color: rgb(tokens["--text-neutral-tertiary"]) },
                ]}
              >
                {formatPrice(originalLineTotal)}
              </Text>
            ) : null}
            <Text
              style={[
                type.label,
                s.lineTotal,
                { color: rgb(tokens["--text-neutral-primary"]) },
              ]}
            >
              {formatPrice(lineTotal)}
            </Text>
          </View>
        </View>
      </View>

      {/* × remove — anchored top-right */}
      <View style={s.removeWrap}>
        <IconButton
          icon={xIcon}
          variant="ghost"
          size="sm"
          onPress={onRemove}
          accessibilityLabel={`Remove ${item.name}`}
        />
      </View>
    </View>
  );
}

// ─── Order summary ────────────────────────────────────────────────────────────

function OrderSummary({ subtotal, itemCount, discountTotal }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  const total = Math.max(0, subtotal - discountTotal) + SHIPPING_FLAT;

  return (
    <View style={s.summaryBlock}>
      <View style={s.summaryRow}>
        <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
        </Text>
        <Text style={type.bodySm}>{formatPrice(subtotal)}</Text>
      </View>

      <View style={s.summaryRow}>
        <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          Shipping
        </Text>
        <Text style={type.bodySm}>{formatPrice(SHIPPING_FLAT)}</Text>
      </View>

      {discountTotal > 0 ? (
        <View style={s.summaryRow}>
          <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            Discount
          </Text>
          <Text style={type.bodySm}>- {formatPrice(discountTotal)}</Text>
        </View>
      ) : null}

      <Divider spacing="sm" />

      <View style={s.summaryRow}>
        <Text style={type.h3}>Total</Text>
        <Text style={[type.h3, s.totalValue]}>{formatPrice(total)}</Text>
      </View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onBrowse }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  const cartIcon = useMemo(
    () => <ShoppingCartIcon size={28} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );

  return (
    <View style={s.emptyWrap}>
      <View
        style={[
          s.emptyIcon,
          { borderColor: rgb(tokens["--border-neutral-secondary"]) },
        ]}
      >
        {cartIcon}
      </View>
      <Text style={type.h3}>Your cart is empty</Text>
      <Text
        style={[
          type.bodySm,
          s.emptyBody,
          { color: rgb(tokens["--text-neutral-tertiary"]) },
        ]}
      >
        Add items from the shop to get started.
      </Text>
      <View style={s.emptyAction}>
        <Button
          label="Browse products"
          onPress={onBrowse}
          size="sm"
          align="center"
          style={{ alignSelf: "center" }}
        />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CartScreen({ navigation }) {
  const tokens   = useColors();
  const type     = makeTypeStyles(tokens);
  const dispatch = useDispatch();

  const { isAuthenticated }        = useAuth();
  const { items, loading, error }  = useSelector((state) => state.cart);

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", variant: "neutral" });

  const showToast = useCallback((message, variant = "neutral") => {
    setToast({ visible: true, message, variant });
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const itemCount = useMemo(
    () => items.reduce((t, i) => t + Number(i.quantity || 0), 0),
    [items]
  );
  const subtotal = useMemo(
    () => items.reduce((t, i) => {
      const original = Number(i.originalPrice || i.price || 0);
      return t + original * Number(i.quantity || 0);
    }, 0),
    [items]
  );
  const discountTotal = useMemo(
    () => items.reduce((t, i) => {
      const original = Number(i.originalPrice || i.price || 0);
      const effective = Number(i.price || 0);
      const savings = Math.max(0, original - effective);
      return t + savings * Number(i.quantity || 0);
    }, 0),
    [items]
  );
  const isEmpty = items.length === 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleIncrement = useCallback(
    (item) => dispatch(updateCartItemQuantity(item.productId, item.quantity + 1)),
    [dispatch]
  );

  const handleDecrement = useCallback(
    (item) => {
      // Clamped at 1 — never dispatches below 1
      if (Number(item.quantity) <= 1) return;
      dispatch(updateCartItemQuantity(item.productId, item.quantity - 1));
    },
    [dispatch]
  );

  const handleRemove = useCallback(
    (item) => {
      dispatch(removeFromCart(item.productId));
      showToast(`${item.name} removed`);
    },
    [dispatch, showToast]
  );

  const handleClearAll = useCallback(() => {
    items.forEach((item) => dispatch(removeFromCart(item.productId)));
    setClearDialogOpen(false);
    showToast("Cart cleared");
  }, [dispatch, items, showToast]);

  const handleCheckout = useCallback(() => {
    if (!items.length) {
      Alert.alert("Cart is empty", "Add products before checkout.");
      return;
    }
    if (!isAuthenticated) {
      Alert.alert(
        "Account required",
        "Please register or sign in before checkout.",
        [{ text: "Sign in", onPress: () => navigation.getParent()?.navigate("Auth") }]
      );
      return;
    }
    navigation.getParent()?.navigate("Checkout");
  }, [items, isAuthenticated, navigation]);

  // ── Nav right slot — only shown when cart has items ────────────────────────

  const clearAllSlot = useMemo(() => {
    return (
      <Pressable 
        onPress={isEmpty ? undefined : () => setClearDialogOpen(true)} 
        hitSlop={8}
        disabled={isEmpty}
      >
        <Text style={[
          type.bodySm, 
          { 
            color: isEmpty 
              ? rgb(tokens["--text-neutral-tertiary"]) 
              : rgb(tokens["--text-error-primary"]) 
          }
        ]}>
          Clear all
        </Text>
      </Pressable>
    );
  }, [isEmpty, tokens, type]);

  // ── Error banner (non-blocking) ────────────────────────────────────────────

  const errorBanner = error ? (
    <Text style={[type.caption, s.errorText, { color: rgb(tokens["--text-error-primary"]) }]}>
      {error}
    </Text>
  ) : null;

  return (
    <Screen safeTop={false} edges={["left", "right", "bottom"]}>
      <NavBar
        title=""
        rightSlot={clearAllSlot}
      />
      <View style={{paddingHorizontal: SCREEN_PAD}}>
        {errorBanner}
      </View>

      {isEmpty ? (
        <EmptyState onBrowse={() => navigation.navigate("home")} />
      ) : (
        /* flex: 1 wrapper so the FlatList and the fixed footer share the
           remaining space correctly without overflow */
        <View style={s.contentArea}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.productId}
            showsVerticalScrollIndicator={false}
            style={s.list}
            contentContainerStyle={s.listContent}
            ItemSeparatorComponent={() => <Divider spacing="none" />}
            renderItem={({ item }) => (
              <CartItemRow
                item={item}
                onIncrement={() => handleIncrement(item)}
                onDecrement={() => handleDecrement(item)}
                onRemove={() => handleRemove(item)}
              />
            )}
          />

          {/* Fixed footer — always visible at the bottom */}
          <View
            style={[
              s.footer,
              { borderTopColor: rgb(tokens["--border-neutral-secondary"]) },
            ]}
          >
            <OrderSummary subtotal={subtotal} itemCount={itemCount} discountTotal={discountTotal} />
            <Divider weight="regular" color="secondary" spacing="none" />
            <View style={s.ctaBlock}>
              <Button
                label={loading ? "Processing…" : "Checkout"}
                disabled={loading || isEmpty}
                onPress={handleCheckout}
                fullWidth
              />
              <Button
                variant="ghost"
                label="Continue shopping"
                onPress={() => navigation.navigate("home")}
                fullWidth
              />
            </View>
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={handleClearAll}
        title="Clear cart?"
        body="All items will be removed from your cart. This cannot be undone."
        variant="danger"
        confirmLabel="Clear"
        cancelLabel="Cancel"
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  errorText: {
    paddingHorizontal: SCREEN_PAD,
    paddingVertical:   6,
  },

  listContent: { paddingBottom: 8 },

  // Wrapper that splits remaining space between list and footer
  contentArea: {
    flex: 1,
  },
  // FlatList scrolls within its share of contentArea
  list: {
    flex: 1,
  },
  // Fixed bottom panel — summary + CTAs
  footer: {
    borderTopWidth: 1,
  },

  // Item row
  itemRow: {
    flexDirection:     "row",
    gap:               12,
    paddingHorizontal: SCREEN_PAD,
    paddingVertical:   14,
    position:          "relative",
  },
  itemImg: {
    width:        64,
    height:       64,
    borderRadius: 10,
    flexShrink:   0,
    overflow:     "hidden",
  },
  itemImgFill: {
    width:  "100%",
    height: "100%",
  },
  itemInfo: {
    flex:        1,
    gap:         3,
    paddingRight: 28,   // reserves space for the × button
  },
  itemBrand: {
    fontFamily:    fonts.ui.bold,
    fontSize:      9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  itemName: {
    fontSize:   13,
    lineHeight: 17,
  },
  itemBadgeWrap: {
    alignSelf: "flex-start",
    marginTop: 1,
  },
  itemBottom: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      6,
  },

  // Qty stepper
  stepper: {
    flexDirection: "row",
    alignItems:    "center",
    borderWidth:   1,
    borderRadius:  6,
    overflow:      "hidden",
  },
  stepperVal: {
    width:            32,
    height:           28,
    textAlign:        "center",
    fontFamily:       fonts.ui.bold,
    fontSize:         13,
    lineHeight:       28,
    borderLeftWidth:  0.5,
    borderRightWidth: 0.5,
  },
  lineTotal: {
    fontSize:      14,
    letterSpacing: -0.3,
  },
  priceStack: {
    alignItems: "flex-end",
    gap: 2,
  },
  originalTotal: {
    fontSize: 11,
    textDecorationLine: "line-through",
  },

  // × remove
  removeWrap: {
    position: "absolute",
    top:      10,
    right:    12,
  },

  // Order summary
  summaryBlock: {
    paddingHorizontal: SCREEN_PAD,
    paddingVertical:   16,
    gap:               10,
  },
  summaryRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "baseline",
  },
  totalValue: {
    letterSpacing: -0.5,
  },

  // CTAs
  ctaBlock: {
    paddingHorizontal: SCREEN_PAD,
    paddingVertical:   14,
    gap:               8,
  },

  // Empty state
  emptyWrap: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 40,
    gap:               12,
  },
  emptyIcon: {
    width:          72,
    height:         72,
    borderRadius:   36,
    borderWidth:    1.5,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   4,
  },
  emptyBody: {
    textAlign:  "center",
    lineHeight: 22,
  },
  emptyAction: {
    alignItems: "center",
    width: "100%",
  },
});

