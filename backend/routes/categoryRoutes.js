const express = require("express");

const { listPublicCategories } = require("../controllers/categoryController");

const router = express.Router();

router.get("/v1/categories", listPublicCategories);

module.exports = router;
