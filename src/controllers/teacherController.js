const { teachers, subjects, teacherApplications } = require("../data/mockData");
const { haversineKm } = require("../utils/geo");

function withDistance(item, lat, lng) {
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ...item, distanceKm: null };
  }

  const distanceKm = haversineKm(lat, lng, item.coordinates.lat, item.coordinates.lng);
  return { ...item, distanceKm: Math.round(distanceKm * 10) / 10 };
}

function listTeachers(req, res) {
  const { subject, minPrice, maxPrice, rating, location, lat, lng } = req.query;

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  let result = teachers.map((t) => withDistance(t, parsedLat, parsedLng));

  if (subject) {
    const s = String(subject).toLowerCase();
    result = result.filter(
      (t) => t.subject.toLowerCase() === s || t.subjects.some((item) => item.toLowerCase() === s)
    );
  }

  if (location) {
    const loc = String(location).toLowerCase();
    result = result.filter((t) => t.location.toLowerCase().includes(loc));
  }

  if (minPrice) {
    result = result.filter((t) => t.price >= Number(minPrice));
  }

  if (maxPrice) {
    result = result.filter((t) => t.price <= Number(maxPrice));
  }

  if (rating) {
    result = result.filter((t) => t.rating >= Number(rating));
  }

  result.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm;
    }
    return b.rating - a.rating;
  });

  return res.json({ items: result, total: result.length });
}

function getTopTeachers(req, res) {
  const top = [...teachers].sort((a, b) => b.rating - a.rating).slice(0, 4);
  return res.json({ items: top });
}

function getTeacherById(req, res) {
  const teacher = teachers.find((item) => item.id === req.params.id);
  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }
  return res.json(teacher);
}

function getPopularSubjects(req, res) {
  return res.json({ items: subjects.slice(0, 6) });
}

function applyAsTeacher(req, res) {
  const { name, subjects: selectedSubjects, experience, price, location } = req.body;

  if (!name || !Array.isArray(selectedSubjects) || !selectedSubjects.length || !experience || !price || !location) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const application = {
    id: `a${teacherApplications.length + 1}`,
    name,
    subjects: selectedSubjects,
    experience,
    price,
    location,
    createdAt: new Date().toISOString(),
  };

  teacherApplications.push(application);
  return res.status(201).json({ message: "Application submitted", application });
}

module.exports = {
  listTeachers,
  getTopTeachers,
  getTeacherById,
  getPopularSubjects,
  applyAsTeacher,
};
