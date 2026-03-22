import SharedProductCard from "@components/layout/ProductCard";

import { showToast } from "@utils/toastBus";
import { useDispatch } from "react-redux";
import { addToCart } from "../../../redux/actions/cartActions";

function toBadge(product) {
  const stock = Number(product?.stock ?? 0);
  if (stock <= 0) {
    return { label: "Out of Stock", variant: "error" };
  }

  if (product?.discountActive) {
    const pct = Math.round(Number(product?.discountPercent || 0));
    if (pct > 0) {
      return { label: `-${pct}%`, variant: "error" };
    }
  }

  if (product?.badge) {
    return product.badge;
  }

  if (stock > 0 && stock <= 5) {
    return { label: "Low Stock", variant: "warning" };
  }

  return null;
}

function toCardItem(product = {}) {
  const name = product.name || "Untitled product";
  const discountActive = product.discountActive === true;
  const discountedPrice =
    discountActive && Number(product.discountedPrice || 0) > 0
      ? Number(product.discountedPrice || 0)
      : Number(product.price || 0);
  const originalPrice = discountActive ? Number(product.price || 0) : null;

  return {
    id: product.id || String(product._id || ""),
    name,
    brand: product.brand || product.category || "",
    stock: product?.stock ?? null,
    price: discountedPrice,
    originalPrice,
    badge: toBadge(product),
    rating: Number(product.ratingAverage || 0),
    category: product.category || "",
    imageUri: product.image?.url,
  };
}

/**
 * ProductCard
 *
 * Width resolution order (first defined wins):
 *   1. itemWidth  — injected by ScrollList's SnapGroup via renderItem({ itemWidth })
 *                   This is the calculated cell width that already accounts for
 *                   paddingH, gap, and column count, so the card fills its slot
 *                   exactly with no extra measuring needed.
 *   2. cardWidth  — explicit override from a parent that manages its own layout
 *   3. undefined  — SharedProductCard falls back to its own default sizing
 *
 * Using itemWidth from SnapGroup means the card width is always in sync with
 * the snap layout calculation — no hardcoded values, no layout jumps.
 */
export default function ProductCard({
  product,
  variant = "grid",
  itemWidth,   // from ScrollList SnapGroup — preferred source of truth
  cardWidth,   // explicit override — used only when itemWidth is absent
  cartIcon,
  onPress,
}) {
  const dispatch = useDispatch();

  const handleAddToCart = (item) => {
    if (!item) return;
    const stock = Number(item?.stock ?? 0);
    if (stock <= 0) {
      showToast("Out of stock", "error");
      return;
    }
    dispatch(addToCart(item));
    showToast("Item added to cart", "success");
  };

  // Prefer the snap-layout-derived width; fall back to explicit override.
  const resolvedWidth = itemWidth ?? cardWidth;

  return (
    <SharedProductCard
      item={toCardItem(product)}
      variant={variant}
      itemWidth={resolvedWidth}
      cardWidth={resolvedWidth}
      cartIcon={cartIcon}
      onPress={() => onPress?.(product)}
      onCartPress={() => handleAddToCart(product)}
    />
  );
}
