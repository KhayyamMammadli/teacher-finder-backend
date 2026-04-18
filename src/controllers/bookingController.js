const { query } = require("../config/db");
const { createId } = require("../utils/id");

async function listBookings(req, res) {
  if (req.user.role === "student") {
    const result = await query(
      "select id, student_id, teacher_id, note, status, created_at from bookings where student_id = $1 order by created_at desc",
      [req.user.id]
    );
    return res.json({ items: result.rows.map(mapBooking) });
  }

  if (req.user.role === "teacher") {
    const result = await query(
      "select id, student_id, teacher_id, note, status, created_at from bookings where teacher_id = $1 order by created_at desc",
      [req.user.teacherId]
    );
    return res.json({ items: result.rows.map(mapBooking) });
  }

  return res.json({ items: [] });
}

function mapBooking(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function createBooking(req, res) {
  const { teacherId, note } = req.body;

  if (!teacherId) {
    return res.status(400).json({ message: "teacherId required" });
  }

  const teacher = await query("select id from teachers where id = $1", [teacherId]);
  if (!teacher.rowCount) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  const created = await query(
    "insert into bookings (id, student_id, teacher_id, note, status, created_at) values ($1,$2,$3,$4,'pending',$5) returning id, student_id, teacher_id, note, status, created_at",
    [createId("b"), req.user.id, teacherId, note || "", new Date().toISOString()]
  );

  return res.status(201).json(mapBooking(created.rows[0]));
}

async function updateBookingStatus(req, res) {
  const bookingResult = await query("select id, teacher_id from bookings where id = $1", [req.params.id]);
  if (!bookingResult.rowCount) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const booking = bookingResult.rows[0];

  if (req.user.role !== "teacher" || booking.teacher_id !== req.user.teacherId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { status } = req.body;
  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be accepted or rejected" });
  }

  const updated = await query(
    "update bookings set status = $1 where id = $2 returning id, student_id, teacher_id, note, status, created_at",
    [status, req.params.id]
  );
  return res.json(mapBooking(updated.rows[0]));
}

module.exports = {
  listBookings,
  createBooking,
  updateBookingStatus,
};
