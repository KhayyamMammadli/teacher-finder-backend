const express = require("express");
const {
  listShops,
  getShop,
  createShop,
  updateShop,
  getMyShop,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} = require("../controllers/shopController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// Public
router.get("/", listShops);
router.get("/products/search", searchProducts);
router.get("/my", authRequired, getMyShop);
router.get("/:id", getShop);

// Authenticated
router.post("/", authRequired, createShop);
router.patch("/:id", authRequired, updateShop);

// Products (owned by shop)
router.post("/products", authRequired, createProduct);
router.patch("/products/:id", authRequired, updateProduct);
router.delete("/products/:id", authRequired, deleteProduct);

module.exports = router;
