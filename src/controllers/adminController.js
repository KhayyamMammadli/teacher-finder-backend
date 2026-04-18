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

function toUserDto(row) {
  return {
    id: row.id,
    role: row.role,
    teacherId: row.teacher_id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    createdAt: row.created_at,
  };
}

function toTeacherDto(row) {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    subject: row.subject,
    subjects: row.subjects || [],
    rating: Number(row.rating || 0),
    price: Number(row.price || 0),
    location: row.location,
    lat: Number(row.lat || 0),
    lng: Number(row.lng || 0),
    experienceYears: Number(row.experience_years || 0),
    bio: row.bio || "",
    createdAt: row.created_at,
  };
}

function toBookingDto(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    note: row.note || "",
    status: row.status,
    createdAt: row.created_at,
    studentName: row.student_name,
    teacherName: row.teacher_name,
  };
}

function toTeacherApplicationDto(row) {
  return {
    id: row.id,
    name: row.name,
    subjects: row.subjects || [],
    experience: Number(row.experience || 0),
    price: Number(row.price || 0),
    location: row.location,
    createdAt: row.created_at,
  };
}

async function getOverview(req, res) {
  await ensureTeacherRegistrationTable();

  const [usersCount, teachersCount, bookingsCount, pendingRegistrationsCount, applicationsCount, recentBookings, recentUsers] =
    await Promise.all([
      query("select count(*)::int as total from users"),
      query("select count(*)::int as total from teachers"),
      query("select count(*)::int as total from bookings"),
      query("select count(*)::int as total from teacher_registration_requests where status = 'pending'"),
      query("select count(*)::int as total from teacher_applications"),
      query(
        `select b.id, b.student_id, b.teacher_id, b.note, b.status, b.created_at,
                student.name as student_name, teacher.name as teacher_name
         from bookings b
         left join users student on student.id = b.student_id
         left join teachers teacher on teacher.id = b.teacher_id
         order by b.created_at desc
         limit 6`
      ),
      query("select id, role, teacher_id, name, email, phone, created_at from users order by created_at desc limit 6"),
    ]);

  return res.json({
    stats: {
      users: usersCount.rows[0].total,
      teachers: teachersCount.rows[0].total,
      bookings: bookingsCount.rows[0].total,
      pendingTeacherRegistrations: pendingRegistrationsCount.rows[0].total,
      teacherApplications: applicationsCount.rows[0].total,
    },
    recentBookings: recentBookings.rows.map(toBookingDto),
    recentUsers: recentUsers.rows.map(toUserDto),
  });
}

async function listUsers(req, res) {
  const result = await query(
    "select id, role, teacher_id, name, email, phone, created_at from users order by created_at desc"
  );

  return res.json({
    items: result.rows.map(toUserDto),
    total: result.rowCount,
  });
}

async function updateUser(req, res) {
  const existing = await query("select id, role, teacher_id, name, email, phone, created_at from users where id = $1", [req.params.id]);

  if (!existing.rowCount) {
    return res.status(404).json({ message: "User tapilmadi" });
  }

  const current = existing.rows[0];
  const nextRole = ["student", "teacher", "admin"].includes(req.body?.role) ? req.body.role : current.role;
  const nextName = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : current.name;
  const nextPhone = typeof req.body?.phone === "string" ? req.body.phone.trim() : current.phone;

  if (current.id === req.user.id && nextRole !== "admin") {
    return res.status(400).json({ message: "Aktiv admin oz rolunu deyise bilmez" });
  }

  const updated = await query(
    "update users set role = $1, name = $2, phone = $3 where id = $4 returning id, role, teacher_id, name, email, phone, created_at",
    [nextRole, nextName, nextPhone, req.params.id]
  );

  return res.json({ message: "User yenilendi", user: toUserDto(updated.rows[0]) });
}

async function deleteUser(req, res) {
  const userResult = await query("select id, role, teacher_id from users where id = $1", [req.params.id]);

  if (!userResult.rowCount) {
    return res.status(404).json({ message: "User tapilmadi" });
  }

  const user = userResult.rows[0];
  if (user.id === req.user.id) {
    return res.status(400).json({ message: "Aktiv admin hesabini sile bilmez" });
  }

  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query("delete from bookings where student_id = $1 or teacher_id = $2", [user.id, user.teacher_id || null]);

    if (user.teacher_id) {
      await client.query("delete from reviews where teacher_id = $1", [user.teacher_id]);
      await client.query("delete from teachers where id = $1", [user.teacher_id]);
    }

    await client.query("delete from users where id = $1", [user.id]);
    await client.query("commit");

    return res.json({ message: "User silindi" });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function listTeachersAdmin(req, res) {
  const result = await query("select * from teachers order by created_at desc nulls last, name asc");

  return res.json({
    items: result.rows.map(toTeacherDto),
    total: result.rowCount,
  });
}

async function updateTeacherAdmin(req, res) {
  const existing = await query("select * from teachers where id = $1", [req.params.id]);

  if (!existing.rowCount) {
    return res.status(404).json({ message: "Muellim tapilmadi" });
  }

  const current = existing.rows[0];
  const subjects = Array.isArray(req.body?.subjects)
    ? req.body.subjects.map((item) => String(item).trim()).filter(Boolean)
    : current.subjects || [];

  const updated = await query(
    `update teachers
     set name = $1,
         subject = $2,
         subjects = $3,
         price = $4,
         location = $5,
         experience_years = $6,
         bio = $7,
         rating = $8
     where id = $9
     returning *`,
    [
      typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : current.name,
      typeof req.body?.subject === "string" && req.body.subject.trim() ? req.body.subject.trim() : current.subject,
      subjects,
      Number.isFinite(Number(req.body?.price)) ? Number(req.body.price) : current.price,
      typeof req.body?.location === "string" && req.body.location.trim() ? req.body.location.trim() : current.location,
      Number.isFinite(Number(req.body?.experienceYears)) ? Number(req.body.experienceYears) : current.experience_years,
      typeof req.body?.bio === "string" ? req.body.bio.trim() : current.bio,
      Number.isFinite(Number(req.body?.rating)) ? Number(req.body.rating) : current.rating,
      req.params.id,
    ]
  );

  return res.json({ message: "Muellim yenilendi", teacher: toTeacherDto(updated.rows[0]) });
}

async function deleteTeacherAdmin(req, res) {
  const teacherResult = await query("select id from teachers where id = $1", [req.params.id]);
  if (!teacherResult.rowCount) {
    return res.status(404).json({ message: "Muellim tapilmadi" });
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("delete from bookings where teacher_id = $1", [req.params.id]);
    await client.query("delete from reviews where teacher_id = $1", [req.params.id]);
    await client.query("update users set role = 'student', teacher_id = null where teacher_id = $1", [req.params.id]);
    await client.query("delete from teachers where id = $1", [req.params.id]);
    await client.query("commit");

    return res.json({ message: "Muellim silindi" });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function listBookingsAdmin(req, res) {
  const result = await query(
    `select b.id, b.student_id, b.teacher_id, b.note, b.status, b.created_at,
            student.name as student_name, teacher.name as teacher_name
     from bookings b
     left join users student on student.id = b.student_id
     left join teachers teacher on teacher.id = b.teacher_id
     order by b.created_at desc`
  );

  return res.json({ items: result.rows.map(toBookingDto), total: result.rowCount });
}

async function updateBookingStatusAdmin(req, res) {
  const status = String(req.body?.status || "");
  if (!["pending", "accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status yanlisdir" });
  }

  const updated = await query(
    `update bookings
     set status = $1
     where id = $2
     returning id, student_id, teacher_id, note, status, created_at`,
    [status, req.params.id]
  );

  if (!updated.rowCount) {
    return res.status(404).json({ message: "Booking tapilmadi" });
  }

  return res.json({ message: "Booking status yenilendi", booking: toBookingDto(updated.rows[0]) });
}

async function deleteBookingAdmin(req, res) {
  const deleted = await query("delete from bookings where id = $1 returning id", [req.params.id]);

  if (!deleted.rowCount) {
    return res.status(404).json({ message: "Booking tapilmadi" });
  }

  return res.json({ message: "Booking silindi" });
}

async function listTeacherApplications(req, res) {
  const result = await query("select * from teacher_applications order by created_at desc");

  return res.json({ items: result.rows.map(toTeacherApplicationDto), total: result.rowCount });
}

async function deleteTeacherApplication(req, res) {
  const deleted = await query("delete from teacher_applications where id = $1 returning id", [req.params.id]);

  if (!deleted.rowCount) {
    return res.status(404).json({ message: "Muraciet tapilmadi" });
  }

  return res.json({ message: "Muraciet silindi" });
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
  getOverview,
  listUsers,
  updateUser,
  deleteUser,
  listTeachersAdmin,
  updateTeacherAdmin,
  deleteTeacherAdmin,
  listBookingsAdmin,
  updateBookingStatusAdmin,
  deleteBookingAdmin,
  listTeacherApplications,
  deleteTeacherApplication,
  listTeacherRegistrationRequests,
  approveTeacherRegistrationRequest,
  rejectTeacherRegistrationRequest,
};