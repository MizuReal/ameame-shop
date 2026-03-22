import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  PackageIcon,
  ClockIcon,
  ArrowRightIcon,
  ReceiptIcon,
} from "phosphor-react-native";

import Screen from "@components/layout/Screen";
import Card from "@components/layout/Card";
import SearchBar from "@components/input/SearchBar";
import Tag from "@components/utility/Tag";
import Badge from "@components/display/Badge";
import SectionHeader from "@components/display/SectionHeader";
import Button from "@components/action/Button";
import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { useAuth } from "../../context/store/auth";
import { fetchMyOrders } from "../../redux/slices/orderSlice";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCREEN_PAD = 16;

const STATUS_OPTIONS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE_VARIANT = {
  pending: "warning",
  shipped: "brand-subtle",
  delivered: "success",
  cancelled: "error",
};

function formatPrice(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ─── Order row ────────────────────────────────────────────────────────────────
function OrderRow({ item, onPress, tokens, ts }) {
  const itemCount = item.items?.length || 0;
  const badgeVariant = STATUS_BADGE_VARIANT[item.status] || "muted";
  const dateLabel = formatDate(item.createdAt || item.dateOrdered);

  return (
    <Card variant="outlined" radius="md" padding="none" onPress={onPress}>
      <View style={s.rowBody}>
        {/* Top: order ID + status badge */}
        <View style={s.rowTop}>
          <Text style={[ts.label, s.orderId]} numberOfLines={1}>
            {`#${item.id}`}
          </Text>
          <Badge
            label={item.status}
            variant={badgeVariant}
            size="sm"
            uppercase
          />
        </View>

        {/* Meta row: item count + date */}
        <View style={s.rowMeta}>
          <View style={s.rowMetaItem}>
            <PackageIcon
              size={12}
              color={rgb(tokens["--icon-neutral-secondary"])}
            />
            <Text style={[ts.caption, { marginLeft: 4 }]}>
              {`${itemCount} item${itemCount !== 1 ? "s" : ""}`}
            </Text>
          </View>
          {dateLabel ? (
            <View style={s.rowMetaItem}>
              <ClockIcon
                size={12}
                color={rgb(tokens["--icon-neutral-secondary"])}
              />
              <Text style={[ts.caption, { marginLeft: 4 }]}>
                {dateLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Footer: total + arrow */}
      <View
        style={[
          s.rowFooter,
          { borderTopColor: rgb(tokens["--border-neutral-secondary"]) },
        ]}
      >
        <Text
          style={[
            ts.h3,
            { fontSize: 16, letterSpacing: -0.3 },
          ]}
        >
          {formatPrice(item.totalAmount)}
        </Text>
        <ArrowRightIcon
          size={16}
          color={rgb(tokens["--icon-neutral-secondary"])}
        />
      </View>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyOrders({ hasFilters, tokens, ts }) {
  return (
    <Card variant="outlined" radius="md" padding="lg" style={s.emptyCard}>
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
            {
              textAlign: "center",
              marginTop: 16,
            },
          ]}
        >
          {hasFilters ? "No matching orders" : "No orders yet"}
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
          {hasFilters
            ? "Try adjusting your search or filter to find what you're looking for."
            : "Your order history will appear here once you make a purchase."}
        </Text>
      </View>
    </Card>
  );
}

// ─── Not signed in state ──────────────────────────────────────────────────────
function SignInPrompt({ navigation, tokens, ts }) {
  return (
    <Card variant="outlined" radius="md" padding="lg" style={s.emptyCard}>
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
            {
              textAlign: "center",
              marginTop: 16,
            },
          ]}
        >
          Sign in to view orders
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
          Track your purchases, view order details, and manage returns.
        </Text>
        <Button
          label="Sign In"
          onPress={() => navigation.getParent()?.navigate("Auth")}
          style={{ marginTop: 16, width: "100%" }}
          leftIcon={
            <ArrowRightIcon
              size={16}
              color={rgb(tokens["--shared-text-on-filled"])}
            />
          }
        />
      </View>
    </Card>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OrdersScreen({ navigation }) {
  const tokens = useColors();
  const ts = makeTypeStyles(tokens);
  const dispatch = useDispatch();
  const { currentUser, isAuthenticated } = useAuth();
  const { myOrders, loadingMyOrders, error } = useSelector((state) => state.orders);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadOrders = useCallback(() => {
    if (!currentUser) return;
    dispatch(fetchMyOrders({ firebaseUser: currentUser }));
  }, [currentUser, dispatch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return (myOrders || []).filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const items = order.items || [];
      return items.some((line) =>
        String(line?.name || "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [myOrders, searchQuery, statusFilter]);

  const hasFilters = statusFilter !== "all" || searchQuery.trim().length > 0;
  const orderCount = filteredOrders.length;

  if (!isAuthenticated) {
    return (
      <Screen safeTop={false} edges={["left", "right", "bottom"]} style={s.safe}>
        <View style={s.container}>
          <SectionHeader title="Orders" />
          <SignInPrompt navigation={navigation} tokens={tokens} ts={ts} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeTop={false} edges={["left", "right", "bottom"]} style={s.safe}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        refreshing={loadingMyOrders}
        onRefresh={loadOrders}
        ListHeaderComponent={
          <View style={s.header}>
            <SectionHeader
              title="Orders"
              subtitle={orderCount > 0 ? `${orderCount}` : undefined}
            />

            <View style={s.searchWrap}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by product name…"
                onClear={() => setSearchQuery("")}
                returnKeyType="search"
              />
            </View>

            <View style={s.statusFilters}>
              {STATUS_OPTIONS.map((option) => (
                <Tag
                  key={option.key}
                  label={option.label}
                  active={statusFilter === option.key}
                  onPress={() => setStatusFilter(option.key)}
                />
              ))}
            </View>

            {error ? (
              <Text
                style={[
                  ts.bodySm,
                  {
                    color: rgb(tokens["--text-error-primary"]),
                    marginBottom: 8,
                  },
                ]}
              >
                {error}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loadingMyOrders ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator
                size="small"
                color={rgb(tokens["--icon-neutral-secondary"])}
              />
            </View>
          ) : (
            <EmptyOrders hasFilters={hasFilters} tokens={tokens} ts={ts} />
          )
        }
        renderItem={({ item }) => (
          <OrderRow
            item={item}
            tokens={tokens}
            ts={ts}
            onPress={() => navigation.navigate("OrderDetails", { id: item.id })}
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
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 8,
  },
  listContent: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 10,
  },
  header: {
    marginBottom: 4,
  },
  searchWrap: {
    marginBottom: 10,
  },
  statusFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  // ── Order row ─────────────────────────────────────────────────────────────
  rowBody: {
    padding: SCREEN_PAD,
    gap: 8,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  orderId: {
    flex: 1,
    letterSpacing: -0.2,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rowMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_PAD,
    paddingVertical: 12,
    borderTopWidth: 1,
  },

  // ── Empty / loading ───────────────────────────────────────────────────────
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
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
