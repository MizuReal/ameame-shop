const express = require("express");

const { createOrder, listOrders, getOrder } = require("../controllers/orderController");
const {
	listOrders: listAdminOrders,
	updateOrderStatus,
} = require("../controllers/adminOrderController");
const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.use("/v1/orders", requireFirebaseAuth);
router.post("/v1/orders", createOrder);
router.get("/v1/orders", listOrders);
router.get("/v1/orders/:id", getOrder);

router.use("/v1/admin/orders", requireFirebaseAuth, requireAdmin);
router.get("/v1/admin/orders", listAdminOrders);
router.patch("/v1/admin/orders/:id/status", updateOrderStatus);

module.exports = router;
