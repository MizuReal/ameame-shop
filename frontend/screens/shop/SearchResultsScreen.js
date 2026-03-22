import { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ArrowLeftIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  WarningCircleIcon,
} from "phosphor-react-native";

import { useColors }      from "@colors/colorContext";
import { rgb }            from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";

import Screen        from "@components/layout/Screen";
import NavBar        from "@components/navigation/NavBar";
import SearchBar     from "@components/input/SearchBar";
import Divider       from "@components/layout/Divider";
import Grid, { gridItemWidth } from "@components/layout/Grid";
import SkeletonCard  from "@components/statusFeedback/SkeletonCard";
import Button        from "@components/action/Button";
import Tag           from "@components/utility/Tag";
import ProductCard from "@components/layout/ProductCard";

import { showToast } from "@utils/toastBus";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/actions/cartActions";
import { fetchProductsSearch } from "../../redux/slices/productSlice";

// ─── Mock search — replace with real API call ─────────────────────────────────

// API-backed search via productSearch service

// ─── Active filter chips strip ────────────────────────────────────────────────

const SORT_LABELS = {
  price_asc:  "Price ↑",
  price_desc: "Price ↓",
  newest:     "Newest",
  rating:     "Top rated",
};

function ActiveFilters({ filters, onRemove }) {
  const chips = [];

  if (filters.sort && filters.sort !== "newest") {
    chips.push({ key: "sort", label: SORT_LABELS[filters.sort] ?? filters.sort });
  }
  (filters.categories ?? []).forEach((c) =>
    chips.push({ key: `cat_${c}`, label: c.charAt(0).toUpperCase() + c.slice(1) })
  );
  if (filters.maxPrice != null) {
    chips.push({ key: "maxPrice", label: `Under ₱${filters.maxPrice.toLocaleString("en-PH")}` });
  }
  if (filters.minPrice != null) {
    chips.push({ key: "minPrice", label: `Over ₱${filters.minPrice.toLocaleString("en-PH")}` });
  }
  if (filters.minDiscountPercent != null) {
    chips.push({ key: "minDiscountPercent", label: `At least ${filters.minDiscountPercent}% off` });
  }

  if (!chips.length) return null;

  return (
    <View style={s.activeFiltersWrap}>
      {chips.map((chip) => (
        <Tag
          key={chip.key}
          label={chip.label}
          active
          onRemove={() => onRemove(chip.key)}
        />
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ title, body, actionLabel, onAction, icon }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  return (
    <View style={s.emptyWrap}>
      <View
        style={[
          s.emptyIcon,
          { borderColor: rgb(tokens["--border-neutral-secondary"]) },
        ]}
      >
        {icon}
      </View>
      <Text style={[type.h3, s.emptyTitle]}>{title}</Text>
      <Text
        style={[
          type.bodySm,
          s.emptyBody,
          { color: rgb(tokens["--text-neutral-tertiary"]) },
        ]}
      >
        {body}
      </Text>
      {actionLabel ? (
        <View style={s.emptyAction}>
          <Button
            variant="secondary"
            label={actionLabel}
            onPress={onAction}
            size="sm"
            align="center"
            style={{ alignSelf: "center" }}
          />
        </View>
      ) : null}
    </View>
  );
}

// ─── Loading skeleton grid ────────────────────────────────────────────────────

function LoadingGrid({ cardWidth }) {
  const items = Array.from({ length: 6 });
  return (
    <Grid
      data={items}
      columns={GRID_COLS}
      gap={GRID_GAP}
      paddingH={SCREEN_PAD}
      keyExtractor={(_, index) => `skeleton-${index}`}
      renderItem={() => (
        <SkeletonCard variant="product" width={cardWidth} />
      )}
    />
  );
}

// ─── Result count label ───────────────────────────────────────────────────────

function ResultCount({ count }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);
  return (
    <Text
      style={[
        type.caption,
        s.resultCount,
        { color: rgb(tokens["--text-neutral-tertiary"]) },
      ]}
    >
      {count} {count === 1 ? "result" : "results"}
    </Text>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const GRID_COLS  = 2;
const GRID_GAP   = 10;
const SCREEN_PAD = 16;
const SEARCH_PAD = 20;
const SEARCH_PAGE_LIMIT = 20;

export default function SearchResultsScreen({
  query     = "",
  filters   = {},
  onEditSearch,
  onOpenFilters,
  onUpdateFilters,
  onClearFilters,
  onOpenProduct,
}) {
  const tokens = useColors();
  const dispatch = useDispatch();

  const { items: results, loading, isFetchingMore, error, pagination } = useSelector(
    (state) => state.products.search
  );

  const fetchResults = useCallback(async ({ page = 1 } = {}) => {
    await dispatch(
      fetchProductsSearch({
        query,
        filters,
        page,
        limit: SEARCH_PAGE_LIMIT,
      })
    );
  }, [dispatch, filters, query]);

  useEffect(() => {
    fetchResults({ page: 1, append: false });
  }, [fetchResults]);

  const handleLoadMore = useCallback(() => {
    if (loading || isFetchingMore || error) return;

    const currentPage = pagination.page || 1;
    const totalPages = pagination.totalPages || 1;
    if (currentPage >= totalPages) return;

    fetchResults({ page: currentPage + 1, append: true });
  }, [error, fetchResults, isFetchingMore, loading, pagination.page, pagination.totalPages]);

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

  const gridCardWidth = gridItemWidth(GRID_COLS, GRID_GAP, SCREEN_PAD);
  const cardItems = useMemo(
    () =>
      results.map((product = {}) => ({
        id: product.id || String(product._id || ""),
        name: product.name ?? "",
        brand: product.brand || product.category || "",
        stock: Number(product?.stock ?? 0),
        price:
          product.discountActive && Number(product.discountedPrice || 0) > 0
            ? Number(product.discountedPrice || 0)
            : Number(product.price || 0),
        originalPrice: product.discountActive ? Number(product.price || 0) : null,
        badge:
          Number(product?.stock ?? 0) <= 0
            ? { label: "Out of Stock", variant: "error" }
            : product.discountActive
              ? (() => {
                  const pct = Math.round(Number(product.discountPercent || 0));
                  return pct > 0 ? { label: `-${pct}%`, variant: "error" } : product.badge ?? null;
                })()
              : product.badge ?? null,
        rating: Number(product.ratingAverage || 0),
        category: product.category || "",
        imageUri: product.image?.url,
      })),
    [results]
  );

  const cartIcon = useMemo(
    () => <ShoppingCartIcon size={16} color={rgb(tokens["--shared-text-on-filled"])} />,
    [tokens]
  );
  const backIcon = useMemo(
    () => <ArrowLeftIcon size={20} color={rgb(tokens["--icon-neutral-primary"])} />,
    [tokens]
  );
  const funnelIcon = useMemo(
    () => <FunnelIcon size={16} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );
  const emptySearchIcon = useMemo(
    () => <MagnifyingGlassIcon size={32} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );
  const emptyFilterIcon = useMemo(
    () => <FunnelIcon size={32} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );
  const errorIcon = useMemo(
    () => <WarningCircleIcon size={32} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );

  const hasQuery = query.trim().length > 0;
  const hasActiveFilters =
    (filters.sort && filters.sort !== "newest") ||
    (filters.categories ?? []).length > 0 ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.minDiscountPercent != null;

  const handleRemoveFilter = useCallback(
    (key) => {
      if (!onUpdateFilters) return;
      if (key === "sort") {
        onUpdateFilters({ ...filters, sort: "newest" });
        return;
      }
      if (key === "maxPrice") {
        onUpdateFilters({ ...filters, maxPrice: null });
        return;
      }
      if (key === "minPrice") {
        onUpdateFilters({ ...filters, minPrice: null });
        return;
      }
      if (key === "minDiscountPercent") {
        onUpdateFilters({ ...filters, minDiscountPercent: null });
        return;
      }
      if (key.startsWith("cat_")) {
        const categoryKey = key.replace("cat_", "");
        onUpdateFilters({
          ...filters,
          categories: (filters.categories ?? []).filter((c) => c !== categoryKey),
        });
      }
    },
    [filters, onUpdateFilters]
  );

  const handleResetFilters = useCallback(() => {
    if (onClearFilters) {
      onClearFilters();
      return;
    }
    onUpdateFilters?.({
      ...filters,
      categories: [],
      minPrice: null,
      maxPrice: null,
      minDiscountPercent: null,
      sort: "newest",
    });
  }, [filters, onClearFilters, onUpdateFilters]);

  // ── Header rendered above the grid ────────────────────────────────────────
  const listHeader = (
    <>
      {/* Search bar — tap to edit query, filter icon opens FilterScreen */}
      <View style={s.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={() => {}}     // read-only here — tapping goes back to SearchScreen
          placeholder="Search products…"
          onClear={onEditSearch}
          searchIcon={
            <MagnifyingGlassIcon size={16} color={rgb(tokens["--icon-neutral-secondary"])} />
          }
          filterIcon={funnelIcon}
          onFilter={() => onOpenFilters?.()}
          onFocus={onEditSearch}      // any focus attempt navigates back to SearchScreen
        />
        {hasActiveFilters && (
          <View
            style={[
              s.filterActiveDot,
              {
                backgroundColor: rgb(tokens["--surface-brand-primary"]),
                borderColor: rgb(tokens["--base-canvas"]),
              },
            ]}
          />
        )}
      </View>

      {/* Result count */}
      {!loading && !error && (
        <View style={s.resultCountRow}>
          <ResultCount count={pagination.total ?? results.length} />
        </View>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <ActiveFilters filters={filters} onRemove={handleRemoveFilter} />
      )}

      <Divider spacing="sm" />
    </>
  );

  // ── Derive the body to render below the header ────────────────────────────
  const listBody = loading ? (
    <LoadingGrid cardWidth={gridCardWidth} />
  ) : error ? (
    <EmptyState
      title="Something went wrong"
      body={error}
      actionLabel="Retry"
      onAction={fetchResults}
      icon={errorIcon}
    />
  ) : cardItems.length === 0 ? (
    hasActiveFilters ? (
      <EmptyState
        title="No products match your filters"
        body="Try resetting or adjusting your filters."
        actionLabel="Reset filters"
        onAction={handleResetFilters}
        icon={emptyFilterIcon}
      />
    ) : hasQuery ? (
      <EmptyState
        title={`No results for "${query}"`}
        body="Try different keywords."
        actionLabel="Edit search"
        onAction={onEditSearch}
        icon={emptySearchIcon}
      />
    ) : (
      <EmptyState
        title="No products available"
        body="Check back soon for new arrivals."
        icon={emptySearchIcon}
      />
    )
  ) : null;

  return (
    <Screen safeTop={false} edges={["left", "right", "bottom"]}>
      {/* Nav — back arrow only; query lives in the SearchBar below */}
      <NavBar
        border={false}
        leftSlot={
          <Pressable onPress={onEditSearch} hitSlop={8}>
            {backIcon}
          </Pressable>
        }
      />

      <Grid
        data={listBody ? [] : cardItems}
        columns={GRID_COLS}
        gap={GRID_GAP}
        paddingH={SCREEN_PAD}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.7}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listBody}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={s.listFooterLoader}>
              <ActivityIndicator
                size="small"
                color={rgb(tokens["--icon-neutral-secondary"])}
              />
            </View>
          ) : (
            <View style={s.listFooter} />
          )
        }
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            variant="grid"
            cardWidth={gridCardWidth}
            cartIcon={cartIcon}
            onPress={onOpenProduct}
            onCartPress={(cartItem) => handleAddToCart(cartItem)}
          />
        )}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Search bar row
  searchWrap: {
    paddingHorizontal: SEARCH_PAD - SCREEN_PAD,
    paddingTop:        10,
    paddingBottom:     6,
    position:          "relative",
  },
  // Small dot on the filter icon when filters are active
  filterActiveDot: {
    position:     "absolute",
    top:          12,
    right:        10,
    width:        7,
    height:       7,
    borderRadius: 4,
    borderWidth:  1.5,
    zIndex:       1,
  },

  // Result count row
  resultCountRow: {
    paddingHorizontal: SCREEN_PAD,
    paddingBottom:     6,
  },

  // Result count text
  resultCount: {
    letterSpacing: 0.5,
  },

  // Active filter chips
  activeFiltersWrap: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    gap:            6,
    paddingHorizontal: SCREEN_PAD,
    paddingBottom:  8,
  },

  // Loading skeleton grid handled by Grid

  // Empty state
  emptyWrap: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical:   48,
    gap:            12,
  },
  emptyIcon: {
    width:         72,
    height:        72,
    borderRadius:  36,
    borderWidth:   1.5,
    alignItems:    "center",
    justifyContent: "center",
    marginBottom:  4,
  },
  emptyTitle: { textAlign: "center" },
  emptyBody:  { textAlign: "center", lineHeight: 22 },
  emptyAction: {
    alignItems: "center",
    width: "100%",
  },

  listFooter: { height: 32 },
  listFooterLoader: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
