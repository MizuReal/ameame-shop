/**
 * Grid.js
 * ─────────────────────────────────────────────────────────────
 * Fixed-column grid layout for product cards and content tiles.
 * Uses FlatList with numColumns for native performance.
 *
 * Props:
 *   data          any[]
 *   renderItem    ({ item, index }) => ReactNode
 *   keyExtractor  (item, index) => string
 *   columns       number   default: 2
 *   gap           number   default: 10 — gap between columns and rows
 *   paddingH      number   default: 16
 *   paddingV      number   default: 8
 *   onEndReached  () => void
 *   ListEmptyComponent  ReactNode
 *   ListHeaderComponent ReactNode
 *   ListFooterComponent ReactNode
 *   style         ViewStyle
 *
 * Note on item width:
 *   Items must set their own width to fill the column. Use the
 *   exported `useGridItemWidth(columns, gap, paddingH)` hook to
 *   calculate the correct width reactively from screen dimensions.
 *
 * Usage:
 *   const itemWidth = useGridItemWidth(2, 10, 16);
 *
 *   <Grid
 *     data={products}
 *     columns={2}
 *     renderItem={({ item }) => (
 *       <ProductCard product={item} style={{ width: itemWidth }} />
 *     )}
 *     keyExtractor={(item) => item.id}
 *   />
 */

import { Dimensions, FlatList, StyleSheet, View } from "react-native";

/**
 * Calculates the width a grid item should be given the layout parameters.
 * Call once outside the component or inside useMemo.
 *
 * @param {number} columns
 * @param {number} gap
 * @param {number} paddingH
 * @returns {number}
 */
export function gridItemWidth(columns = 2, gap = 10, paddingH = 16) {
  const screenWidth = Dimensions.get("window").width;
  const totalGap    = gap * (columns - 1);
  const usableWidth = screenWidth - paddingH * 2 - totalGap;
  return Math.floor(usableWidth / columns);
}

export default function Grid({
  data,
  renderItem,
  keyExtractor,
  columns                   = 2,
  gap                       = 10,
  paddingH                  = 16,
  paddingV                  = 8,
  onEndReached,
  onEndReachedThreshold       = 0.5,
  showsVerticalScrollIndicator = false,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  style,
}) {
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={columns}
      // Key required when columns changes at runtime
      key={String(columns)}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      columnWrapperStyle={columns > 1 ? { gap } : undefined}
      contentContainerStyle={{
        paddingHorizontal: paddingH,
        paddingVertical:   paddingV,
        gap,
      }}
      style={[s.grid, style]}
    />
  );
}

const s = StyleSheet.create({
  grid: { flex: 1 },
});
