import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClockIcon, XIcon, MagnifyingGlassIcon } from "phosphor-react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useColors }      from "@colors/colorContext";
import { rgb }            from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts }          from "@typography/fonts";

import Screen        from "@components/layout/Screen";
import NavBar        from "@components/navigation/NavBar";
import SearchBar     from "@components/input/SearchBar";
import Divider       from "@components/layout/Divider";
import SectionHeader from "@components/display/SectionHeader";
import Tag           from "@components/utility/Tag";
import { searchProducts } from "@utils/productSearch";

// ─── Static data (replace with persisted storage + API) ──────────────────────

const RECENTS_STORAGE_KEY = "search:recentQueries";
const MAX_RECENTS = 8;

const SUGGESTION_LIMIT = 6;

// ─── Autocomplete row ─────────────────────────────────────────────────────────

function SuggestionRow({ text, query, onPress }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  // Bold the matched portion
  const lower    = text.toLowerCase();
  const qLower   = query.toLowerCase();
  const matchIdx = lower.indexOf(qLower);

  let content;
  if (matchIdx === -1) {
    content = <Text style={[type.bodyBase, s.suggestionText]}>{text}</Text>;
  } else {
    const before = text.slice(0, matchIdx);
    const match  = text.slice(matchIdx, matchIdx + query.length);
    const after  = text.slice(matchIdx + query.length);
    content = (
      <Text style={[type.bodyBase, s.suggestionText]}>
        {before}
        <Text style={{ color: rgb(tokens["--text-neutral-primary"]), fontFamily: fonts.ui.bold }}>
          {match}
        </Text>
        {after}
      </Text>
    );
  }

  const searchIcon = useMemo(
    () => <MagnifyingGlassIcon size={16} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );

  return (
    <Pressable
      onPress={() => onPress(text)}
      style={({ pressed }) => [s.suggestionRow, pressed && { opacity: 0.7 }]}
    >
      {searchIcon}
      {content}
    </Pressable>
  );
}

// ─── Recent search row ────────────────────────────────────────────────────────

function RecentRow({ item, onPress, onRemove }) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  const clockIcon = useMemo(
    () => <ClockIcon size={15} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );
  const xIcon = useMemo(
    () => <XIcon size={14} color={rgb(tokens["--icon-neutral-secondary"])} />,
    [tokens]
  );

  return (
    <Pressable
      onPress={() => onPress(item.query)}
      style={({ pressed }) => [s.recentRow, pressed && { opacity: 0.7 }]}
    >
      <View style={s.recentLeft}>
        {clockIcon}
        <Text style={[type.bodyBase, s.recentText]} numberOfLines={1}>
          {item.query}
        </Text>
      </View>
      <Pressable
        onPress={() => onRemove(item.id)}
        hitSlop={8}
        style={s.recentRemove}
      >
        {xIcon}
      </Pressable>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen({
  onSubmit,
  onSelectCategory,
  categories = [],
  categoryError,
}) {
  const tokens = useColors();
  const type   = makeTypeStyles(tokens);

  const [query,   setQuery]   = useState("");
  const [recents, setRecents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadRecents = async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENTS_STORAGE_KEY);
        if (!isMounted) return;
        if (!raw) {
          setRecents([]);
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecents(parsed);
        }
      } catch {
        if (isMounted) {
          setRecents([]);
        }
      }
    };

    loadRecents();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus?.();
      }, 50);
      return () => clearTimeout(timer);
    }, [])
  );


  const persistRecents = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // no-op
    }
  }, []);

  const pushRecent = useCallback(
    (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setRecents((prev) => {
        const normalized = [
          { id: `r_${Date.now()}`, query: trimmed },
          ...prev.filter((item) => item.query.toLowerCase() !== trimmed.toLowerCase()),
        ].slice(0, MAX_RECENTS);
        persistRecents(normalized);
        return normalized;
      });
    },
    [persistRecents]
  );

  const isTyping    = query.length > 0;

  useEffect(() => {
    let isMounted = true;
    let debounceId;

    if (!query.trim()) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    setSuggestionsLoading(true);
    debounceId = setTimeout(async () => {
      try {
        const response = await searchProducts({
          query: query.trim(),
          filters: {},
          page: 1,
          limit: SUGGESTION_LIMIT,
        });
        if (!isMounted) return;
        const names = (response.products || [])
          .map((product) => product?.name)
          .filter(Boolean)
          .slice(0, SUGGESTION_LIMIT);
        setSuggestions(names);
      } catch {
        if (isMounted) {
          setSuggestions([]);
        }
      } finally {
        if (isMounted) {
          setSuggestionsLoading(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(debounceId);
    };
  }, [query]);

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    const trimmed = query.trim();
    pushRecent(trimmed);
    onSubmit?.(trimmed);
  }, [query, onSubmit, pushRecent]);

  const handleSelectSuggestion = useCallback((text) => {
    pushRecent(text);
    onSubmit?.(text);
  }, [onSubmit, pushRecent]);

  const handleSelectRecent = useCallback((q) => {
    onSubmit?.(q);
  }, [onSubmit]);

  const handleRemoveRecent = useCallback((id) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persistRecents(next);
      return next;
    });
  }, [persistRecents]);

  const handleClearAllRecents = useCallback(() => {
    setRecents([]);
    persistRecents([]);
  }, [persistRecents]);

  return (
    <Screen safeTop={false} edges={["left", "right", "bottom"]}>
      <View style={s.searchWrap}>
        <SearchBar
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search products…"
          onClear={() => setQuery("")}
          onSubmit={handleSubmit}
          returnKeyType="search"
          autoFocus={false}
        />
      </View>

      <Divider spacing="sm" />

      {/* ── Typing: autocomplete ─────────────────────────────────── */}
      {isTyping ? (
        <FlatList
          data={suggestions}
          keyExtractor={(item, i) => String(i)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <SuggestionRow
              text={item}
              query={query}
              onPress={handleSelectSuggestion}
            />
          )}
          ListEmptyComponent={
            <View style={s.noSuggestions}>
              <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                {suggestionsLoading
                  ? "Searching…"
                  : `No suggestions for "${query}"`}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <Divider spacing="none" />}
          contentContainerStyle={s.suggestionsContent}
        />
      ) : (

        /* ── Idle: recents + categories ────────────────────────── */
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.idleContent}
        >
          {/* Recent searches */}
          {recents.length > 0 && (
            <>
              <SectionHeader
                title="Recent"
                action={
                  <Pressable onPress={handleClearAllRecents}>
                    <Text style={[type.bodySm, { color: rgb(tokens["--text-brand-primary"]) }]}>
                      Clear all
                    </Text>
                  </Pressable>
                }
                style={s.sectionHeader}
              />
              <View>
                {recents.map((item, i) => (
                  <View key={item.id}>
                    <RecentRow
                      item={item}
                      onPress={handleSelectRecent}
                      onRemove={handleRemoveRecent}
                    />
                    {i < recents.length - 1 && <Divider spacing="none" />}
                  </View>
                ))}
              </View>
              <Divider weight="regular" spacing="sm" />
            </>
          )}

          {/* Browse categories */}
          <SectionHeader
            title="Browse"
            subtitle="Categories"
            style={s.sectionHeader}
          />
          <View style={s.tagWrap}>
            <Tag
              key="all"
              label="All"
              onPress={() => onSelectCategory?.("all")}
            />
            {categories.map((cat) => (
              <Tag
                key={cat.id || cat.name}
                label={cat.name}
                onPress={() => onSelectCategory?.(cat.name)}
              />
            ))}
          </View>
          {categoryError ? (
            <Text style={[type.bodySm, s.categoryError, { color: rgb(tokens["--text-error-primary"]) }]}>
              {categoryError}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SCREEN_PAD = 20;

const s = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop:   20,
    paddingBottom: 10,
  },
  sectionHeader: { paddingHorizontal: SCREEN_PAD },

  // Idle
  idleContent: { 
    paddingHorizontal: SCREEN_PAD,
    paddingBottom: 32 
  },
  tagWrap: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    gap:            8,
    paddingTop:     8,
    paddingBottom:  4,
  },
  categoryError: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 6,
  },

  // Recent row
  recentRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_PAD,
    paddingVertical: 13,
  },
  recentLeft: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
    flex:          1,
  },
  recentText:   { flex: 1 },
  recentRemove: { paddingLeft: 12 },

  // Suggestions
  suggestionsContent: { paddingBottom: 32 },
  suggestionRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            12,
    paddingHorizontal: SCREEN_PAD,
    paddingVertical: 13,
  },
  suggestionText: { flex: 1 },
  noSuggestions: {
    paddingHorizontal: SCREEN_PAD,
    paddingVertical:   24,
  },
});
