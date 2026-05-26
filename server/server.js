import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { pool, query } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "dev-secret";

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
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

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/stations", async (_req, res) => {
  const rows = await query("SELECT * FROM stations ORDER BY featured DESC, score DESC, name ASC");
  res.json({ stations: rows.map(toStation) });
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
  await upsertStation(station);
  res.status(201).json({ station });
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

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

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
    category: row.category,
    tags: parseJson(row.tags),
    models: parseJson(row.models),
    region: row.region,
    latency: Number(row.latency),
    uptime: row.uptime,
    status: row.status,
    security: parseJson(row.security),
    pricing: row.pricing,
    launchLabel: row.launch_label,
    icon: row.icon,
    accent: row.accent,
    featured: Boolean(row.featured),
    score: Number(row.score),
    apiShape: row.api_shape,
    useCases: parseJson(row.use_cases),
    docs: row.docs
  };
}

function normalizeStation(input) {
  const station = {
    id: String(input.id || "").trim(),
    name: String(input.name || "").trim(),
    tagline: String(input.tagline || "").trim(),
    description: String(input.description || "").trim(),
    url: String(input.url || "").trim(),
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
    accent: String(input.accent || "blue").trim(),
    featured: Boolean(input.featured),
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
      id, name, tagline, description, url, category, tags, models, region,
      latency, uptime, status, security, pricing, launch_label, icon, accent,
      featured, score, api_shape, use_cases, docs
    ) VALUES (
      :id, :name, :tagline, :description, :url, :category, :tags,
      :models, :region, :latency, :uptime, :status,
      :security, :pricing, :launchLabel, :icon, :accent,
      :featured, :score, :apiShape, :useCases, :docs
    )
    ON DUPLICATE KEY UPDATE
      name = VALUES(name), tagline = VALUES(tagline), description = VALUES(description),
      url = VALUES(url), category = VALUES(category), tags = VALUES(tags),
      models = VALUES(models), region = VALUES(region), latency = VALUES(latency),
      uptime = VALUES(uptime), status = VALUES(status), security = VALUES(security),
      pricing = VALUES(pricing), launch_label = VALUES(launch_label), icon = VALUES(icon),
      accent = VALUES(accent), featured = VALUES(featured), score = VALUES(score),
      api_shape = VALUES(api_shape), use_cases = VALUES(use_cases), docs = VALUES(docs)`,
    {
      ...station,
      tags: JSON.stringify(station.tags),
      models: JSON.stringify(station.models),
      security: JSON.stringify(station.security),
      useCases: JSON.stringify(station.useCases),
      featured: station.featured ? 1 : 0
    }
  );
}
