import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ArrowLeftIcon } from "phosphor-react-native";

import { useColors }      from "@colors/colorContext";
import { rgb }            from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";

import Screen        from "@components/layout/Screen";
import NavBar        from "@components/navigation/NavBar";
import Divider       from "@components/layout/Divider";
import SectionHeader from "@components/display/SectionHeader";
import Checkbox      from "@components/input/Checkbox";
import Tag           from "@components/utility/Tag";
import Button        from "@components/action/Button";
import { fetchDiscountOptions } from "@utils/productSearch";

// ─── Static filter options (replace with API data) ────────────────────────────

const SORT_OPTIONS = [
  { key: "newest",     label: "Newest" },
  { key: "price_asc",  label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "rating",     label: "Top rated" },
];

const PRICE_PRESETS = [
  { label: "Under ₱5,000",  value: 5000 },
  { label: "Under ₱10,000", value: 10000 },
  { label: "Under ₱20,000", value: 20000 },
  { label: "Under ₱50,000", value: 50000 },
];

const MIN_PRICE_PRESETS = [
  { label: "Over ₱1,000",  value: 1000 },
  { label: "Over ₱5,000",  value: 5000 },
  { label: "Over ₱10,000", value: 10000 },
  { label: "Over ₱20,000", value: 20000 },
];

const DEFAULT_FILTERS = {
  sort:       "newest",
  categories: [],
  minPrice:   null,
  maxPrice:   null,
  minDiscountPercent: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleArrayItem(arr, item) {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function countActiveFilters(f) {
  let n = 0;
  if (f.sort && f.sort !== "newest") n++;
  n += (f.categories ?? []).length;
  if (f.minPrice != null) n++;
  if (f.maxPrice != null) n++;
  if (f.minDiscountPercent != null) n++;
  return n;
}

// ─── Sort option row ──────────────────────────────────────────────────────────

function SortRow({ option, selected, onSelect }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  return (
    <Pressable
      onPress={() => onSelect(option.key)}
      style={({ pressed }) => [s.sortRow, pressed && { opacity: 0.7 }]}
    >
      <Text style={type.bodyBase}>{option.label}</Text>
      <View
        style={[
          s.radio,
          {
            borderColor: selected
              ? rgb(tokens["--border-brand-primary"])
              : rgb(tokens["--border-neutral-secondary"]),
          },
        ]}
      >
        {selected && (
          <View
            style={[
              s.radioDot,
              { backgroundColor: rgb(tokens["--surface-brand-primary"]) },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FilterScreen({
  initialFilters = DEFAULT_FILTERS,
  onApply,
  onBack,
  categories = [],
  categoryError,
}) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  const [draft, setDraft] = useState({
    sort:       initialFilters.sort       ?? "newest",
    categories: initialFilters.categories ?? [],
    minPrice:   initialFilters.minPrice   ?? null,
    maxPrice:   initialFilters.maxPrice   ?? null,
    minDiscountPercent: initialFilters.minDiscountPercent ?? null,
  });
  const [discountOptions, setDiscountOptions] = useState([]);
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  const activeCount = countActiveFilters(draft);

  const handleReset = useCallback(() => setDraft({ ...DEFAULT_FILTERS }), []);

  const handleApply = useCallback(() => onApply?.(draft), [draft, onApply]);

  const setSort       = (v)   => setDraft((d) => ({ ...d, sort: v }));
  const toggleCat     = (key) => setDraft((d) => ({ ...d, categories: toggleArrayItem(d.categories, key) }));
  const setMinPrice   = (v)   => setDraft((d) => ({ ...d, minPrice: d.minPrice === v ? null : v }));
  const setMaxPrice   = (v)   => setDraft((d) => ({ ...d, maxPrice: d.maxPrice === v ? null : v }));
  const setMinDiscount = (v) => setDraft((d) => ({
    ...d,
    minDiscountPercent: d.minDiscountPercent === v ? null : v,
  }));

  useEffect(() => {
    let isMounted = true;
    setDiscountLoading(true);
    setDiscountError("");

    fetchDiscountOptions({ limit: 6 })
      .then((options) => {
        if (!isMounted) return;
        setDiscountOptions(options);
      })
      .catch((error) => {
        if (!isMounted) return;
        setDiscountOptions([]);
        setDiscountError(error?.message || "Failed to load discounts.");
      })
      .finally(() => {
        if (isMounted) {
          setDiscountLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const backIcon = (
    <Pressable onPress={onBack} hitSlop={8}>
      <ArrowLeftIcon size={20} color={rgb(tokens["--icon-neutral-primary"])} />
    </Pressable>
  );

  const resetAction = (
    <Pressable onPress={handleReset}>
      <Text style={[type.bodySm, { color: rgb(tokens["--text-brand-primary"]) }]}>
        Reset{activeCount > 0 ? ` (${activeCount})` : ""}
      </Text>
    </Pressable>
  );

  return (
    <Screen safeTop={false} edges={["left", "right", "bottom"]}>
      <NavBar
        title="Filter & Sort"
        leftSlot={backIcon}
        rightSlot={resetAction}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >

        <SectionHeader
          title="Sort by"
          style={s.sectionHeader}
        />
        <View style={s.section}>
          {SORT_OPTIONS.map((opt, i) => (
            <View key={opt.key}>
              <SortRow
                option={opt}
                selected={draft.sort === opt.key}
                onSelect={setSort}
              />
              {i < SORT_OPTIONS.length - 1 && <Divider spacing="none" />}
            </View>
          ))}
        </View>

        <Divider weight="regular" color="secondary" spacing="sm" />

        <SectionHeader
          title="Category"
          style={s.sectionHeader}
        />
        <View style={s.section}>
          {categories.length === 0 ? (
            <Text style={[type.bodySm, s.emptyCategory, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              {categoryError || "No categories available."}
            </Text>
          ) : (
            categories.map((cat, i) => (
              <View key={cat.id || cat.name}>
                <Checkbox
                  label={cat.name}
                  checked={draft.categories.includes(cat.name)}
                  onChange={() => toggleCat(cat.name)}
                  style={s.checkboxRow}
                />
                {i < categories.length - 1 && <Divider spacing="none" />}
              </View>
            ))
          )}
        </View>

        <Divider weight="regular" color="secondary" spacing="sm" />

        <SectionHeader
          title="Discounts"
          style={s.sectionHeader}
        />
        <View style={s.tagSection}>
          {discountLoading ? (
            <Text style={[type.bodySm, s.emptyCategory, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              Loading discounts…
            </Text>
          ) : discountOptions.length === 0 ? (
            <Text style={[type.bodySm, s.emptyCategory, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              {discountError || "No active discounts right now."}
            </Text>
          ) : (
            discountOptions.map((value) => (
              <Tag
                key={value}
                label={`At least ${value}% off`}
                active={draft.minDiscountPercent === value}
                onPress={() => setMinDiscount(value)}
              />
            ))
          )}
        </View>

        <Divider weight="regular" color="secondary" spacing="sm" />

        <SectionHeader
          title="Min price"
          style={s.sectionHeader}
        />
        <View style={s.tagSection}>
          {MIN_PRICE_PRESETS.map((p) => (
            <Tag
              key={p.value}
              label={p.label}
              active={draft.minPrice === p.value}
              onPress={() => setMinPrice(p.value)}
            />
          ))}
        </View>

        <Divider weight="regular" color="secondary" spacing="sm" />

        <SectionHeader
          title="Max price"
          style={s.sectionHeader}
        />
        <View style={s.tagSection}>
          {PRICE_PRESETS.map((p) => (
            <Tag
              key={p.value}
              label={p.label}
              active={draft.maxPrice === p.value}
              onPress={() => setMaxPrice(p.value)}
            />
          ))}
        </View>

        <View style={s.bottomPad} />

      </ScrollView>

      {/* ── Sticky CTA ────────────────────────────────────────── */}
      <View
        style={[
          s.cta,
          { borderTopColor: rgb(tokens["--border-neutral-weak"]) },
        ]}
      >
        <Button
          label={activeCount > 0 ? `Apply filters (${activeCount})` : "Apply"}
          onPress={handleApply}
          fullWidth
        />
      </View>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SCREEN_PAD = 16;

const s = StyleSheet.create({
  content: { 
    paddingHorizontal: SCREEN_PAD,
    paddingBottom: 8 
  },

  sectionHeader: { },

  section: {
  },

  // Sort row
  sortRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  radio: {
    width:         20,
    height:        20,
    borderRadius:  10,
    borderWidth:   1.5,
    alignItems:    "center",
    justifyContent: "center",
  },
  radioDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },

  // Checkbox rows
  checkboxRow: {
    paddingVertical: 14,
  },
  emptyCategory: {
    paddingVertical: 8,
  },

  // Price tag section
  tagSection: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    gap:            8,
    paddingTop:     8,
    paddingBottom:  4,
  },

  bottomPad: { height: 16 },

  // CTA
  cta: {
    paddingVertical:   14,
    borderTopWidth:    1,
  },
});
