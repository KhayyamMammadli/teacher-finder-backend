const { query } = require("../config/db");
const { createId } = require("../utils/id");

function mapShop(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    instagramUrl: row.instagram_url,
    whatsapp: row.whatsapp,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url,
    location: row.location,
    deliveryInfo: row.delivery_info,
    isFeatured: row.is_featured,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    description: row.description,
    price: row.price !== null ? Number(row.price) : null,
    category: row.category,
    imageUrl: row.image_url,
    isAvailable: row.is_available,
    createdAt: row.created_at,
  };
}

async function listShops(req, res) {
  const { category, search, featured, limit = "20", offset = "0" } = req.query;

  const conditions = ["s.is_active = true"];
  const params = [];

  if (category && category !== "all") {
    params.push(category);
    conditions.push(`s.category = $${params.length}`);
  }

  if (search) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(lower(s.name) like $${params.length} or lower(s.description) like $${params.length} or lower(s.location) like $${params.length})`);
  }

  if (featured === "true") {
    conditions.push("s.is_featured = true");
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  params.push(Number(limit) || 20, Number(offset) || 0);
  const lIdx = params.length - 1;
  const oIdx = params.length;

  const sql = `
    select s.*,
      count(p.id) filter (where p.is_available) as product_count
    from shops s
    left join products p on p.shop_id = s.id
    ${where}
    group by s.id
    order by s.is_featured desc, s.created_at desc
    limit $${lIdx} offset $${oIdx}
  `;

  const result = await query(sql, params);
  return res.json(result.rows.map((row) => ({ ...mapShop(row), productCount: Number(row.product_count) })));
}

async function getShop(req, res) {
  const { id } = req.params;
  const shopResult = await query("select * from shops where id = $1 and is_active = true", [id]);
  const shop = shopResult.rows[0];

  if (!shop) {
    return res.status(404).json({ message: "Mağaza tapılmadı" });
  }

  const productsResult = await query(
    "select * from products where shop_id = $1 and is_available = true order by created_at desc",
    [id]
  );

  return res.json({ ...mapShop(shop), products: productsResult.rows.map(mapProduct) });
}

async function createShop(req, res) {
  const { name, description, category, instagramUrl, whatsapp, logoUrl, coverUrl, location, deliveryInfo } = req.body;

  if (!name || !category) {
    return res.status(400).json({ message: "Ad və kateqoriya tələb olunur" });
  }

  const existing = await query("select id from shops where owner_id = $1 limit 1", [req.user.id]);
  if (existing.rowCount) {
    return res.status(409).json({ message: "Sizdə artıq bir mağaza var" });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
  const id = createId("shop");

  await query(
    `insert into shops (id, owner_id, name, slug, description, category, instagram_url, whatsapp, logo_url, cover_url, location, delivery_info)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, req.user.id, name, slug, description || null, category, instagramUrl || null, whatsapp || null, logoUrl || null, coverUrl || null, location || null, deliveryInfo || null]
  );

  await query("update users set role = 'shop_owner' where id = $1", [req.user.id]);

  const result = await query("select * from shops where id = $1", [id]);
  return res.status(201).json(mapShop(result.rows[0]));
}

async function updateShop(req, res) {
  const { id } = req.params;
  const shop = await query("select owner_id from shops where id = $1", [id]);

  if (!shop.rowCount) {
    return res.status(404).json({ message: "Mağaza tapılmadı" });
  }

  if (shop.rows[0].owner_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "İcazəniz yoxdur" });
  }

  const { name, description, category, instagramUrl, whatsapp, logoUrl, coverUrl, location, deliveryInfo } = req.body;

  await query(
    `update shops set
      name = coalesce($1, name),
      description = coalesce($2, description),
      category = coalesce($3, category),
      instagram_url = coalesce($4, instagram_url),
      whatsapp = coalesce($5, whatsapp),
      logo_url = coalesce($6, logo_url),
      cover_url = coalesce($7, cover_url),
      location = coalesce($8, location),
      delivery_info = coalesce($9, delivery_info),
      updated_at = now()
    where id = $10`,
    [name || null, description || null, category || null, instagramUrl || null, whatsapp || null, logoUrl || null, coverUrl || null, location || null, deliveryInfo || null, id]
  );

  const result = await query("select * from shops where id = $1", [id]);
  return res.json(mapShop(result.rows[0]));
}

async function getMyShop(req, res) {
  const result = await query("select * from shops where owner_id = $1 limit 1", [req.user.id]);

  if (!result.rowCount) {
    return res.status(404).json({ message: "Mağazanız yoxdur" });
  }

  const shop = result.rows[0];
  const products = await query("select * from products where shop_id = $1 order by created_at desc", [shop.id]);

  return res.json({ ...mapShop(shop), products: products.rows.map(mapProduct) });
}

async function createProduct(req, res) {
  const { shopId, name, description, price, category, imageUrl } = req.body;

  if (!shopId || !name) {
    return res.status(400).json({ message: "Mağaza ID və məhsul adı tələb olunur" });
  }

  const shopResult = await query("select owner_id from shops where id = $1", [shopId]);

  if (!shopResult.rowCount) {
    return res.status(404).json({ message: "Mağaza tapılmadı" });
  }

  if (shopResult.rows[0].owner_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "İcazəniz yoxdur" });
  }

  const id = createId("prod");
  await query(
    "insert into products (id, shop_id, name, description, price, category, image_url) values ($1,$2,$3,$4,$5,$6,$7)",
    [id, shopId, name, description || null, price ? Number(price) : null, category || null, imageUrl || null]
  );

  const result = await query("select * from products where id = $1", [id]);
  return res.status(201).json(mapProduct(result.rows[0]));
}

async function updateProduct(req, res) {
  const { id } = req.params;
  const prod = await query("select p.*, s.owner_id from products p join shops s on s.id = p.shop_id where p.id = $1", [id]);

  if (!prod.rowCount) {
    return res.status(404).json({ message: "Məhsul tapılmadı" });
  }

  if (prod.rows[0].owner_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "İcazəniz yoxdur" });
  }

  const { name, description, price, category, imageUrl, isAvailable } = req.body;

  await query(
    `update products set
      name = coalesce($1, name),
      description = coalesce($2, description),
      price = coalesce($3, price),
      category = coalesce($4, category),
      image_url = coalesce($5, image_url),
      is_available = coalesce($6, is_available),
      updated_at = now()
    where id = $7`,
    [name || null, description || null, price !== undefined ? Number(price) : null, category || null, imageUrl || null, isAvailable !== undefined ? Boolean(isAvailable) : null, id]
  );

  const result = await query("select * from products where id = $1", [id]);
  return res.json(mapProduct(result.rows[0]));
}

async function deleteProduct(req, res) {
  const { id } = req.params;
  const prod = await query("select p.id, s.owner_id from products p join shops s on s.id = p.shop_id where p.id = $1", [id]);

  if (!prod.rowCount) {
    return res.status(404).json({ message: "Məhsul tapılmadı" });
  }

  if (prod.rows[0].owner_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "İcazəniz yoxdur" });
  }

  await query("delete from products where id = $1", [id]);
  return res.json({ message: "Silindi" });
}

async function searchProducts(req, res) {
  const { search, category, shopId, limit = "24", offset = "0" } = req.query;

  const conditions = ["p.is_available = true", "s.is_active = true"];
  const params = [];

  if (search) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(lower(p.name) like $${params.length} or lower(p.description) like $${params.length})`);
  }

  if (category && category !== "all") {
    params.push(category);
    conditions.push(`p.category = $${params.length}`);
  }

  if (shopId) {
    params.push(shopId);
    conditions.push(`p.shop_id = $${params.length}`);
  }

  params.push(Number(limit) || 24, Number(offset) || 0);
  const lIdx = params.length - 1;
  const oIdx = params.length;

  const sql = `
    select p.*, s.name as shop_name, s.instagram_url, s.whatsapp, s.location as shop_location
    from products p
    join shops s on s.id = p.shop_id
    where ${conditions.join(" and ")}
    order by p.created_at desc
    limit $${lIdx} offset $${oIdx}
  `;

  const result = await query(sql, params);

  return res.json(result.rows.map((row) => ({
    ...mapProduct(row),
    shopName: row.shop_name,
    instagramUrl: row.instagram_url,
    whatsapp: row.whatsapp,
    shopLocation: row.shop_location,
  })));
}

module.exports = {
  listShops,
  getShop,
  createShop,
  updateShop,
  getMyShop,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
};
