const { users } = require("../data/mockData");

function getMyProfile(req, res) {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    teacherId: user.teacherId,
  });
}

function updateMyProfile(req, res) {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { name, phone } = req.body;
  if (typeof name === "string" && name.trim()) {
    user.name = name.trim();
  }
  if (typeof phone === "string") {
    user.phone = phone.trim();
  }

  return res.json({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    teacherId: user.teacherId,
  });
}

module.exports = {
  getMyProfile,
  updateMyProfile,
};
