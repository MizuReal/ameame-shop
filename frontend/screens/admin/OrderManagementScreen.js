import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { PackageIcon, ReceiptIcon } from "phosphor-react-native";
import { useDispatch, useSelector } from "react-redux";

import Screen from "@components/layout/Screen";
import Card from "@components/layout/Card";
import Button from "@components/action/Button";
import Badge from "@components/display/Badge";
import Tag from "@components/utility/Tag";
import SectionHeader from "@components/display/SectionHeader";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { useAuth } from "../../context/store/auth";
import {
  fetchAdminOrders,
  updateAdminOrderStatus,
} from "../../redux/slices/orderSlice";

const STATUS_FILTERS = ["", "pending", "shipped", "delivered", "cancelled"];
const PAGE_SIZE = 12;
const LOAD_MORE_COOLDOWN_MS = 500;

const NEXT_STATUS_MAP = {
  pending: "shipped",
  shipped: "delivered",
  delivered: "delivered",
  cancelled: "cancelled",
};

function canCancelStatus(status) {
  return ["pending", "shipped"].includes(status);
}

function getStatusVariant(status) {
  switch (status) {
    case "pending": return "warning";
    case "shipped": return "brand-subtle";
    case "delivered": return "success";
    case "cancelled": return "error";
    default: return "neutral";
  }
}

const OrderCard = memo(function OrderCard({ item, busy, onAdvance, onCancel, tokens, type }) {
  const nextStatus = NEXT_STATUS_MAP[item.status] || item.status;
  const canAdvance = nextStatus !== item.status;
  const canCancel = canCancelStatus(item.status);
  const variant = getStatusVariant(item.status);
  const actionLabel = canAdvance
    ? `Mark as ${nextStatus}`
    : item.status === "cancelled"
      ? "Cancelled"
      : "Delivered";

  return (
    <Card variant="outlined" radius="md" padding="md" style={s.card}>
      <View style={s.cardTop}>
        <View style={s.idRow}>
          <ReceiptIcon size={14} color={rgb(tokens["--icon-neutral-tertiary"])} />
          <Text style={[type.label, { flex: 1 }]} numberOfLines={1}>{`#${item.id}`}</Text>
        </View>
        <Badge label={item.status} variant={variant} size="sm" />
      </View>

      <View style={s.cardBody}>
        <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          {item.user?.email || "Unknown user"}
        </Text>
        <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
          {`${item.items?.length || 0} items — ₱${Number(item.totalAmount || 0).toLocaleString("en-PH")}`}
        </Text>
      </View>

      <View style={s.cardFooter}>
        <Button
          label={actionLabel}
          variant={canAdvance ? "primary" : "ghost"}
          size="sm"
          onPress={() => onAdvance(item)}
          disabled={!canAdvance || busy}
          loading={busy}
          style={{ flex: 1 }}
        />
        {canCancel ? (
          <Button
            label="Cancel order"
            variant="danger"
            size="sm"
            onPress={() => onCancel(item)}
            disabled={busy}
            loading={busy}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    </Card>
  );
});

export default function OrderManagementScreen() {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState("");
  const lastLoadMoreAtRef = useRef(0);

  const {
    adminOrders,
    loadingAdminOrders,
    loadingAdminOrdersMore,
    adminOrdersTotal,
    error,
  } = useSelector(
    (state) => state.orders
  );

  const loadOrders = useCallback((page = 1, append = false) => {
    if (!currentUser) return;

    dispatch(
      fetchAdminOrders({
        firebaseUser: currentUser,
        status: statusFilter,
        page,
        limit: PAGE_SIZE,
        append,
      })
    );
  }, [currentUser, dispatch, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
    loadOrders(1, false);
  }, [loadOrders, statusFilter]);

  const hasMore = adminOrders.length < Number(adminOrdersTotal || 0);

  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    if (now - lastLoadMoreAtRef.current < LOAD_MORE_COOLDOWN_MS) {
      return;
    }

    if (loadingAdminOrders || loadingAdminOrdersMore || !hasMore || !currentUser) {
      return;
    }

    lastLoadMoreAtRef.current = now;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadOrders(nextPage, true);
  }, [
    currentPage,
    currentUser,
    hasMore,
    loadOrders,
    loadingAdminOrders,
    loadingAdminOrdersMore,
  ]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    loadOrders(1, false);
  }, [loadOrders]);

  const handleAdvance = useCallback(
    (order) => {
      const nextStatus = NEXT_STATUS_MAP[order.status] || order.status;
      if (!currentUser || nextStatus === order.status) return;

      Alert.alert(
        "Update order",
        `Move order to ${nextStatus}? User will receive a push notification.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Update",
            onPress: async () => {
              setStatusUpdatingOrderId(order.id);
              try {
                await dispatch(
                  updateAdminOrderStatus({
                    firebaseUser: currentUser,
                    orderId: order.id,
                    status: nextStatus,
                  })
                ).unwrap();
                handleRefresh();
              } catch (updateError) {
                Alert.alert(
                  "Update failed",
                  updateError?.message || "Unable to update order status."
                );
              } finally {
                setStatusUpdatingOrderId("");
              }
            },
          },
        ]
      );
    },
    [currentUser, dispatch, handleRefresh]
  );

  const handleCancel = useCallback(
    (order) => {
      if (!currentUser || !canCancelStatus(order?.status)) return;

      Alert.alert(
        "Cancel order",
        "Cancel this order? User will receive a push notification.",
        [
          { text: "Keep", style: "cancel" },
          {
            text: "Cancel order",
            style: "destructive",
            onPress: async () => {
              setStatusUpdatingOrderId(order.id);
              try {
                await dispatch(
                  updateAdminOrderStatus({
                    firebaseUser: currentUser,
                    orderId: order.id,
                    status: "cancelled",
                  })
                ).unwrap();
                handleRefresh();
              } catch (updateError) {
                Alert.alert(
                  "Cancellation failed",
                  updateError?.message || "Unable to cancel this order."
                );
              } finally {
                setStatusUpdatingOrderId("");
              }
            },
          },
        ]
      );
    },
    [currentUser, dispatch, handleRefresh]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const renderItem = useCallback(
    ({ item }) => (
      <OrderCard
        item={item}
        busy={statusUpdatingOrderId === item.id}
        onAdvance={handleAdvance}
        onCancel={handleCancel}
        tokens={tokens}
        type={type}
      />
    ),
    [handleAdvance, handleCancel, statusUpdatingOrderId, tokens, type]
  );

  const listFooter = useMemo(() => {
    if (!loadingAdminOrdersMore) {
      return <View style={s.listFooterSpacer} />;
    }

    return (
      <View style={s.listFooterLoading}>
        <ActivityIndicator size="small" color={rgb(tokens["--icon-neutral-secondary"])} />
        <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>Loading more orders...</Text>
      </View>
    );
  }, [loadingAdminOrdersMore, tokens, type.caption]);

  return (
    <Screen edges={["left", "right"]} safeTop={false} style={s.safe}>
      <View style={s.container}>
        <SectionHeader
          title="Order Management"
          subtitle="FULFILLMENT"
          variant="bar"
        />

        <View style={s.filterScroll}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={(item) => item || "all"}
            contentContainerStyle={s.filterRow}
            renderItem={({ item }) => (
              <Tag
                label={item || "all"}
                active={statusFilter === item}
                onPress={() => setStatusFilter(item)}
                size="sm"
              />
            )}
          />
        </View>

        {error ? (
          <Text style={[type.caption, { color: rgb(tokens["--text-error-primary"]), marginBottom: 8 }]}>
            {error}
          </Text>
        ) : null}

        {loadingAdminOrders && adminOrders.length > 0 ? (
          <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>Refreshing orders...</Text>
        ) : null}

        <FlatList
          data={adminOrders}
          keyExtractor={keyExtractor}
          style={s.listWrap}
          contentContainerStyle={adminOrders.length ? s.list : s.emptyList}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              {loadingAdminOrders ? (
                <>
                  <ActivityIndicator size="small" color={rgb(tokens["--icon-neutral-secondary"])} />
                  <Text style={[type.label, { color: rgb(tokens["--text-neutral-tertiary"]), marginTop: 10 }]}>Loading orders...</Text>
                </>
              ) : (
                <>
                  <PackageIcon size={48} weight="thin" color={rgb(tokens["--icon-neutral-quaternary"])} />
                  <Text style={[type.label, { color: rgb(tokens["--text-neutral-tertiary"]), marginTop: 12 }]}>
                    No orders found.
                  </Text>
                </>
              )}
            </View>
          }
          refreshing={loadingAdminOrders}
          onRefresh={handleRefresh}
          onEndReachedThreshold={0.5}
          onEndReached={handleLoadMore}
          initialNumToRender={8}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
          ListFooterComponent={listFooter}
          renderItem={renderItem}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  filterScroll: {
    marginHorizontal: -16,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  listWrap: {
    flex: 1,
  },
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  card: {
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  cardBody: {
    gap: 2,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 12,
  },
  listFooterLoading: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  listFooterSpacer: {
    height: 16,
  },
});
