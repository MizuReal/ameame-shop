const mongoose = require("mongoose");

const Order = require("../models/Order");

async function findEligibleCompletedOrderId({ userId, productId }) {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  const order = await Order.findOne({
    user: userId,
    status: { $in: ["delivered", "completed"] },
    "items.product": productId,
  })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean();

  return order?._id || null;
}

module.exports = {
  findEligibleCompletedOrderId,
};
