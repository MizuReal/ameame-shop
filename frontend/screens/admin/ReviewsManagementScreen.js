import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { MagnifyingGlassIcon, StarIcon, ChatTeardropTextIcon } from "phosphor-react-native";
import { useDispatch, useSelector } from "react-redux";

import { auth } from "@modules/firebase/client";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import Screen from "@components/layout/Screen";
import Card from "@components/layout/Card";
import SearchBar from "@components/input/SearchBar";
import Dropdown from "@components/input/Dropdown";
import ToggleSwitch from "@components/input/ToggleSwitch";
import Tag from "@components/utility/Tag";
import Accordion from "@components/utility/Accordion";
import Badge from "@components/display/Badge";
import SectionHeader from "@components/display/SectionHeader";
import Alert from "@components/statusFeedback/Alert";
import { adminListCategories, syncAuthSession } from "@utils/authSession";
import {
  clearAdminReviewError,
  clearProductFilter,
  fetchAdminReviews,
  fetchReviewSuggestions,
  setIsActiveFilter,
  setProductFilter,
  setQuery,
  setSortOption,
  toggleCategory,
  toggleRating,
} from "../../redux/slices/adminReviewSlice";

const SORT_OPTIONS = [
  { label: "Most recent", value: "recent" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest rating", value: "highest" },
  { label: "Lowest rating", value: "lowest" },
];

function RatingChip({ value, active, onPress }) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);
  const bg        = rgb(active ? tokens["--surface-brand-primary"]  : tokens["--surface-neutral-primary"]);
  const border    = rgb(active ? tokens["--border-brand-primary"]   : tokens["--border-neutral-secondary"]);
  const text      = rgb(active ? tokens["--shared-text-on-filled"]  : tokens["--text-neutral-primary"]);
  const iconColor = rgb(active ? tokens["--shared-text-on-filled"]  : tokens["--text-neutral-tertiary"]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.ratingChip,
        { backgroundColor: bg, borderColor: border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <StarIcon size={12} weight="fill" color={iconColor} />
      <Text style={[type.caption, { color: text }]}>{value}</Text>
    </Pressable>
  );
}

function mapSortValue(value) {
  switch (value) {
    case "oldest": return { sortKey: "createdAt", sortOrder: "asc" };
    case "highest": return { sortKey: "rating", sortOrder: "desc" };
    case "lowest": return { sortKey: "rating", sortOrder: "asc" };
    default: return { sortKey: "createdAt", sortOrder: "desc" };
  }
}

export default function ReviewsManagementScreen({ navigation }) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);
  const dispatch = useDispatch();
  const debounceRef = useRef(null);

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [screenError, setScreenError] = useState("");

  const { items, loading, error, filters, suggestions, loadingSuggestions } = useSelector(state => state.adminReviews);

  const selectedSort = useMemo(() => {
    if (filters.sortKey === "rating") return filters.sortOrder === "asc" ? "lowest" : "highest";
    return filters.sortOrder === "asc" ? "oldest" : "recent";
  }, [filters.sortKey, filters.sortOrder]);

  const loadReviews = useCallback((page = 1) => {
    if (firebaseUser) dispatch(fetchAdminReviews({ firebaseUser, page }));
  }, [dispatch, firebaseUser]);

  const loadCategories = useCallback(async (user) => {
    try {
      const profile = await syncAuthSession(user);
      if (profile.role !== 1 || profile.isActive === false) { setScreenError("Unauthorized."); return; }
      const next = await adminListCategories(user);
      setCategories(Array.isArray(next) ? next : []);
    } catch (err) { setScreenError(err?.message); }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setFirebaseUser(user || null);
      if (!user) { setScreenError("Sign in as admin."); return; }
      await loadCategories(user);
      loadReviews(1);
    });
    return () => { mounted = false; unsubscribe(); };
  }, [loadCategories, loadReviews]);

  useEffect(() => {
    if (firebaseUser) loadReviews(1);
  }, [firebaseUser, filters.query, filters.productId, filters.categories, filters.ratings, filters.isActive, filters.sortKey, filters.sortOrder, loadReviews]);

  useEffect(() => {
    if (!firebaseUser) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = filters.query.trim();
    if (!query || query.length < 2 || filters.productId) return;
    debounceRef.current = setTimeout(() => dispatch(fetchReviewSuggestions({ firebaseUser, query })), 300);
  }, [dispatch, firebaseUser, filters.productId, filters.query]);

  const selectSuggestion = (item) => {
    dispatch(setProductFilter({ productId: item.id, productName: item.name }));
    dispatch(setQuery(item.name));
  };

  const renderSuggestions = () => {
    if (!filters.query || filters.query.length < 2 || filters.productId || (suggestions.length === 0 && !loadingSuggestions)) return null;
    return (
      <View style={[s.suggestions, { borderColor: rgb(tokens["--border-neutral-secondary"]), backgroundColor: rgb(tokens["--surface-neutral-primary"]) }]}>
        {loadingSuggestions ? <ActivityIndicator size="small" style={{ padding: 10 }} /> : suggestions.map(item => (
          <Pressable key={item.id} onPress={() => selectSuggestion(item)} style={({ pressed }) => [s.suggestionRow, { borderBottomColor: rgb(tokens["--border-neutral-weak"]) }, pressed && { opacity: 0.7 }]}>
            <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-primary"]) }]}>{item.name}</Text>
            <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]}>{item.category}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  const header = (
    <View style={s.headerWrap}>
      <SectionHeader title="Reviews Management" subtitle="REVIEWS" variant="rule" />
      
      <View style={s.searchSection}>
        <SearchBar
          value={filters.query}
          onChangeText={v => { dispatch(setQuery(v)); if (filters.productId && v !== filters.productName) dispatch(clearProductFilter()); }}
          placeholder="Product or user email..."
          onClear={() => { dispatch(setQuery("")); dispatch(clearProductFilter()); dispatch(clearAdminReviewError()); }}
          searchIcon={<MagnifyingGlassIcon size={16} color={rgb(tokens["--text-neutral-tertiary"])} />}
        />
        {renderSuggestions()}
      </View>

      <Card variant="outlined" radius="md" padding="md" style={s.filterCard}>
        <Accordion title="Filters & Sorting" defaultOpen={false} divider={false} bodyOverflowVisible>
          <View style={s.accordionBody}>
            <Dropdown label="Sort Order" value={selectedSort} options={SORT_OPTIONS} onChange={v => dispatch(setSortOption(mapSortValue(v)))} />
            <ToggleSwitch label="Show Deleted Only" value={filters.isActive === false} onValueChange={v => dispatch(setIsActiveFilter(v ? false : undefined))} />
            
            <View style={s.filterGroup}>
              <Text style={type.label}>Category</Text>
              <View style={s.chipRow}>
                {categories.map(c => <Tag key={c.id || c.name} label={c.name} active={filters.categories.includes(c.name)} onPress={() => dispatch(toggleCategory(c.name))} size="sm" />)}
              </View>
            </View>

            <View style={s.filterGroup}>
              <Text style={type.label}>Rating</Text>
              <View style={s.chipRow}>
                {[1,2,3,4,5].map((r) => (
                  <RatingChip
                    key={r}
                    value={String(r)}
                    active={filters.ratings.includes(r)}
                    onPress={() => dispatch(toggleRating(r))}
                  />
                ))}
              </View>
            </View>
          </View>
        </Accordion>
      </Card>

      {(error || screenError) && (
        <Alert variant="error" body={error || screenError} />
      )}
    </View>
  );

  return (
    <Screen edges={["left", "right"]} safeTop={false} style={s.safe}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card variant="outlined" radius="md" padding="md" style={s.reviewCard}>
            <Pressable onPress={() => navigation.navigate("AdminReviewDetail", { reviewId: item.id })} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <View style={s.reviewHead}>
                <View style={s.reviewTitleWrap}>
                  <Text style={type.bodySm} numberOfLines={1}>{item.product?.name || "Product"}</Text>
                  <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]} numberOfLines={1}>
                    {item.user?.displayName || "User"} • {item.user?.email || ""}
                  </Text>
                </View>
                <View style={[s.ratingBadge, { backgroundColor: rgb(tokens["--surface-neutral-primary"]) }]}>
                  <Text style={type.label}>{Number(item.rating || 0).toFixed(1)}</Text>
                  <StarIcon size={12} weight="fill" color={rgb(tokens["--text-neutral-primary"])} />
                </View>
              </View>

              <View style={s.commentBox}>
                <Text style={[type.caption, { color: rgb(tokens["--text-neutral-primary"]), lineHeight: 16 }]} numberOfLines={3}>
                  {item.comment || "No comment."}
                </Text>
              </View>

              <View style={s.badgeRow}>
                {item.verified && <Badge label="Verified" variant="success" size="sm" />}
                {!item.isActive && <Badge label="Deleted" variant="muted" size="sm" />}
              </View>
            </Pressable>
          </Card>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={!loading && <View style={s.empty}><ChatTeardropTextIcon size={40} color={rgb(tokens["--icon-neutral-tertiary"])} /><Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-secondary"]) }]}>No reviews found.</Text></View>}
        contentContainerStyle={s.list}
        onRefresh={() => loadReviews(1)}
        refreshing={loading}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 64, gap: 12 },
  headerWrap: { gap: 16, marginBottom: 8 },
  searchSection: { position: 'relative', zIndex: 100 },
  suggestions: { position: 'absolute', top: 50, left: 0, right: 0, borderRadius: 8, borderWidth: 1, zIndex: 101 },
  suggestionRow: { padding: 12, borderBottomWidth: 1 },
  filterCard: { gap: 12 },
  accordionBody: { gap: 16, paddingTop: 8 },
  filterGroup: { gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reviewCard: { gap: 10 },
  reviewHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  reviewTitleWrap: { flex: 1, gap: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  commentBox: { paddingVertical: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  empty: { paddingVertical: 60, alignItems: 'center', gap: 12 },
});