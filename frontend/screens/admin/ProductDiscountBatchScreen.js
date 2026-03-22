import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { MagnifyingGlassIcon, TagIcon, SelectionIcon, PackageIcon } from "phosphor-react-native";

import { auth } from "@modules/firebase/client";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import Button from "@components/action/Button";
import Card from "@components/layout/Card";
import Screen from "@components/layout/Screen";
import Dropdown from "@components/input/Dropdown";
import SearchBar from "@components/input/SearchBar";
import TextInput from "@components/input/TextInput";
import DateInput from "@components/input/DateInput";
import Accordion from "@components/utility/Accordion";
import SectionHeader from "@components/display/SectionHeader";
import Badge from "@components/display/Badge";
import Tag from "@components/utility/Tag";
import { showToast } from "@utils/toastBus";
import {
  adminBatchUpdateProductDiscounts,
  adminListCategories,
  adminListProducts,
  syncAuthSession,
} from "@utils/authSession";

const EMPTY_BULK = {
  discountType: "",
  discountValue: "",
  discountStartAt: "",
  discountEndAt: "",
};

const PRICE_REGEX = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const PAGE_SIZE = 12;
const LOAD_MORE_COOLDOWN_MS = 500;

function mergeById(existingItems, nextItems) {
  const seen = new Set(existingItems.map((item) => item.id));
  const merged = [...existingItems];

  nextItems.forEach((item) => {
    if (!item?.id) return;

    if (seen.has(item.id)) {
      const index = merged.findIndex((entry) => entry.id === item.id);
      if (index >= 0) {
        merged[index] = item;
      }
      return;
    }

    seen.add(item.id);
    merged.push(item);
  });

  return merged;
}

const ProductRow = memo(function ProductRow({ item, selected, onToggle, tokens, type }) {
  const imageUrl = item?.image?.url || item?.images?.[0]?.url || "";

  return (
    <Card 
      variant="outlined" 
      radius="md" 
      padding="md" 
      style={[
        s.productCard,
        selected && { borderColor: rgb(tokens["--border-brand-primary"]), backgroundColor: rgb(tokens["--surface-brand-subtle"]) }
      ]}
    >
      <Pressable onPress={() => onToggle?.(item.id)} style={s.productPressRow}>
        <View style={[s.selectBox, { 
          borderColor: selected ? rgb(tokens["--border-brand-primary"]) : rgb(tokens["--border-neutral-secondary"]),
          backgroundColor: selected ? rgb(tokens["--surface-brand-secondary"]) : "transparent"
        }]}>
          {selected && <Text style={{ color: rgb(tokens["--text-brand-primary"]), fontSize: 10 }}>✓</Text>}
        </View>

        <View style={s.productThumbWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.productThumb} />
          ) : (
            <View style={[s.productThumb, { backgroundColor: rgb(tokens["--surface-neutral-subtle"]), alignItems: 'center', justifyContent: 'center' }]}>
               <PackageIcon size={18} color={rgb(tokens["--icon-neutral-tertiary"])} />
            </View>
          )}
        </ View>

        <View style={s.productInfo}>
          <Text style={type.label} numberOfLines={1}>{item.name}</Text>
          <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            {item.category} • ₱{Number(item.price || 0).toLocaleString("en-PH")}
          </Text>
        </View>
      </Pressable>
    </Card>
  );
});

export default function ProductDiscountBatchScreen() {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const lastLoadMoreAtRef = useRef(0);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulk, setBulk] = useState(EMPTY_BULK);
  const [bulkErrors, setBulkErrors] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const categoryValues = useMemo(() => categories.map(item => item.name), [categories]);

  const discountTypeOptions = useMemo(() => [
    { label: "No discount", value: "" },
    { label: "Percent (%)", value: "percent" },
    { label: "Fixed (₱)", value: "fixed" },
  ], []);

  const filterCategoryOptions = useMemo(() => [
    "all",
    ...categoryValues,
  ], [categoryValues]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    return products.filter(item => {
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      const matchesMin = min === null || Number(item.price) >= min;
      const matchesMax = max === null || Number(item.price) <= max;
      return matchesSearch && matchesCategory && matchesMin && matchesMax;
    });
  }, [products, searchQuery, filterCategory, minPrice, maxPrice]);

  const selectedCount = selectedIds.size;

  const loadProducts = useCallback(async (
    signedInUser,
    { asRefresh = false, page = 1, append = false } = {}
  ) => {
    if (!signedInUser) return;
    const isLoadMore = append && page > 1;
    if (isLoadMore) {
      setLoadingMoreProducts(true);
    } else if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const profile = await syncAuthSession(signedInUser);
      if (profile.role !== 1 || profile.isActive === false) throw new Error("Unauthorized.");

      const shouldLoadCategories = page === 1;
      const [productsResponse, nextCategories] = await Promise.all([
        adminListProducts(signedInUser, {
          page,
          limit: PAGE_SIZE,
          includeMeta: true,
        }),
        shouldLoadCategories ? adminListCategories(signedInUser) : Promise.resolve(null),
      ]);

      const nextProducts = Array.isArray(productsResponse?.products)
        ? productsResponse.products
        : [];

      setProducts((prev) => (append ? mergeById(prev, nextProducts) : nextProducts));
      setCurrentPage(Number(productsResponse?.page || page));
      setTotalProducts(Number(productsResponse?.total || nextProducts.length));

      if (Array.isArray(nextCategories)) {
        setCategories(nextCategories);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMoreProducts(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setFirebaseUser(user || null);
      if (!user) { setError("Sign in as admin."); setProducts([]); setLoading(false); return; }
      await loadProducts(user, { page: 1, append: false });
    });
    return () => { isMounted = false; unsubscribe(); };
  }, [loadProducts]);

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => setSelectedIds(new Set(filteredProducts.map(p => p.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const hasMore = products.length < Number(totalProducts || 0);

  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    if (now - lastLoadMoreAtRef.current < LOAD_MORE_COOLDOWN_MS) {
      return;
    }

    if (loading || refreshing || loadingMoreProducts || !hasMore || !firebaseUser) {
      return;
    }

    lastLoadMoreAtRef.current = now;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadProducts(firebaseUser, { page: nextPage, append: true });
  }, [
    currentPage,
    firebaseUser,
    hasMore,
    loadProducts,
    loading,
    loadingMoreProducts,
    refreshing,
  ]);

  const handleRefresh = useCallback(() => {
    if (!firebaseUser) return;
    setCurrentPage(1);
    loadProducts(firebaseUser, { asRefresh: true, page: 1, append: false });
  }, [firebaseUser, loadProducts]);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderItem = useCallback(
    ({ item }) => (
      <ProductRow
        item={item}
        selected={selectedIds.has(item.id)}
        onToggle={toggleSelected}
        tokens={tokens}
        type={type}
      />
    ),
    [selectedIds, tokens, type]
  );

  const listFooter = useMemo(() => {
    if (!loadingMoreProducts) {
      return <View style={s.listFooterSpacer} />;
    }

    return (
      <View style={s.listFooterLoading}>
        <ActivityIndicator size="small" color={rgb(tokens["--icon-neutral-secondary"])} />
        <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>Loading more products...</Text>
      </View>
    );
  }, [loadingMoreProducts, tokens, type.caption]);

  const applyBulkDiscounts = async () => {
    if (!firebaseUser || selectedCount === 0) return;
    const errors = {};
    if (bulk.discountType && bulk.discountValue && !PRICE_REGEX.test(bulk.discountValue)) {
      errors.discountValue = "Invalid value.";
    }
    setBulkErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBulkSaving(true);
    try {
      const updated = await adminBatchUpdateProductDiscounts(firebaseUser, {
        productIds: Array.from(selectedIds),
        discountType: bulk.discountType,
        discountValue: bulk.discountType ? bulk.discountValue || "0" : "0",
        discountStartAt: bulk.discountStartAt || "",
        discountEndAt: bulk.discountEndAt || "",
      });
      if (updated.length) {
        setProducts(prev => prev.map(p => updated.find(u => u.id === p.id) || p));
      }
      showToast("Batch update successful.", "success");
      setBulk(EMPTY_BULK);
      setSelectedIds(new Set());
    } catch (err) { setError(err.message); } finally { setBulkSaving(false); }
  };

  const header = (
    <View style={s.headerWrap}>
      <SectionHeader title="Batch Discounts" subtitle="PROMOTIONS" variant="bar" />
      
      <Card variant="outlined" radius="md" padding="md" style={s.controlCard}>
            <Accordion title="Search & Filter" defaultOpen={false} divider={false} bodyOverflowVisible>
              <View style={s.accordionBody}>
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery("")} placeholder="Search product name..." />
                <View style={s.filterChips}>
                  {filterCategoryOptions.map((value) => (
                    <Tag
                      key={value}
                      label={value === "all" ? "All Categories" : value}
                      active={filterCategory === value}
                      onPress={() => setFilterCategory(value)}
                      size="sm"
                    />
                  ))}
                </View>
              </View>
            </Accordion>
      </Card>

      <Card variant="outlined" radius="md" padding="md" style={s.controlCard}>
        <View style={s.selectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={type.label}>Selection</Text>
            <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <View style={s.selectionActions}>
             <Button label="All" variant="ghost" size="sm" onPress={selectAllFiltered} />
             <Button label="Clear" variant="ghost" size="sm" onPress={clearSelection} />
          </View>
        </View>

        <View style={s.divider} />

        <Accordion title="Discount Details" defaultOpen={selectedCount > 0} divider={false}>
          <View style={s.accordionBody}>
            <Dropdown label="Type" value={bulk.discountType} options={discountTypeOptions} onChange={v => setBulk(b => ({ ...b, discountType: v }))} />
            <TextInput label="Value" keyboardType="numeric" value={bulk.discountValue} onChangeText={v => setBulk(b => ({ ...b, discountValue: v }))} error={bulkErrors.discountValue} />
            <View style={s.priceRow}>
              <View style={{ flex: 1 }}><DateInput label="Starts" value={bulk.discountStartAt} onChange={v => setBulk(b => ({ ...b, discountStartAt: v }))} placeholder="Select start date" /></View>
              <View style={{ flex: 1 }}><DateInput label="Ends" value={bulk.discountEndAt} onChange={v => setBulk(b => ({ ...b, discountEndAt: v }))} placeholder="Select end date" /></View>
            </View>
            <Button label={bulkSaving ? "Applying..." : "Apply Batch Update"} onPress={applyBulkDiscounts} loading={bulkSaving} disabled={bulkSaving || selectedCount === 0} variant="primary" />
          </View>
        </Accordion>
      </Card>

      {error ? <Card variant="outlined" radius="md" padding="md" style={{ borderColor: rgb(tokens["--border-error-weak"]) }}><Text style={[type.caption, { color: rgb(tokens["--text-error-primary"]) }]}>{error}</Text></Card> : null}
    </View>
  );

  return (
    <Screen edges={["left", "right"]} safeTop={false} style={s.safe}>
      <FlatList
        data={filteredProducts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReachedThreshold={0.5}
        onEndReached={handleLoadMore}
        initialNumToRender={8}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        ListFooterComponent={listFooter}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 64, gap: 12 },
  headerWrap: { gap: 16, marginBottom: 8 },
  controlCard: { gap: 12 },
  accordionBody: { gap: 12, paddingTop: 8 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectionActions: { flexDirection: 'row', gap: 4 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginHorizontal: -16 },
  priceRow: { flexDirection: 'row', gap: 12 },
  productCard: { padding: 8 },
  productPressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectBox: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  productThumbWrap: { width: 44, height: 44, borderRadius: 6, overflow: 'hidden' },
  productThumb: { width: '100%', height: '100%' },
  productInfo: { flex: 1, gap: 2 },
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
