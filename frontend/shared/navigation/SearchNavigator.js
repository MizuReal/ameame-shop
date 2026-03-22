import { useCallback, useEffect, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SearchScreen from "../../screens/shop/SearchScreen";
import SearchResultsScreen from "../../screens/shop/SearchResultsScreen";
import FilterScreen from "../../screens/shop/FilterScreen";
import { fetchCategories } from "@utils/categoryService";

const Stack = createNativeStackNavigator();

const DEFAULT_FILTERS = {
  categories: [],
  minPrice: null,
  maxPrice: null,
  minDiscountPercent: null,
  sort: "newest",
};

function SearchHomeScreen({
  navigation,
  categories,
  categoryError,
  applyPreset,
  pendingPreset,
  clearParentPreset,
  setQuery,
  setFilters,
  routePreset,
}) {
  const lastRoutePreset = useRef(null);

  useEffect(() => {
    if (!routePreset) return;
    if (routePreset === lastRoutePreset.current) return;
    lastRoutePreset.current = routePreset;
    const applied = applyPreset(routePreset);
    if (applied) {
      navigation?.setParams?.({ preset: undefined });
      clearParentPreset?.();
    }
  }, [applyPreset, clearParentPreset, navigation, routePreset]);

  useEffect(() => {
    if (!pendingPreset) return;
    const applied = applyPreset(pendingPreset);
    if (applied) {
      clearParentPreset?.();
    }
  }, [applyPreset, clearParentPreset, pendingPreset]);

  return (
    <SearchScreen
      categories={categories}
      categoryError={categoryError}
      onSubmit={(text) => {
        setQuery(text);
        setFilters(DEFAULT_FILTERS);
        navigation.navigate("SearchResults");
      }}
      onSelectCategory={(key) => {
        const nextCategories = key && key !== "all" ? [key] : [];
        setQuery("");
        setFilters({ ...DEFAULT_FILTERS, categories: nextCategories });
        navigation.navigate("SearchResults");
      }}
    />
  );
}

function SearchResultsWrapper({
  navigation,
  routePreset,
  applyPreset,
  clearParentPreset,
  query,
  filters,
  onEditSearch,
  onOpenFilters,
  onUpdateFilters,
  onClearFilters,
  onOpenProduct,
}) {
  const lastRoutePreset = useRef(null);

  useEffect(() => {
    if (!routePreset) return;
    if (routePreset === lastRoutePreset.current) return;
    lastRoutePreset.current = routePreset;
    applyPreset(routePreset, { navigateToResults: false });
    navigation?.setParams?.({ preset: undefined });
    clearParentPreset?.();
  }, [applyPreset, clearParentPreset, navigation, routePreset]);

  return (
    <SearchResultsScreen
      query={query}
      filters={filters}
      onEditSearch={onEditSearch}
      onOpenFilters={onOpenFilters}
      onUpdateFilters={onUpdateFilters}
      onClearFilters={onClearFilters}
      onOpenProduct={onOpenProduct}
    />
  );
}

export default function SearchNavigator({ route, navigation }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState(null);
  const [pendingPreset, setPendingPreset] = useState(null);
  const stackNavRef = useRef(null);

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const preset = route?.params?.preset ?? route?.params?.params?.preset;

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        const result = await fetchCategories();
        if (isMounted) {
          setCategories(result);
          setCategoryError(null);
        }
      } catch (error) {
        if (isMounted) {
          setCategories([]);
          setCategoryError(error?.message || "Failed to load categories.");
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const applyPreset = useCallback((nextPreset, options = {}) => {
    const nextQuery = typeof nextPreset?.query === "string" ? nextPreset.query : "";
    const nextFilters = {
      ...DEFAULT_FILTERS,
      ...(nextPreset?.filters || {}),
    };
    setQuery(nextQuery);
    setFilters(nextFilters);
    if (options.navigateToResults === false) {
      return true;
    }
    if (stackNavRef.current?.navigate) {
      stackNavRef.current.navigate("SearchResults");
      return true;
    }
    setPendingPreset(nextPreset);
    return false;
  }, []);

  useEffect(() => {
    if (!preset) return;
    const didNavigate = applyPreset(preset);
    if (didNavigate) {
      navigation?.setParams?.({ preset: undefined });
    }
  }, [applyPreset, navigation, preset]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="SearchHome">
      <Stack.Screen name="SearchHome">
        {({ navigation, route }) => {
          stackNavRef.current = navigation;
          return (
            <SearchHomeScreen
              navigation={navigation}
              categories={categories}
              categoryError={categoryError}
              applyPreset={(nextPreset) => {
                const applied = applyPreset(nextPreset);
                if (applied) {
                  setPendingPreset(null);
                }
                return applied;
              }}
              pendingPreset={pendingPreset}
              clearParentPreset={() => {
                setPendingPreset(null);
                navigation?.getParent?.()?.setParams?.({ preset: undefined });
              }}
              setQuery={setQuery}
              setFilters={setFilters}
              routePreset={route?.params?.preset}
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="SearchResults">
        {({ navigation, route }) => (
          <SearchResultsWrapper
            navigation={navigation}
            routePreset={route?.params?.preset}
            applyPreset={applyPreset}
            clearParentPreset={() => navigation?.getParent?.()?.setParams?.({ preset: undefined })}
            query={query}
            filters={filters}
            onEditSearch={() => navigation.navigate("SearchHome")}
            onOpenFilters={() => navigation.navigate("Filter")}
            onUpdateFilters={setFilters}
            onClearFilters={clearFilters}
            onOpenProduct={(product) => {
              const productId = product?.id || product?._id;
              if (!productId) return;
              navigation.navigate("Product", {
                id: productId,
                product,
              });
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Filter">
        {({ navigation }) => (
          <FilterScreen
            initialFilters={filters}
            categories={categories}
            categoryError={categoryError}
            onApply={(draft) => {
              setFilters(draft);
              navigation.goBack();
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
