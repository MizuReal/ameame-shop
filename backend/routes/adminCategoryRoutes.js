const express = require("express");

const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/adminCategoryController");
const { requireFirebaseAuth } = require("../middleware/requireFirebaseAuth");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.use("/v1/admin", requireFirebaseAuth, requireAdmin);
router.get("/v1/admin/categories", listCategories);
router.post("/v1/admin/categories", createCategory);
router.patch("/v1/admin/categories/:categoryId", updateCategory);
router.delete("/v1/admin/categories/:categoryId", deleteCategory);

module.exports = router;
