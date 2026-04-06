// SWPC Solar Wind Data Parser
// Supports legacy YYYY-MM-DD rows and current ace-swepam 1m / ace-magnetometer 1m text products.

function parseUtcTimestampFromYrMoDaHhmm(parts) {
  const yr = parseInt(parts[0], 10);
  const mo = parseInt(parts[1], 10);
  const da = parseInt(parts[2], 10);
  const hhmm = parts[3];
  if (!/^\d{4}$/.test(hhmm)) return null;
  const hh = parseInt(hhmm.slice(0, 2), 10);
  const mm = parseInt(hhmm.slice(2, 4), 10);
  if (
    [yr, mo, da, hh, mm].some((n) => Number.isNaN(n)) ||
    mo < 1 ||
    mo > 12 ||
    da < 1 ||
    da > 31
  ) {
    return null;
  }
  return new Date(Date.UTC(yr, mo - 1, da, hh, mm, 0));
}

/** Current SWPC ace-swepam 1m: YR MO DA HHMM ... S Density Speed Temperature (exactly 10 fields) */
function tryParseSwepam1mLine(parts) {
  if (parts.length !== 10) return null;
  if (!/^\d{4}$/.test(parts[0])) return null;

  const timestamp = parseUtcTimestampFromYrMoDaHhmm(parts);
  if (!timestamp) return null;

  const density = parseFloat(parts[7]);
  const speed = parseFloat(parts[8]);
  const temperature = parseFloat(parts[9]);

  if (!Number.isFinite(density) || !Number.isFinite(speed)) return null;
  if (density < -9000 || speed < -9000) return null;

  return {
    timestamp,
    density,
    speed,
    temperature: Number.isFinite(temperature) ? temperature : null,
    bx: null,
    by: null,
    bz: null,
    bt: null,
    source: "SWPC",
  };
}

/** ACE mag 1m: YR MO DA HHMM ... S Bx By Bz Bt Lat Long (12+ fields) */
function tryParseMag1mLine(parts) {
  if (parts.length < 12) return null;
  if (!/^\d{4}$/.test(parts[0])) return null;

  const timestamp = parseUtcTimestampFromYrMoDaHhmm(parts);
  if (!timestamp) return null;

  const bx = parseFloat(parts[7]);
  const by = parseFloat(parts[8]);
  const bz = parseFloat(parts[9]);
  const bt = parseFloat(parts[10]);

  if (![bx, by, bz, bt].every((v) => Number.isFinite(v))) return null;
  if (Math.abs(bx) > 900 || Math.abs(by) > 900 || Math.abs(bz) > 900) {
    return null;
  }

  return { timestamp, bx, by, bz, bt };
}

/** Legacy products/solar-wind text: YYYY-MM-DD HH:MM:SS ... */
function tryParseLegacyLine(parts) {
  if (parts.length < 6) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) return null;

  let timestamp;
  if (parts[0].includes("-")) {
    timestamp = new Date(parts[0] + " " + parts[1]);
  } else {
    return null;
  }

  if (isNaN(timestamp.getTime())) return null;

  const entry = {
    timestamp,
    density: parseFloat(parts[2]) || null,
    speed: parseFloat(parts[3]) || null,
    temperature: parseFloat(parts[4]) || null,
    bx: parseFloat(parts[5]) || null,
    by: parseFloat(parts[6]) || null,
    bz: parseFloat(parts[7]) || null,
    bt: parseFloat(parts[8]) || null,
    source: "SWPC",
  };

  if (
    !entry.bt &&
    entry.bx !== null &&
    entry.by !== null &&
    entry.bz !== null
  ) {
    entry.bt = Math.sqrt(entry.bx ** 2 + entry.by ** 2 + entry.bz ** 2);
  }

  if (entry.speed !== null || entry.density !== null || entry.bt !== null) {
    return entry;
  }
  return null;
}

export function parseSWPCData(rawText) {
  const lines = rawText.trim().split("\n");
  const data = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith(":")) continue;

    const parts = line.split(/\s+/);
    let entry =
      tryParseLegacyLine(parts) ||
      tryParseSwepam1mLine(parts) ||
      null;

    if (entry) {
      data.push(entry);
    }
  }

  data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return data;
}

/** Build ms → { bx, by, bz, bt } from ace-magnetometer.txt body */
export function parseAceMagnetometerMap(rawText) {
  const map = new Map();
  const lines = rawText.trim().split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(":")) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    const row = tryParseMag1mLine(parts);
    if (row) {
      map.set(row.timestamp.getTime(), {
        bx: row.bx,
        by: row.by,
        bz: row.bz,
        bt: row.bt,
      });
    }
  }
  return map;
}

export function mergeMagIntoPlasma(plasma, magByTimeMs) {
  if (!plasma?.length || !magByTimeMs?.size) return plasma;
  return plasma.map((e) => {
    const t = e.timestamp.getTime();
    let m = magByTimeMs.get(t);
    if (!m) {
      m = magByTimeMs.get(t - 60 * 1000) || magByTimeMs.get(t + 60 * 1000);
    }
    if (!m) return e;
    return { ...e, bx: m.bx, by: m.by, bz: m.bz, bt: m.bt };
  });
}

export function getLatestReadings(data) {
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1];
  return {
    timestamp: latest.timestamp,
    density: latest.density,
    speed: latest.speed,
    temperature: latest.temperature,
    magneticField: {
      bx: latest.bx,
      by: latest.by,
      bz: latest.bz,
      bt: latest.bt,
    },
  };
}

export function calculateAverages(data, hours = 24) {
  if (!data || data.length === 0) return null;

  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recentData = data.filter((entry) => entry.timestamp > cutoffTime);

  if (recentData.length === 0) return null;

  const sums = recentData.reduce(
    (acc, entry) => ({
      density: acc.density + (entry.density || 0),
      speed: acc.speed + (entry.speed || 0),
      temperature: acc.temperature + (entry.temperature || 0),
      bt: acc.bt + (entry.bt || 0),
    }),
    { density: 0, speed: 0, temperature: 0, bt: 0 }
  );

  return {
    density: sums.density / recentData.length,
    speed: sums.speed / recentData.length,
    temperature: sums.temperature / recentData.length,
    bt: sums.bt / recentData.length,
    count: recentData.length,
  };
}
