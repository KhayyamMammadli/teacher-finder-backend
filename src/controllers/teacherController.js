const { query } = require("../config/db");
const { createId } = require("../utils/id");
const { haversineKm } = require("../utils/geo");

function mapTeacher(row, reviews = []) {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    subject: row.subject,
    subjects: row.subjects || [],
    rating: Number(row.rating || 0),
    price: Number(row.price || 0),
    location: row.location,
    coordinates: {
      lat: Number(row.lat || 0),
      lng: Number(row.lng || 0),
    },
    experienceYears: Number(row.experience_years || 0),
    bio: row.bio,
    reviews,
  };
}

function withDistance(item, lat, lng) {
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ...item, distanceKm: null };
  }

  const distanceKm = haversineKm(lat, lng, item.coordinates.lat, item.coordinates.lng);
  return { ...item, distanceKm: Math.round(distanceKm * 10) / 10 };
}

async function listTeachers(req, res) {
  const { subject, minPrice, maxPrice, rating, location, lat, lng } = req.query;

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  const params = [];
  const where = [];

  if (subject) {
    params.push(String(subject).toLowerCase());
    where.push(`(lower(subject) = $${params.length} or exists (select 1 from unnest(subjects) s where lower(s) = $${params.length}))`);
  }

  if (location) {
    params.push(`%${String(location).toLowerCase()}%`);
    where.push(`lower(location) like $${params.length}`);
  }

  if (minPrice) {
    params.push(Number(minPrice));
    where.push(`price >= $${params.length}`);
  }

  if (maxPrice) {
    params.push(Number(maxPrice));
    where.push(`price <= $${params.length}`);
  }

  if (rating) {
    params.push(Number(rating));
    where.push(`rating >= $${params.length}`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const teacherRows = await query(`select * from teachers ${whereSql}`, params);

  let result = teacherRows.rows.map((row) => withDistance(mapTeacher(row), parsedLat, parsedLng));

  result.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm;
    }
    return b.rating - a.rating;
  });

  return res.json({ items: result, total: result.length });
}

async function getTopTeachers(req, res) {
  const topRows = await query("select * from teachers order by rating desc limit 4");
  const top = topRows.rows.map((row) => mapTeacher(row));
  return res.json({ items: top });
}

async function getTeacherById(req, res) {
  const teacherResult = await query("select * from teachers where id = $1", [req.params.id]);
  if (!teacherResult.rowCount) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  const reviewResult = await query(
    "select id, user_name, comment, rating from reviews where teacher_id = $1 order by created_at desc",
    [req.params.id]
  );

  const reviews = reviewResult.rows.map((row) => ({
    id: row.id,
    user: row.user_name,
    comment: row.comment,
    rating: Number(row.rating || 0),
  }));

  const teacher = mapTeacher(teacherResult.rows[0], reviews);
  return res.json(teacher);
}

async function getPopularSubjects(req, res) {
  const result = await query(
    "select subject from teachers union select distinct unnest(subjects) as subject from teachers limit 8"
  );
  return res.json({ items: result.rows.map((row) => row.subject).filter(Boolean) });
}

async function applyAsTeacher(req, res) {
  const { name, subjects: selectedSubjects, experience, price, location } = req.body;

  if (!name || !Array.isArray(selectedSubjects) || !selectedSubjects.length || !experience || !price || !location) {
    return res.status(400).json({ message: "Butun saheler teleb olunur" });
  }

  const application = {
    id: createId("a"),
    name,
    subjects: selectedSubjects,
    experience,
    price,
    location,
    createdAt: new Date().toISOString(),
  };

  await query(
    "insert into teacher_applications (id, name, subjects, experience, price, location, created_at) values ($1,$2,$3,$4,$5,$6,$7)",
    [application.id, name, selectedSubjects, Number(experience), Number(price), location, application.createdAt]
  );

  return res.status(201).json({ message: "Muraciet ugurla gonderildi", application });
}

module.exports = {
  listTeachers,
  getTopTeachers,
  getTeacherById,
  getPopularSubjects,
  applyAsTeacher,
};
