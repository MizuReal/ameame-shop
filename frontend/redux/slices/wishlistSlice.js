import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  addToWishlistRequest,
  getWishlistStatusRequest,
  listWishlistRequest,
  removeFromWishlistRequest,
} from "@utils/authSession";

function parseErrorMessage(error) {
  return error?.message || "Wishlist request failed.";
}

export const fetchWishlist = createAsyncThunk(
  "wishlist/fetchWishlist",
  async ({ firebaseUser }, { rejectWithValue }) => {
    try {
      return await listWishlistRequest(firebaseUser);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const fetchWishlistStatus = createAsyncThunk(
  "wishlist/fetchWishlistStatus",
  async ({ firebaseUser, productId }, { rejectWithValue }) => {
    try {
      return await getWishlistStatusRequest(firebaseUser, productId);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const toggleWishlist = createAsyncThunk(
  "wishlist/toggleWishlist",
  async ({ firebaseUser, productId, isWishlisted }, { rejectWithValue }) => {
    try {
      if (isWishlisted) {
        await removeFromWishlistRequest(firebaseUser, productId);
        return { productId, isWishlisted: false, item: null };
      }
      const item = await addToWishlistRequest(firebaseUser, { productId });
      return { productId, isWishlisted: true, item };
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const removeFromWishlist = createAsyncThunk(
  "wishlist/removeFromWishlist",
  async ({ firebaseUser, productId }, { rejectWithValue }) => {
    try {
      await removeFromWishlistRequest(firebaseUser, productId);
      return { productId };
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

const initialState = {
  items: [],
  statusByProductId: {},
  loading: false,
  error: "",
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    resetWishlistState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.statusByProductId = {};
        state.items.forEach((item) => {
          if (item?.productId) {
            state.statusByProductId[item.productId] = true;
          }
        });
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load wishlist.";
      })
      .addCase(fetchWishlistStatus.fulfilled, (state, action) => {
        const { productId, isWishlisted } = action.payload || {};
        if (productId) {
          state.statusByProductId[productId] = Boolean(isWishlisted);
        }
      })
      .addCase(fetchWishlistStatus.rejected, (state, action) => {
        state.error = action.payload || "Failed to check wishlist.";
      })
      .addCase(toggleWishlist.pending, (state, action) => {
        const { productId, isWishlisted } = action.meta.arg || {};
        if (productId) {
          state.statusByProductId[productId] = !isWishlisted;
        }
        state.error = "";
      })
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        const { productId, isWishlisted, item } = action.payload || {};
        if (!productId) return;
        state.statusByProductId[productId] = Boolean(isWishlisted);
        if (isWishlisted && item) {
          state.items = [item, ...state.items.filter((entry) => entry.productId !== productId)];
        } else if (!isWishlisted) {
          state.items = state.items.filter((entry) => entry.productId !== productId);
        }
      })
      .addCase(toggleWishlist.rejected, (state, action) => {
        const { productId, isWishlisted } = action.meta.arg || {};
        if (productId) {
          state.statusByProductId[productId] = Boolean(isWishlisted);
        }
        state.error = action.payload || "Failed to update wishlist.";
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        const { productId } = action.payload || {};
        if (!productId) return;
        state.items = state.items.filter((entry) => entry.productId !== productId);
        state.statusByProductId[productId] = false;
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.error = action.payload || "Failed to remove from wishlist.";
      });
  },
});

export const { resetWishlistState } = wishlistSlice.actions;

export default wishlistSlice.reducer;
