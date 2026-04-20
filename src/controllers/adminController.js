const { query } = require("../config/db");

async function getOverview(req, res) {
  try {
    const [usersR, shopsR, ordersR, newOrdersR, activeShopsR] = await Promise.all([
      query("select count(*) from users where role != 'admin'"),
      query("select count(*) from shops"),
      query("select count(*) from orders"),
      query("select count(*) from orders where status = 'new'"),
      query("select count(*) from shops where is_active = true"),
    ]);
    res.json({
      stats: {
        users: parseInt(usersR.rows[0].count),
        shops: parseInt(shopsR.rows[0].count),
        activeShops: parseInt(activeShopsR.rows[0].count),
        orders: parseInt(ordersR.rows[0].count),
        newOrders: parseInt(newOrdersR.rows[0].count),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function listShopsAdmin(req, res) {
  try {
    const { rows } = await query(
      `select s.*, u.name as owner_name, u.email as owner_email,
        (select count(*) from products p where p.shop_id = s.id) as product_count,
        (select count(*) from orders o where o.shop_id = s.id) as order_count
       from shops s
       join users u on u.id = s.owner_id
       order by s.created_at desc`
    );
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateShopAdmin(req, res) {
  const { id } = req.params;
  const { is_featured, is_active } = req.body;
  try {
    const sets = [];
    const vals = [];
    if (is_featured !== undefined) { sets.push(`is_featured = $${sets.length + 1}`); vals.push(is_featured); }
    if (is_active !== undefined) { sets.push(`is_active = $${sets.length + 1}`); vals.push(is_active); }
    if (!sets.length) return res.status(400).json({ message: "No fields to update" });
    sets.push(`updated_at = now()`);
    vals.push(id);
    const { rows } = await query(
      `update shops set ${sets.join(", ")} where id = $${vals.length} returning *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ message: "Shop not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteShopAdmin(req, res) {
  const { id } = req.params;
  try {
    await query("delete from shops where id = $1", [id]);
    res.json({ message: "Mağaza silindi" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function listOrdersAdmin(req, res) {
  try {
    const { status } = req.query;
    let sql = `select o.*, s.name as shop_name, p.name as product_name
               from orders o
               join shops s on s.id = o.shop_id
               left join products p on p.id = o.product_id`;
    const vals = [];
    if (status && status !== "all") {
      sql += ` where o.status = $1`;
      vals.push(status);
    }
    sql += ` order by o.created_at desc limit 200`;
    const { rows } = await query(sql, vals);
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateOrderStatusAdmin(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ["new", "processing", "shipped", "delivered", "cancelled"];

  if (!valid.includes(status)) {
    return res.status(400).json({ message: "Yanlis status" });
  }

  try {
    const updated = await query(
      `update orders
       set status = $1, updated_at = now()
       where id = $2
       returning id, status, updated_at`,
      [status, id]
    );

    if (!updated.rowCount) {
      return res.status(404).json({ message: "Sifaris tapilmadi" });
    }

    return res.json({
      message: "Sifaris statusu yenilendi",
      item: updated.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function listUsers(req, res) {
  try {
    const { rows } = await query(
      `select id, name, email, phone, role, created_at from users order by created_at desc`
    );
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { role, name } = req.body;
  try {
    const sets = [];
    const vals = [];
    if (role) { sets.push(`role = $${sets.length + 1}`); vals.push(role); }
    if (name) { sets.push(`name = $${sets.length + 1}`); vals.push(name); }
    if (!sets.length) return res.status(400).json({ message: "No fields" });
    vals.push(id);
    const { rows } = await query(
      `update users set ${sets.join(", ")} where id = $${vals.length} returning id,name,email,role`,
      vals
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    if (id === req.user.id) return res.status(400).json({ message: "Özünüzü silə bilməzsiniz" });
    await query("delete from users where id = $1", [id]);
    res.json({ message: "İstifadəçi silindi" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getOverview,
  listShopsAdmin,
  updateShopAdmin,
  deleteShopAdmin,
  listOrdersAdmin,
  updateOrderStatusAdmin,
  listUsers,
  updateUser,
  deleteUser,
};
