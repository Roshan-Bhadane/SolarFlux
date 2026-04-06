"use client";

import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

// Helper functions for handling NASA API data format - same as in CMETable
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
    // Use fixed seconds to prevent hydration errors
    const seconds = "00";

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

const TOPO_JSON =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function CMEMap({ events = [] }) {
  const markers = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    if (safeEvents.length === 0) {
      return [];
    }

    const filteredMarkers = safeEvents
      .filter((e) => {
        if (!e) {
          return false;
        }
        const lat = getLatitude(e);
        const lon = getLongitude(e);
        return lat !== "—" && lon !== "—";
      })
      .map((e, idx) => {
        const marker = {
          id: e.id || `${e.startTime || e.time21_5 || idx}-${idx}`,
          coordinates: [getLongitude(e), getLatitude(e)],
          speed: e.speed || e.speedKmSec || 800, // Default speed
          time: formatDate(e.startTime || e.time21_5 || e.detectionTime),
          note: e.note || e.activityID || e.id || "",
          isMostAccurate:
            e.isMostAccurate ||
            e.catalog === "M2M_CATALOG" ||
            e.mostAccurateOnly === true,
          halfAngle: e.halfAngle || 30, // Default half angle if not provided
          earthImpact: e.earthImpact || false,
          classification: e.classification || "",
        };
        return marker;
      });
    return filteredMarkers;
  }, [events]);

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-600/30 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">CME Map</h3>
        <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
          react-simple-maps
        </span>
      </div>
      <div className="w-full h-[380px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden border border-slate-600/30">
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Background gradient */}
          <defs>
            <linearGradient
              id="oceanGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ocean background */}
          <rect width="100%" height="100%" fill="url(#oceanGradient)" />

          <Geographies geography={TOPO_JSON}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: "#475569",
                      stroke: "#64748b",
                      strokeWidth: 0.8,
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                    },
                    hover: {
                      fill: "#64748b",
                      stroke: "#94a3b8",
                      strokeWidth: 1,
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                    },
                    pressed: {
                      fill: "#64748b",
                      stroke: "#94a3b8",
                      strokeWidth: 1,
                    },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Grid lines for better orientation */}
          <g stroke="#64748b" strokeWidth="0.3" opacity="0.4">
            {/* Latitude lines */}
            {Array.from({ length: 9 }, (_, i) => (
              <line
                key={`lat-${i}`}
                x1="0"
                y1={((i + 1) * 100) / 9}
                x2="100%"
                y2={((i + 1) * 100) / 9}
              />
            ))}
            {/* Longitude lines */}
            {Array.from({ length: 18 }, (_, i) => (
              <line
                key={`lon-${i}`}
                x1={((i + 1) * 100) / 18}
                y1="0"
                x2={((i + 1) * 100) / 18}
                y2="100%"
              />
            ))}
          </g>

          {/* CME Prediction Areas */}
          {markers.map((m) => {
            // Create a proper cone shape for prediction area
            const centerX = m.coordinates[0];
            const centerY = m.coordinates[1];
            const halfAngle = m.halfAngle || 30; // Ensure we have a half angle
            const angleInRadians = (halfAngle * Math.PI) / 180;

            // Calculate points for a cone/triangle shape
            // The cone extends in the direction away from the sun (center of map)
            // For solar physics, we need to point away from the center (0,0)
            // Calculate direction from center of sun (0,0) to the CME source point
            const direction = Math.atan2(centerY, centerX);

            // Calculate the cone points - cone extends outward from the CME source
            const coneLength = 100; // Increased length of the cone for better visibility
            const tipX = centerX + coneLength * Math.cos(direction);
            const tipY = centerY + coneLength * Math.sin(direction);

            // Calculate the base points of the cone using the half angle
            const baseWidth = coneLength * Math.tan(angleInRadians);
            const perpDirection = direction + Math.PI / 2;

            const basePoint1X = centerX + baseWidth * Math.cos(perpDirection);
            const basePoint1Y = centerY + baseWidth * Math.sin(perpDirection);
            const basePoint2X = centerX - baseWidth * Math.cos(perpDirection);
            const basePoint2Y = centerY - baseWidth * Math.sin(perpDirection);

            // Create path for the cone
            const conePath = `
              M ${centerX} ${centerY}
              L ${basePoint1X} ${basePoint1Y}
              L ${tipX} ${tipY}
              L ${basePoint2X} ${basePoint2Y}
              Z
            `;

            // Draw the prediction cone only if we have valid coordinates and half angle
            return (
              <g key={`area-${m.id}`}>
                {/* Prediction cone visualization */}
                <path
                  d={conePath}
                  fill={
                    m.earthImpact
                      ? "rgba(255, 0, 0, 0.6)"
                      : "rgba(255, 0, 255, 0.5)"
                  }
                  stroke={
                    m.earthImpact
                      ? "rgba(255, 0, 0, 0.9)"
                      : "rgba(255, 0, 255, 0.8)"
                  }
                  strokeWidth="3"
                  opacity="1"
                  filter="url(#glow)"
                />
                {/* Debug point at the tip of the cone */}
                <circle cx={tipX} cy={tipY} r="2" fill="white" stroke="none" />
              </g>
            );
          })}

          {/* CME Event Markers */}
          {markers.map((m) => (
            <Marker key={m.id} coordinates={m.coordinates}>
              {/* Glow effect */}
              <circle
                r={m.isMostAccurate ? 8 : 6}
                fill="transparent"
                stroke={m.isMostAccurate ? "#fca5a5" : "#fda4af"}
                strokeWidth="2"
                opacity="0.6"
                filter="url(#glow)"
              />
              {/* Main marker */}
              <circle
                r={m.isMostAccurate ? 4 : 3}
                fill={m.earthImpact ? "#ef4444" : "#ec4899"}
                stroke="#ffffff"
                strokeWidth="2"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
              />
              {/* Center dot */}
              <circle r={1} fill="#ffffff" stroke="none" />
              <title>
                {`CME Event\nTime: ${m.time || "Unknown"}\nSpeed: ${
                  m.speed ?? "—"
                } km/s\nHalf Angle: ${m.halfAngle}°\nEarth Impact: ${
                  m.earthImpact ? "Yes" : "No"
                }\nAccuracy: ${m.isMostAccurate ? "High" : "Estimate"}\n${
                  m.note || ""
                }`}
              </title>
            </Marker>
          ))}

          {/* Legend */}
          <g transform="translate(20, 20)">
            <rect
              x="0"
              y="0"
              width="140"
              height="100"
              fill="rgba(15, 23, 42, 0.8)"
              rx="4"
              stroke="#64748b"
              strokeWidth="1"
            />
            <text x="10" y="20" fill="#ffffff" fontSize="10" fontWeight="bold">
              CME Events
            </text>
            <circle
              cx="15"
              cy="35"
              r="4"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="1"
            />
            <text x="25" y="40" fill="#e2e8f0" fontSize="9">
              Earth-directed
            </text>
            <circle
              cx="15"
              cy="50"
              r="3"
              fill="#ec4899"
              stroke="#ffffff"
              strokeWidth="1"
            />
            <text x="25" y="55" fill="#e2e8f0" fontSize="9">
              Non-Earth-directed
            </text>
            <path
              d="M 10 70 l 10 5 l -10 5 z"
              fill="rgba(255, 0, 0, 0.6)"
              stroke="rgba(255, 0, 0, 0.9)"
              strokeWidth="3"
            />
            <text x="25" y="75" fill="#e2e8f0" fontSize="9">
              Prediction Area
            </text>
            <text x="10" y="90" fill="#cbd5e1" fontSize="8">
              Colored by impact probability
            </text>
          </g>
        </ComposableMap>
      </div>

      {/* Map Info */}
      <div className="mt-3 text-xs text-slate-300">
        <div className="flex justify-between items-center">
          <span>Total Events: {markers.length}</span>
          <span>
            High Accuracy: {markers.filter((m) => m.isMostAccurate).length}
          </span>
        </div>
      </div>
    </div>
  );
}
