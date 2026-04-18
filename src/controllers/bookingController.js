const { bookings, teachers } = require("../data/mockData");

function listBookings(req, res) {
  if (req.user.role === "student") {
    const mine = bookings.filter((b) => b.studentId === req.user.id);
    return res.json({ items: mine });
  }

  if (req.user.role === "teacher") {
    const mine = bookings.filter((b) => b.teacherId === req.user.teacherId);
    return res.json({ items: mine });
  }

  return res.json({ items: [] });
}

function createBooking(req, res) {
  const { teacherId, note } = req.body;

  if (!teacherId) {
    return res.status(400).json({ message: "teacherId required" });
  }

  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  const booking = {
    id: `b${bookings.length + 1}`,
    studentId: req.user.id,
    teacherId,
    note: note || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  return res.status(201).json(booking);
}

function updateBookingStatus(req, res) {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (req.user.role !== "teacher" || booking.teacherId !== req.user.teacherId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { status } = req.body;
  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be accepted or rejected" });
  }

  booking.status = status;
  return res.json(booking);
}

module.exports = {
  listBookings,
  createBooking,
  updateBookingStatus,
};
