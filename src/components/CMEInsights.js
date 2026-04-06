"use client";

import { useState, useEffect } from "react";
import {
  classifyStrength,
  estimateDirection,
  forecastImpact,
} from "@/lib/cme/placeholders";

export default function CMEInsights({ events = [] }) {
  const [telegramConfigured, setTelegramConfigured] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState(null);

  useEffect(() => {
    fetch("/api/telegram-status")
      .then((r) => r.json())
      .then((d) => setTelegramConfigured(!!d.configured))
      .catch(() => setTelegramConfigured(false));
  }, []);

  const sample = events[0];
  if (!sample) {
    return (
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Insights</h3>
        <p className="text-gray-400 text-sm">No events loaded.</p>
      </div>
    );
  }

  const strength = classifyStrength(sample);
  const direction = estimateDirection(sample);
  const forecast = forecastImpact(sample);

  const sendTelegramTest = async () => {
    setSendMessage(null);
    if (!telegramConfigured) {
      setSendMessage(
        "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local to enable alerts."
      );
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/telegram-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setSendMessage("Test message sent. Check your Telegram chat.");
      } else {
        setSendMessage(
          data.message ||
            data.details?.error ||
            "Could not send Telegram message."
        );
      }
    } catch (e) {
      setSendMessage(e.message || "Request failed.");
    } finally {
      setSending(false);
    }
  };

  const sendSampleCmeAlert = async () => {
    setSendMessage(null);
    if (!telegramConfigured) {
      setSendMessage(
        "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local to enable alerts."
      );
      return;
    }
    setSending(true);
    try {
      const anomaly = {
        reason: `CME sample alert (${strength.class})`,
        timestamp: sample.startTime || sample.time21_5 || new Date().toISOString(),
        windSpeed: parseFloat(sample.speed ?? sample.speedKmSec) || undefined,
        particleFlux: 0,
      };
      const res = await fetch("/api/telegram-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cme-alert",
          anomaly,
          forecast,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendMessage("CME-style alert sent to Telegram.");
      } else {
        setSendMessage(
          data.message ||
            data.details?.error ||
            "Could not send Telegram message."
        );
      }
    } catch (e) {
      setSendMessage(e.message || "Request failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        CME Insights & Alerts
      </h3>

      {telegramConfigured === false && (
        <p className="text-amber-200/90 text-sm mb-4">
          Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local to enable
          alerts.
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={sendTelegramTest}
          disabled={sending}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600/80 hover:bg-blue-600 text-white disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send Telegram test"}
        </button>
        <button
          type="button"
          onClick={sendSampleCmeAlert}
          disabled={sending}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-orange-600/80 hover:bg-orange-600 text-white disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send sample CME alert"}
        </button>
      </div>

      {sendMessage && (
        <p className="text-sm text-gray-300 mb-4">{sendMessage}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="p-3 bg-white/5 rounded">
          <div className="text-gray-400">Strength</div>
          <div className="text-white font-medium truncate">
            {strength.class}
          </div>
          <div className="text-gray-500 text-xs truncate">
            {strength.rationale}
          </div>
        </div>
        <div className="p-3 bg-white/5 rounded">
          <div className="text-gray-400">Direction</div>
          <div className="text-white font-medium truncate">
            {direction.directionLabel}
          </div>
          <div className="text-gray-500 text-xs truncate">
            lat {direction.latitude}, lon {direction.longitude}
          </div>
        </div>
        <div className="p-3 bg-white/5 rounded">
          <div className="text-gray-400">Forecast</div>
          <div className="text-white font-medium truncate">
            ETA ~{forecast.etaHours} h
          </div>
          <div className="text-gray-500 text-xs truncate">
            likelihood {Math.round(forecast.likelihood * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
