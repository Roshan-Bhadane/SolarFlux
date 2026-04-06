"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bell,
  Globe,
  Satellite,
  Zap,
  TrendingUp,
  Shield,
  Database,
  Wifi,
  Radio,
  Clock,
} from "lucide-react";
import SolarChart from "@/components/SolarChart";
import SolarWindChart from "@/components/SolarWindChart";
import MagnetometerChart from "@/components/MagnetometerChart";
import CMEMap from "@/components/CMEMap";
import CMETable from "@/components/CMETable";
import AlertCard from "@/components/AlertCard";
import AdityaL1Monitor from "@/components/AdityaL1Monitor";
import NasaApiStatus from "@/components/NasaApiStatus";
import { adityaL1Simulator } from "@/lib/aditya-l1/simulator";
import { detectAnomalies } from "@/lib/cme/placeholders";

function mapSwpcRowToSolarChart(row) {
  const ts =
    row.timestamp instanceof Date
      ? row.timestamp.getTime()
      : new Date(row.timestamp).getTime();
  return {
    timestamp: ts,
    windSpeed: row.speed,
    density: row.density,
    temperature: row.temperature,
    magneticField: row.bt,
  };
}

function mapSwpcRowToMag(row) {
  const ts =
    row.timestamp instanceof Date
      ? row.timestamp.getTime()
      : new Date(row.timestamp).getTime();
  return {
    timestamp: ts,
    bx: row.bx,
    by: row.by,
    bz: row.bz,
    totalField: row.bt,
  };
}

function buildAlertsFromWindSeries(solarWindSeries) {
  const aspex = solarWindSeries.map((p) => ({
    timestamp: p.timestamp,
    windSpeed: p.windSpeed,
    particleFlux: (p.density || 0) * 80,
  }));
  const { anomalies } = detectAnomalies(aspex);
  return anomalies.map((a, i) => ({
    id: `sw-${i}-${a.timestamp}`,
    title: a.reason || "Solar wind anomaly",
    description: `Wind ${
      a.windSpeed != null ? Math.round(a.windSpeed) : "—"
    } km/s · density-based flux proxy ${
      a.particleFlux != null ? Math.round(a.particleFlux) : "—"
    }`,
    severity:
      a.isRuleBased || (a.score || 0) >= 4
        ? "high"
        : (a.score || 0) >= 2
          ? "medium"
          : "low",
    type: "CME",
    timestamp:
      typeof a.timestamp === "number"
        ? a.timestamp
        : new Date(a.timestamp).getTime(),
    source: "NOAA SWPC (ACE/DSCOVR)",
    speed:
      a.windSpeed != null ? `${Math.round(a.windSpeed)} km/s` : undefined,
  }));
}

function ClientOnly({ children }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="animate-pulse bg-gray-800/20 rounded-lg p-4">
        Loading...
      </div>
    );
  }

  return children;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveData, setLiveData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [cmeEvents, setCmeEvents] = useState([]);
  const [cmeLoading, setCmeLoading] = useState(false);
  const [cmeError, setCmeError] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [usingSimulatedDashboard, setUsingSimulatedDashboard] = useState(false);
  const [dataSourceMode, setDataSourceMode] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const testTelegramConnection = async () => {
    try {
      const response = await fetch("/api/telegram-test");
      const result = await response.json();
      setTelegramStatus(result.success ? "connected" : "disconnected");
    } catch (error) {
      console.error("Telegram test failed:", error);
      setTelegramStatus("error");
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function initializeData() {
      setCmeLoading(true);
      setCmeError(null);

      try {
        const [cmeRes, noaaRes, windRes] = await Promise.all([
          fetch("/api/cme", { signal: AbortSignal.timeout(25000) }),
          fetch("/api/noaa", { signal: AbortSignal.timeout(15000) }),
          fetch("/api/solar-wind?source=ace", {
            signal: AbortSignal.timeout(15000),
          }),
        ]);

        let cmePayload = null;
        let noaaPayload = null;
        let windPayload = null;
        try {
          cmePayload = await cmeRes.json();
        } catch {
          /* ignore */
        }
        try {
          noaaPayload = await noaaRes.json();
        } catch {
          /* ignore */
        }
        try {
          windPayload = await windRes.json();
        } catch {
          /* ignore */
        }

        const cmeOk =
          cmeRes.ok && cmePayload && cmePayload.isFallback !== true;
        const noaaOk =
          noaaRes.ok && noaaPayload && noaaPayload.source === "NOAA_SWPC";
        const windOk =
          windRes.ok &&
          windPayload &&
          windPayload.isFallback !== true &&
          Array.isArray(windPayload.data) &&
          windPayload.data.length > 0;

        const allLive = cmeOk && noaaOk && windOk;

        if (cancelled) return;

        if (allLive) {
          const rows = windPayload.data;
          const solarWind = rows.map(mapSwpcRowToSolarChart);
          const magnetometer = rows.map(mapSwpcRowToMag);
          setLiveData({
            solarWind,
            magnetometer,
            particleFlux: [],
          });
          setCmeEvents(
            Array.isArray(cmePayload.events) ? cmePayload.events : []
          );
          setAnomalies(buildAlertsFromWindSeries(solarWind));
          setCmeError(null);
          setUsingSimulatedDashboard(false);
          setDataSourceMode("live");
          setIsSimulating(false);
          setSystemStatus({
            ...adityaL1Simulator.getSystemStatus(),
            dataLatency: "~1–5 min (NOAA SWPC)",
          });
        } else {
          const status = adityaL1Simulator.getSystemStatus();
          const historical = adityaL1Simulator.getHistoricalData();

          if (!historical.magnetometer) {
            historical.magnetometer = [];
          }
          if (historical.magnetometer.length === 0) {
            const now = Date.now();
            for (let i = 24; i >= 0; i--) {
              const timestamp = now - i * 60 * 60 * 1000;
              historical.magnetometer.push(
                adityaL1Simulator.generateMagnetometerData(timestamp)
              );
            }
          }

          setSystemStatus(status);
          setLiveData(historical);
          const sw0 = historical.solarWind || [];
          setAnomalies(buildAlertsFromWindSeries(sw0));
          setCmeEvents(adityaL1Simulator.cmeEvents);
          setCmeError(
            "Using simulated data — NASA CME, NOAA, or solar wind feed did not all load successfully."
          );
          setUsingSimulatedDashboard(true);
          setDataSourceMode("simulated");
          setIsSimulating(true);
        }

        testTelegramConnection();
      } catch (error) {
        console.error("Dashboard data load error:", error);
        if (cancelled) return;

        const status = adityaL1Simulator.getSystemStatus();
        const historical = adityaL1Simulator.getHistoricalData();
        if (!historical.magnetometer) historical.magnetometer = [];
        if (historical.magnetometer.length === 0) {
          const now = Date.now();
          for (let i = 24; i >= 0; i--) {
            const timestamp = now - i * 60 * 60 * 1000;
            historical.magnetometer.push(
              adityaL1Simulator.generateMagnetometerData(timestamp)
            );
          }
        }
        setSystemStatus(status);
        setLiveData(historical);
        setAnomalies(
          buildAlertsFromWindSeries(historical.solarWind || [])
        );
        setCmeEvents(adityaL1Simulator.cmeEvents);
        setCmeError(
          `Using simulated data — ${error.message || "network error"}`
        );
        setUsingSimulatedDashboard(true);
        setDataSourceMode("simulated");
        setIsSimulating(true);
        testTelegramConnection();
      } finally {
        if (!cancelled) setCmeLoading(false);
      }
    }

    initializeData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!usingSimulatedDashboard || !isSimulating) return undefined;

    const simulationInterval = setInterval(() => {
      const update = adityaL1Simulator.generateRealTimeUpdate();
      setLiveData((prev) => ({
        ...prev,
        solarWind: [...(prev?.solarWind || []), update.solarWind],
        particleFlux: [...(prev?.particleFlux || []), update.particleFlux],
        magnetometer: [...(prev?.magnetometer || []), update.magnetometer],
      }));
      setAnomalies(update.anomalies);
    }, 10000);

    const cmeInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const newCME = adityaL1Simulator.simulateCMEDetection();
        setCmeEvents((prev) => [newCME, ...prev]);
      }
    }, 30000);

    return () => {
      clearInterval(simulationInterval);
      clearInterval(cmeInterval);
    };
  }, [isSimulating, usingSimulatedDashboard]);

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "OPERATIONAL":
        return "text-green-400";
      case "WARNING":
        return "text-yellow-400";
      case "CRITICAL":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const formatTime = (date) => {
    if (!isClient) return "--:--:--";
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const chartWind = liveData?.solarWind || [];
  const chartMag = liveData?.magnetometer || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-md border-b border-slate-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Satellite className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  SolarFlux Dashboard
                </h1>
                <p className="text-slate-300">
                  Real-time Aditya-L1 CME Detection & Monitoring
                </p>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-3 justify-end">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                  dataSourceMode === null
                    ? "text-slate-400 border-slate-500/40 bg-slate-500/10"
                    : dataSourceMode === "live"
                      ? "text-green-300 border-green-500/40 bg-green-500/10"
                      : "text-amber-200 border-amber-500/40 bg-amber-500/10"
                }`}
                title="Data source for charts and CME table"
              >
                {dataSourceMode === null
                  ? "…"
                  : dataSourceMode === "live"
                    ? "🟢 Live Data"
                    : "🟡 Simulated"}
              </span>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isSimulating ? "bg-green-400" : "bg-gray-400"
                  } animate-pulse`}
                ></div>
                <span className="text-sm text-slate-300">
                  {usingSimulatedDashboard
                    ? isSimulating
                      ? "SIMULATION ACTIVE"
                      : "SIMULATION PAUSED"
                    : "LIVE FEEDS"}
                </span>
              </div>
              <button
                onClick={toggleSimulation}
                disabled={!usingSimulatedDashboard}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !usingSimulatedDashboard
                    ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                    : isSimulating
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {isSimulating ? "Pause" : "Start"} Simulation
              </button>
              <button
                onClick={testTelegramConnection}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  telegramStatus === "connected"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : telegramStatus === "error"
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
                title="Test Telegram Integration"
              >
                {telegramStatus === "connected"
                  ? "✓"
                  : telegramStatus === "error"
                    ? "✗"
                    : "📱"}{" "}
                Telegram
              </button>
              <div className="text-sm text-slate-400">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {usingSimulatedDashboard && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-100">
          Using simulated data — live NASA CME, NOAA, and solar wind feeds did
          not all load. Check <code className="text-amber-200">.env.local</code>{" "}
          and network, then refresh.
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Solar Activity & CME Map
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-600/30 rounded-xl p-6 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Solar Activity
                  </h3>
                </div>
                <SolarChart
                  data={chartWind}
                  useMockData={usingSimulatedDashboard && chartWind.length === 0}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <ClientOnly>
                <CMEMap
                  events={
                    usingSimulatedDashboard && cmeEvents.length === 0
                      ? adityaL1Simulator.cmeEvents
                      : cmeEvents
                  }
                />
              </ClientOnly>
              {usingSimulatedDashboard && cmeEvents.length > 0 && (
                <div className="mt-2 text-xs text-amber-400">
                  CME list uses simulated events; map may include synthetic
                  coordinates.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Data Analysis & Insights
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-600/30 rounded-xl p-6 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Wifi className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Solar Wind Analysis
                  </h3>
                </div>
                <SolarWindChart
                  data={chartWind}
                  useMockData={usingSimulatedDashboard && chartWind.length === 0}
                />
              </div>
            </div>

            <div>
              <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-600/30 rounded-xl p-6 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Radio className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Magnetometer Data
                  </h3>
                </div>
                <MagnetometerChart
                  data={chartMag}
                  useMockData={usingSimulatedDashboard && chartMag.length === 0}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Real-time Monitoring
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-600/30 rounded-xl p-6 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Bell className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Current Alerts
                  </h3>
                  <span className="text-xs text-slate-300 bg-orange-500/20 px-2 py-1 rounded border border-orange-500/30">
                    {anomalies.length} active
                  </span>
                </div>

                {anomalies.length > 0 ? (
                  <div className="space-y-3">
                    {anomalies.map((anomaly, index) => (
                      <AlertCard key={anomaly.id || index} alert={anomaly} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Shield className="w-12 h-12 mx-auto mb-2 text-green-400" />
                    <p>All systems operational</p>
                    <p className="text-xs">No active alerts</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-600/30 rounded-xl p-6 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Quick Actions
                  </h3>
                </div>

                <div className="space-y-3">
                  <button className="w-full p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors">
                    Generate CME Report
                  </button>
                  <button className="w-full p-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium transition-colors">
                    Export Data
                  </button>
                  <button className="w-full p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 text-sm font-medium transition-colors">
                    System Diagnostics
                  </button>
                  <button className="w-full p-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-orange-400 text-sm font-medium transition-colors">
                    Emergency Protocol
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <AdityaL1Monitor
            data={liveData}
            systemStatus={systemStatus}
            anomalies={anomalies}
          />
        </div>

        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              CME Events Database
            </h2>
          </div>

          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-600/30 rounded-xl p-6 shadow-xl">
            <ClientOnly>
              <CMETable
                cmeEvents={cmeEvents}
                loading={cmeLoading}
                error={cmeError}
                onRefresh={async () => {
                  setCmeLoading(true);
                  setCmeError(null);
                  try {
                    const response = await fetch("/api/cme", {
                      cache: "no-store",
                      signal: AbortSignal.timeout(25000),
                    });
                    const data = await response.json();
                    if (response.ok && data.isFallback !== true) {
                      setCmeEvents(Array.isArray(data.events) ? data.events : []);
                      setCmeError(null);
                    } else if (usingSimulatedDashboard) {
                      setCmeEvents(adityaL1Simulator.cmeEvents);
                      setCmeError(
                        data.note ||
                          "CME API unavailable — using simulated CME list"
                      );
                    } else {
                      setCmeEvents([]);
                      setCmeError(
                        data.note ||
                          "Could not refresh CME data from NASA DONKI."
                      );
                    }
                  } catch (error) {
                    console.error("Error refreshing CME data:", error);
                    if (usingSimulatedDashboard) {
                      setCmeEvents(adityaL1Simulator.cmeEvents);
                      setCmeError(
                        `${error.message} — using simulated CME list`
                      );
                    } else {
                      setCmeError(`Refresh failed: ${error.message}`);
                    }
                  } finally {
                    setCmeLoading(false);
                  }
                }}
              />
            </ClientOnly>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-600/30 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-300">System Status:</span>
                <span
                  className={`text-sm font-medium ${getStatusColor(
                    systemStatus?.systemHealth || "EXCELLENT"
                  )}`}
                >
                  {systemStatus?.systemHealth || "EXCELLENT"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-300">Data Latency:</span>
                <span className="text-sm font-medium text-blue-400">
                  {systemStatus?.dataLatency || "~5 minutes"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <NasaApiStatus />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleSimulation}
                  disabled={!usingSimulatedDashboard}
                  className={`px-3 py-1 rounded-md text-sm font-medium text-white transition-colors ${
                    !usingSimulatedDashboard
                      ? "bg-slate-600 cursor-not-allowed"
                      : isSimulating
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  {isSimulating ? "Stop Simulation" : "Start Simulation"}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Last Update: {formatTime(currentTime)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
