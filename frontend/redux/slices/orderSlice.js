import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  adminListOrders,
  adminUpdateOrderStatus,
  createOrderRequest,
  getMyOrderRequest,
  listMyOrdersRequest,
} from "@utils/authSession";

function parseErrorMessage(error) {
  return error?.message || "Order request failed.";
}

export const fetchMyOrders = createAsyncThunk(
  "orders/fetchMyOrders",
  async ({ firebaseUser }, { rejectWithValue }) => {
    try {
      return await listMyOrdersRequest(firebaseUser);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const fetchOrderDetails = createAsyncThunk(
  "orders/fetchOrderDetails",
  async ({ firebaseUser, orderId }, { rejectWithValue }) => {
    try {
      return await getMyOrderRequest(firebaseUser, orderId);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const createOrder = createAsyncThunk(
  "orders/createOrder",
  async ({ firebaseUser, items, checkoutContact }, { rejectWithValue }) => {
    try {
      return await createOrderRequest(firebaseUser, {
        items,
        checkoutContact,
        paymentMethod: "cash_on_delivery",
      });
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const fetchAdminOrders = createAsyncThunk(
  "orders/fetchAdminOrders",
  async (
    { firebaseUser, status, page = 1, limit = 12, append = false },
    { rejectWithValue }
  ) => {
    try {
      const response = await adminListOrders(firebaseUser, {
        status,
        page,
        limit,
        includeMeta: true,
      });

      return {
        ...response,
        append,
      };
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

export const updateAdminOrderStatus = createAsyncThunk(
  "orders/updateAdminOrderStatus",
  async ({ firebaseUser, orderId, status }, { rejectWithValue }) => {
    try {
      return await adminUpdateOrderStatus(firebaseUser, orderId, status);
    } catch (error) {
      return rejectWithValue(parseErrorMessage(error));
    }
  }
);

const initialState = {
  myOrders: [],
  adminOrders: [],
  selectedOrder: null,
  loadingMyOrders: false,
  loadingAdminOrders: false,
  loadingAdminOrdersMore: false,
  loadingOrderDetails: false,
  creatingOrder: false,
  updatingStatus: false,
  adminOrdersPage: 1,
  adminOrdersLimit: 12,
  adminOrdersTotal: 0,
  createSuccessOrderId: "",
  error: "",
};

function upsertOrder(items, order) {
  if (!order?.id) {
    return items;
  }

  const index = items.findIndex((item) => item.id === order.id);
  if (index < 0) {
    return [order, ...items];
  }

  const next = [...items];
  next[index] = order;
  return next;
}

function mergeOrdersById(existingOrders, nextOrders) {
  const normalizedExisting = Array.isArray(existingOrders) ? existingOrders : [];
  const normalizedNext = Array.isArray(nextOrders) ? nextOrders : [];
  const seen = new Set(normalizedExisting.map((order) => order.id));
  const merged = [...normalizedExisting];

  normalizedNext.forEach((order) => {
    if (!order?.id) {
      return;
    }

    if (seen.has(order.id)) {
      const index = merged.findIndex((item) => item.id === order.id);
      if (index >= 0) {
        merged[index] = order;
      }
      return;
    }

    seen.add(order.id);
    merged.push(order);
  });

  return merged;
}

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    clearOrderError(state) {
      state.error = "";
    },
    clearCreateSuccessOrder(state) {
      state.createSuccessOrderId = "";
    },
    setSelectedOrderFromNotification(state, action) {
      state.selectedOrder = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state) => {
        state.loadingMyOrders = true;
        state.error = "";
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loadingMyOrders = false;
        state.myOrders = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loadingMyOrders = false;
        state.error = action.payload || "Failed to load orders.";
      })
      .addCase(fetchOrderDetails.pending, (state) => {
        state.loadingOrderDetails = true;
        state.error = "";
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.loadingOrderDetails = false;
        state.selectedOrder = action.payload || null;
        state.myOrders = upsertOrder(state.myOrders, action.payload);
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.loadingOrderDetails = false;
        state.error = action.payload || "Failed to load order details.";
      })
      .addCase(createOrder.pending, (state) => {
        state.creatingOrder = true;
        state.error = "";
        state.createSuccessOrderId = "";
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.creatingOrder = false;
        state.selectedOrder = action.payload || null;
        state.myOrders = upsertOrder(state.myOrders, action.payload);
        state.createSuccessOrderId = action.payload?.id || "";
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.creatingOrder = false;
        state.error = action.payload || "Failed to create order.";
      })
      .addCase(fetchAdminOrders.pending, (state, action) => {
        const requestPage = Number(action.meta?.arg?.page || 1);
        const isLoadMore = requestPage > 1;
        state.loadingAdminOrders = !isLoadMore;
        state.loadingAdminOrdersMore = isLoadMore;
        state.error = "";
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.loadingAdminOrders = false;
        state.loadingAdminOrdersMore = false;

        const {
          orders,
          page,
          limit,
          total,
          append,
        } = action.payload || {};

        const normalizedOrders = Array.isArray(orders) ? orders : [];
        state.adminOrders = append
          ? mergeOrdersById(state.adminOrders, normalizedOrders)
          : normalizedOrders;
        state.adminOrdersPage = Number(page || 1);
        state.adminOrdersLimit = Number(limit || state.adminOrdersLimit || 12);
        state.adminOrdersTotal = Number(total || state.adminOrders.length);
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.loadingAdminOrders = false;
        state.loadingAdminOrdersMore = false;
        state.error = action.payload || "Failed to load admin orders.";
      })
      .addCase(updateAdminOrderStatus.pending, (state) => {
        state.updatingStatus = true;
        state.error = "";
      })
      .addCase(updateAdminOrderStatus.fulfilled, (state, action) => {
        state.updatingStatus = false;
        const order = action.payload;
        state.adminOrders = upsertOrder(state.adminOrders, order);
        state.myOrders = upsertOrder(state.myOrders, order);
        if (state.selectedOrder?.id === order?.id) {
          state.selectedOrder = order;
        }
      })
      .addCase(updateAdminOrderStatus.rejected, (state, action) => {
        state.updatingStatus = false;
        state.error = action.payload || "Failed to update order status.";
      });
  },
});

export const {
  clearOrderError,
  clearCreateSuccessOrder,
  setSelectedOrderFromNotification,
} = orderSlice.actions;

export default orderSlice.reducer;
