import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  adminDeleteReview,
  adminGetReview,
  adminListReviews,
  adminReviewSuggestions,
  adminUpdateReview,
} from "@utils/authSession";

function parseErrorMessage(error) {
  return error?.message || "Review request failed.";
}

export const fetchAdminReviews = createAsyncThunk(
  "adminReviews/fetchAdminReviews",
  async ({ firebaseUser, page = 1 }, { getState, rejectWithValue }) => {
    try {
      const { filters, pagination } = getState().adminReviews;
      return await adminListReviews(firebaseUser, {
        q: filters.query,
        productId: filters.productId,
        categories: filters.categories,
        ratings: filters.ratings,
        isActive: filters.isActive,
        sort: filters.sortKey,
        order: filters.sortOrder,
        page,
        limit: pagination.limit,
      });
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const fetchAdminReviewDetail = createAsyncThunk(
  "adminReviews/fetchAdminReviewDetail",
  async ({ firebaseUser, reviewId }, { rejectWithValue }) => {
    try {
      return await adminGetReview(firebaseUser, reviewId);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const updateAdminReview = createAsyncThunk(
  "adminReviews/updateAdminReview",
  async ({ firebaseUser, reviewId, updates }, { rejectWithValue }) => {
    try {
      return await adminUpdateReview(firebaseUser, reviewId, updates);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const deleteAdminReview = createAsyncThunk(
  "adminReviews/deleteAdminReview",
  async ({ firebaseUser, reviewId }, { rejectWithValue }) => {
    try {
      return await adminDeleteReview(firebaseUser, reviewId);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const fetchReviewSuggestions = createAsyncThunk(
  "adminReviews/fetchReviewSuggestions",
  async ({ firebaseUser, query }, { rejectWithValue }) => {
    try {
      return await adminReviewSuggestions(firebaseUser, query);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

const initialState = {
  items: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  loading: false,
  error: "",
  filters: {
    query: "",
    productId: "",
    productName: "",
    categories: [],
    ratings: [],
    isActive: undefined,
    sortKey: "createdAt",
    sortOrder: "desc",
  },
  suggestions: [],
  loadingSuggestions: false,
  detail: null,
  loadingDetail: false,
  updating: false,
  deleting: false,
};

function upsertReview(list, review) {
  if (!review?.id) return list;
  const index = list.findIndex((item) => item.id === review.id);
  if (index < 0) {
    return [review, ...list];
  }
  const next = [...list];
  next[index] = review;
  return next;
}

function removeReview(list, reviewId) {
  return list.filter((item) => item.id !== reviewId);
}

const adminReviewSlice = createSlice({
  name: "adminReviews",
  initialState,
  reducers: {
    setQuery(state, action) {
      state.filters.query = action.payload || "";
    },
    setProductFilter(state, action) {
      state.filters.productId = action.payload?.productId || "";
      state.filters.productName = action.payload?.productName || "";
    },
    clearProductFilter(state) {
      state.filters.productId = "";
      state.filters.productName = "";
    },
    toggleCategory(state, action) {
      const category = action.payload;
      const exists = state.filters.categories.includes(category);
      state.filters.categories = exists
        ? state.filters.categories.filter((item) => item !== category)
        : [...state.filters.categories, category];
    },
    toggleRating(state, action) {
      const rating = Number(action.payload);
      const exists = state.filters.ratings.includes(rating);
      state.filters.ratings = exists
        ? state.filters.ratings.filter((item) => item !== rating)
        : [...state.filters.ratings, rating];
    },
    setIsActiveFilter(state, action) {
      state.filters.isActive = action.payload;
    },
    setSortOption(state, action) {
      state.filters.sortKey = action.payload?.sortKey || "createdAt";
      state.filters.sortOrder = action.payload?.sortOrder || "desc";
    },
    setPage(state, action) {
      state.pagination.page = action.payload || 1;
    },
    clearAdminReviewError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminReviews.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchAdminReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload?.reviews) ? action.payload.reviews : [];
        state.pagination.page = Number(action.payload?.page || 1);
        state.pagination.limit = Number(action.payload?.limit || 20);
        state.pagination.total = Number(action.payload?.total || 0);
      })
      .addCase(fetchAdminReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load reviews.";
      })
      .addCase(fetchAdminReviewDetail.pending, (state) => {
        state.loadingDetail = true;
        state.error = "";
      })
      .addCase(fetchAdminReviewDetail.fulfilled, (state, action) => {
        state.loadingDetail = false;
        state.detail = action.payload || null;
      })
      .addCase(fetchAdminReviewDetail.rejected, (state, action) => {
        state.loadingDetail = false;
        state.error = action.payload || "Failed to load review.";
      })
      .addCase(updateAdminReview.pending, (state) => {
        state.updating = true;
        state.error = "";
      })
      .addCase(updateAdminReview.fulfilled, (state, action) => {
        state.updating = false;
        state.detail = action.payload || state.detail;
        const updated = action.payload;
        if (updated) {
          const filterActive = state.filters.isActive;
          if (filterActive === true && updated.isActive === false) {
            state.items = removeReview(state.items, updated.id);
          } else if (filterActive === false && updated.isActive === true) {
            state.items = removeReview(state.items, updated.id);
          } else {
            state.items = upsertReview(state.items, updated);
          }
        }
      })
      .addCase(updateAdminReview.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || "Failed to update review.";
      })
      .addCase(deleteAdminReview.pending, (state) => {
        state.deleting = true;
        state.error = "";
      })
      .addCase(deleteAdminReview.fulfilled, (state, action) => {
        state.deleting = false;
        const reviewId = action.payload?.reviewId;
        if (reviewId) {
          state.items = removeReview(state.items, reviewId);
          if (state.detail?.id === reviewId) {
            state.detail = null;
          }
        }
      })
      .addCase(deleteAdminReview.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload || "Failed to delete review.";
      })
      .addCase(fetchReviewSuggestions.pending, (state) => {
        state.loadingSuggestions = true;
      })
      .addCase(fetchReviewSuggestions.fulfilled, (state, action) => {
        state.loadingSuggestions = false;
        state.suggestions = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchReviewSuggestions.rejected, (state) => {
        state.loadingSuggestions = false;
        state.suggestions = [];
      });
  },
});

export const {
  setQuery,
  setProductFilter,
  clearProductFilter,
  toggleCategory,
  toggleRating,
  setIsActiveFilter,
  setSortOption,
  setPage,
  clearAdminReviewError,
} = adminReviewSlice.actions;

export default adminReviewSlice.reducer;
