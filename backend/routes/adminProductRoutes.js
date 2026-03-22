const express = require("express");

const {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  batchUpdateDiscounts,
} = require("../controllers/adminProductController");
const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { uploadProductImage } = require("../middleware/uploadProductImage");

const router = express.Router();

router.use("/v1/admin", requireFirebaseAuth, requireAdmin);
router.get("/v1/admin/products", listProducts);
router.post("/v1/admin/products", uploadProductImage.array("images", 5), createProduct);
router.patch("/v1/admin/products/discount-batch", batchUpdateDiscounts);
router.patch("/v1/admin/products/:productId", uploadProductImage.array("images", 5), updateProduct);
router.delete("/v1/admin/products/:productId", deleteProduct);

module.exports = router;
