import { memo, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { TagIcon, InfoIcon, MagnifyingGlassIcon } from "phosphor-react-native";

import { auth } from "@modules/firebase/client";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import Button from "@components/action/Button";
import Card from "@components/layout/Card";
import Screen from "@components/layout/Screen";
import SearchBar from "@components/input/SearchBar";
import TextInput from "@components/input/TextInput";
import SectionHeader from "@components/display/SectionHeader";
import Accordion from "@components/utility/Accordion";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategories,
  adminUpdateCategory,
  syncAuthSession,
} from "@utils/authSession";

const CATEGORY_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 &'()-]{1,39}$/;
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

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
};

function normalizeCategoryName(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

const CategoryItem = memo(function CategoryItem({ item, onEdit, onDelete, deleteBusyId, tokens, type }) {
  return (
    <Card variant="outlined" radius="md" padding="md" style={s.itemCard}>
      <View style={s.itemRow}>
        <View style={[s.iconBox, { backgroundColor: rgb(tokens["--base-canvas"]) }]}>
          <TagIcon size={20} color={rgb(tokens["--text-neutral-primary"])} />
        </View>
        <View style={s.itemInfo}>
          <Text style={type.label}>{item.name}</Text>
          <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]} numberOfLines={1}>
            {item.description || "No description"}
          </Text>
        </View>
      </View>

      <View style={s.itemActions}>
        <Button label="Edit" variant="secondary" onPress={() => onEdit(item)} size="sm" style={{ flex: 1 }} />
        <Button
          label="Delete"
          variant="danger"
          onPress={() => onDelete(item)}
          loading={deleteBusyId === item.id}
          disabled={deleteBusyId === item.id}
          size="sm"
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
});

export default function CategoryCrudScreen() {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const lastLoadMoreAtRef = useRef(0);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(item => 
      item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const loadCategories = useCallback(async (
    signedInUser,
    { asRefresh = false, page = 1, append = false } = {}
  ) => {
    if (!signedInUser) return;
    const isLoadMore = append && page > 1;
    if (isLoadMore) {
      setLoadingMore(true);
    } else if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const profile = await syncAuthSession(signedInUser);
      if (profile.role !== 1 || profile.isActive === false) throw new Error("Unauthorized.");
      const response = await adminListCategories(signedInUser, {
        page,
        limit: PAGE_SIZE,
        includeMeta: true,
      });
      const nextCategories = Array.isArray(response?.categories) ? response.categories : [];
      setCategories((prev) => (append ? mergeById(prev, nextCategories) : nextCategories));
      setCurrentPage(Number(response?.page || page));
      setTotalCategories(Number(response?.total || nextCategories.length));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setFirebaseUser(user || null);
      if (!user) { setError("Sign in as admin."); setCategories([]); setLoading(false); return; }
      await loadCategories(user, { page: 1, append: false });
    });
    return () => { isMounted = false; unsubscribe(); };
  }, [loadCategories]);

  const resetForm = () => { setForm(EMPTY_FORM); setFieldErrors({}); };

  const validateForm = () => {
    const errors = {};
    const nName = normalizeCategoryName(form.name);
    if (!nName) errors.name = "Required."; else if (!CATEGORY_NAME_REGEX.test(nName)) errors.name = "Invalid format.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async () => {
    if (!firebaseUser || !validateForm()) return;
    setSaving(true);
    setError("");
    const payload = {
      name: normalizeCategoryName(form.name),
      description: String(form.description || "").trim(),
    };
    try {
      if (form.id) {
        const updated = await adminUpdateCategory(firebaseUser, form.id, payload);
        setCategories(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      } else {
        const created = await adminCreateCategory(firebaseUser, payload);
        setCategories(prev => [created, ...prev]);
        setTotalCategories((prev) => Number(prev || 0) + 1);
      }
      resetForm();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const onEdit = useCallback((category) => {
    setForm({ id: category.id, name: category.name || "", description: category.description || "" });
    setFieldErrors({});
  }, []);

  const onDelete = useCallback((category) => {
    Alert.alert("Delete", `Delete ${category.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeleteBusyId(category.id);
        try {
          await adminDeleteCategory(firebaseUser, category.id);
          setCategories(prev => prev.filter(item => item.id !== category.id));
          setTotalCategories((prev) => Math.max(0, Number(prev || 0) - 1));
          if (form.id === category.id) resetForm();
        } catch (err) { setError(err.message); } finally { setDeleteBusyId(""); }
      }},
    ]);
  }, [firebaseUser, form.id]);

  const hasMore = categories.length < Number(totalCategories || 0);

  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    if (now - lastLoadMoreAtRef.current < LOAD_MORE_COOLDOWN_MS) {
      return;
    }

    if (loading || refreshing || loadingMore || !hasMore || !firebaseUser) {
      return;
    }

    lastLoadMoreAtRef.current = now;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadCategories(firebaseUser, { page: nextPage, append: true });
  }, [
    categories.length,
    currentPage,
    firebaseUser,
    hasMore,
    loadCategories,
    loading,
    loadingMore,
    refreshing,
  ]);

  const handleRefresh = useCallback(() => {
    if (!firebaseUser) return;
    setCurrentPage(1);
    loadCategories(firebaseUser, { asRefresh: true, page: 1, append: false });
  }, [firebaseUser, loadCategories]);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderItem = useCallback(
    ({ item }) => (
      <CategoryItem
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
        deleteBusyId={deleteBusyId}
        tokens={tokens}
        type={type}
      />
    ),
    [deleteBusyId, onDelete, onEdit, tokens, type]
  );

  const listFooter = useMemo(() => {
    if (!loadingMore) {
      return <View style={s.listFooterSpacer} />;
    }

    return (
      <View style={s.listFooterLoading}>
        <ActivityIndicator size="small" color={rgb(tokens["--icon-neutral-secondary"])} />
        <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>Loading more categories...</Text>
      </View>
    );
  }, [loadingMore, tokens, type.caption]);

  const header = (
    <View style={s.headerWrap}>
      <SectionHeader title="Category Management" subtitle="TAXONOMY" variant="bar" />

      <Accordion title={form.id ? "Edit Category" : "Create Category"} defaultOpen={!!form.id}>
        <View style={s.formWrapper}>
          <TextInput label="Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} error={fieldErrors.name} placeholder="e.g. Manga" />
          <TextInput label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline numberOfLines={3} placeholder="Optional..." />
          <Button label={saving ? "Saving..." : form.id ? "Update Category" : "Create Category"} onPress={onSubmit} loading={saving} variant="primary" />
          {form.id && <Button variant="ghost" label="Cancel Edit" onPress={resetForm} size="sm" />}
        </View>
      </Accordion>

      <Card variant="outlined" radius="md" padding="md" style={s.filterCard}>
         <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery("")} placeholder="Search categories..." />
      </Card>

      {error ? <Card variant="outlined" radius="md" padding="md" style={{ borderColor: rgb(tokens["--border-error-weak"]) }}><Text style={[type.caption, { color: rgb(tokens["--text-error-primary"]) }]}>{error}</Text></Card> : null}
    </View>
  );

  return (
    <Screen edges={["left", "right"]} safeTop={false} style={s.safe}>
      <FlatList
        data={filteredCategories}
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
  formWrapper: { gap: 12, paddingTop: 8 },
  filterCard: { padding: 4, borderWidth: 0, backgroundColor: 'transparent' },
  itemCard: { gap: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, gap: 2 },
  itemActions: { flexDirection: 'row', gap: 8 },
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
