const { pool, query } = require("../config/db");
const { createId } = require("../utils/id");
const { ensureTeacherRegistrationTable } = require("../utils/teacherRegistration");

function toRequestDto(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    status: row.status,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
  };
}

async function listTeacherRegistrationRequests(req, res) {
  await ensureTeacherRegistrationTable();

  const requestedStatus = String(req.query.status || "pending").toLowerCase();
  const allowedStatuses = ["pending", "approved", "rejected", "all"];
  const status = allowedStatuses.includes(requestedStatus) ? requestedStatus : "pending";

  const result = status === "all"
    ? await query("select * from teacher_registration_requests order by requested_at desc")
    : await query("select * from teacher_registration_requests where status = $1 order by requested_at desc", [status]);

  return res.json({
    items: result.rows.map(toRequestDto),
    total: result.rowCount,
  });
}

async function approveTeacherRegistrationRequest(req, res) {
  await ensureTeacherRegistrationTable();

  const requestId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query("begin");

    const requestResult = await client.query(
      "select * from teacher_registration_requests where id = $1 for update",
      [requestId]
    );

    if (!requestResult.rowCount) {
      await client.query("rollback");
      return res.status(404).json({ message: "Muraciet tapilmadi" });
    }

    const registrationRequest = requestResult.rows[0];

    if (registrationRequest.status !== "pending") {
      await client.query("rollback");
      return res.status(409).json({ message: "Bu muraciet artiq emal olunub" });
    }

    const existingUser = await client.query("select id from users where lower(email) = $1 limit 1", [
      String(registrationRequest.email).toLowerCase(),
    ]);

    if (existingUser.rowCount) {
      await client.query("rollback");
      return res.status(409).json({ message: "Bu email ucun user artiq movcuddur" });
    }

    const teacherId = createId("t");
    const userId = createId("u");

    await client.query(
      "insert into teachers (id, name, image, subject, subjects, rating, price, location, lat, lng, experience_years, bio) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
      [
        teacherId,
        registrationRequest.name,
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600",
        "General",
        [],
        0,
        0,
        "Baku",
        40.4093,
        49.8671,
        0,
        "Yeni muellim profili",
      ]
    );

    const userInsert = await client.query(
      "insert into users (id, role, teacher_id, name, email, password_hash, phone) values ($1,$2,$3,$4,$5,$6,$7) returning id, role, teacher_id, name, email, phone",
      [
        userId,
        "teacher",
        teacherId,
        registrationRequest.name,
        String(registrationRequest.email).toLowerCase(),
        registrationRequest.password_hash,
        registrationRequest.phone || "",
      ]
    );

    await client.query(
      `update teacher_registration_requests
       set status = 'approved',
           approved_at = now(),
           approved_by = $2,
           updated_at = now()
       where id = $1`,
      [requestId, req.user.id]
    );

    await client.query("commit");

    return res.json({
      message: "Muellim muracieti tesdiqlendi",
      user: userInsert.rows[0],
    });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function rejectTeacherRegistrationRequest(req, res) {
  await ensureTeacherRegistrationTable();

  const requestId = req.params.id;
  const reason = String(req.body?.reason || "").trim();

  const existing = await query("select id, status from teacher_registration_requests where id = $1", [requestId]);

  if (!existing.rowCount) {
    return res.status(404).json({ message: "Muraciet tapilmadi" });
  }

  if (existing.rows[0].status !== "pending") {
    return res.status(409).json({ message: "Bu muraciet artiq emal olunub" });
  }

  await query(
    `update teacher_registration_requests
     set status = 'rejected',
         rejected_at = now(),
         rejected_by = $2,
         rejection_reason = $3,
         updated_at = now()
     where id = $1`,
    [requestId, req.user.id, reason || null]
  );

  return res.json({ message: "Muellim muracieti redd edildi" });
}

module.exports = {
  listTeacherRegistrationRequests,
  approveTeacherRegistrationRequest,
  rejectTeacherRegistrationRequest,
};