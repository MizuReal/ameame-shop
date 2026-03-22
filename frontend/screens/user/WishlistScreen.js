import { useCallback, useEffect, useMemo } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  HeartIcon,
  ShoppingCartIcon,
  TrashIcon,
  HeartBreakIcon,
} from "phosphor-react-native";

import Screen from "@components/layout/Screen";
import Card from "@components/layout/Card";
import Button from "@components/action/Button";
import Badge from "@components/display/Badge";
import SectionHeader from "@components/display/SectionHeader";
import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts } from "@typography/fonts";
import { addToCart } from "../../redux/actions/cartActions";
import { fetchWishlist, removeFromWishlist } from "../../redux/slices/wishlistSlice";
import { useAuth } from "../../context/store/auth";
import { showToast } from "@utils/toastBus";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCREEN_PAD = 16;

function formatPrice(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH")}`;
}

// ─── Wishlist item card ───────────────────────────────────────────────────────
function WishlistItemCard({ item, onRemove, onOpenProduct, onAddToCart }) {
  const tokens = useColors();
  const ts = useMemo(() => makeTypeStyles(tokens), [tokens]);
  const product = item?.product || {};
  const discountActive = product.discountActive === true;
  const discountPercent = Math.round(Number(product.discountPercent || 0));
  const outOfStock = Number(product?.stock ?? 0) <= 0;

  return (
    <Card variant="outlined" radius="md" padding="none" style={s.card}>
      <Pressable onPress={() => onOpenProduct?.(product)} style={s.row}>
        {/* Product image */}
        {product?.image?.url ? (
          <View style={s.imageWrap}>
            <Image source={{ uri: product.image.url }} style={s.image} />
            {/* Halftone screen-tone overlay (manga aesthetic) */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: rgb(tokens["--base-foreground"]), opacity: 0.03 },
              ]}
            />
          </View>
        ) : (
          <View
            style={[
              s.imageWrap,
              s.image,
              {
                backgroundColor: rgb(tokens["--surface-neutral-primary"]),
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <HeartIcon
              size={28}
              color={rgb(tokens["--icon-neutral-weak"])}
              weight="thin"
            />
          </View>
        )}

        {/* Product details */}
        <View style={s.details}>
          {/* Brand / category label */}
          <Text
            style={[
              s.brand,
              { color: rgb(tokens["--text-neutral-tertiary"]) },
            ]}
            numberOfLines={1}
          >
            {(product?.category || "General").toUpperCase()}
          </Text>

          {/* Product name */}
          <Text
            style={[
              ts.label,
              s.title,
              { color: rgb(tokens["--text-neutral-primary"]) },
            ]}
            numberOfLines={2}
          >
            {product?.name || "Unnamed product"}
          </Text>

          {/* Badges row */}
          <View style={s.badgeRow}>
            {outOfStock ? (
              <Badge
                label="Out of Stock"
                variant="error"
                size="sm"
                uppercase={false}
              />
            ) : discountActive ? (
              <Badge
                label={`-${discountPercent}%`}
                variant="error"
                size="sm"
                uppercase={false}
              />
            ) : (
              <Badge
                label="In Stock"
                variant="success"
                size="sm"
                uppercase={false}
              />
            )}
          </View>

          {/* Price row */}
          <View style={s.priceRow}>
            {discountActive ? (
              <>
                <Text
                  style={[
                    s.price,
                    { color: rgb(tokens["--text-neutral-primary"]) },
                  ]}
                >
                  {formatPrice(product.discountedPrice)}
                </Text>
                <Text
                  style={[
                    s.priceStrike,
                    { color: rgb(tokens["--text-neutral-tertiary"]) },
                  ]}
                >
                  {formatPrice(product.price)}
                </Text>
              </>
            ) : (
              <Text
                style={[
                  s.price,
                  { color: rgb(tokens["--text-neutral-primary"]) },
                ]}
              >
                {formatPrice(product.price)}
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      {/* Card footer — action buttons */}
      <View
        style={[
          s.cardFooter,
          { borderTopColor: rgb(tokens["--border-neutral-secondary"]) },
        ]}
      >
        <Button
          variant="primary"
          size="sm"
          label="Add to Cart"
          leftIcon={
            <ShoppingCartIcon
              size={14}
              color={rgb(tokens["--shared-text-on-filled"])}
            />
          }
          onPress={() => onAddToCart?.(product)}
          disabled={outOfStock}
          style={{ flex: 1 }}
        />
        <Pressable
          onPress={() => onRemove?.(product)}
          style={({ pressed }) => [
            s.removeBtn,
            {
              borderColor: rgb(tokens["--border-neutral-primary"]),
              backgroundColor: pressed
                ? rgb(tokens["--surface-neutral-primary"])
                : "transparent",
            },
          ]}
          accessibilityLabel="Remove from wishlist"
        >
          <TrashIcon size={16} color={rgb(tokens["--icon-neutral-secondary"])} />
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyWishlist() {
  const tokens = useColors();
  const ts = useMemo(() => makeTypeStyles(tokens), [tokens]);

  return (
    <Card variant="outlined" radius="md" padding="lg" style={s.emptyCard}>
      <View style={s.emptyInner}>
        <View
          style={[
            s.emptyIconBg,
            { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
          ]}
        >
          <HeartBreakIcon
            size={28}
            color={rgb(tokens["--icon-neutral-weak"])}
            weight="light"
          />
        </View>
        <Text
          style={[
            ts.h3,
            {
              color: rgb(tokens["--text-neutral-primary"]),
              textAlign: "center",
              marginTop: 16,
            },
          ]}
        >
          Your wishlist is empty
        </Text>
        <Text
          style={[
            ts.bodySm,
            {
              color: rgb(tokens["--text-neutral-tertiary"]),
              textAlign: "center",
              marginTop: 6,
              lineHeight: 20,
            },
          ]}
        >
          Browse products and tap the heart icon to save your favorites here.
        </Text>
      </View>
    </Card>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function WishlistScreen({ navigation }) {
  const tokens = useColors();
  const ts = makeTypeStyles(tokens);
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  const { items, loading, error } = useSelector((state) => state.wishlist);

  const loadWishlist = useCallback(() => {
    if (!currentUser) return;
    dispatch(fetchWishlist({ firebaseUser: currentUser }));
  }, [currentUser, dispatch]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = useCallback(
    (product) => {
      if (!currentUser || !product?.id) return;
      dispatch(removeFromWishlist({ firebaseUser: currentUser, productId: product.id }))
        .unwrap()
        .then(() => showToast("Removed from wishlist", "success"))
        .catch((err) => showToast(err?.message || "Failed to remove.", "error"));
    },
    [currentUser, dispatch]
  );

  const handleOpenProduct = useCallback(
    (product) => {
      if (!product?.id) return;
      navigation?.navigate?.("Product", { id: product.id, product });
    },
    [navigation]
  );

  const handleAddToCart = useCallback(
    (product) => {
      if (!product) return;
      if (Number(product?.stock ?? 0) <= 0) {
        showToast("Out of stock", "error");
        return;
      }
      dispatch(addToCart(product));
      showToast("Item added to cart", "success");
    },
    [dispatch]
  );

  const itemCount = items?.length ?? 0;

  return (
    <Screen safeTop={false} edges={["left", "right", "bottom"]} style={s.safe}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        refreshing={loading}
        onRefresh={loadWishlist}
        ListHeaderComponent={
          <View style={s.header}>
            <SectionHeader
              title="Wishlist"
              subtitle={itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? "s" : ""}` : undefined}
            />
            <Text
              style={[
                ts.bodySm,
                {
                  color: rgb(tokens["--text-neutral-secondary"]),
                  marginTop: 2,
                },
              ]}
            >
              Keep track of your favorites and their latest discounts.
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            error ? (
              <Card variant="outlined" radius="md" padding="md" style={s.errorCard}>
                <Text
                  style={[
                    ts.bodySm,
                    { color: rgb(tokens["--text-error-primary"]) },
                  ]}
                >
                  {error}
                </Text>
              </Card>
            ) : (
              <EmptyWishlist />
            )
          ) : null
        }
        renderItem={({ item }) => (
          <WishlistItemCard
            item={item}
            onRemove={handleRemove}
            onOpenProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
          />
        )}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  header: {
    marginBottom: 8,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    padding: SCREEN_PAD,
    gap: 12,
  },
  imageWrap: {
    borderRadius: 6,
    overflow: "hidden",
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 6,
  },
  details: {
    flex: 1,
    gap: 3,
  },
  brand: {
    fontFamily: fonts.ui.bold,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.ui.bold,
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontFamily: fonts.special.bold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  priceStrike: {
    fontFamily: fonts.ui.medium,
    fontSize: 11,
    textDecorationLine: "line-through",
  },

  // ── Card footer ──────────────────────────────────────────────────────────
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SCREEN_PAD,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Empty state ──────────────────────────────────────────────────────────
  emptyCard: {
    marginTop: 4,
  },
  emptyInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Error card ───────────────────────────────────────────────────────────
  errorCard: {
    marginTop: 4,
  },
});
