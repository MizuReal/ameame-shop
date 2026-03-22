import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { onAuthStateChanged } from "firebase/auth";
import {
  CameraIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "phosphor-react-native";

import { auth } from "@modules/firebase/client";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import Button from "@components/action/Button";
import IconButton from "@components/action/IconButton";
import Card from "@components/layout/Card";
import Screen from "@components/layout/Screen";
import Dropdown from "@components/input/Dropdown";
import SearchBar from "@components/input/SearchBar";
import TextInput from "@components/input/TextInput";
import Accordion from "@components/utility/Accordion";
import SectionHeader from "@components/display/SectionHeader";
import Badge from "@components/display/Badge";
import Tag from "@components/utility/Tag";
import { showToast } from "@utils/toastBus";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminListCategories,
  adminListProducts,
  adminUpdateProduct,
  syncAuthSession,
} from "@utils/authSession";

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  category: "",
  price: "",
  stock: "",
  discountType: "",
  discountValue: "",
  discountStartAt: "",
  discountEndAt: "",
  isActive: true,
  existingImages: [],
  newImageAssets: [],
};

const PRODUCT_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 .,'&()\/-]{1,79}$/;
const PRICE_REGEX = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const STOCK_REGEX = /^(?:0|[1-9]\d{0,6})$/;
const DESCRIPTION_REGEX = /^[A-Za-z0-9 .,'"&()\-!?/:;%+@#*\n\r]{0,500}$/;
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

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

const ProductItem = memo(function ProductItem({ item, onEdit, onDelete, deleteBusyId, tokens, type }) {
  const productImageUrl = item?.image?.url || item?.images?.[0]?.url || "";

  return (
    <Card variant="outlined" radius="md" padding="md" style={s.productCard}>
      <View style={s.productRow}>
        <View style={s.productThumbWrap}>
          {productImageUrl ? (
            <Image source={{ uri: productImageUrl }} style={s.productThumb} />
          ) : (
            <View style={[s.productThumbPlaceholder, { backgroundColor: rgb(tokens["--surface-neutral-subtle"]) }]}>
              <ImageIcon size={20} color={rgb(tokens["--icon-neutral-tertiary"])} />
            </View>
          )}
        </View>

        <View style={s.productInfo}>
          <Text style={type.label} numberOfLines={1}>{item.name}</Text>
          <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]}> 
            {item.category} • ₱{Number(item.price || 0).toLocaleString("en-PH")}
          </Text>
          <View style={s.productBadges}>
            <Badge label={`Stock: ${item.stock}`} variant="neutral" size="sm" />
            <Badge 
              label={item.isActive ? "Active" : "Inactive"} 
              variant={item.isActive ? "success" : "muted"} 
              size="sm" 
            />
          </View>
        </View>
      </View>

      <View style={s.rowButtons}>
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

export default function ProductCrudScreen({ navigation }) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState("");
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const lastLoadMoreAtRef = useRef(0);

  const categoryValues = useMemo(() => categories.map((item) => item.name), [categories]);

  const formCategoryOptions = useMemo(() => categoryValues.map((value) => ({ label: value, value })), [categoryValues]);

  const discountTypeOptions = useMemo(() => [
    { label: "No discount", value: "" },
    { label: "Percent", value: "percent" },
    { label: "Fixed amount", value: "fixed" },
  ], []);

  const filterCategoryOptions = useMemo(() => [
    "all",
    ...categoryValues,
  ], [categoryValues]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const parsedMinRaw = minPrice.trim() ? Number(minPrice) : null;
    const parsedMaxRaw = maxPrice.trim() ? Number(maxPrice) : null;
    const parsedMin = Number.isFinite(parsedMinRaw) ? parsedMinRaw : null;
    const parsedMax = Number.isFinite(parsedMaxRaw) ? parsedMaxRaw : null;

    return products.filter((item) => {
      const itemName = String(item.name || "").toLowerCase();
      const itemDescription = String(item.description || "").toLowerCase();
      const itemCategory = String(item.category || "").toLowerCase();
      const itemPrice = Number(item.price || 0);

      const matchesSearch = !normalizedQuery
        || itemName.includes(normalizedQuery)
        || itemDescription.includes(normalizedQuery)
        || itemCategory.includes(normalizedQuery);

      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      const matchesMin = parsedMin === null || itemPrice >= parsedMin;
      const matchesMax = parsedMax === null || itemPrice <= parsedMax;

      return matchesSearch && matchesCategory && matchesMin && matchesMax;
    });
  }, [products, searchQuery, filterCategory, minPrice, maxPrice]);

  const previewImageItems = useMemo(() => [
    ...form.existingImages.map((entry) => ({
      key: `existing-${entry.public_id || entry.url}`,
      uri: entry.url,
      source: "existing",
    })),
    ...form.newImageAssets.map((entry, index) => ({
      key: `new-${entry.uri}-${index}`,
      uri: entry.uri,
      source: "new",
    })),
  ], [form.existingImages, form.newImageAssets]);

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
      if (profile.role !== 1 || profile.isActive === false) {
        throw new Error("You do not have permission to manage products.");
      }
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

      if (Array.isArray(nextCategories) && nextCategories.length > 0) {
        setForm((prev) => {
          if (!prev.id && !prev.category) {
            return { ...prev, category: nextCategories[0].name };
          }
          return prev;
        });
      }
    } catch (err) {
      setError(err.message || "Unable to load products.");
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
      if (!user) {
        setError("You must sign in as admin.");
        setProducts([]);
        setLoading(false);
        return;
      }
      await loadProducts(user, { page: 1, append: false });
    });
    return () => { isMounted = false; unsubscribe(); };
  }, [loadProducts]);

  const resetForm = useCallback(() => { setForm(EMPTY_FORM); setFieldErrors({}); }, []);

  const onEdit = useCallback((product) => {
    const existingImages = Array.isArray(product?.images) && product.images.length > 0
      ? product.images.map(e => ({ url: e?.url || "", public_id: e?.public_id || "" })).filter(e => e.url)
      : product?.image?.url ? [{ url: product.image.url, public_id: product.image.public_id || "" }] : [];

    setForm({
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
      discountType: product.discountType || "",
      discountValue: String(product.discountValue ?? ""),
      discountStartAt: formatDateInput(product.discountStartAt),
      discountEndAt: formatDateInput(product.discountEndAt),
      isActive: product.isActive !== false,
      existingImages,
      newImageAssets: [],
    });
  }, []);

  const removePreviewImage = (item) => {
    setForm(prev => {
      if (item.source === "existing") {
        return { ...prev, existingImages: prev.existingImages.filter(e => e.url !== item.uri) };
      }
      return { ...prev, newImageAssets: prev.newImageAssets.filter(e => e.uri !== item.uri) };
    });
  };

  const onPickImage = async () => {
    setPickingImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError("Photo library permission required."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const selected = result.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName || `product-${Date.now()}-${i}.jpg`,
        type: a.mimeType || "image/jpeg",
      })).filter(a => a.uri);
      setForm(prev => ({
        ...prev,
        newImageAssets: [...prev.newImageAssets, ...selected].slice(0, 5 - prev.existingImages.length),
      }));
    } catch (e) { setError(e.message); } finally { setPickingImage(false); }
  };

  const onCaptureImage = async () => {
    setPickingImage(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { setError("Camera permission required."); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setForm(prev => ({
        ...prev,
        newImageAssets: [...prev.newImageAssets, {
          uri: asset.uri,
          name: asset.fileName || `product-${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        }].slice(0, 5 - prev.existingImages.length),
      }));
    } catch (e) { setError(e.message); } finally { setPickingImage(false); }
  };

  const onSubmit = async () => {
    if (!firebaseUser) return;
    const errors = {};
    const nName = form.name.trim();
    if (!nName) errors.name = "Required."; else if (!PRODUCT_NAME_REGEX.test(nName)) errors.name = "Invalid format.";
    if (!form.category) errors.category = "Required.";
    if (!PRICE_REGEX.test(form.price)) errors.price = "Invalid price.";
    if (!STOCK_REGEX.test(form.stock)) errors.stock = "Invalid stock.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      name: nName,
      description: form.description.trim(),
      category: form.category,
      price: form.price,
      stock: form.stock,
      isActive: String(Boolean(form.isActive)),
      discountType: form.discountType,
      discountValue: form.discountType ? form.discountValue || "0" : "0",
      discountStartAt: form.discountStartAt || "",
      discountEndAt: form.discountEndAt || "",
      retainImagePublicIds: JSON.stringify(form.existingImages.map(e => e.public_id).filter(Boolean)),
    };

    setSaving(true);
    try {
      if (form.id) {
        const updated = await adminUpdateProduct(firebaseUser, form.id, payload, form.newImageAssets);
        setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        showToast("Product updated.", "success");
      } else {
        const created = await adminCreateProduct(firebaseUser, payload, form.newImageAssets);
        setProducts(prev => [created, ...prev]);
        setTotalProducts((prev) => Number(prev || 0) + 1);
        showToast("Product created.", "success");
      }
      resetForm();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const onDelete = useCallback((product) => {
    Alert.alert("Delete", `Delete ${product.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeleteBusyId(product.id);
        try {
          await adminDeleteProduct(firebaseUser, product.id);
          setProducts(prev => prev.filter(p => p.id !== product.id));
          setTotalProducts((prev) => Math.max(0, Number(prev || 0) - 1));
          showToast("Deleted.", "success");
        } catch (e) { setError(e.message); } finally { setDeleteBusyId(""); }
      }},
    ]);
  }, [firebaseUser]);

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
      <ProductItem
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

  const header = (
    <View style={s.headerWrap}>
      <SectionHeader title="Product Management" subtitle="PRODUCTS" variant="bar" />

      <Accordion title={form.id ? "Edit Product" : "Create New Product"} defaultOpen={!!form.id}>
        <View style={s.formWrapper}>
          <TextInput label="Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} error={fieldErrors.name} />
          <Dropdown label="Category" value={form.category} options={formCategoryOptions} onChange={v => setForm(f => ({ ...f, category: v }))} error={fieldErrors.category} />
          <View style={s.priceRow}>
            <View style={{ flex: 1 }}><TextInput label="Price" keyboardType="numeric" value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v }))} error={fieldErrors.price} /></View>
            <View style={{ flex: 1 }}><TextInput label="Stock" keyboardType="numeric" value={form.stock} onChangeText={v => setForm(f => ({ ...f, stock: v }))} error={fieldErrors.stock} /></View>
          </View>
          
          <Accordion title="Discounts" defaultOpen={false} divider={false} bodyOverflowVisible>
            <View style={s.accordionBody}>
              <Dropdown label="Type" value={form.discountType} options={discountTypeOptions} onChange={v => setForm(f => ({ ...f, discountType: v }))} />
              <TextInput label="Value" keyboardType="numeric" value={form.discountValue} onChangeText={v => setForm(f => ({ ...f, discountValue: v }))} />
            </View>
          </Accordion>

          <TextInput label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline numberOfLines={3} />

          <View style={s.imageActionsRow}>
            <IconButton icon={<ImageIcon size={18} color={rgb(tokens["--text-neutral-primary"])} />} onPress={onPickImage} />
            <IconButton icon={<CameraIcon size={18} color={rgb(tokens["--text-neutral-primary"])} />} onPress={onCaptureImage} />
            <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              {form.existingImages.length + form.newImageAssets.length}/5 Images
            </Text>
          </View>

          {previewImageItems.length > 0 && (
            <View style={s.previewRow}>
              {previewImageItems.map(item => (
                <View key={item.key} style={s.previewThumbWrap}>
                  <Image source={{ uri: item.uri }} style={s.previewThumb} />
                  <Pressable onPress={() => removePreviewImage(item)} style={s.previewRemoveBtn}><XIcon size={10} color="#fff" /></Pressable>
                </View>
              ))}
            </View>
          )}

          <Button label={saving ? "Saving..." : form.id ? "Update Product" : "Create Product"} onPress={onSubmit} loading={saving} variant="primary" />
          {form.id && <Button variant="ghost" label="Cancel Edit" onPress={resetForm} size="sm" />}
        </View>
      </Accordion>

      <Card variant="outlined" radius="md" padding="md" style={s.filterCard}>
        <Accordion title="Search & Filter" defaultOpen={false} divider={false} bodyOverflowVisible>
          <View style={s.filterBody}>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery("")} placeholder="Search products..." />
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
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 64, gap: 16 },
  headerWrap: { gap: 16, marginBottom: 8 },
  formWrapper: { gap: 12, paddingTop: 8 },
  productCard: { gap: 12 },
  productRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  productThumbWrap: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
  productThumb: { width: '100%', height: '100%' },
  productThumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, gap: 4 },
  productBadges: { flexDirection: 'row', gap: 6 },
  rowButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  priceRow: { flexDirection: 'row', gap: 12 },
  accordionBody: { gap: 12, paddingTop: 8 },
  previewRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  previewThumbWrap: { width: 50, height: 50, borderRadius: 6, overflow: "hidden", position: "relative" },
  previewThumb: { width: "100%", height: "100%" },
  previewRemoveBtn: { position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.5)", width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  imageActionsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  filterCard: { padding: 0, borderWidth: 0, backgroundColor: 'transparent' },
  filterBody: { gap: 12, paddingTop: 8 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
