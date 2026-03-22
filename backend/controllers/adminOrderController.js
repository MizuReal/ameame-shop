const mongoose = require("mongoose");

const Order = require("../models/Order");
const User = require("../models/User");
const { sendOrderStatusPush } = require("../services/pushNotificationService");
const { sendError } = require("../utils/errorResponse");
const { getPaginationParams } = require("../utils/pagination");

const STATUS_ORDER = ["pending", "shipped", "delivered", "cancelled"];
const LEGACY_STATUS_ORDER = ["completed"];
const FULFILLMENT_ORDER = ["pending", "shipped", "delivered"];

function normalizeOrderStatus(status) {
  return status === "completed" ? "delivered" : status;
}

function shouldDebugPush() {
  return process.env.DEBUG_PUSH_NOTIFICATIONS === "1";
}

function toOrderDto(order) {
  const normalizedStatus = normalizeOrderStatus(order.status);

  return {
    id: String(order._id),
    user: order.user
      ? {
          id: String(order.user._id || order.user),
          email: order.user.email || "",
          displayName: order.user.displayName || "",
        }
      : null,
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          ...item,
          product: item.product ? String(item.product) : item.product,
        }))
      : [],
    totalAmount: order.totalAmount,
    checkoutContact: order.checkoutContact || null,
    paymentMethod: order.paymentMethod,
    status: normalizedStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function canMoveToStatus(currentStatus, nextStatus) {
  const normalizedCurrentStatus = normalizeOrderStatus(currentStatus);

  if (
    (![...STATUS_ORDER, ...LEGACY_STATUS_ORDER].includes(currentStatus) &&
      !STATUS_ORDER.includes(normalizedCurrentStatus)) ||
    !STATUS_ORDER.includes(nextStatus)
  ) {
    return false;
  }

  if (normalizedCurrentStatus === nextStatus) {
    return true;
  }

  if (normalizedCurrentStatus === "cancelled" || normalizedCurrentStatus === "delivered") {
    return false;
  }

  if (nextStatus === "cancelled") {
    return true;
  }

  const currentIndex = FULFILLMENT_ORDER.indexOf(normalizedCurrentStatus);
  const nextIndex = FULFILLMENT_ORDER.indexOf(nextStatus);

  if (currentIndex < 0 || nextIndex < 0) {
    return false;
  }

  // Allow only one-step forward transitions (pending->shipped->delivered).
  return nextIndex === currentIndex + 1;
}

async function listOrders(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const query = {};

    if (status) {
      if (![...STATUS_ORDER, ...LEGACY_STATUS_ORDER].includes(status)) {
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid status filter.");
      }
      query.status = status === "completed" ? { $in: ["completed", "delivered"] } : status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "email displayName")
        .lean(),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      orders: orders.map((order) => toOrderDto(order)),
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const nextStatus = typeof req.body?.status === "string" ? req.body.status.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_ORDER_ID", "Invalid order id.");
    }

    if (!STATUS_ORDER.includes(nextStatus)) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid order status.");
    }

    const order = await Order.findById(id);
    if (!order) {
      return sendError(res, 404, "ORDER_NOT_FOUND", "Order not found.");
    }

    if (!canMoveToStatus(order.status, nextStatus)) {
      return sendError(
        res,
        400,
        "INVALID_STATUS_TRANSITION",
        `Cannot move order from ${order.status} to ${nextStatus}.`
      );
    }

    const previousStatus = normalizeOrderStatus(order.status);
    const statusChanged = previousStatus !== nextStatus;
    order.status = nextStatus;
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "email displayName pushTokens")
      .lean();

    let push = { sent: 0, failed: 0, removed: 0, invalid: 0, attempted: false };

    if (shouldDebugPush()) {
      const userTokenCount = Array.isArray(populatedOrder?.user?.pushTokens)
        ? populatedOrder.user.pushTokens.length
        : 0;
      console.log(
        `[push-debug] order status update order=${String(order._id)} from=${previousStatus} to=${nextStatus} changed=${statusChanged} user=${String(populatedOrder?.user?._id || "")} tokens=${userTokenCount}`
      );
    }

    if (statusChanged && populatedOrder?.user?._id) {
      const user = await User.findById(populatedOrder.user._id);
      if (user) {
        push = await sendOrderStatusPush({ user, order: populatedOrder });

        if (shouldDebugPush()) {
          console.log(
            `[push-debug] order push result order=${String(order._id)} attempted=${push.attempted} sent=${push.sent} invalid=${push.invalid} removed=${push.removed}`
          );
        }
      }
    }

    return res.status(200).json({
      order: toOrderDto(populatedOrder),
      notification: push,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listOrders,
  updateOrderStatus,
};
