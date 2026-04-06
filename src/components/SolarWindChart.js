"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

export default function SolarWindChart({ data, useMockData = false }) {
  const chartData =
    data?.map((item) => ({
      time: (() => {
        const date = new Date(item.timestamp);
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
      })(),
      windSpeed: item.windSpeed,
      density: item.density,
      temperature:
        item.temperature != null &&
        !Number.isNaN(Number(item.temperature))
          ? Number(item.temperature) / 1000
          : 0,
      magneticField: item.magneticField,
    })) || [];

  if (chartData.length === 0 && useMockData) {
    for (let i = 23; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60 * 60 * 1000);
      chartData.push({
        time: `${time.getHours().toString().padStart(2, "0")}:${time
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
        windSpeed: 400 + Math.random() * 200,
        density: 5 + Math.random() * 10,
        temperature: (100 + Math.random() * 200) / 1000,
        magneticField: 5 + Math.random() * 15,
      });
    }
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-slate-400 text-sm border border-slate-600/30 rounded-lg bg-slate-900/30">
        No solar wind data to display
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium mb-2">{`Time: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}${entry.unit || ""}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="windSpeedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            fontSize={12}
            tick={{ fill: "#94a3b8" }}
          />
          <YAxis
            yAxisId="left"
            stroke="#94a3b8"
            fontSize={12}
            tick={{ fill: "#94a3b8" }}
            label={{
              value: "Wind Speed (km/s)",
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              fontSize: 12,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#94a3b8"
            fontSize={12}
            tick={{ fill: "#94a3b8" }}
            label={{
              value: "Density (p/cm³)",
              angle: 90,
              position: "insideRight",
              fill: "#94a3b8",
              fontSize: 12,
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Primary metric: Wind Speed */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="windSpeed"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#windSpeedGradient)"
            name="Wind Speed"
            unit=" km/s"
          />

          {/* Secondary metric: Density */}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="density"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#densityGradient)"
            name="Density"
            unit=" p/cm³"
          />

          {/* Temperature line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Temperature"
            unit=" kK"
            dot={false}
          />

          {/* Magnetic Field line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="magneticField"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="3 3"
            name="Magnetic Field"
            unit=" nT"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Chart Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-slate-300">Wind Speed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-slate-300">Density</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-slate-300">Temperature</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-slate-300">Magnetic Field</span>
        </div>
      </div>
    </div>
  );
}
