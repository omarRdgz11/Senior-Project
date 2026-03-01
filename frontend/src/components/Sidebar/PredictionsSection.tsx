import React from "react";

interface PredictionsSectionProps {
  enabled: boolean;
  date: string;
  today: string;
  onToggle: (v: boolean) => void;
  onDateChange: (v: string) => void;
}

/**
 * Sidebar section for Predictions controls.
 * - Toggle to show/hide the demo prediction layer
 * - Single date selector (today or future)
 * - Future dates are allowed — the UI keeps the user's selection
 */
export default function PredictionsSection({
  enabled,
  date,
  today,
  onToggle,
  onDateChange,
}: PredictionsSectionProps) {
  const isFuture = date > today;

  const handleDateChange = (v: string) => {
    // If cleared or empty, fall back to today
    onDateChange(v || today);
  };

  return (
    <div className="mb-5">
      {/* Section header with toggle */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="checkbox checkbox-sm"
          id="predictions-toggle"
        />
        <label
          htmlFor="predictions-toggle"
          className="text-sm font-semibold cursor-pointer select-none flex items-center gap-1"
        >
          {/* Orange dot indicator */}
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: "#ed8936" }}
          />
          Predictions
        </label>
      </div>

      {enabled && (
        <div className="pl-2">
          <label className="block text-xs text-base-content/60 mb-1">
            Prediction Date
          </label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => handleDateChange(e.target.value)}
            className="input input-bordered input-sm w-full"
          />
          {isFuture && (
            <p className="text-xs mt-1" style={{ color: "#b7791f" }}>
              Future date — showing demo forecast
            </p>
          )}
          {!isFuture && (
            <p className="text-xs text-base-content/40 mt-1">
              Today or future dates only
            </p>
          )}
        </div>
      )}
    </div>
  );
}
