/**
 * ProductCard.js
 * ─────────────────────────────────────────────────────────────
 * Reusable product card used across the shop.
 *
 * Variants:
 *   "scroll"  — fixed-width card for horizontal ScrollList strips.
 *               Width is driven by the itemWidth prop (passed through
 *               by ScrollList's snapColumns renderItem callback).
 *   "grid"    — fills its parent cell; used inside Grid.
 *               Width is set by the parent (gridItemWidth).
 *
 * Badge behaviour:
 *   Driven entirely by the product's `badge` field from the database.
 *   badge: { label, variant } | null | undefined
 *
 *   Supported Badge variants (from DisplayCompPrev):
 *     "filled"       — solid ink (e.g. NEW)
 *     "error"        — red (e.g. SALE)
 *     "success"      — green (e.g. In Stock)
 *     "warning"      — amber (e.g. Low Stock)
 *     "brand"        — brand colour (e.g. PREMIUM)
 *     "brand-subtle" — light brand (e.g. Limited)
 *     "outline"      — bordered
 *     "muted"        — subdued
 *
 *   Pass the badge object straight from your API/DB response:
 *     { badge: { label: "SALE", variant: "error" } }
 *     { badge: { label: "NEW",  variant: "filled" } }
 *     { badge: null }   ← no badge rendered
 *
 * Props:
 *   item        object  — product data (see shape below)
 *   variant     "scroll" | "grid"   default: "grid"
 *   itemWidth   number | undefined  — provided by ScrollList snapColumns
 *   cardWidth   number | undefined  — provided by Grid / gridItemWidth
 *   cartIcon    ReactNode           — pre-built icon passed from screen
 *   onPress     (item) => void
 *
 * Product shape (DB fields used by this component):
 *   id          string
 *   brand       string
 *   name        string
 *   price       number              — raw number, formatted as ₱X,XXX
 *   badge       { label: string, variant: string } | null | undefined
 *   imageUri    string | undefined  — remote image URI (future)
 */

import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { StarIcon } from "phosphor-react-native";

import { useColors }      from "@colors/colorContext";
import { rgb }            from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts }          from "@typography/fonts";

import Badge           from "@components/display/Badge";
import Card            from "@components/layout/Card";
import AddToCartButton from "@components/action/AddToCartButton";

// ─── Image placeholder ────────────────────────────────────────────────────────
// Swap for <Image> once imageUri is available from the DB.

function ProductImage({ item, height, aspectRatio }) {
  const tokens = useColors();

  const imageStyle = height
    ? { height, width: "100%" }
    : { aspectRatio: aspectRatio ?? 1.2, width: "100%" };

  const hasStockValue = item?.stock !== undefined && item?.stock !== null;
  const stockValue = Number(item?.stock ?? 0);
  const resolvedBadge =
    hasStockValue && stockValue <= 0
      ? { label: "Out of Stock", variant: "error" }
      : item.badge;

  return (
    <View
      style={[
        imageStyle,
        { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
      ]}
    >
      {item.imageUri ? (
        <Image
          source={{ uri: item.imageUri }}
          style={[StyleSheet.absoluteFill, s.image]}
          resizeMode="cover"
        />
      ) : null}
      {resolvedBadge ? (
        <View style={s.badgeWrap}>
          <Badge
            label={resolvedBadge.label}
            variant={resolvedBadge.variant}
            size="sm"
          />
        </View>
      ) : null}
    </View>
  );
}

// ─── Card body ────────────────────────────────────────────────────────────────

function ProductCardBody({
  item,
  cartIcon,
  onPress,
  onCartPress,
  showShopActions = false,
  onCartPlaceholderPress,
}) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);
  const rating = Number(item?.rating || 0);

  if (showShopActions) {
    return (
      <View style={[s.body, s.bodyShop]}>
        <View style={s.brandRow}>
          <Text
            style={[s.brand, { color: rgb(tokens["--text-neutral-tertiary"]) }]}
            numberOfLines={1}
          >
            {item.brand}
          </Text>
          <View style={s.ratingInline}>
            <StarIcon
              size={10}
              weight="fill"
              color={"rgb(255, 223, 0)"}
            />
            <Text style={[s.ratingValue, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              {rating.toFixed(1)}
            </Text>
          </View>
        </View>
        <Text style={[type.label, s.name]} numberOfLines={2}>
          {item.name}
        </Text>
        {Number(item.originalPrice || 0) > Number(item.price || 0) ? (
          <View style={s.priceRow}>
            <Text style={[s.price, { color: rgb(tokens["--text-neutral-primary"]) }]}>
              ₱{Number(item.price || 0).toLocaleString("en-PH")}
            </Text>
            <Text style={s.priceStrike}>
              ₱{Number(item.originalPrice || 0).toLocaleString("en-PH")}
            </Text>
          </View>
        ) : (
          <Text style={[s.price, { color: rgb(tokens["--text-neutral-primary"]) }]}>
            ₱{Number(item.price || 0).toLocaleString("en-PH")}
          </Text>
        )}
        <View style={s.actionRow}>
          <AddToCartButton
            icon={cartIcon}
            size="sm"
            iconOnly
            onPress={
              onCartPress
                ? () => onCartPress(item)
                : onCartPlaceholderPress
            }
          />
          <AddToCartButton
            fullWidth={false}
            size="sm"
            label="Purchase"
            onPress={() => onPress?.(item)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={s.body}>
      <View style={s.brandRow}>
        <Text
          style={[s.brand, { color: rgb(tokens["--text-neutral-tertiary"]) }]}
          numberOfLines={1}
        >
          {item.brand}
        </Text>
        <View style={s.ratingInline}>
          <StarIcon
            size={10}
            weight="fill"
            color={"rgb(255, 223, 0)"}
          />
          <Text style={[s.ratingValue, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            {rating.toFixed(1)}
          </Text>
        </View>
      </View>
      <Text style={[type.label, s.name]} numberOfLines={2}>
        {item.name}
      </Text>
      <View style={s.footer}>
        {Number(item.originalPrice || 0) > Number(item.price || 0) ? (
          <View style={s.priceRow}>
            <Text style={[s.price, { color: rgb(tokens["--text-neutral-primary"]) }]}>
              ₱{Number(item.price || 0).toLocaleString("en-PH")}
            </Text>
            <Text style={s.priceStrike}>
              ₱{Number(item.originalPrice || 0).toLocaleString("en-PH")}
            </Text>
          </View>
        ) : (
          <Text style={[s.price, { color: rgb(tokens["--text-neutral-primary"]) }]}>
            ₱{Number(item.price || 0).toLocaleString("en-PH")}
          </Text>
        )}
        <AddToCartButton
          icon={cartIcon}
          iconOnly
          size="sm"
          onPress={
            onCartPress
              ? () => onCartPress(item)
              : () => onPress?.(item)
          }
        />
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductCard({
  item,
  variant   = "grid",
  itemWidth,   // from ScrollList snapColumns renderItem callback
  cardWidth,   // from Grid / gridItemWidth
  cartIcon,
  onPress,
  onCartPress,
  showShopActions = false,
  onCartPlaceholderPress,
  disableCardPress = false,
}) {
  const tokens = useColors();

  const isScroll = variant === "scroll";

  // Width: scroll cards use itemWidth (from snapColumns), grid cards use cardWidth.
  const outerStyle = isScroll
    ? itemWidth ? { width: itemWidth } : null
    : cardWidth ? { width: cardWidth } : null;

  const imageHeight = isScroll ? 108 : 132;

  return (
    <Pressable
      onPress={disableCardPress ? undefined : () => onPress?.(item)}
      style={outerStyle}
    >
      <Card
        variant="elevated"
        radius="lg"
        padding="none"
        style={[
          s.card,
          isScroll ? s.cardScroll : s.cardGrid,
          { borderColor: rgb(tokens["--border-neutral-secondary"]) },
        ]}
      >
        <ProductImage
          item={item}
          height={imageHeight}
          aspectRatio={isScroll ? undefined : 1.2}
        />
        <ProductCardBody
          item={item}
          cartIcon={cartIcon}
          onPress={onPress}
          onCartPress={onCartPress}
          showShopActions={showShopActions}
          onCartPlaceholderPress={onCartPlaceholderPress}
        />
      </Card>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow:    "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  // scroll variant — width driven by itemWidth prop, no flex
  cardScroll: {},
  // grid variant — fills the cell width set by parent
  cardGrid: {
    flex: 1,
  },

  badgeWrap: {
    position: "absolute",
    top:      8,
    left:     8,
    zIndex:   1,
  },

  body: {
    padding: 10,
    gap:     3,
  },
  bodyShop: {
    minHeight: 114,
  },
  brand: {
    fontFamily:    fonts.ui.bold,
    fontSize:      9,
    lineHeight:    12,
    minHeight:     12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  name: {
    fontSize:   13,
    lineHeight: 17,
    minHeight:  34,
  },
  footer: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  price: {
    fontFamily:    fonts.ui.bold,
    fontSize:      14,
    lineHeight:    18,
    letterSpacing: -0.3,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceStrike: {
    fontFamily: fonts.ui.medium,
    fontSize: 11,
    color: "#8a8a8a",
    textDecorationLine: "line-through",
  },
  ratingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingValue: {
    fontFamily: fonts.ui.medium,
    fontSize: 11,
    lineHeight: 13,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
});
