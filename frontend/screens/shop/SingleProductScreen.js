import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  ArrowLeftIcon,
  HeartIcon,
  ShoppingBagIcon,
  PackageIcon,
  ShoppingCartIcon,
  StarIcon,
  TagIcon,
} from "phosphor-react-native";

import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts } from "@typography/fonts";
import { useDispatch, useSelector } from "react-redux";

import Screen from "@components/layout/Screen";
import NavBar from "@components/navigation/NavBar";
import Divider from "@components/layout/Divider";
import Button from "@components/action/Button";
import AddToCartButton from "@components/action/AddToCartButton";
import WishlistButton from "@components/action/WishlistButton";
import Card from "@components/layout/Card";
import ImageCarousel from "@components/display/ImageCarousel";
import ReviewCard from "@components/display/ReviewCard";
import ReviewActionsMenu from "@components/overlay/ReviewActionsMenu";
import ConfirmDialog from "@components/overlay/ConfirmDialog";
import Badge from "@components/display/Badge";
import Spinner from "@components/statusFeedback/Spinner";

import { showToast } from "@utils/toastBus";
import { addToCart } from "../../redux/actions/cartActions";
import { useAuth } from "../../context/store/auth";
import {
  deleteReview,
  fetchMyReviewForProduct,
  fetchProductReviews,
} from "../../redux/slices/reviewSlice";
import {
  fetchWishlistStatus,
  toggleWishlist,
} from "../../redux/slices/wishlistSlice";
import {
  fetchProductDetail,
  primeProductDetail,
} from "../../redux/slices/productSlice";

function ProductImage({ imageUris, placeholderColor }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tokens = useColors();
  const type   = useMemo(() => makeTypeStyles(tokens), [tokens]);
  const totalImages = imageUris.length;

  return (
    <Card variant="outlined" radius="lg" style={s.imageCard}>
      <View style={[s.imageWrap, { backgroundColor: placeholderColor }]}>
        {totalImages > 0 ? (
          <>
            <ImageCarousel
              images={imageUris}
              height={260}
              onIndexChange={setActiveIndex}
            />
            {totalImages > 1 ? (
              <View style={s.imageCountPill}>
                <Text style={[type.caption, { color: rgb(tokens["--text-always-light"]) }]}>{`${activeIndex + 1}/${totalImages}`}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>No image available</Text>
        )}
      </View>
    </Card>
  );
}

function InlineStars({ rating, tokens }) {
  return (
    <View style={s.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = rating >= n;
        const half = !filled && rating >= n - 0.5;
        return (
          <StarIcon
            key={n}
            size={14}
            weight={filled || half ? "fill" : "regular"}
            color={
              filled
                ? "rgb(255, 223, 0)"
                : half
                  ? "rgb(255, 223, 0)"
                  : rgb(tokens["--icon-neutral-tertiary"])
            }
            style={{ opacity: half ? 0.55 : 1 }}
          />
        );
      })}
    </View>
  );
}

function StockIndicator({ stock, tokens, type }) {
  const qty = Number(stock || 0);
  let color, label;
  if (qty > 10) {
    color = rgb(tokens["--text-success-primary"]);
    label = "In Stock";
  } else if (qty > 0) {
    color = rgb(tokens["--text-warning-primary"]);
    label = `Low Stock — ${qty} left`;
  } else {
    color = rgb(tokens["--text-error-primary"]);
    label = "Out of Stock";
  }

  return (
    <View style={s.inlineRow}>
      <PackageIcon size={14} color={color} weight="duotone" />
      <Text style={[type.label, { color }]}>{label}</Text>
    </View>
  );
}

function ProductInfo({ product }) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

  const ratingCount = Number(product?.ratingCount || 0);
  const ratingAverage = Number(product?.ratingAverage || 0);
  const discountActive = product?.discountActive === true;
  const discountPercent = Math.round(Number(product?.discountPercent || 0));
  const savings = discountActive
    ? Number(product?.price || 0) - Number(product?.discountedPrice || 0)
    : 0;

  return (
    <Card variant="outlined" radius="lg" style={s.infoCard}>
      <View style={s.infoWrap}>
        <View
          style={[
            s.categoryChip,
            {
              borderColor: rgb(tokens["--border-brand-secondary"]),
              backgroundColor: rgb(tokens["--surface-brand-secondary"]),
            },
          ]}
        >
          <View style={s.inlineRow}>
            <TagIcon size={12} color={rgb(tokens["--icon-brand-primary"])} weight="fill" />
            <Text style={[type.overline, { color: rgb(tokens["--text-brand-primary"]) }]}>
              {product?.category || "General"}
            </Text>
          </View>
        </View>

        <Text style={[type.h2, s.title]}>{product?.name || "Unnamed product"}</Text>

        {discountActive ? (
          <View style={s.priceBlock}>
            <View style={s.priceRow}>
              <Text style={[s.price, { color: rgb(tokens["--text-brand-primary"]) }]}>
                {`₱${Number(product?.discountedPrice || 0).toLocaleString("en-PH")}`}
              </Text>
              <Text style={[type.bodySm, s.priceStrike, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                {`₱${Number(product?.price || 0).toLocaleString("en-PH")}`}
              </Text>
              <Badge
                label={`-${discountPercent}%`}
                variant="error"
                size="sm"
                uppercase={false}
              />
            </View>
            {savings > 0 && (
              <Text style={[type.caption, s.savingsText, { color: rgb(tokens["--text-success-primary"]) }]}>
                {`You save ₱${savings.toLocaleString("en-PH")}`}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[s.price, { color: rgb(tokens["--text-brand-primary"]) }]}>
            {`₱${Number(product?.price || 0).toLocaleString("en-PH")}`}
          </Text>
        )}

        <View style={s.metaRow}>
          <View
            style={[
              s.metaPill,
              {
                borderColor: rgb(tokens["--border-neutral-secondary"]),
                backgroundColor: rgb(tokens["--surface-neutral-primary"]),
              },
            ]}
          >
            <StockIndicator stock={product?.stock} tokens={tokens} type={type} />
          </View>

          <View
            style={[
              s.metaPill,
              {
                borderColor: rgb(tokens["--border-neutral-secondary"]),
                backgroundColor: rgb(tokens["--surface-neutral-primary"]),
              },
            ]}
          >
            <View style={s.inlineRow}>
              <InlineStars rating={ratingAverage} tokens={tokens} />
              <Text style={[type.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
                {`${ratingAverage.toFixed(1)} (${ratingCount})`}
              </Text>
            </View>
          </View>
        </View>

        <Divider spacing="sm" />

        <View style={s.descriptionWrap}>
          <Text style={[type.label, { color: rgb(tokens["--text-neutral-primary"]) }]}>
            Description
          </Text>
          <Text style={[type.bodyBase, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            {product?.description || "No description available."}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function SingleProductScreen({ navigation, route }) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  const routeProduct = route?.params?.product;
  const routeId = String(route?.params?.id || routeProduct?.id || routeProduct?._id || "").trim();

  const productState = useSelector((state) => state.products.detailsById[routeId]);
  const product = productState?.item || routeProduct || null;
  const loading = Boolean(productState?.loading);
  const error = productState?.error || null;
  const missingProductId = !routeId;
  const [confirmDelete, setConfirmDelete] = useState(null);
  const productImageUris = useMemo(() => {
    const fromGallery = Array.isArray(product?.images)
      ? product.images.map((entry) => entry?.url).filter(Boolean)
      : [];
    const fallback = product?.image?.url ? [product.image.url] : [];
    return Array.from(new Set([...fromGallery, ...fallback]));
  }, [product]);

  const reviewState = useSelector((state) => state.reviews.productReviews[routeId]);
  const myReview = useSelector((state) => state.reviews.myReviewByProductId[routeId]);
  const deletingReview = useSelector((state) => state.reviews.deleting);
  const topReviews = reviewState?.items || [];
  const isWishlisted = useSelector(
    (state) => state.wishlist.statusByProductId[routeId]
  );

  const loadProduct = useCallback(() => {
    if (!routeId) {
      return;
    }

    dispatch(fetchProductDetail(routeId));
  }, [dispatch, routeId]);

  const handleAddToCart = useCallback(
    (item) => {
      if (!item) return;
      if (Number(item?.stock ?? 0) <= 0) {
        showToast("Out of stock", "error");
        return;
      }
      dispatch(addToCart(item));
      showToast("Item added to cart", "success");
    },
    [dispatch]
  );

  const handleBuyNow = useCallback(
    (item) => {
      if (!item) return;
      if (Number(item?.stock ?? 0) <= 0) {
        showToast("Out of stock", "error");
        return;
      }
      dispatch(addToCart(item));
      navigation.navigate("Checkout");
    },
    [dispatch, navigation]
  );

  useEffect(() => {
    if (routeProduct) {
      dispatch(primeProductDetail(routeProduct));
    }
  }, [dispatch, routeProduct]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useFocusEffect(
    useCallback(() => {
      loadProduct();
    }, [loadProduct])
  );

  useEffect(() => {
    if (routeId) {
      dispatch(fetchProductReviews({ productId: routeId, page: 1, limit: 3, sort: "newest" }));
    }
  }, [dispatch, routeId]);

  useEffect(() => {
    if (currentUser && routeId) {
      dispatch(fetchMyReviewForProduct({ firebaseUser: currentUser, productId: routeId }));
    }
  }, [currentUser, dispatch, routeId]);

  useEffect(() => {
    if (currentUser && routeId) {
      dispatch(fetchWishlistStatus({ firebaseUser: currentUser, productId: routeId }));
    }
  }, [currentUser, dispatch, routeId]);

  const backIcon = useMemo(
    () => <ArrowLeftIcon size={20} color={rgb(tokens["--icon-neutral-primary"])} />,
    [tokens]
  );

  const cartIcon = useMemo(
    () => <ShoppingCartIcon size={16} color={rgb(tokens["--shared-text-on-filled"])} />,
    [tokens]
  );

  const buyNowIcon = useMemo(
    () => <ShoppingBagIcon size={16} color={rgb(tokens["--shared-text-on-filled"])} weight="fill" />,
    [tokens]
  );

  const wishlistIcon = useMemo(
    () => <HeartIcon size={18} color={rgb(tokens["--icon-neutral-primary"])} weight="regular" />,
    [tokens]
  );

  const wishlistIconActive = useMemo(
    () => <HeartIcon size={18} color={rgb(tokens["--icon-brand-primary"])} weight="fill" />,
    [tokens]
  );

  const handleToggleWishlist = useCallback(
    (next) => {
      if (!routeId) return;
      if (!currentUser) {
        showToast("Sign in to use wishlist.", "error");
        return;
      }
      dispatch(
        toggleWishlist({
          firebaseUser: currentUser,
          productId: routeId,
          isWishlisted: Boolean(isWishlisted),
        })
      )
        .unwrap()
        .then(() => showToast(next ? "Added to wishlist." : "Removed from wishlist.", "success"))
        .catch((err) => showToast(err?.message || "Unable to update wishlist.", "error"));
    },
    [currentUser, dispatch, isWishlisted, routeId]
  );

  const handleDeleteReview = useCallback(async () => {
    if (!currentUser || !confirmDelete?.id) {
      setConfirmDelete(null);
      return;
    }

    try {
      await dispatch(
        deleteReview({
          firebaseUser: currentUser,
          reviewId: confirmDelete.id,
        })
      ).unwrap();
      showToast("Review deleted.", "success");
      dispatch(fetchProductReviews({ productId: routeId, page: 1, limit: 3, sort: "newest" }));
    } catch (error) {
      showToast(error?.message || "Failed to delete review.", "error");
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete, currentUser, dispatch, routeId]);

  return (
    <Screen
      scrollable
      safeTop={false}
      edges={["top", "left", "right"]}
      contentContainerStyle={s.content}
    >
      <NavBar
        title="Product"
        leftSlot={
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            {backIcon}
          </Pressable>
        }
      />

      {loading ? (
        <View style={s.centerState}>
          <Spinner size="sm" />
          <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>Loading product…</Text>
        </View>
      ) : missingProductId || error ? (
        <View style={s.centerState}>
          <Text style={[type.bodyBase, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            {missingProductId ? "Missing product id." : error}
          </Text>
          <Button label="Retry" variant="secondary" size="sm" onPress={loadProduct} />
        </View>
      ) : (
        <>
          <ProductImage
            imageUris={productImageUris}
            placeholderColor={rgb(tokens["--surface-neutral-primary"])}
          />

          <ProductInfo product={product} />

          <Card variant="outlined" radius="lg" style={s.actionsCard}>
            <View style={s.actions}>
              <Button
                leftIcon={buyNowIcon}
                label={Number(product?.stock ?? 0) <= 0 ? "Out of Stock" : "Buy Now"}
                variant="primary"
                fullWidth
                disabled={Number(product?.stock ?? 0) <= 0}
                onPress={() => handleBuyNow(product)}
              />
              <View style={s.actionRow}>
                <AddToCartButton
                  icon={cartIcon}
                  label={Number(product?.stock ?? 0) <= 0 ? "Out of Stock" : "Add to cart"}
                  fullWidth
                  disabled={Number(product?.stock ?? 0) <= 0}
                  onPress={() => handleAddToCart(product)}
                />
                <WishlistButton
                  isWishlisted={Boolean(isWishlisted)}
                  onToggle={handleToggleWishlist}
                  icon={wishlistIcon}
                  activeIcon={wishlistIconActive}
                />
              </View>
            </View>
          </Card>

          <Card variant="outlined" radius="lg" style={s.reviewCard}>
            <View style={s.reviewHeader}>
              <Text style={[type.h3, { color: rgb(tokens["--text-neutral-primary"]) }]}>
                Reviews
              </Text>
              <Pressable
                onPress={() =>
                  navigation.navigate("ProductReviews", {
                    productId: routeId,
                    productName: product?.name || "Product",
                  })
                }
              >
                <Text style={[type.caption, { color: rgb(tokens["--text-brand-primary"]) }]}>
                  See All Reviews
                </Text>
              </Pressable>
            </View>

            {myReview?.isActive ? (
              <View style={s.reviewBadgeRow}>
                <Badge label="You reviewed this item" variant="brand-subtle" size="sm" uppercase={false} />
                <ReviewActionsMenu
                  onEdit={() =>
                    navigation.navigate("ReviewEditor", {
                      productId: routeId,
                      productName: product?.name || "Product",
                    })
                  }
                  onDelete={() => setConfirmDelete(myReview)}
                />
              </View>
            ) : currentUser ? (
              <Button
                label="Write Review"
                variant="secondary"
                size="sm"
                onPress={() =>
                  navigation.navigate("ReviewEditor", {
                    productId: routeId,
                    productName: product?.name || "Product",
                  })
                }
              />
            ) : null}

            {topReviews.length === 0 ? (
              <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                No reviews yet.
              </Text>
            ) : (
              topReviews.map((review) => {
                const isMine = myReview?.id === review.id && review.isActive;
                return (
                  <View
                    key={review.id}
                    style={[
                      s.reviewRow,
                      isMine && { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
                    ]}
                  >
                    <ReviewCard
                      author={review.authorName || "Customer"}
                      rating={Number(review.rating || 0)}
                      date={review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                      body={review.comment}
                      verified
                      rightSlot={
                        isMine ? (
                          <ReviewActionsMenu
                            onEdit={() =>
                              navigation.navigate("ReviewEditor", {
                                productId: routeId,
                                productName: product?.name || "Product",
                              })
                            }
                            onDelete={() => setConfirmDelete(review)}
                          />
                        ) : null
                      }
                    />
                  </View>
                );
              })
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        visible={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteReview}
        title="Delete review?"
        body="This review will be removed from the product page."
        confirmLabel="Delete"
        variant="danger"
        loading={deletingReview}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingTop:    8,
    paddingBottom: 32,
  },
  centerState: {
    paddingHorizontal: 16,
    paddingVertical:   32,
    gap:               12,
    alignItems:        "center",
    justifyContent:    "center",
  },

  // Image
  imageCard: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  imageWrap: {
    borderRadius:   12,
    overflow:       "hidden",
    height:         260,
    alignItems:     "center",
    justifyContent: "center",
  },
  imageCountPill: {
    position:        "absolute",
    right:           10,
    bottom:          10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius:    999,
    // --surface-always-dark is a fixed near-black that never inverts in dark mode
    backgroundColor: "rgba(15,15,15,0.55)",
  },

  // Info card
  infoWrap: {
    padding: 16,
    gap:     12,
  },
  infoCard: {
    marginTop:        14,
    marginHorizontal: 16,
  },
  categoryChip: {
    alignSelf:       "flex-start",
    borderWidth:     1,
    borderRadius:    999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  title: {
    lineHeight: 30,
  },
  // price has no exact scale match (24px bold) — keep font + size, colour applied inline
  price: {
    fontFamily:    fonts.ui.bold,
    fontSize:      24,
    letterSpacing: -0.4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  // priceStrike: type.bodySm is applied in JSX; only the decoration remains here
  priceStrike: {
    textDecorationLine: "line-through",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
  },
  metaPill: {
    borderWidth:     1,
    borderRadius:    999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priceBlock: {
    gap: 4,
  },
  // savingsText: type.caption applied in JSX; bold override kept here
  savingsText: {
    fontFamily: fonts.ui.bold,
  },
  starsRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           2,
  },
  descriptionWrap: {
    marginTop: 4,
    gap:       6,
  },

  // Actions card
  actionsCard: {
    marginTop:        18,
    marginHorizontal: 16,
  },
  actions: {
    paddingHorizontal: 12,
    paddingVertical:   12,
    gap:               12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },

  // Reviews card
  reviewCard: {
    marginTop:        18,
    marginHorizontal: 16,
    padding:          14,
    gap:              12,
  },
  reviewHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            10,
  },
  reviewBadgeRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            10,
  },
  reviewRow: {
    borderRadius:    8,
    paddingHorizontal: 6,
  },
});
