"use client";

import { AlertTriangle } from "lucide-react";

// Helper functions for handling NASA API data format
function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid

    // Use a fixed format that doesn't depend on locale settings
    // Format: MM/DD/YYYY, HH:MM:SS (24-hour format)
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return dateString; // Return original on error
  }
}

function getLatitude(event) {
  // Check all possible locations for latitude data
  if (event.latitude !== undefined) return event.latitude;
  if (event.coordinates?.latitude !== undefined)
    return event.coordinates.latitude;
  if (event.sourceLocation) {
    // Try to parse from sourceLocation format like "N12E25"
    const match = event.sourceLocation.match(/([NS])(\d+)/);
    if (match) {
      const value = parseInt(match[2]);
      return match[1] === "N" ? value : -value;
    }
  }
  return "—";
}

function getLongitude(event) {
  // Check all possible locations for longitude data
  if (event.longitude !== undefined) return event.longitude;
  if (event.coordinates?.longitude !== undefined)
    return event.coordinates.longitude;
  if (event.sourceLocation) {
    // Try to parse from sourceLocation format like "N12E25"
    const match = event.sourceLocation.match(/([EW])(\d+)/);
    if (match) {
      const value = parseInt(match[2]);
      return match[1] === "E" ? value : -value;
    }
  }
  return "—";
}

export default function CMETable({
  cmeEvents = [],
  loading = false,
  onRefresh,
  error,
}) {
  // Convert NASA API data format to our expected format if needed
  const events = Array.isArray(cmeEvents) ? cmeEvents : [];
  const isFallbackData =
    error && (error.includes("fallback") || error.includes("Fallback"));

  return (
    <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">CME Events</h3>
          <p className="text-sm text-gray-400">
            NASA DONKI CMEAnalysis {isFallbackData && "(Fallback Data)"}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-md disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* Fallback Data Warning */}
      {isFallbackData && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Date/Time</th>
              <th className="px-3 py-2 text-left font-medium">Speed (km/s)</th>
              <th className="px-3 py-2 text-left font-medium">Latitude</th>
              <th className="px-3 py-2 text-left font-medium">Longitude</th>
              <th className="px-3 py-2 text-left font-medium">Half Angle</th>
              <th className="px-3 py-2 text-left font-medium">Earth Impact</th>
              <th className="px-3 py-2 text-left font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-gray-200">
            {events.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                  <div className="space-y-2">
                    <div>No CME data available</div>
                    <div className="text-xs text-gray-500">
                      Check API endpoints and simulator data
                    </div>
                    <button
                      onClick={() => {
                        if (onRefresh) onRefresh();
                      }}
                      className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded border border-blue-500/30"
                    >
                      Force Refresh
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {events.map((e, idx) => (
              <tr key={idx} className="hover:bg-white/5">
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDate(e.startTime || e.time21_5)}
                </td>
                <td className="px-3 py-2">{e.speed || e.speedKmSec || "—"}</td>
                <td className="px-3 py-2">{getLatitude(e)}</td>
                <td className="px-3 py-2">{getLongitude(e)}</td>
                <td className="px-3 py-2">
                  {e.halfAngle || e.halfAngle || "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      e.isMostAccurate ||
                      e.catalog === "M2M_CATALOG" ||
                      e.mostAccurateOnly === true
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                    }`}
                  >
                    {e.isMostAccurate ||
                    e.catalog === "M2M_CATALOG" ||
                    e.mostAccurateOnly === true
                      ? "Most Accurate"
                      : "Estimate"}
                  </span>
                </td>
                <td
                  className="px-3 py-2 max-w-xs truncate"
                  title={e.note || e.activityID || ""}
                >
                  {e.note || e.activityID || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
