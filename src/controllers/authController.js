const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/constants");
const { users, teachers } = require("../data/mockData");

function toAuthResponse(user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      teacherId: user.teacherId,
    },
  };
}

async function register(req, res) {
  const { name, email, password, role = "student", phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email, password required" });
  }

  if (!["student", "teacher"].includes(role)) {
    return res.status(400).json({ message: "role must be student or teacher" });
  }

  if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = `u${users.length + 1}`;

  const user = {
    id,
    role,
    name,
    email,
    passwordHash,
    phone: phone || "",
    createdAt: new Date().toISOString(),
  };

  if (role === "teacher") {
    const teacherId = `t${teachers.length + 1}`;
    teachers.push({
      id: teacherId,
      name,
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600",
      subject: "General",
      subjects: [],
      rating: 0,
      price: 0,
      location: "Unknown",
      coordinates: { lat: 40.4093, lng: 49.8671 },
      experienceYears: 0,
      bio: "Yeni müəllim profili",
      reviews: [],
    });
    user.teacherId = teacherId;
  }

  users.push(user);
  return res.status(201).json(toAuthResponse(user));
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "email and password required" });
  }

  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json(toAuthResponse(user));
}

module.exports = {
  register,
  login,
};
