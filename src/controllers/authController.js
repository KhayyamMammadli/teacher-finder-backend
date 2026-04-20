const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN, META_APP_ID, META_APP_SECRET, META_REDIRECT_URI, WEB_APP_URL } = require("../config/constants");
const { query } = require("../config/db");
const { createId } = require("../utils/id");

const META_GRAPH_BASE = "https://graph.facebook.com/v22.0";

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
      authProvider: user.auth_provider || null,
      instagramUsername: user.instagram_username || null,
      profileImageUrl: user.profile_image_url || null,
    },
  };
}

function buildFrontendRedirect(path, params = {}) {
  const url = new URL(path, WEB_APP_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function fetchMetaJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || "Meta API xetasi bas verdi";
    throw new Error(message);
  }

  return data;
}

async function upsertInstagramSeller({ instagramId, username, accessToken, expiresIn, profileImageUrl }) {
  const syntheticEmail = `instagram_${instagramId}@azstore.local`;
  const existing = await query(
    `select id, role, name, email, phone, auth_provider, instagram_username, profile_image_url
     from users
     where (auth_provider = 'instagram' and provider_user_id = $1) or lower(email) = $2
     limit 1`,
    [instagramId, syntheticEmail]
  );

  const expiresAt = expiresIn ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString() : null;
  const displayName = username ? `@${username}` : "Instagram Seller";

  if (existing.rowCount) {
    const updated = await query(
      `update users
       set role = 'shop_owner',
           name = $1,
           email = coalesce(email, $2),
           auth_provider = 'instagram',
           provider_user_id = $3,
           instagram_username = $4,
           profile_image_url = $5,
           instagram_access_token = $6,
           instagram_token_expires_at = $7
       where id = $8
       returning id, role, name, email, phone, auth_provider, instagram_username, profile_image_url`,
      [displayName, syntheticEmail, instagramId, username || null, profileImageUrl || null, accessToken, expiresAt, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const created = await query(
    `insert into users
      (id, role, name, email, phone, auth_provider, provider_user_id, instagram_username, profile_image_url, instagram_access_token, instagram_token_expires_at)
     values ($1, 'shop_owner', $2, $3, '', 'instagram', $4, $5, $6, $7, $8)
     returning id, role, name, email, phone, auth_provider, instagram_username, profile_image_url`,
    [createId("u"), displayName, syntheticEmail, instagramId, username || null, profileImageUrl || null, accessToken, expiresAt]
  );
  return created.rows[0];
}

async function createOauthSession(userId) {
  const sessionId = createId("oauth");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await query(
    "insert into oauth_login_sessions (id, user_id, expires_at, consumed) values ($1, $2, $3, false)",
    [sessionId, userId, expiresAt]
  );
  return sessionId;
}

async function getInstagramOAuthUrl(req, res) {
  if (!META_APP_ID || !META_REDIRECT_URI) {
    return res.status(500).json({ message: "Instagram login env deyisenleri teyin olunmayib" });
  }

  const url = new URL(`${META_GRAPH_BASE}/oauth/authorize`);
  url.searchParams.set("client_id", META_APP_ID);
  url.searchParams.set("redirect_uri", META_REDIRECT_URI);
  url.searchParams.set("scope", "instagram_basic,pages_show_list,business_management");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", String(req.query.state || "seller-login"));

  return res.json({ url: url.toString() });
}

async function instagramCallback(req, res) {
  const { code, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.redirect(buildFrontendRedirect("/login", { auth_error: errorDescription || error }));
  }

  if (!code) {
    return res.redirect(buildFrontendRedirect("/login", { auth_error: "Instagram kodu tapilmadi" }));
  }

  if (!META_APP_ID || !META_APP_SECRET || !META_REDIRECT_URI) {
    return res.redirect(buildFrontendRedirect("/login", { auth_error: "Instagram env ayarlari yoxdur" }));
  }

  try {
    const tokenUrl = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", META_REDIRECT_URI);
    tokenUrl.searchParams.set("code", String(code));

    const tokenData = await fetchMetaJson(tokenUrl.toString());
    const userAccessToken = tokenData.access_token;

    const accountsUrl = new URL(`${META_GRAPH_BASE}/me/accounts`);
    accountsUrl.searchParams.set("fields", "instagram_business_account{id,username,profile_picture_url}");
    accountsUrl.searchParams.set("access_token", userAccessToken);

    const accountsData = await fetchMetaJson(accountsUrl.toString());
    const instagramAccount = (accountsData.data || []).find((page) => page.instagram_business_account)?.instagram_business_account;

    if (!instagramAccount?.id) {
      return res.redirect(buildFrontendRedirect("/login", {
        auth_error: "Instagram Business hesabi tapilmadi. Hesab Facebook Page ile bagli olmalidir.",
      }));
    }

    const user = await upsertInstagramSeller({
      instagramId: instagramAccount.id,
      username: instagramAccount.username,
      accessToken: userAccessToken,
      expiresIn: tokenData.expires_in,
      profileImageUrl: instagramAccount.profile_picture_url,
    });

    const authCode = await createOauthSession(user.id);
    return res.redirect(buildFrontendRedirect("/login", { auth_code: authCode }));
  } catch (err) {
    return res.redirect(buildFrontendRedirect("/login", {
      auth_error: err instanceof Error ? err.message : "Instagram login ugursuz oldu",
    }));
  }
}

async function exchangeInstagramCode(req, res) {
  const { authCode } = req.body;

  if (!authCode) {
    return res.status(400).json({ message: "authCode teleb olunur" });
  }

  const sessionResult = await query(
    `select s.id, s.user_id, s.expires_at, s.consumed,
            u.id as user_id_value, u.role, u.name, u.email, u.phone, u.auth_provider, u.instagram_username, u.profile_image_url
     from oauth_login_sessions s
     join users u on u.id = s.user_id
     where s.id = $1
     limit 1`,
    [authCode]
  );

  if (!sessionResult.rowCount) {
    return res.status(404).json({ message: "Instagram auth sessiyasi tapilmadi" });
  }

  const session = sessionResult.rows[0];
  if (session.consumed || new Date(session.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ message: "Instagram auth sessiyasinin vaxti bitib" });
  }

  await query("update oauth_login_sessions set consumed = true where id = $1", [authCode]);
  return res.json(toAuthResponse(session));
}

async function sendRegisterOtp(req, res) {
  return res.status(410).json({
    message: "Seller qeydiyyati ucun Instagram login istifade edin",
  });
}

async function verifyRegisterOtp(req, res) {
  return res.status(410).json({
    message: "Seller qeydiyyati ucun Instagram login istifade edin",
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email ve sifre teleb olunur" });
  }

  const result = await query("select * from users where lower(email) = $1", [String(email).toLowerCase()]);
  if (!result.rowCount) {
    return res.status(401).json({ message: "Email ve ya sifre sehvdir" });
  }

  const user = result.rows[0];

  const ok = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
  if (!ok) {
    return res.status(401).json({ message: "Email ve ya sifre sehvdir" });
  }

  return res.json(toAuthResponse(user));
}

async function register(req, res) {
  return res.status(410).json({
    message: "Qeydiyyat ucun OTP axinindan istifade edin",
  });
}

module.exports = {
  getInstagramOAuthUrl,
  instagramCallback,
  exchangeInstagramCode,
  sendRegisterOtp,
  verifyRegisterOtp,
  register,
  login,
};
