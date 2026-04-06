"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Timeline from "@/components/Timeline";
import {
  classifyStrength,
  calculateGeomagneticStormIntensity,
} from "@/lib/cme/placeholders";
import {
  Search,
  Calendar,
  Filter,
  Download,
  BarChart3,
  ChevronDown,
} from "lucide-react";

function cmeSeverityForTimeline(event) {
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

function cmeToTimelineEvent(event, idx) {
  const strength = classifyStrength(event);
  const t = event.startTime || event.time21_5;
  const d = t ? new Date(t) : new Date();
  const severity = cmeSeverityForTimeline(event);
  const storm = calculateGeomagneticStormIntensity(event);

  return {
    id: String(event.activityID || event.id || `cme-${idx}`),
    date: d.toISOString().split("T")[0],
    time: `${d.toISOString().slice(11, 19)} UTC`,
    title: `CME — ${strength.class} strength`,
    description:
      event.note || event.activityID || strength.rationale || "NASA DONKI",
    severity,
    location: event.sourceLocation || "Unknown",
    impact: storm.description,
    source:
      Array.isArray(event.instruments) && event.instruments.length
        ? event.instruments.join(", ")
        : "NASA DONKI CMEAnalysis",
    details: strength.rationale,
  };
}

export default function Archive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [historicalEvents, setHistoricalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadArchive = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 90 * 86400000)
        .toISOString()
        .split("T")[0];
      const res = await fetch(
        `/api/cme?startDate=${start}&endDate=${end}`,
        { cache: "no-store", signal: AbortSignal.timeout(25000) }
      );
      const data = await res.json();
      if (!res.ok || data.isFallback) {
        setHistoricalEvents([]);
        setLoadError(
          data.note ||
            data.error ||
            "Could not load archive CME data from NASA."
        );
        return;
      }
      const ev = Array.isArray(data.events) ? data.events : [];
      setHistoricalEvents(ev.map(cmeToTimelineEvent));
    } catch (e) {
      setHistoricalEvents([]);
      setLoadError(e.message || "Failed to load archive");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  const years = useMemo(() => {
    const ys = new Set(
      historicalEvents.map((e) => (e.date || "").slice(0, 4)).filter(Boolean)
    );
    return ["all", ...Array.from(ys).sort().reverse()];
  }, [historicalEvents]);

  const severities = ["all", "critical", "high", "medium", "low"];

  const filteredEvents = historicalEvents.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear =
      selectedYear === "all" || (event.date && event.date.startsWith(selectedYear));
    const matchesSeverity =
      selectedSeverity === "all" || event.severity === selectedSeverity;
    return matchesSearch && matchesYear && matchesSeverity;
  });

  const getEventStats = () => {
    const total = historicalEvents.length;
    const critical = historicalEvents.filter(
      (e) => e.severity === "critical"
    ).length;
    const high = historicalEvents.filter((e) => e.severity === "high").length;
    const medium = historicalEvents.filter(
      (e) => e.severity === "medium"
    ).length;
    const low = historicalEvents.filter((e) => e.severity === "low").length;

    return { total, critical, high, medium, low };
  };

  const stats = getEventStats();

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Historical Archive
            </h1>
            <p className="text-gray-300">
              Last 90 days of CME events from NASA DONKI CMEAnalysis
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadArchive()}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-orange-500/40 text-orange-300 hover:bg-orange-500/10 text-sm disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh archive"}
          </button>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white mb-1">{stats.total}</p>
            <p className="text-sm text-gray-400">Total Events</p>
          </div>
          <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-400 mb-1">
              {stats.critical}
            </p>
            <p className="text-sm text-gray-400">Critical</p>
          </div>
          <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-400 mb-1">
              {stats.high}
            </p>
            <p className="text-sm text-gray-400">High</p>
          </div>
          <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400 mb-1">
              {stats.medium}
            </p>
            <p className="text-sm text-gray-400">Medium</p>
          </div>
          <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400 mb-1">{stats.low}</p>
            <p className="text-sm text-gray-400">Low</p>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search historical events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year === "all" ? "All Years" : year}
                  </option>
                ))}
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                {severities.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity === "all"
                      ? "All Severities"
                      : severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>More</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Date Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      readOnly
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm opacity-60"
                    />
                    <input
                      type="date"
                      readOnly
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm opacity-60"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Archive window is fixed to the last 90 days from NASA.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Source
                  </label>
                  <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                    <option value="">NASA DONKI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Impact Level
                  </label>
                  <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Use severity filter above</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-300">
              Showing {filteredEvents.length} of {historicalEvents.length}{" "}
              events
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors">
              <BarChart3 className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>

        <Timeline events={filteredEvents} loading={loading} />
      </div>

      <Footer />
    </div>
  );
}
