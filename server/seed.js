import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { stations } from "./seed-data/stations.js";
import { baseConfig, dbName } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connection = await mysql.createConnection({
    ...baseConfig(false),
    multipleStatements: true
  });

  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await connection.query(schema.replaceAll("`azurekiln_ai_hub`", `\`${dbName}\``));
  await connection.changeUser({ database: dbName });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@azurekiln.ai";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
  const demoEmail = process.env.DEMO_EMAIL || "demo@azurekiln.ai";
  const demoPassword = process.env.DEMO_PASSWORD || "demo123456";

  await upsertUser(connection, "管理员", adminEmail, adminPassword, "admin");
  await upsertUser(connection, "Demo User", demoEmail, demoPassword, "user");

  for (const [index, station] of stations.entries()) {
    await connection.execute(
      `INSERT INTO stations (
        id, name, tagline, description, url, api_endpoint, cdk_url, category, tags, models, region,
        latency, uptime, status, security, pricing, launch_label, icon, icon_url, accent,
        featured, sort_order, score, api_shape, use_cases, docs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), tagline = VALUES(tagline), description = VALUES(description),
        url = VALUES(url), api_endpoint = VALUES(api_endpoint), cdk_url = VALUES(cdk_url), category = VALUES(category), tags = VALUES(tags),
        models = VALUES(models), region = VALUES(region), latency = VALUES(latency),
        uptime = VALUES(uptime), status = VALUES(status), security = VALUES(security),
        pricing = VALUES(pricing), launch_label = VALUES(launch_label), icon = VALUES(icon), icon_url = VALUES(icon_url),
        accent = VALUES(accent), featured = VALUES(featured), sort_order = VALUES(sort_order), score = VALUES(score),
        api_shape = VALUES(api_shape), use_cases = VALUES(use_cases), docs = VALUES(docs)`,
      [
        station.id,
        station.name,
        station.tagline,
        station.description,
        station.url,
        station.apiEndpoint || station.url,
        station.cdkUrl || "",
        station.category,
        JSON.stringify(station.tags),
        JSON.stringify(station.models),
        station.region,
        station.latency,
        station.uptime,
        station.status,
        JSON.stringify(station.security),
        station.pricing,
        station.launchLabel,
        station.icon,
        station.iconUrl || "",
        station.accent,
        station.featured ? 1 : 0,
        station.sortOrder || (index + 1) * 10,
        station.score,
        station.apiShape,
        JSON.stringify(station.useCases),
        station.docs
      ]
    );
  }

  await connection.end();
  console.log(`Seeded MySQL database "${dbName}"`);
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`Demo login: ${demoEmail} / ${demoPassword}`);
}

async function upsertUser(connection, name, email, password, role) {
  const hash = await bcrypt.hash(password, 10);
  await connection.execute(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role)`,
    [name, email, hash, role]
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
