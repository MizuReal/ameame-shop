import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  createReviewRequest,
  deleteReviewRequest,
  getMyReviewRequest,
  listMyReviewsRequest,
  listProductReviewsRequest,
  updateReviewRequest,
} from "@utils/authSession";

function parseErrorMessage(error) {
  return error?.message || "Review request failed.";
}

function ensureProductState(state, productId) {
  if (!state.productReviews[productId]) {
    state.productReviews[productId] = {
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      loading: false,
      error: "",
      sort: "newest",
      rating: "",
    };
  }
}

function upsertReview(list, review) {
  if (!review?.id) {
    return list;
  }

  const index = list.findIndex((item) => item.id === review.id);
  if (index < 0) {
    return [review, ...list];
  }

  const next = [...list];
  next[index] = review;
  return next;
}

function removeReview(list, reviewId) {
  if (!reviewId) {
    return list;
  }

  return list.filter((item) => item.id !== reviewId);
}

export const fetchProductReviews = createAsyncThunk(
  "reviews/fetchProductReviews",
  async ({ productId, page = 1, limit = 20, sort = "newest", rating = "" }, { rejectWithValue }) => {
    try {
      return await listProductReviewsRequest(productId, { page, limit, sort, rating });
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const fetchMyReviews = createAsyncThunk(
  "reviews/fetchMyReviews",
  async ({ firebaseUser }, { rejectWithValue }) => {
    try {
      return await listMyReviewsRequest(firebaseUser);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const fetchMyReviewForProduct = createAsyncThunk(
  "reviews/fetchMyReviewForProduct",
  async ({ firebaseUser, productId }, { rejectWithValue }) => {
    try {
      return await getMyReviewRequest(firebaseUser, productId);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const createReview = createAsyncThunk(
  "reviews/createReview",
  async ({ firebaseUser, payload }, { rejectWithValue }) => {
    try {
      return await createReviewRequest(firebaseUser, payload);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const updateReview = createAsyncThunk(
  "reviews/updateReview",
  async ({ firebaseUser, reviewId, payload }, { rejectWithValue }) => {
    try {
      return await updateReviewRequest(firebaseUser, reviewId, payload);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const deleteReview = createAsyncThunk(
  "reviews/deleteReview",
  async ({ firebaseUser, reviewId }, { rejectWithValue }) => {
    try {
      return await deleteReviewRequest(firebaseUser, reviewId);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

const initialState = {
  productReviews: {},
  myReviews: [],
  myReviewByProductId: {},
  loadingMyReviews: false,
  submitting: false,
  deleting: false,
  error: "",
};

const reviewSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    clearReviewError(state) {
      state.error = "";
    },
    resetReviewsState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductReviews.pending, (state, action) => {
        const { productId, sort = "newest", rating = "" } = action.meta.arg || {};
        if (!productId) return;
        ensureProductState(state, productId);
        state.productReviews[productId].loading = true;
        state.productReviews[productId].error = "";
        state.productReviews[productId].sort = sort;
        state.productReviews[productId].rating = rating;
      })
      .addCase(fetchProductReviews.fulfilled, (state, action) => {
        const { productId, page = 1, limit = 20 } = action.meta.arg || {};
        if (!productId) return;
        ensureProductState(state, productId);
        const { reviews, total } = action.payload || {};
        const current = state.productReviews[productId];
        current.loading = false;
        current.page = page;
        current.limit = limit;
        current.total = Number(total || 0);
        current.items =
          page > 1 ? [...current.items, ...(reviews || [])] : Array.isArray(reviews) ? reviews : [];
      })
      .addCase(fetchProductReviews.rejected, (state, action) => {
        const { productId } = action.meta.arg || {};
        if (!productId) return;
        ensureProductState(state, productId);
        state.productReviews[productId].loading = false;
        state.productReviews[productId].error = action.payload || "Failed to load reviews.";
      })
      .addCase(fetchMyReviews.pending, (state) => {
        state.loadingMyReviews = true;
        state.error = "";
      })
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.loadingMyReviews = false;
        state.myReviews = Array.isArray(action.payload) ? action.payload : [];
        state.myReviewByProductId = {};
        state.myReviews.forEach((review) => {
          if (review?.product) {
            state.myReviewByProductId[String(review.product)] = review;
          }
        });
      })
      .addCase(fetchMyReviews.rejected, (state, action) => {
        state.loadingMyReviews = false;
        state.error = action.payload || "Failed to load reviews.";
      })
      .addCase(fetchMyReviewForProduct.pending, (state, action) => {
        const { productId } = action.meta.arg || {};
        if (productId) {
          state.myReviewByProductId[productId] = state.myReviewByProductId[productId] || null;
        }
        state.error = "";
      })
      .addCase(fetchMyReviewForProduct.fulfilled, (state, action) => {
        const { productId } = action.meta.arg || {};
        if (!productId) return;
        state.myReviewByProductId[productId] = action.payload || null;
      })
      .addCase(fetchMyReviewForProduct.rejected, (state, action) => {
        state.error = action.payload || "Failed to load your review.";
      })
      .addCase(createReview.pending, (state) => {
        state.submitting = true;
        state.error = "";
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.submitting = false;
        const review = action.payload;
        if (review?.product) {
          state.myReviewByProductId[String(review.product)] = review;
        }
        state.myReviews = upsertReview(state.myReviews, review);
        if (review?.product && state.productReviews[review.product]) {
          state.productReviews[review.product].items = upsertReview(
            state.productReviews[review.product].items,
            review
          );
        }
      })
      .addCase(createReview.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || "Failed to submit review.";
      })
      .addCase(updateReview.pending, (state) => {
        state.submitting = true;
        state.error = "";
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.submitting = false;
        const review = action.payload;
        if (review?.product) {
          state.myReviewByProductId[String(review.product)] = review;
        }
        state.myReviews = upsertReview(state.myReviews, review);
        if (review?.product && state.productReviews[review.product]) {
          state.productReviews[review.product].items = upsertReview(
            state.productReviews[review.product].items,
            review
          );
        }
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || "Failed to update review.";
      })
      .addCase(deleteReview.pending, (state) => {
        state.deleting = true;
        state.error = "";
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.deleting = false;
        const review = action.payload;
        if (review?.product) {
          state.myReviewByProductId[String(review.product)] = review.isActive ? review : null;
        }
        state.myReviews = review?.isActive
          ? upsertReview(state.myReviews, review)
          : removeReview(state.myReviews, review?.id);
        if (review?.product && state.productReviews[review.product]) {
          state.productReviews[review.product].items = review?.isActive
            ? upsertReview(state.productReviews[review.product].items, review)
            : removeReview(state.productReviews[review.product].items, review?.id);
        }
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload || "Failed to delete review.";
      });
  },
});

export const { clearReviewError, resetReviewsState } = reviewSlice.actions;

export default reviewSlice.reducer;
