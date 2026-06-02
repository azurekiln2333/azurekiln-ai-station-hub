const DEFAULT_TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS || 8000);
const DEFAULT_INTERVAL_MS = Number(process.env.PROBE_INTERVAL_MS || 300000);

let running = false;
let lastRun = null;

export function getProbeState() {
  return {
    running,
    lastRun,
    intervalMs: DEFAULT_INTERVAL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS
  };
}

export function startProbeScheduler(query, logger = console) {
  runStationChecks(query, logger).catch((error) => logger.error("Initial probe failed:", error));
  return setInterval(() => {
    runStationChecks(query, logger).catch((error) => logger.error("Scheduled probe failed:", error));
  }, DEFAULT_INTERVAL_MS);
}

export async function runStationChecks(query, logger = console) {
  if (running) {
    return getProbeState();
  }

  running = true;
  lastRun = new Date().toISOString();

  try {
    const stations = await query("SELECT id, url FROM stations ORDER BY id ASC");
    const results = await Promise.allSettled(
      stations.map(async (station) => {
        const result = await probeUrl(station.url);
        await query(
          `UPDATE stations
           SET status = :status,
               latency = :latency,
               last_checked_at = NOW(),
               status_error = :statusError
           WHERE id = :id`,
          {
            id: station.id,
            status: result.status,
            latency: result.latency,
            statusError: result.error
          }
        );
        return { id: station.id, ...result };
      })
    );

    return {
      ...getProbeState(),
      checked: results.length,
      failed: results.filter((result) => result.status === "rejected").length
    };
  } finally {
    running = false;
  }
}

async function probeUrl(url) {
  const start = Date.now();
  try {
    const response = await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS, "HEAD");
    const latency = Math.max(Date.now() - start, 1);
    const status = classifyStatus(response.status);
    return {
      latency,
      status,
      error: status === "online" ? null : `HTTP ${response.status}`
    };
  } catch (headError) {
    try {
      const response = await fetchWithTimeout(url, DEFAULT_TIMEOUT_MS, "GET");
      const latency = Math.max(Date.now() - start, 1);
      const status = classifyStatus(response.status);
      return {
        latency,
        status,
        error: status === "online" ? null : `HTTP ${response.status}`
      };
    } catch (getError) {
      return {
        latency: DEFAULT_TIMEOUT_MS,
        status: "offline",
        error: trimError(getError.message || "Probe failed")
      };
    }
  }
}

async function fetchWithTimeout(url, timeoutMs, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "AzureKiln-AI-Hub-Probe/1.0"
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

function classifyStatus(statusCode) {
  if (statusCode >= 200 && statusCode < 400) return "online";
  if (statusCode === 408 || statusCode === 429) return "degraded";
  if (statusCode >= 400 && statusCode < 500) return "online";
  return "offline";
}

function trimError(error) {
  return String(error).slice(0, 240);
}
