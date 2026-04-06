"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function MagnetometerChart({ data, useMockData = false }) {
  const chartData =
    data?.map((item) => ({
      time: (() => {
        const date = new Date(item.timestamp);
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
      })(),
      bx: item.bx,
      by: item.by,
      bz: item.bz,
      totalField: item.totalField,
    })) || [];

  if (chartData.length === 0 && useMockData) {
    for (let i = 23; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60 * 60 * 1000);
      const baseBx = (Math.random() - 0.5) * 10;
      const baseBy = (Math.random() - 0.5) * 10;
      const baseBz = -5 + (Math.random() - 0.5) * 10;
      const totalField = Math.sqrt(
        baseBx * baseBx + baseBy * baseBy + baseBz * baseBz
      );

      chartData.push({
        time: `${time.getHours().toString().padStart(2, "0")}:${time
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
        bx: parseFloat(baseBx.toFixed(2)),
        by: parseFloat(baseBy.toFixed(2)),
        bz: parseFloat(baseBz.toFixed(2)),
        totalField: parseFloat(totalField.toFixed(2)),
      });
    }
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-slate-400 text-sm border border-slate-600/30 rounded-lg bg-slate-900/30">
        No magnetometer data to display
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
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            fontSize={12}
            tick={{ fill: "#94a3b8" }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tick={{ fill: "#94a3b8" }}
            label={{
              value: "Magnetic Field (nT)",
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              fontSize: 12,
            }}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Bx component */}
          <Line
            type="monotone"
            dataKey="bx"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Bx"
            unit=" nT"
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* By component */}
          <Line
            type="monotone"
            dataKey="by"
            stroke="#10b981"
            strokeWidth={2}
            name="By"
            unit=" nT"
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Bz component */}
          <Line
            type="monotone"
            dataKey="bz"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Bz"
            unit=" nT"
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Total field magnitude */}
          <Line
            type="monotone"
            dataKey="totalField"
            stroke="#ef4444"
            strokeWidth={3}
            name="Total Field"
            unit=" nT"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}