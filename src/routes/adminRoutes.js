const express = require("express");
const {
  getOverview,
  listShopsAdmin,
  updateShopAdmin,
  deleteShopAdmin,
  listOrdersAdmin,
  updateOrderStatusAdmin,
  listUsers,
  updateUser,
  deleteUser,
} = require("../controllers/adminController");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired, requireRole("admin"));

router.get("/overview", getOverview);
router.get("/shops", listShopsAdmin);
router.patch("/shops/:id", updateShopAdmin);
router.delete("/shops/:id", deleteShopAdmin);
router.get("/orders", listOrdersAdmin);
router.patch("/orders/:id/status", updateOrderStatusAdmin);
router.get("/users", listUsers);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

module.exports = router;
