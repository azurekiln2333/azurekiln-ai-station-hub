import "./env.js";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { pool, query } from "./db.js";
import { getProbeState, runStationCheck, runStationChecks, startProbeScheduler } from "./statusProbe.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "dev-secret";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const oauthIssuerUrl = trimTrailingSlash(process.env.OAUTH_ISSUER_URL || "http://localhost:3146");
const oauthClientId = process.env.OAUTH_CLIENT_ID || "";
const oauthClientSecret = process.env.OAUTH_CLIENT_SECRET || "";
const oauthRedirectUri = process.env.OAUTH_REDIRECT_URI || `${clientOrigin}/oauth/callback`;
const oauthScope = process.env.OAUTH_SCOPE || "openid profile email";

app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1 AS ok");
    res.json({ ok: true, database: "mysql" });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: "邮箱和密码不能为空" });
    return;
  }

  const users = await query("SELECT * FROM users WHERE email = :email LIMIT 1", { email });
  const user = users[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: "账号或密码错误" });
    return;
  }

  res.json({
    token: signUser(user),
    user: publicUser(user)
  });
});

app.post("/api/auth/oauth/authorize-url", (req, res) => {
  if (!isOauthConfigured()) {
    res.status(400).json({ error: "OAuth 登录尚未配置" });
    return;
  }

  const state = String(req.body?.state || "").trim();
  const codeChallenge = String(req.body?.codeChallenge || req.body?.code_challenge || "").trim();
  if (!state || !codeChallenge) {
    res.status(400).json({ error: "OAuth state 和 code challenge 不能为空" });
    return;
  }

  const url = new URL(`${oauthIssuerUrl}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", oauthClientId);
  url.searchParams.set("redirect_uri", oauthRedirectUri);
  url.searchParams.set("scope", oauthScope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  res.json({ url: url.toString() });
});

app.post("/api/auth/oauth/callback", async (req, res) => {
  if (!isOauthConfigured()) {
    res.status(400).json({ error: "OAuth 登录尚未配置" });
    return;
  }

  const code = String(req.body?.code || "").trim();
  const codeVerifier = String(req.body?.codeVerifier || req.body?.code_verifier || "").trim();
  if (!code || !codeVerifier) {
    res.status(400).json({ error: "OAuth 授权码或 code verifier 不能为空" });
    return;
  }

  const tokenData = await exchangeOAuthCode(code, codeVerifier);
  const profile = await fetchOAuthProfile(tokenData.access_token);
  const user = await findOrCreateOAuthUser(profile);

  res.json({
    token: signUser(user),
    user: publicUser(user)
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/stations", async (_req, res) => {
  const rows = await query("SELECT * FROM stations ORDER BY sort_order ASC, featured DESC, score DESC, name ASC");
  res.json({ stations: rows.map(toStation) });
});

app.get("/api/stations/status", async (_req, res) => {
  const rows = await query(
    `SELECT id, latency, status, last_checked_at, status_error
     FROM stations
     ORDER BY id ASC`
  );
  res.json({
    probe: getProbeState(),
    statuses: rows.map(toStationStatus)
  });
});

app.post("/api/stations/check", async (_req, res) => {
  const probe = await runStationChecks(query);
  const rows = await query(
    `SELECT id, latency, status, last_checked_at, status_error
     FROM stations
     ORDER BY id ASC`
  );
  res.json({
    probe,
    statuses: rows.map(toStationStatus)
  });
});

app.post("/api/admin/stations/check", requireAdmin, async (_req, res) => {
  const probe = await runStationChecks(query);
  const rows = await query(
    `SELECT id, latency, status, last_checked_at, status_error
     FROM stations
     ORDER BY id ASC`
  );
  res.json({
    probe,
    statuses: rows.map(toStationStatus)
  });
});

app.post("/api/stations/:id/check", async (req, res) => {
  const result = await runStationCheck(query, req.params.id);
  if (!result) {
    res.status(404).json({ error: "中转站不存在" });
    return;
  }
  const rows = await query(
    `SELECT id, latency, status, last_checked_at, status_error
     FROM stations
     WHERE id = :id
     LIMIT 1`,
    { id: req.params.id }
  );
  res.json({ status: toStationStatus(rows[0]) });
});

app.post("/api/stations/:id/click", async (req, res) => {
  await query("UPDATE stations SET click_count = click_count + 1 WHERE id = :id", { id: req.params.id });
  const rows = await query("SELECT id, click_count FROM stations WHERE id = :id LIMIT 1", { id: req.params.id });
  if (!rows[0]) {
    res.status(404).json({ error: "中转站不存在" });
    return;
  }
  res.json({ id: rows[0].id, clickCount: Number(rows[0].click_count || 0) });
});

app.get("/api/stations/:id", async (req, res) => {
  const rows = await query("SELECT * FROM stations WHERE id = :id LIMIT 1", { id: req.params.id });
  if (!rows[0]) {
    res.status(404).json({ error: "中转站不存在" });
    return;
  }
  res.json({ station: toStation(rows[0]) });
});

app.get("/api/favorites", requireAuth, async (req, res) => {
  const rows = await query(
    `SELECT s.* FROM favorites f
     JOIN stations s ON s.id = f.station_id
     WHERE f.user_id = :userId
     ORDER BY f.created_at DESC`,
    { userId: req.user.id }
  );
  res.json({ stations: rows.map(toStation) });
});

app.post("/api/favorites/:stationId", requireAuth, async (req, res) => {
  await query(
    `INSERT IGNORE INTO favorites (user_id, station_id)
     VALUES (:userId, :stationId)`,
    { userId: req.user.id, stationId: req.params.stationId }
  );
  res.json({ ok: true });
});

app.delete("/api/favorites/:stationId", requireAuth, async (req, res) => {
  await query(
    `DELETE FROM favorites WHERE user_id = :userId AND station_id = :stationId`,
    { userId: req.user.id, stationId: req.params.stationId }
  );
  res.json({ ok: true });
});

app.post("/api/admin/stations", requireAdmin, async (req, res) => {
  const station = normalizeStation(req.body);
  if (!station.sortOrder) {
    station.sortOrder = await getNextSortOrder();
  }
  await upsertStation(station);
  res.status(201).json({ station });
});

app.put("/api/admin/stations/order", requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  if (!ids.length) {
    res.status(400).json({ error: "排序列表不能为空" });
    return;
  }

  const uniqueIds = [...new Set(ids)];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [index, id] of uniqueIds.entries()) {
      await connection.execute("UPDATE stations SET sort_order = ? WHERE id = ?", [(index + 1) * 10, id]);
    }
    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

app.put("/api/admin/stations/:id", requireAdmin, async (req, res) => {
  const station = normalizeStation({ ...req.body, id: req.params.id });
  await upsertStation(station);
  res.json({ station });
});

app.delete("/api/admin/stations/:id", requireAdmin, async (req, res) => {
  await query("DELETE FROM stations WHERE id = :id", { id: req.params.id });
  res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "服务异常" });
});

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

async function bootstrap() {
  await ensureStationColumns();
  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
  });
  startProbeScheduler(query);
}

async function ensureStationColumns() {
  const columns = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'stations'
       AND COLUMN_NAME IN ('api_endpoint', 'cdk_url', 'icon_url', 'last_checked_at', 'status_error', 'sort_order', 'click_count', 'supports_checkin')`
  );
  const existing = new Set(columns.map((column) => column.COLUMN_NAME));

  if (!existing.has("api_endpoint")) {
    await query("ALTER TABLE stations ADD COLUMN api_endpoint VARCHAR(500) NOT NULL DEFAULT '' AFTER url");
    await query("UPDATE stations SET api_endpoint = url WHERE api_endpoint = ''");
  }
  if (!existing.has("cdk_url")) {
    await query("ALTER TABLE stations ADD COLUMN cdk_url VARCHAR(500) NULL AFTER api_endpoint");
  }
  if (!existing.has("icon_url")) {
    await query("ALTER TABLE stations ADD COLUMN icon_url VARCHAR(500) NULL AFTER icon");
  }
  if (!existing.has("last_checked_at")) {
    await query("ALTER TABLE stations ADD COLUMN last_checked_at DATETIME NULL AFTER status");
  }
  if (!existing.has("status_error")) {
    await query("ALTER TABLE stations ADD COLUMN status_error VARCHAR(255) NULL AFTER last_checked_at");
  }
  if (!existing.has("sort_order")) {
    await query("ALTER TABLE stations ADD COLUMN sort_order INT UNSIGNED NOT NULL DEFAULT 0 AFTER featured");
    await initializeSortOrder();
  }
  if (!existing.has("click_count")) {
    await query("ALTER TABLE stations ADD COLUMN click_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER sort_order");
  }
  if (!existing.has("supports_checkin")) {
    await query("ALTER TABLE stations ADD COLUMN supports_checkin BOOLEAN NOT NULL DEFAULT FALSE AFTER click_count");
  }
}

async function initializeSortOrder() {
  const rows = await query("SELECT id FROM stations ORDER BY featured DESC, score DESC, name ASC");
  for (const [index, row] of rows.entries()) {
    await query("UPDATE stations SET sort_order = :sortOrder WHERE id = :id", {
      id: row.id,
      sortOrder: (index + 1) * 10
    });
  }
}

async function getNextSortOrder() {
  const rows = await query("SELECT COALESCE(MAX(sort_order), 0) + 10 AS sort_order FROM stations");
  return Number(rows[0]?.sort_order || 10);
}

function signUser(user) {
  return jwt.sign(publicUser(user), jwtSecret, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function isOauthConfigured() {
  return Boolean(oauthIssuerUrl && oauthClientId && oauthClientSecret && oauthRedirectUri);
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

async function exchangeOAuthCode(code, codeVerifier) {
  const response = await fetch(`${oauthIssuerUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${oauthClientId}:${oauthClientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthRedirectUri,
      code_verifier: codeVerifier
    })
  });

  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "OAuth 授权码换取令牌失败");
  }
  if (!data.access_token) {
    throw new Error("OAuth token 响应缺少 access_token");
  }
  return data;
}

async function fetchOAuthProfile(accessToken) {
  const response = await fetch(`${oauthIssuerUrl}/oauth2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "OAuth 用户资料获取失败");
  }
  if (!data.email) {
    throw new Error("OAuth 用户资料缺少 email，确认客户端 scope 包含 email");
  }
  return data;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function findOrCreateOAuthUser(profile) {
  const email = String(profile.email || "").trim().toLowerCase();
  const name = String(profile.name || profile.preferred_username || profile.username || email).trim();
  const users = await query("SELECT * FROM users WHERE email = :email LIMIT 1", { email });
  if (users[0]) {
    return users[0];
  }

  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (:name, :email, :passwordHash, 'user')`,
    {
      name,
      email,
      passwordHash
    }
  );

  const created = await query("SELECT * FROM users WHERE email = :email LIMIT 1", { email });
  return created[0];
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "请先登录" });
    return;
  }
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "登录已过期" });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      res.status(403).json({ error: "只有管理员可以访问管理页" });
      return;
    }
    next();
  });
}

function parseJson(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function toStation(row) {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    url: row.url,
    apiEndpoint: row.api_endpoint || row.url,
    cdkUrl: row.cdk_url || "",
    category: row.category,
    tags: parseJson(row.tags),
    models: parseJson(row.models),
    region: row.region,
    latency: Number(row.latency),
    uptime: row.uptime,
    status: row.status,
    lastCheckedAt: formatDate(row.last_checked_at),
    statusError: row.status_error || null,
    security: parseJson(row.security),
    pricing: row.pricing,
    launchLabel: row.launch_label,
    icon: row.icon,
    iconUrl: row.icon_url || "",
    accent: row.accent,
    featured: Boolean(row.featured),
    sortOrder: Number(row.sort_order || 0),
    clickCount: Number(row.click_count || 0),
    supportsCheckin: Boolean(row.supports_checkin),
    score: Number(row.score),
    apiShape: row.api_shape,
    useCases: parseJson(row.use_cases),
    docs: row.docs
  };
}

function toStationStatus(row) {
  return {
    id: row.id,
    latency: Number(row.latency),
    status: row.status,
    lastCheckedAt: formatDate(row.last_checked_at),
    statusError: row.status_error || null
  };
}

function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function normalizeStation(input) {
  const station = {
    id: String(input.id || "").trim(),
    name: String(input.name || "").trim(),
    tagline: String(input.tagline || "").trim(),
    description: String(input.description || "").trim(),
    url: String(input.url || "").trim(),
    apiEndpoint: String(input.apiEndpoint || input.api_endpoint || input.url || "").trim(),
    cdkUrl: String(input.cdkUrl || input.cdk_url || "").trim(),
    category: String(input.category || "未分类").trim(),
    tags: parseJson(input.tags),
    models: parseJson(input.models),
    region: String(input.region || "Global").trim(),
    latency: Number(input.latency || 0),
    uptime: String(input.uptime || "99.9%").trim(),
    status: ["online", "degraded", "offline"].includes(input.status) ? input.status : "online",
    security: parseJson(input.security),
    pricing: String(input.pricing || "待定").trim(),
    launchLabel: String(input.launchLabel || input.launch_label || "点击直达").trim(),
    icon: String(input.icon || "ServerCog").trim(),
    iconUrl: String(input.iconUrl || input.icon_url || "").trim(),
    accent: String(input.accent || "blue").trim(),
    featured: Boolean(input.featured),
    sortOrder: Number(input.sortOrder || input.sort_order || 0),
    clickCount: Number(input.clickCount || input.click_count || 0),
    supportsCheckin: Boolean(input.supportsCheckin || input.supports_checkin),
    score: Number(input.score || 0),
    apiShape: String(input.apiShape || input.api_shape || "API").trim(),
    useCases: parseJson(input.useCases || input.use_cases),
    docs: String(input.docs || input.url || "").trim()
  };

  if (!station.id || !station.name || !station.url) {
    throw new Error("id、名称和直达链接不能为空");
  }
  return station;
}

async function upsertStation(station) {
  await query(
    `INSERT INTO stations (
      id, name, tagline, description, url, api_endpoint, cdk_url, category, tags, models, region,
      latency, uptime, status, security, pricing, launch_label, icon, icon_url, accent,
      featured, sort_order, click_count, supports_checkin, score, api_shape, use_cases, docs
    ) VALUES (
      :id, :name, :tagline, :description, :url, :apiEndpoint, :cdkUrl, :category, :tags,
      :models, :region, :latency, :uptime, :status,
      :security, :pricing, :launchLabel, :icon, :iconUrl, :accent,
      :featured, :sortOrder, :clickCount, :supportsCheckin, :score, :apiShape, :useCases, :docs
    )
    ON DUPLICATE KEY UPDATE
      name = VALUES(name), tagline = VALUES(tagline), description = VALUES(description),
      url = VALUES(url), api_endpoint = VALUES(api_endpoint), cdk_url = VALUES(cdk_url), category = VALUES(category), tags = VALUES(tags),
      models = VALUES(models), region = VALUES(region), latency = VALUES(latency),
      uptime = VALUES(uptime), status = VALUES(status), security = VALUES(security),
      pricing = VALUES(pricing), launch_label = VALUES(launch_label), icon = VALUES(icon), icon_url = VALUES(icon_url),
      accent = VALUES(accent), featured = VALUES(featured), sort_order = VALUES(sort_order),
      click_count = VALUES(click_count), supports_checkin = VALUES(supports_checkin), score = VALUES(score),
      api_shape = VALUES(api_shape), use_cases = VALUES(use_cases), docs = VALUES(docs)`,
    {
      ...station,
      tags: JSON.stringify(station.tags),
      models: JSON.stringify(station.models),
      security: JSON.stringify(station.security),
      useCases: JSON.stringify(station.useCases),
      featured: station.featured ? 1 : 0,
      supportsCheckin: station.supportsCheckin ? 1 : 0
    }
  );
}
