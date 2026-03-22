import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ShoppingCartIcon } from "phosphor-react-native";

import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { fonts } from "@typography/fonts";

import SearchBar from "@components/input/SearchBar";
import SectionHeader from "@components/display/SectionHeader";
import Banner from "@components/display/Banner";
import ImageCarousel from "@components/display/ImageCarousel";
import ScrollList from "@components/layout/ScrollList";
import Button from "@components/action/Button";
import SkeletonCard from "@components/statusFeedback/SkeletonCard";

import { fetchCategories } from "@utils/categoryService";
import { searchProducts } from "@utils/productSearch";

import ProductList from "./ProductList";

const SCREEN_PAD = 16;
const POPULAR_PAGE_LIMIT = 12;
const H_SCROLL_EDGE = 4;
const H_SCROLL_GAP = 8;
const CAROUSEL_HEIGHT = 170;

// Replace with local hero banner images from assets
const CAROUSEL_IMAGES = [
  require("../../../assets/images/heroBanner/hb1.jpg"),
  require("../../../assets/images/heroBanner/hb2.jpg"),
  require("../../../assets/images/heroBanner/hb3.jpg"),
  require("../../../assets/images/heroBanner/hb4.jpg"),
];

function mergeUniqueProducts(existing, incoming) {
  const seen = new Set(existing.map((item) => item.id || item._id));
  const next = [...existing];

  incoming.forEach((item) => {
    const key = item.id || item._id;
    if (!key || seen.has(key)) return;
    seen.add(key);
    next.push(item);
  });

  return next;
}

function CategoryChips({ categories, activeKey, onSelect }) {
  const tokens = useColors();

  return (
    <ScrollList
      data={categories}
      keyExtractor={(item) => item.key}
      paddingH={H_SCROLL_EDGE}
      gap={7}
      style={s.chipsScroll}
      renderItem={({ item }) => {
        const active = item.key === activeKey;

        return (
          <Pressable
            onPress={() => onSelect(item.key)}
            style={[
              s.chip,
              {
                backgroundColor: active
                  ? rgb(tokens["--surface-neutral-strong"])
                  : "transparent",
                borderColor: active
                  ? rgb(tokens["--border-neutral-primary"])
                  : rgb(tokens["--border-neutral-secondary"]),
              },
            ]}
          >
            <Text
              style={[
                s.chipLabel,
                {
                  color: active
                    ? rgb(tokens["--text-neutral-inverted"])
                    : rgb(tokens["--text-neutral-secondary"]),
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

function LoadingRow() {
  const skeletonData = Array(6).fill(null);
  
  return (
    <ScrollList
      data={skeletonData}
      keyExtractor={(_, index) => `skeleton-${index}`}
      snapColumns={2}
      skipEntranceAnimation
      paddingH={H_SCROLL_EDGE}
      paddingV={8}
      gap={H_SCROLL_GAP}
      renderItem={({ itemWidth }) => (
        <SkeletonCard variant="product" width={itemWidth} />
      )}
    />
  );
}

function toCategoryChip(category) {
  return {
    key: category.name,
    label: category.name,
  };
}

export default function ProductContainer({ navigation, onNavigateToSearch, onOpenProduct }) {
  const tokens = useColors();

  const [categories, setCategories] = useState([{ key: "all", label: "All" }]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [newArrivals, setNewArrivals] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMorePopular, setIsFetchingMorePopular] = useState(false);
  const [error, setError] = useState(null);
  const [lastLoadedCategory, setLastLoadedCategory] = useState("all");
  const [popularPagination, setPopularPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: POPULAR_PAGE_LIMIT,
  });

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        const result = await fetchCategories();
        if (!isMounted) return;
        const next = [{ key: "all", label: "All" }, ...result.map(toCategoryChip)];
        setCategories(next);
      } catch {
        if (isMounted) {
          setCategories([{ key: "all", label: "All" }]);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const categoryFilter = activeCategory !== "all" ? [activeCategory] : [];

    try {
      const [latestRes, popularRes] = await Promise.all([
        searchProducts({
          filters: {
            sort: "newest",
            categories: categoryFilter,
          },
          page: 1,
          limit: 8,
        }),
        searchProducts({
          filters: {
            sort: "rating",
            categories: categoryFilter,
          },
          page: 1,
          limit: POPULAR_PAGE_LIMIT,
        }),
      ]);

      setNewArrivals(latestRes.products || []);
      setPopular(popularRes.products || []);
      setPopularPagination(popularRes.pagination || {
        page: 1,
        totalPages: 1,
        total: 0,
        limit: POPULAR_PAGE_LIMIT,
      });
      setLastLoadedCategory(activeCategory);
    } catch (err) {
      setNewArrivals([]);
      setPopular([]);
      setPopularPagination({
        page: 1,
        totalPages: 1,
        total: 0,
        limit: POPULAR_PAGE_LIMIT,
      });
      setError(err?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const loadMorePopular = useCallback(async () => {
    if (loading || isFetchingMorePopular) return;
    if ((popularPagination.page || 1) >= (popularPagination.totalPages || 1)) return;

    const categoryFilter = activeCategory !== "all" ? [activeCategory] : [];
    const nextPage = (popularPagination.page || 1) + 1;

    setIsFetchingMorePopular(true);

    try {
      const response = await searchProducts({
        filters: {
          sort: "rating",
          categories: categoryFilter,
        },
        page: nextPage,
        limit: POPULAR_PAGE_LIMIT,
      });

      const nextProducts = response.products || [];
      setPopular((prev) => mergeUniqueProducts(prev, nextProducts));
      setPopularPagination(response.pagination || popularPagination);
    } finally {
      setIsFetchingMorePopular(false);
    }
  }, [activeCategory, isFetchingMorePopular, loading, popularPagination]);

  const handleNavigateToSearch = useCallback(() => {
    if (onNavigateToSearch) {
      onNavigateToSearch();
      return;
    }

    navigation?.navigate?.("search", { screen: "SearchHome" });
  }, [navigation, onNavigateToSearch]);

  const handleNavigateToDeals = useCallback(() => {
    const canUseDiscount =
      !loading &&
      lastLoadedCategory === activeCategory &&
      maxDiscount > 0;

    const preset = {
      query: "",
      filters: {
        sort: "newest",
        categories: activeCategory !== "all" ? [activeCategory] : [],
        minPrice: null,
        maxPrice: null,
        minDiscountPercent: canUseDiscount ? Math.floor(maxDiscount) : null,
      },
    };

    if (onNavigateToSearch) {
      onNavigateToSearch(preset);
      return;
    }

    navigation?.navigate?.("search", { preset });
  }, [activeCategory, lastLoadedCategory, loading, maxDiscount, navigation, onNavigateToSearch]);

  const handleOpenProduct = useCallback(
    (product) => {
      if (onOpenProduct) {
        onOpenProduct(product);
        return;
      }

      const productId = product?.id || product?._id;
      if (productId) {
        navigation?.navigate?.("Product", {
          id: productId,
          product,
        });
      }
    },
    [navigation, onOpenProduct]
  );

  const cartIcon = useMemo(
    () => <ShoppingCartIcon size={16} color={rgb(tokens["--shared-text-on-filled"])} />,
    [tokens]
  );

  const maxDiscount = useMemo(() => {
    const allProducts = [...newArrivals, ...popular];
    let max = 0;

    allProducts.forEach((product) => {
      if (product?.discountActive !== true) return;

      const originalPrice = Number(product?.price || 0);
      const discountedPrice = Number(product?.discountedPrice || 0);
      const serverPercent = Number(product?.discountPercent || 0);

      let pct = 0;
      if (serverPercent > 0) {
        pct = serverPercent;
      } else if (originalPrice > 0 && discountedPrice > 0 && discountedPrice < originalPrice) {
        pct = ((originalPrice - discountedPrice) / originalPrice) * 100;
      }

      if (pct > max) max = pct;
    });

    return max;
  }, [newArrivals, popular]);

  const bannerCopy = useMemo(() => {
    const categoryLabel =
      activeCategory === "all"
        ? "all categories"
        : activeCategory;

    const effectiveDiscount =
      !loading && lastLoadedCategory === activeCategory ? maxDiscount : 0;
    const displayDiscount = Math.round(effectiveDiscount);

    if (displayDiscount > 0) {
      return {
        eyebrow: "Top deal",
        title: `Up to ${displayDiscount}% off`,
        subtitle: `On ${categoryLabel} right now`,
        actionLabel: "Shop deals",
      };
    }

    return {
      eyebrow: "Fresh drops",
      title: "New arrivals this week",
      subtitle: "Browse the latest picks",
      actionLabel: "Shop",
    };
  }, [activeCategory, lastLoadedCategory, loading, maxDiscount]);

  const seeAll = useCallback(
    (onPress) => (
      <Pressable onPress={onPress}>
        <Text
          style={{
            fontFamily: fonts.ui.medium,
            fontSize: 11,
            color: rgb(tokens["--text-brand-primary"]),
            letterSpacing: 0.5,
          }}
        >
          {"See all ->"}
        </Text>
      </Pressable>
    ),
    [tokens]
  );

  const listHeader = (
    <>
      <Pressable onPress={handleNavigateToSearch} style={s.searchWrap}>
        <View pointerEvents="none">
          <SearchBar
            placeholder="Search products…"
            editable={false}
            showSoftInputOnFocus={false}
          />
        </View>
      </Pressable>

      <View style={s.carouselSpacing} />

      <View style={s.bannerWrap}>
        <Banner
          eyebrow={bannerCopy.eyebrow}
          title={bannerCopy.title}
          subtitle={bannerCopy.subtitle}
          actionLabel={bannerCopy.actionLabel}
          onAction={handleNavigateToDeals}
          variant="dark"
        />
      </View>

      <CategoryChips
        categories={categories}
        activeKey={activeCategory}
        onSelect={setActiveCategory}
      />

      <View style={s.carouselSpacing} />

      <ImageCarousel
        images={CAROUSEL_IMAGES}
        height={CAROUSEL_HEIGHT}
        autoPlay
        autoPlayInterval={3500}
      />

      {error ? (
        <View style={s.errorBox}>
          <Text style={[s.errorText, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>{error}</Text>
          <Button label="Retry" variant="secondary" size="sm" onPress={fetchProducts} />
        </View>
      ) : null}

      <SectionHeader
        title="New Arrivals"
        subtitle="Just in"
        action={seeAll(handleNavigateToSearch)}
        style={s.sectionHeader}
      />

      {loading ? (
        <LoadingRow />
      ) : (
        <ProductList
          variant="scroll"
          products={newArrivals}
          cartIcon={cartIcon}
          onOpenProduct={handleOpenProduct}
        />
      )}

      <SectionHeader
        title="Popular"
        subtitle="Best sellers"
        action={seeAll(handleNavigateToSearch)}
        style={s.sectionHeader}
      />
    </>
  );

  const gridItems = loading ? Array(6).fill(null) : popular;
  const popularFooter = isFetchingMorePopular ? (
    <View style={s.gridFooterLoader}>
      <ActivityIndicator size="small" color={rgb(tokens["--icon-neutral-secondary"])} />
    </View>
  ) : (
    <View style={s.gridFooterSpacer} />
  );

  return (
    <ProductList
      variant="grid"
      products={gridItems}
      cartIcon={cartIcon}
      onOpenProduct={handleOpenProduct}
      listHeader={listHeader}
      listFooter={popularFooter}
      onEndReached={loadMorePopular}
      onEndReachedThreshold={0.7}
    />
  );
}

const s = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: H_SCROLL_EDGE,
    paddingTop: 12,
    paddingBottom: 4,
  },

  carouselSpacing: {
    height: 12,
  },

  loadingContainer: {
    paddingHorizontal: H_SCROLL_EDGE,
    paddingVertical: 8,
  },

  chipsScroll: { flexGrow: 0, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  chipLabel: {
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },

  sectionHeader: { paddingHorizontal: SCREEN_PAD },

  bannerWrap: {
    paddingVertical: 8,
  },

  errorBox: {
    paddingHorizontal: SCREEN_PAD,
    paddingBottom: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
  },

  gridFooterLoader: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  gridFooterSpacer: {
    height: 24,
  },
});
