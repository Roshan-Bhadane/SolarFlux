import {
  parseSWPCData,
  parseAceMagnetometerMap,
  mergeMagIntoPlasma,
  getLatestReadings,
  calculateAverages,
} from "@/lib/swpc/parser";

// SWPC text products (legacy /products/solar-wind/*.txt URLs often 404 now)
const SWPC_URLS = {
  ace: "https://services.swpc.noaa.gov/text/ace-swepam.txt",
  dscovr: "https://services.swpc.noaa.gov/text/ace-swepam.txt",
};

const ACE_MAG_URL = "https://services.swpc.noaa.gov/text/ace-magnetometer.txt";

// Fallback data for when SWPC is unavailable
function generateFallbackData() {
  const now = new Date();
  const data = [];

  // Generate 24 hours of mock data
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp,
      density: 5 + Math.random() * 10, // 5-15 protons/cm³
      speed: 350 + Math.random() * 200, // 350-550 km/s
      temperature: 80000 + Math.random() * 120000, // 80k-200k K
      bx: -5 + Math.random() * 10, // -5 to 5 nT
      by: -5 + Math.random() * 10, // -5 to 5 nT
      bz: -5 + Math.random() * 10, // -5 to 5 nT
      bt: 5 + Math.random() * 10, // 5-15 nT
      source: "SWPC_FALLBACK",
    });
  }

  return data;
}

async function fetchSWPCData(url) {
  try {
    const response = await fetch(url, {
      cache: "no-store", // Always fetch fresh data
      headers: {
        "User-Agent": "SolarFlux/1.0 (solar-weather-monitoring)",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    // Check if we got valid data
    if (!text || text.trim().length < 100) {
      throw new Error("Invalid or empty response from SWPC");
    }

    return text;
  } catch (error) {
    console.error(`Failed to fetch SWPC data from ${url}:`, error);
    throw error;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "ace"; // ace or dscovr
    const includeAverages = searchParams.get("averages") === "true";
    const useFallback = searchParams.get("fallback") === "true";

    const url = SWPC_URLS[source];
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Invalid source. Use "ace" or "dscovr"' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let parsedData;
    let dataSource = source;

    if (useFallback) {
      // Use fallback data
      parsedData = generateFallbackData();
      dataSource = `${source}_FALLBACK`;
    } else {
      try {
        const [rawPlasma, rawMag] = await Promise.all([
          fetchSWPCData(url),
          fetchSWPCData(ACE_MAG_URL).catch(() => null),
        ]);
        parsedData = parseSWPCData(rawPlasma);
        if (rawMag && parsedData.length > 0) {
          const magMap = parseAceMagnetometerMap(rawMag);
          parsedData = mergeMagIntoPlasma(parsedData, magMap);
        }

        if (!parsedData || parsedData.length === 0) {
          parsedData = generateFallbackData();
          dataSource = `${source}_FALLBACK`;
        }
      } catch {
        parsedData = generateFallbackData();
        dataSource = `${source}_FALLBACK`;
      }
    }

    const result = {
      source: dataSource,
      timestamp: new Date().toISOString(),
      data: parsedData,
      latest: getLatestReadings(parsedData),
      count: parsedData.length,
      isFallback: dataSource.includes("FALLBACK"),
    };

    if (includeAverages) {
      result.averages = {
        "24h": calculateAverages(parsedData, 24),
        "6h": calculateAverages(parsedData, 6),
        "1h": calculateAverages(parsedData, 1),
      };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("SWPC API error:", error);

    // Even if everything fails, return fallback data
    try {
      const fallbackData = generateFallbackData();
      const result = {
        source: "FALLBACK_EMERGENCY",
        timestamp: new Date().toISOString(),
        data: fallbackData,
        latest: getLatestReadings(fallbackData),
        count: fallbackData.length,
        isFallback: true,
        error: "Using emergency fallback data",
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (fallbackError) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch solar wind data",
          details: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}
