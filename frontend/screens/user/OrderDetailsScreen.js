import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  PackageIcon,
  MapPinIcon,
  CreditCardIcon,
  ReceiptIcon,
  ImageIcon,
} from "phosphor-react-native";

import Screen from "@components/layout/Screen";
import Card from "@components/layout/Card";
import Button from "@components/action/Button";
import Badge from "@components/display/Badge";
import SectionHeader from "@components/display/SectionHeader";
import ConfirmDialog from "@components/overlay/ConfirmDialog";
import ReviewActionsMenu from "@components/overlay/ReviewActionsMenu";
import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts } from "@typography/fonts";
import { useAuth } from "../../context/store/auth";
import { fetchOrderDetails } from "../../redux/slices/orderSlice";
import { deleteReview, fetchMyReviews } from "../../redux/slices/reviewSlice";
import { showToast } from "@utils/toastBus";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCREEN_PAD = 16;

const STATUS_BADGE_VARIANT = {
  pending: "warning",
  shipped: "brand-subtle",
  delivered: "success",
  cancelled: "error",
};

function formatPrice(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH")}`;
}

// ─── Line item card ───────────────────────────────────────────────────────────
function LineItem({
  item,
  review,
  canReview,
  onWriteReview,
  onEditReview,
  onDeleteReview,
  tokens,
  ts,
}) {
  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);

  return (
    <View style={s.lineItem}>
      {/* Product thumbnail */}
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={[
            s.productImage,
            { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            s.productImage,
            s.productImageFallback,
            { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
          ]}
        >
          <ImageIcon
            size={18}
            color={rgb(tokens["--icon-neutral-weak"])}
            weight="light"
          />
        </View>
      )}

      {/* Product info */}
      <View style={s.lineContent}>
        <Text
          style={[ts.label, { fontSize: 13, letterSpacing: -0.2 }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text style={ts.caption}>
          {`Qty ${item.quantity} × ${formatPrice(item.price)}`}
        </Text>

        {/* Review actions (only for delivered orders) */}
        {canReview ? (
          review?.isActive ? (
            <View style={s.reviewRow}>
              <Badge
                label="Reviewed"
                variant="success"
                size="sm"
                uppercase={false}
              />
              <ReviewActionsMenu
                onEdit={onEditReview}
                onDelete={onDeleteReview}
              />
            </View>
          ) : (
            <View style={{ marginTop: 6 }}>
              <Button
                label="Write Review"
                variant="secondary"
                size="sm"
                onPress={onWriteReview}
              />
            </View>
          )
        ) : null}
      </View>

      {/* Line total */}
      <Text style={[ts.label, { fontSize: 13 }]}>
        {formatPrice(lineTotal)}
      </Text>
    </View>
  );
}

// ─── Summary row helper ───────────────────────────────────────────────────────
function SummaryRow({ label, value, bold, tokens, ts }) {
  return (
    <View style={s.summaryRow}>
      <Text style={[ts.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
        {label}
      </Text>
      <Text
        style={[
          bold ? ts.h3 : ts.label,
          bold && { fontSize: 18, letterSpacing: -0.3 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OrderDetailsScreen({ route, navigation }) {
  const tokens = useColors();
  const ts = makeTypeStyles(tokens);
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const { selectedOrder, loadingOrderDetails, error } = useSelector(
    (state) => state.orders
  );
  const { myReviews, deleting } = useSelector((state) => state.reviews);
  const orderId = route?.params?.id;
  const order =
    selectedOrder && selectedOrder.id === orderId ? selectedOrder : null;
  const [confirmDelete, setConfirmDelete] = useState(null);

  const itemCount = useMemo(
    () =>
      (order?.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
    [order]
  );

  const loadOrder = useCallback(() => {
    if (!currentUser || !orderId) return;
    dispatch(fetchOrderDetails({ firebaseUser: currentUser, orderId }));
  }, [currentUser, dispatch, orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (currentUser) {
      dispatch(fetchMyReviews({ firebaseUser: currentUser }));
    }
  }, [currentUser, dispatch]);

  const reviewMap = useMemo(() => {
    const map = new Map();
    (myReviews || []).forEach((review) => {
      if (review?.product) {
        map.set(String(review.product), review);
      }
    });
    return map;
  }, [myReviews]);

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
    } catch (err) {
      showToast(err?.message || "Failed to delete review.", "error");
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete, currentUser, dispatch]);

  const badgeVariant = STATUS_BADGE_VARIANT[order?.status] || "muted";
  const paymentLabel = (order?.paymentMethod || "cash_on_delivery")
    .replace(/_/g, " ");

  return (
    <Screen
      safeTop={false}
      scrollable
      edges={["left", "right", "bottom"]}
      contentContainerStyle={s.content}
    >
      <View style={s.container}>
        <SectionHeader title="Order Details" />

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {loadingOrderDetails ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator
              size="small"
              color={rgb(tokens["--icon-neutral-secondary"])}
            />
          </View>
        ) : error ? (
          /* ── Error ──────────────────────────────────────────────────── */
          <Card variant="outlined" radius="md" padding="md">
            <Text style={[ts.bodySm, { color: rgb(tokens["--text-error-primary"]) }]}>
              {error}
            </Text>
          </Card>
        ) : !currentUser ? (
          <Card variant="outlined" radius="md" padding="lg">
            <View style={s.emptyInner}>
              <View
                style={[
                  s.emptyIconBg,
                  { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
                ]}
              >
                <ReceiptIcon
                  size={28}
                  color={rgb(tokens["--icon-neutral-weak"])}
                  weight="light"
                />
              </View>
              <Text
                style={[
                  ts.h3,
                  { textAlign: "center", marginTop: 16 },
                ]}
              >
                Sign in required
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
                Please log in first to view this order update.
              </Text>
              <View style={{ marginTop: 14 }}>
                <Button
                  label="Go to Sign In"
                  variant="primary"
                  onPress={() => navigation.navigate("Auth")}
                />
              </View>
            </View>
          </Card>
        ) : !order ? (
          /* ── Not found ─────────────────────────────────────────────── */
          <Card variant="outlined" radius="md" padding="lg">
            <View style={s.emptyInner}>
              <View
                style={[
                  s.emptyIconBg,
                  { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
                ]}
              >
                <ReceiptIcon
                  size={28}
                  color={rgb(tokens["--icon-neutral-weak"])}
                  weight="light"
                />
              </View>
              <Text
                style={[
                  ts.h3,
                  { textAlign: "center", marginTop: 16 },
                ]}
              >
                Order not found
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
                This order may have been removed or the link is invalid.
              </Text>
            </View>
          </Card>
        ) : (
          <>
            {/* ── Order summary card ─────────────────────────────────── */}
            <Card variant="outlined" radius="md" padding="none">
              <View style={s.cardBody}>
                {/* Header: order ID + status badge */}
                <View style={s.orderHeader}>
                  <Text style={[ts.label, { flex: 1, letterSpacing: -0.2 }]}>
                    {`Order #${order.id}`}
                  </Text>
                  <Badge
                    label={order.status}
                    variant={badgeVariant}
                    size="sm"
                    uppercase
                  />
                </View>

                {/* Payment method */}
                <View style={s.metaRow}>
                  <CreditCardIcon
                    size={14}
                    color={rgb(tokens["--icon-neutral-secondary"])}
                  />
                  <Text
                    style={[
                      ts.caption,
                      { textTransform: "capitalize" },
                    ]}
                  >
                    {paymentLabel}
                  </Text>
                </View>
              </View>

              {/* Totals footer */}
              <View
                style={[
                  s.cardFooter,
                  { borderTopColor: rgb(tokens["--border-neutral-secondary"]) },
                ]}
              >
                <SummaryRow
                  label={`${itemCount} item${itemCount !== 1 ? "s" : ""}`}
                  value={formatPrice(order.totalAmount)}
                  bold
                  tokens={tokens}
                  ts={ts}
                />
              </View>
            </Card>

            {/* ── Delivery contact card ──────────────────────────────── */}
            {order.checkoutContact ? (
              <Card variant="outlined" radius="md" padding="none">
                <View style={s.cardBody}>
                  <View style={s.cardSectionHeader}>
                    <MapPinIcon
                      size={14}
                      color={rgb(tokens["--icon-neutral-secondary"])}
                    />
                    <Text style={ts.label}>Delivery Contact</Text>
                  </View>

                  <View style={s.contactBlock}>
                    <Text style={ts.bodySm}>
                      {order.checkoutContact.fullName}
                    </Text>
                    <Text style={ts.caption}>
                      {order.checkoutContact.email}
                    </Text>
                    <Text style={ts.caption}>
                      {order.checkoutContact.contactNumber}
                    </Text>
                    <Text style={ts.caption}>
                      {[
                        order.checkoutContact.addressLine1,
                        order.checkoutContact.city,
                        order.checkoutContact.province,
                        order.checkoutContact.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {/* ── Items card ────────────────────────────────────────── */}
            <Card variant="outlined" radius="md" padding="none">
              <View style={s.cardBody}>
                <View style={s.cardSectionHeader}>
                  <PackageIcon
                    size={14}
                    color={rgb(tokens["--icon-neutral-secondary"])}
                  />
                  <Text style={ts.label}>Items</Text>
                </View>

                {(order.items || []).map((lineItem, index) => (
                  <View key={`${lineItem.product || "product"}-${index}`}>
                    {index > 0 ? (
                      <View
                        style={[
                          s.separator,
                          {
                            backgroundColor: rgb(
                              tokens["--border-neutral-secondary"]
                            ),
                          },
                        ]}
                      />
                    ) : null}
                    <LineItem
                      item={lineItem}
                      tokens={tokens}
                      ts={ts}
                      review={reviewMap.get(String(lineItem.product))}
                      canReview={order.status === "delivered" || order.status === "completed"}
                      onWriteReview={() =>
                        navigation.navigate("ReviewEditor", {
                          productId: String(lineItem.product),
                          productName: lineItem.name || "Product",
                        })
                      }
                      onEditReview={() =>
                        navigation.navigate("ReviewEditor", {
                          productId: String(lineItem.product),
                          productName: lineItem.name || "Product",
                        })
                      }
                      onDeleteReview={() =>
                        setConfirmDelete(
                          reviewMap.get(String(lineItem.product))
                        )
                      }
                    />
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}
      </View>

      <ConfirmDialog
        visible={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteReview}
        title="Delete review?"
        body="This review will be removed from the product page."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  container: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 8,
    gap: 12,
  },

  // ── Card sections ────────────────────────────────────────────────────────
  cardBody: {
    padding: SCREEN_PAD,
    gap: 10,
  },
  cardFooter: {
    paddingHorizontal: SCREEN_PAD,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // ── Order header ─────────────────────────────────────────────────────────
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  // ── Contact ──────────────────────────────────────────────────────────────
  contactBlock: {
    gap: 2,
  },

  // ── Line items ───────────────────────────────────────────────────────────
  lineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  lineContent: {
    flex: 1,
    gap: 2,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  productImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  reviewRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  separator: {
    height: 1,
    marginVertical: 12,
  },

  // ── Empty / loading ──────────────────────────────────────────────────────
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
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
