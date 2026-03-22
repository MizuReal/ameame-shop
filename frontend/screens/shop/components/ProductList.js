import ProductCard from "./ProductCard";
import SkeletonCard from "@components/statusFeedback/SkeletonCard";

import Grid, { gridItemWidth } from "@components/layout/Grid";
import ScrollList from "@components/layout/ScrollList";

const SCREEN_PAD = 16;
const GRID_GAP = 10;
const GRID_COLS = 2;
const H_SCROLL_GAP = 8;
const H_SCROLL_EDGE = 4;

export default function ProductList({
  products = [],
  variant = "grid",
  cartIcon,
  onOpenProduct,
  listHeader,
  listFooter,
  onEndReached,
  onEndReachedThreshold = 0.7,
  refreshControl,
}) {
  if (variant === "scroll") {
    return (
      <ScrollList
        data={products}
        keyExtractor={(item) => item.id}
        snapColumns={2}
        paddingH={H_SCROLL_EDGE}
        paddingV={8}
        gap={H_SCROLL_GAP}
        fixedItemWidth={155}
        renderItem={({ item, itemWidth }) => (
          <ProductCard
            product={item}
            variant="scroll"
            itemWidth={itemWidth}
            cartIcon={cartIcon}
            onPress={onOpenProduct}
          />
        )}
      />
    );
  }

  const cardWidth = gridItemWidth(GRID_COLS, GRID_GAP, SCREEN_PAD);

  return (
    <Grid
      data={products}
      columns={GRID_COLS}
      gap={GRID_GAP}
      paddingH={SCREEN_PAD}
      keyExtractor={(item, index) => item?.id || `skeleton-${index}`}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      refreshControl={refreshControl}
      renderItem={({ item }) => 
  item ? (
    <ProductCard
      product={item}
      variant="grid"
      cardWidth={cardWidth}
      cartIcon={cartIcon}
      onPress={onOpenProduct}
    />
  ) : (
    <SkeletonCard variant="product" width={cardWidth} />
  )
}
    />
  );
}
