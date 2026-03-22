import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";

import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import Card from "@components/layout/Card";
import Divider from "@components/layout/Divider";
import Screen from "@components/layout/Screen";
import Tag from "@components/utility/Tag";
import Alert from "@components/statusFeedback/Alert";
import Spinner from "@components/statusFeedback/Spinner";
import SkeletonCard from "@components/statusFeedback/SkeletonCard";
import Button from "@components/action/Button";
import { useAuth } from "../../context/store/auth";
import { adminListOrders, adminListProducts, adminListUsers } from "@utils/authSession";

function KpiCard({ title, value, helper, accent }) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

  return (
    <Card variant="outlined" radius="md" padding="md" style={s.kpiCard}>
      <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
        {title}
      </Text>
      <Text
        style={[
          type.display,
          {
            color: accent
              ? rgb(tokens["--text-brand-primary"])
              : rgb(tokens["--text-neutral-primary"]),
          },
        ]}
      >
        {value}
      </Text>
      {helper ? (
        <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
          {helper}
        </Text>
      ) : null}
    </Card>
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const next = new Date(value);
  if (Number.isNaN(next.getTime())) {
    return "-";
  }

  return next.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount) {
  return `₱${Number(amount || 0).toLocaleString("en-PH")}`;
}

function buildRangeConfig(rangeKey, now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);

  if (rangeKey === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (rangeKey === "7") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (rangeKey === "30") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setMonth(start.getMonth() - 11, 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (rangeKey === "today") {
    const labels = [];
    const indexMap = new Map();
    for (let hour = 0; hour < 24; hour += 1) {
      const label = hour % 6 === 0
        ? String(hour)
        : "";
      labels.push(label);
      indexMap.set(hour, hour);
    }
    const indexForDate = (date) => indexMap.get(date.getHours()) ?? -1;
    return { start, end, labels, indexForDate };
  }

  if (rangeKey === "yr") {
    const labels = [];
    const indexMap = new Map();
    const cursor = new Date(start);
    for (let i = 0; i < 12; i += 1) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      labels.push(
        i % 3 === 0
          ? cursor.toLocaleDateString("en-PH", {
              month: "short",
              year: undefined,
            })
          : ""
      );
      indexMap.set(key, i);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const indexForDate = (date) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return indexMap.has(key) ? indexMap.get(key) : -1;
    };
    return { start, end, labels, indexForDate };
  }

  const labels = [];
  const indexMap = new Map();
  const cursor = new Date(start);
  let idx = 0;
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const label = rangeKey === "30" && idx % 5 !== 0
      ? ""
      : String(cursor.getDate());
    labels.push(label);
    indexMap.set(key, idx);
    idx += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  const indexForDate = (date) => {
    const key = date.toISOString().slice(0, 10);
    return indexMap.has(key) ? indexMap.get(key) : -1;
  };
  return { start, end, labels, indexForDate };
}

function LineChart({ title, labels, values, formatValue }) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);
  const [chartWidth, setChartWidth] = useState(0);
  const chartHeight = 140;
  const maxValue = Math.max(1, ...values);
  const minValue = Math.min(0, ...values);
  const range = Math.max(1, maxValue - minValue);
  const paddingX = 8;
  const paddingY = 10;

  const lineColor = rgb(tokens["--surface-accent-primary"]);

  const points = values.map((value, index) => {
    const xStep = values.length > 1
      ? (chartWidth - paddingX * 2) / (values.length - 1)
      : 0;
    const x = paddingX + xStep * index;
    const normalized = (value - minValue) / range;
    const y = chartHeight - paddingY - normalized * (chartHeight - paddingY * 2);
    return { x, y };
  });
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View style={s.chartBlock}>
      <View style={s.chartHeader}>
        <Text style={type.label}>{title}</Text>
        <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          {formatValue(Math.max(...values, 0))}
        </Text>
      </View>
      <View style={s.chartArea} onLayout={({ nativeEvent }) => setChartWidth(nativeEvent.layout.width)}>
        <Svg width={chartWidth} height={chartHeight} pointerEvents="none">
          <Polyline
            points={pointsAttr}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.5}
          />
          {points.map((point, index) => (
            <Circle
              key={`${title}-pt-${index}`}
              cx={point.x}
              cy={point.y}
              r={3}
              fill={lineColor}
            />
          ))}
        </Svg>
      </View>
      <View style={[s.chartLabelsRow, { paddingHorizontal: paddingX }]}>
        {labels.map((label, index) => (
          <View key={`${title}-label-${index}`} style={s.labelSlot}>
            {label ? (
              <Text
                style={[
                  type.caption,
                  {
                    color: rgb(tokens["--text-neutral-tertiary"]),
                    fontSize: 8,
                    textAlign: "center",
                    width: 32,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

async function countReviewedProducts(firebaseUser) {
  const PAGE_LIMIT = 100;
  const firstPage = await adminListProducts(firebaseUser, {
    page: 1,
    limit: PAGE_LIMIT,
    includeMeta: true,
  });

  let reviewed = firstPage.products.filter((product) => Number(product.ratingCount || 0) > 0).length;
  const totalPages = Math.max(1, Math.ceil(Number(firstPage.total || 0) / PAGE_LIMIT));

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await adminListProducts(firebaseUser, {
      page,
      limit: PAGE_LIMIT,
      includeMeta: true,
    });
    reviewed += nextPage.products.filter((product) => Number(product.ratingCount || 0) > 0).length;
  }

  return reviewed;
}

export default function AdminDashboardHomeScreen({ navigation }) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [productsReviewed, setProductsReviewed] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [rangeKey, setRangeKey] = useState("7");
  const [rangeSeries, setRangeSeries] = useState({ labels: [], orders: [], revenue: [] });

  const loadDashboard = useCallback(
    async ({ asRefresh = false } = {}) => {
      if (!currentUser) {
        setLoading(false);
        setRefreshing(false);
        setError("You must be signed in as admin.");
        return;
      }

      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [
          ordersResponse,
          pendingResponse,
          reviewedCount,
          usersResponse,
          productsResponse,
        ] = await Promise.all([
          adminListOrders(currentUser, { page: 1, limit: 8, includeMeta: true }),
          adminListOrders(currentUser, { status: "pending", page: 1, limit: 1, includeMeta: true }),
          countReviewedProducts(currentUser),
          adminListUsers(currentUser),
          adminListProducts(currentUser, { page: 1, limit: 1, includeMeta: true }),
        ]);

        setRecentOrders(Array.isArray(ordersResponse.orders) ? ordersResponse.orders : []);
        setTotalOrders(Number(ordersResponse.total || 0));
        setPendingOrders(Number(pendingResponse.total || 0));
        setProductsReviewed(Number(reviewedCount || 0));
        const users = Array.isArray(usersResponse) ? usersResponse : [];
        setTotalUsers(users.length);
        setActiveUsers(users.filter((user) => user?.isActive !== false).length);
        setTotalProducts(Number(productsResponse.total || 0));

        const PAGE_LIMIT = 100;
        const firstPage = await adminListOrders(currentUser, { page: 1, limit: PAGE_LIMIT, includeMeta: true });
        const totalPages = Math.max(1, Math.ceil(Number(firstPage.total || 0) / PAGE_LIMIT));
        let orders = Array.isArray(firstPage.orders) ? firstPage.orders : [];
        for (let page = 2; page <= totalPages; page += 1) {
          const nextPage = await adminListOrders(currentUser, { page, limit: PAGE_LIMIT, includeMeta: true });
          orders = orders.concat(Array.isArray(nextPage.orders) ? nextPage.orders : []);
        }
        setAllOrders(orders);
      } catch (requestError) {
        setError(requestError?.message || "Unable to load dashboard data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const { start, end, labels, indexForDate } = buildRangeConfig(rangeKey);
    const orders = Array(labels.length).fill(0);
    const revenue = Array(labels.length).fill(0);

    (allOrders || []).forEach((order) => {
      if (!order?.createdAt) return;
      const created = new Date(order.createdAt);
      if (Number.isNaN(created.getTime())) return;
      if (created < start || created > end) return;
      const idx = indexForDate(created);
      if (idx < 0) return;
      orders[idx] += 1;
      revenue[idx] += Number(order.totalAmount || 0);
    });

    setRangeSeries({ labels, orders, revenue });
  }, [allOrders, rangeKey]);

  return (
    <Screen
      edges={["left", "right"]}
      safeTop={false}
      scrollable
      contentContainerStyle={s.content}
    >
      <View style={s.header}>
        <Text style={type.h2}>Dashboard</Text>
        <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
          A quick snapshot of store activity.
        </Text>
      </View>

      {/* ── KPI grid — 2 columns ─────────────────────────────── */}
      {loading ? (
        <View style={s.kpiGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={s.kpiSkeletonWrap}>
              <SkeletonCard variant="list-row" />
            </View>
          ))}
        </View>
      ) : (
        <View style={s.kpiGrid}>
          <KpiCard title="Total Orders"      value={String(totalOrders)}      helper="All-time" />
          <KpiCard title="Pending"           value={String(pendingOrders)}    helper="Needs fulfillment" accent={pendingOrders > 0} />
          <KpiCard title="Total Products"    value={String(totalProducts)}    helper="Catalog size" />
          <KpiCard title="Reviewed Products" value={String(productsReviewed)} helper="With ≥1 review" />
          <KpiCard title="Total Users"       value={String(totalUsers)}       helper="Registered" />
          <KpiCard title="Active Users"      value={String(activeUsers)}      helper="Active accounts" />
        </View>
      )}

      {/* ── Trend charts ─────────────────────────────────────── */}
      <Card variant="outlined" radius="md" padding="md" style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <Text style={type.label}>Trends</Text>
          <View style={s.rangeRow}>
            {[
              { key: "today", label: "TDY" },
              { key: "7",     label: "7D" },
              { key: "30",    label: "30D" },
              { key: "yr",    label: "YR" },
            ].map((range) => (
              <Tag
                key={range.key}
                label={range.label}
                active={rangeKey === range.key}
                onPress={() => setRangeKey(range.key)}
                size="sm"
              />
            ))}
          </View>
        </View>
        <LineChart
          title="Revenue"
          labels={rangeSeries.labels}
          values={rangeSeries.revenue}
          formatValue={(v) => formatCurrency(v)}
        />
      </Card>

      {/* ── Error ────────────────────────────────────────────── */}
      {error ? (
        <Alert variant="error" title="Unable to load data" body={error} />
      ) : null}

      {/* ── Recent orders ────────────────────────────────────── */}
      <Card variant="outlined" radius="md" padding="md" style={s.recentCard}>
        <View style={s.recentHeader}>
          <Text style={type.label}>Recent Orders</Text>
          <Button
            variant="secondary"
            size="sm"
            label={refreshing ? "Refreshing…" : "Refresh"}
            disabled={loading || refreshing}
            onPress={() => loadDashboard({ asRefresh: true })}
          />
        </View>

        {loading ? (
          <View style={s.spinnerWrap}>
            <Spinner size="sm" />
            <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              Loading…
            </Text>
          </View>
        ) : recentOrders.length === 0 ? (
          <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            No recent orders yet.
          </Text>
        ) : (
          recentOrders.slice(0, 5).map((order, i) => (
            <View key={order.id}>
              {i > 0 && <Divider spacing="none" />}
              <Pressable
                onPress={() => navigation.navigate("OrderManagement")}
                style={({ pressed }) => [s.orderRow, pressed && { opacity: 0.7 }]}
              >
                <View style={s.orderMain}>
                  <Text
                    style={[type.label, { color: rgb(tokens["--text-neutral-primary"]) }]}
                    numberOfLines={1}
                  >
                    {`#${order.id}`}
                  </Text>
                  <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                    {order.user?.email || "Unknown user"}
                  </Text>
                </View>
                <View style={s.orderMetaRight}>
                  <Text style={[type.label, { color: rgb(tokens["--text-neutral-primary"]) }]}>
                    {formatCurrency(order.totalAmount)}
                  </Text>
                  <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                    {`${order.status} · ${formatDate(order.createdAt)}`}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 12,
  },
  header: {
    gap: 4,
    marginBottom: 2,
  },

  // ── KPI grid ─────────────────────────────────────────────
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
  },
  kpiSkeletonWrap: {
    flexBasis: "47%",
    flexGrow: 1,
  },

  // ── Charts ───────────────────────────────────────────────
  chartCard: {
    gap: 14,
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chartBlock: {
    gap: 8,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartArea: {
    height: 140,
    width: "100%",
  },
  chartLabelsRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  labelSlot: {
    flex: 1,
    alignItems: "center",
  },

  // ── Recent orders ─────────────────────────────────────────
  recentCard: {
    gap: 10,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spinnerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  orderMain: {
    flex: 1,
    gap: 2,
  },
  orderMetaRight: {
    alignItems: "flex-end",
    gap: 2,
    maxWidth: 170,
  },
});
