import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getProductById, searchProducts } from "@utils/productSearch";

const SEARCH_DEFAULT_LIMIT = 20;

function defaultPagination(limit = SEARCH_DEFAULT_LIMIT) {
  return {
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
  };
}

function mergeUniqueProducts(existing, incoming) {
  const seen = new Set(existing.map((item) => item.id || item._id));
  const next = [...existing];

  incoming.forEach((item) => {
    const key = item?.id || item?._id;
    if (!key || seen.has(key)) return;
    seen.add(key);
    next.push(item);
  });

  return next;
}

export const fetchProductsSearch = createAsyncThunk(
  "products/fetchProductsSearch",
  async ({ query = "", filters = {}, page = 1, limit = SEARCH_DEFAULT_LIMIT } = {}, { rejectWithValue }) => {
    try {
      return await searchProducts({ query, filters, page, limit });
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load products.");
    }
  }
);

export const fetchProductDetail = createAsyncThunk(
  "products/fetchProductDetail",
  async (productId, { rejectWithValue }) => {
    try {
      const product = await getProductById(productId);
      return {
        productId: String(productId),
        product,
      };
    } catch (error) {
      return rejectWithValue({
        productId: String(productId || ""),
        message: error?.message || "Failed to load product.",
      });
    }
  }
);

const initialState = {
  search: {
    items: [],
    loading: false,
    isFetchingMore: false,
    error: "",
    pagination: defaultPagination(),
    lastQuery: "",
    lastFilters: {},
  },
  detailsById: {},
};

const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    resetProductSearch(state) {
      state.search = {
        items: [],
        loading: false,
        isFetchingMore: false,
        error: "",
        pagination: defaultPagination(),
        lastQuery: "",
        lastFilters: {},
      };
    },
    primeProductDetail(state, action) {
      const product = action.payload;
      const productId = String(product?.id || product?._id || "").trim();
      if (!productId) return;

      state.detailsById[productId] = {
        item: product,
        loading: false,
        error: "",
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductsSearch.pending, (state, action) => {
        const { query = "", filters = {}, page = 1, limit = SEARCH_DEFAULT_LIMIT } = action.meta.arg || {};
        const append = page > 1;

        state.search.lastQuery = query;
        state.search.lastFilters = filters;

        if (append) {
          state.search.isFetchingMore = true;
        } else {
          state.search.loading = true;
          state.search.error = "";
          state.search.pagination = defaultPagination(limit);
        }
      })
      .addCase(fetchProductsSearch.fulfilled, (state, action) => {
        const { page = 1, limit = SEARCH_DEFAULT_LIMIT } = action.meta.arg || {};
        const append = page > 1;
        const nextProducts = action.payload?.products || [];

        state.search.loading = false;
        state.search.isFetchingMore = false;
        state.search.error = "";
        state.search.items = append
          ? mergeUniqueProducts(state.search.items, nextProducts)
          : nextProducts;
        state.search.pagination = action.payload?.pagination || defaultPagination(limit);
      })
      .addCase(fetchProductsSearch.rejected, (state, action) => {
        const { page = 1, limit = SEARCH_DEFAULT_LIMIT } = action.meta.arg || {};
        const append = page > 1;

        state.search.loading = false;
        state.search.isFetchingMore = false;
        state.search.error = action.payload || "Failed to load products.";

        if (!append) {
          state.search.items = [];
          state.search.pagination = defaultPagination(limit);
        }
      })
      .addCase(fetchProductDetail.pending, (state, action) => {
        const productId = String(action.meta.arg || "").trim();
        if (!productId) return;

        const existing = state.detailsById[productId] || {};
        state.detailsById[productId] = {
          item: existing.item || null,
          loading: true,
          error: "",
        };
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        const { productId, product } = action.payload || {};
        if (!productId) return;

        state.detailsById[productId] = {
          item: product || null,
          loading: false,
          error: "",
        };
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        const payloadProductId = action.payload?.productId;
        const fallbackProductId = String(action.meta.arg || "").trim();
        const productId = String(payloadProductId || fallbackProductId || "").trim();
        if (!productId) return;

        const existing = state.detailsById[productId] || {};
        state.detailsById[productId] = {
          item: existing.item || null,
          loading: false,
          error: action.payload?.message || "Failed to load product.",
        };
      });
  },
});

export const { resetProductSearch, primeProductDetail } = productSlice.actions;

export default productSlice.reducer;
