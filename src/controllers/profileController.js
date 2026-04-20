const { query } = require("../config/db");

function mapProfile(row) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    email: row.email,
    phone: row.phone,
  };
}

async function getMyProfile(req, res) {
  const result = await query("select id, role, name, email, phone from users where id = $1", [
    req.user.id,
  ]);

  if (!result.rowCount) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(mapProfile(result.rows[0]));
}

async function updateMyProfile(req, res) {
  const existing = await query("select id, role, name, email, phone from users where id = $1", [
    req.user.id,
  ]);

  if (!existing.rowCount) {
    return res.status(404).json({ message: "User not found" });
  }

  const current = existing.rows[0];
  const { name, phone } = req.body;

  const updated = await query(
    "update users set name = $1, phone = $2 where id = $3 returning id, role, name, email, phone",
    [
      typeof name === "string" && name.trim() ? name.trim() : current.name,
      typeof phone === "string" ? phone.trim() : current.phone,
      req.user.id,
    ]
  );

  return res.json(mapProfile(updated.rows[0]));
}

module.exports = {
  getMyProfile,
  updateMyProfile,
};
