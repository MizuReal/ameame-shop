const express = require("express");

const { listProducts, getProduct, listDiscountOptions } = require("../controllers/productController");
const { validateSearchQuery } = require("../middleware/validateSearchQuery");

const router = express.Router();

router.get("/v1/products", validateSearchQuery, listProducts);
router.get("/v1/products/discounts", listDiscountOptions);
router.get("/v1/products/:id", getProduct);

module.exports = router;
