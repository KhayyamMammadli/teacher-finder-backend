const express = require("express");
const { createOrder, listShopOrders, updateOrderStatus } = require("../controllers/orderController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// Public: submit inquiry
router.post("/", createOrder);

// Shop owner
router.get("/my", authRequired, listShopOrders);
router.patch("/:id/status", authRequired, updateOrderStatus);

module.exports = router;
