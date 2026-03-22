import Screen from "@components/layout/Screen";

import ProductContainer from "./components/ProductContainer";

export default function ShopScreen({ navigation, onNavigateToSearch, onOpenProduct }) {
  return (
    <Screen edges={["left", "right", "bottom"]} safeTop={false}>
      <ProductContainer
        navigation={navigation}
        onNavigateToSearch={onNavigateToSearch}
        onOpenProduct={onOpenProduct}
      />
    </Screen>
  );
}
