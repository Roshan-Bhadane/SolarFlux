"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  Zap,
  Bell,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function Timeline({ events = [], loading = false }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  if (loading) {
    return (
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">CME Timeline</h3>
            <p className="text-sm text-gray-400">Loading NASA archive…</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-white/5 rounded-lg" />
          <div className="h-16 bg-white/5 rounded-lg" />
          <div className="h-16 bg-white/5 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">CME Timeline</h3>
            <p className="text-sm text-gray-400">
              No events in the current filter
            </p>
          </div>
        </div>
        <p className="text-gray-500 text-sm text-center py-8">
          Load data from NASA or adjust filters to see CME history.
        </p>
      </div>
    );
  }

  const timelineEvents = events;

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return <Zap className="w-4 h-4 text-red-400" />;
      case "high":
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "low":
        return <Bell className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "border-red-500 bg-red-500/20";
      case "high":
        return "border-orange-500 bg-orange-500/20";
      case "medium":
        return "border-yellow-500 bg-yellow-500/20";
      case "low":
        return "border-blue-500 bg-blue-500/20";
      default:
        return "border-gray-500 bg-gray-500/20";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  return (
    <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-500 rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">CME Timeline</h3>
          <p className="text-sm text-gray-400">
            Historical solar events and CME detections
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {timelineEvents.map((event, index) => (
          <div key={event.id} className="relative">
            {index < timelineEvents.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-16 bg-gradient-to-b from-white/20 to-transparent"></div>
            )}

            <div className="flex items-start space-x-4">
              <div
                className={`w-12 h-12 rounded-full border-2 ${getSeverityColor(
                  event.severity
                )} flex items-center justify-center flex-shrink-0`}
              >
                {getSeverityIcon(event.severity)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-semibold text-white">
                      {event.title}
                    </h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                        event.severity
                      )} text-white uppercase tracking-wide`}
                    >
                      {event.severity}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedEvent(
                        selectedEvent === event.id ? null : event.id
                      )
                    }
                    className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        selectedEvent === event.id ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                </div>

                <p className="text-gray-300 text-sm mb-3">{event.description}</p>

                <div className="flex items-center space-x-4 text-xs text-gray-400 mb-3">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{event.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Impact</p>
                    <p className="text-white font-medium">{event.impact}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Source</p>
                    <p className="text-white font-medium">{event.source}</p>
                  </div>
                </div>

                {selectedEvent === event.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-gray-300 text-sm mb-3">
                      {event.details}
                    </p>
                    <button className="flex items-center space-x-1 px-3 py-1 bg-white/10 rounded-md text-sm text-white hover:bg-white/20 transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      <span>View Full Report</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
