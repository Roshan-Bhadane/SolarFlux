"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import AlertCard from "@/components/AlertCard";
import Navbar from "@/components/Navbar";
import {
  classifyStrength,
  forecastImpact,
} from "@/lib/cme/placeholders";
import { Search, Filter, ChevronDown, AlertTriangle, Bell } from "lucide-react";

function cmeSeverityForAlert(event) {
  const strength = classifyStrength(event);
  const speed = parseFloat(event.speed ?? event.speedKmSec) || 0;
  const half = parseFloat(event.halfAngle) || 0;
  if (strength.class === "High" && (strength.score >= 85 || speed >= 1200)) {
    return "critical";
  }
  if (strength.class === "High" || speed >= 900 || half >= 55) {
    return "high";
  }
  if (strength.class === "Medium") return "medium";
  return "low";
}

function mapCmeToAlert(event, index) {
  const strength = classifyStrength(event);
  const forecast = forecastImpact(event);
  const t = event.startTime || event.time21_5;
  const ts = t ? new Date(t).getTime() : Date.now();
  const speedNum = Math.round(
    parseFloat(event.speed ?? event.speedKmSec) || 0
  );
  const half = event.halfAngle != null ? String(event.halfAngle) : "—";

  return {
    id: String(event.activityID || event.id || `cme-${index}`),
    title: `CME — ${strength.class} (analysis score ${strength.score})`,
    description: strength.rationale || "NASA DONKI CMEAnalysis event",
    severity: cmeSeverityForAlert(event),
    type: "CME",
    timestamp: ts,
    location: event.sourceLocation || "—",
    speed: `${speedNum} km/s`,
    intensity: `${half}° half-angle`,
    estimatedArrival:
      forecast.etaHours != null
        ? `~${forecast.etaHours} h (model estimate)`
        : "—",
    source: "NASA DONKI CMEAnalysis",
    impactAssessment: forecast.summary ? [forecast.summary] : [],
    recommendedActions: [],
  };
}

export default function Alerts() {
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCme = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .split("T")[0];
      const res = await fetch(
        `/api/cme?startDate=${start}&endDate=${end}`,
        { cache: "no-store", signal: AbortSignal.timeout(25000) }
      );
      const data = await res.json();
      if (!res.ok || data.isFallback) {
        setAlerts([]);
        setLoadError(
          data.note ||
            data.error ||
            "Could not load live CME data from NASA (no simulated alerts shown)."
        );
        return;
      }
      const ev = Array.isArray(data.events) ? data.events : [];
      setAlerts(ev.map(mapCmeToAlert));
    } catch (e) {
      setAlerts([]);
      setLoadError(e.message || "Failed to load CME data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCme();
  }, [loadCme]);

  const severityFilters = useMemo(
    () => [
      {
        value: "all",
        label: "All Alerts",
        count: alerts.length,
        icon: <Filter className="w-4 h-4 mr-2" />,
      },
      {
        value: "critical",
        label: "Critical",
        count: alerts.filter((a) => a.severity === "critical").length,
        icon: <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />,
      },
      {
        value: "high",
        label: "High",
        count: alerts.filter((a) => a.severity === "high").length,
        icon: <AlertTriangle className="w-4 h-4 mr-2 text-orange-400" />,
      },
      {
        value: "medium",
        label: "Medium",
        count: alerts.filter((a) => a.severity === "medium").length,
        icon: <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />,
      },
      {
        value: "low",
        label: "Low",
        count: alerts.filter((a) => a.severity === "low").length,
        icon: <AlertTriangle className="w-4 h-4 mr-2 text-blue-400" />,
      },
    ],
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSeverity =
        selectedSeverity === "all" ||
        alert.severity.toLowerCase() === selectedSeverity.toLowerCase();

      const matchesSearch =
        searchQuery === "" ||
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alert.location &&
          alert.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (alert.type &&
          alert.type.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSeverity && matchesSearch;
    });
  }, [alerts, selectedSeverity, searchQuery]);

  const lowCount = alerts.filter((a) => a.severity === "low").length;
  const lowPct =
    alerts.length > 0 ? Math.round((lowCount / alerts.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
              Solar Activity Alerts
            </h1>
            <p className="text-gray-400">
              CME events from NASA DONKI (last 30 days), classified with
              SolarFlux scoring
            </p>
          </div>
          <button
            onClick={() => loadCme()}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              loading
                ? "bg-gray-700/50 border-gray-600/50 text-gray-400 cursor-not-allowed"
                : "bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600/30 transition-colors"
            }`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh Data</span>
              </>
            )}
          </button>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm">
            {loadError}
          </div>
        )}

        <div className="mb-8 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search alerts by title, description, location, or type..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800/70 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white placeholder-gray-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center px-4 py-2.5 bg-gray-800/70 border border-gray-700 rounded-lg hover:bg-gray-700/70 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
              <ChevronDown
                className={`w-4 h-4 ml-2 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
          </div>

          {showFilters && (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 transition-all">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter by Severity
              </h3>
              <div className="flex flex-wrap gap-2">
                {severityFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedSeverity(filter.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center transition-all ${
                      selectedSeverity === filter.value
                        ? "bg-blue-600/90 text-white shadow-lg shadow-blue-500/20"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white"
                    }`}
                  >
                    {filter.icon}
                    {filter.label}
                    <span
                      className={`ml-1.5 min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-xs ${
                        selectedSeverity === filter.value
                          ? "bg-white/20"
                          : "bg-black/20"
                      }`}
                    >
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {loading ? (
            Array(3)
              .fill(0)
              .map((_, index) => (
                <AlertCard key={`skeleton-${index}`} loading />
              ))
          ) : filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-dashed border-gray-700/50">
              <Bell className="w-16 h-16 text-gray-500/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                {searchQuery || selectedSeverity !== "all"
                  ? "No alerts match your filters"
                  : "No active alerts"}
              </h3>
              <p className="text-gray-500">
                {searchQuery || selectedSeverity !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "No CME events were reported in the last 30 days in NASA DONKI for the current query."}
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Alert Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-400 mb-2">
                {alerts.length}
              </p>
              <p className="text-gray-400">Total Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400 mb-2">
                {
                  alerts.filter(
                    (a) => a.severity === "critical" || a.severity === "high"
                  ).length
                }
              </p>
              <p className="text-gray-400">High Priority</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400 mb-2">
                {lowPct}%
              </p>
              <p className="text-gray-400">Low Risk</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
