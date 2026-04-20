const { query } = require("../config/db");
const { createId } = require("../utils/id");

function mapOrder(row) {
  return {
    id: row.id,
    shopId: row.shop_id,
    productId: row.product_id,
    productName: row.product_name || null,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerInstagram: row.customer_instagram,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Public: anyone can submit an inquiry/order
async function createOrder(req, res) {
  const { shopId, productId, customerName, customerPhone, customerInstagram, note } = req.body;

  if (!shopId || !customerName) {
    return res.status(400).json({ message: "Mağaza ID və müştəri adı tələb olunur" });
  }

  const shopResult = await query("select id from shops where id = $1 and is_active = true", [shopId]);
  if (!shopResult.rowCount) {
    return res.status(404).json({ message: "Mağaza tapılmadı" });
  }

  const id = createId("ord");
  await query(
    `insert into orders (id, shop_id, product_id, customer_name, customer_phone, customer_instagram, note)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [id, shopId, productId || null, customerName, customerPhone || null, customerInstagram || null, note || null]
  );

  return res.status(201).json({ id, message: "Sifarişiniz göndərildi" });
}

// Shop owner: list orders for their shop
async function listShopOrders(req, res) {
  const { status, limit = "50", offset = "0" } = req.query;

  const shopResult = await query("select id from shops where owner_id = $1 limit 1", [req.user.id]);
  if (!shopResult.rowCount) {
    return res.status(404).json({ message: "Mağazanız yoxdur" });
  }

  const shopId = shopResult.rows[0].id;
  const conditions = ["o.shop_id = $1"];
  const params = [shopId];

  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }

  params.push(Number(limit) || 50, Number(offset) || 0);
  const lIdx = params.length - 1;
  const oIdx = params.length;

  const sql = `
    select o.*, p.name as product_name
    from orders o
    left join products p on p.id = o.product_id
    where ${conditions.join(" and ")}
    order by o.created_at desc
    limit $${lIdx} offset $${oIdx}
  `;

  const result = await query(sql, params);
  return res.json(result.rows.map(mapOrder));
}

// Shop owner: update order status
async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const valid = ["new", "processing", "shipped", "delivered", "cancelled"];
  if (!valid.includes(status)) {
    return res.status(400).json({ message: "Yanlış status" });
  }

  const orderResult = await query(
    "select o.id, s.owner_id from orders o join shops s on s.id = o.shop_id where o.id = $1",
    [id]
  );

  if (!orderResult.rowCount) {
    return res.status(404).json({ message: "Sifariş tapılmadı" });
  }

  if (orderResult.rows[0].owner_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "İcazəniz yoxdur" });
  }

  await query("update orders set status = $1, updated_at = now() where id = $2", [status, id]);

  const updated = await query(
    "select o.*, p.name as product_name from orders o left join products p on p.id = o.product_id where o.id = $1",
    [id]
  );
  return res.json(mapOrder(updated.rows[0]));
}

module.exports = {
  createOrder,
  listShopOrders,
  updateOrderStatus,
};
