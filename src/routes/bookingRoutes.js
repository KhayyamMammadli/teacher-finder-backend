const express = require("express");
const {
  listBookings,
  createBooking,
  updateBookingStatus,
} = require("../controllers/bookingController");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired);
router.get("/", listBookings);
router.post("/", requireRole("student"), createBooking);
router.patch("/:id/status", requireRole("teacher"), updateBookingStatus);

module.exports = router;
