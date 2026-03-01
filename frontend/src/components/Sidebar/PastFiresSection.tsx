import React from "react";

interface PastFiresSectionProps {
  enabled: boolean;
  start: string;
  end: string;
  today: string;
  onToggle: (v: boolean) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}

/**
 * Sidebar section for Past Fires controls.
 * - Toggle to show/hide the layer
 * - Date range: start <= end <= today
 */
export default function PastFiresSection({
  enabled,
  start,
  end,
  today,
  onToggle,
  onStartChange,
  onEndChange,
}: PastFiresSectionProps) {
  const handleStartChange = (v: string) => {
    onStartChange(v);
    // If start jumps past end, pull end along
    if (v > end) onEndChange(v);
  };

  const handleEndChange = (v: string) => {
    // Clamp to today
    const clamped = v > today ? today : v;
    onEndChange(clamped);
    // If end moves before start, pull start along
    if (clamped < start) onStartChange(clamped);
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
          id="past-fires-toggle"
        />
        <label
          htmlFor="past-fires-toggle"
          className="text-sm font-semibold cursor-pointer select-none flex items-center gap-1"
        >
          {/* Red dot indicator */}
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: "#e53e3e" }}
          />
          Past Fires
        </label>
      </div>

      {enabled && (
        <div className="pl-2 space-y-2">
          <div>
            <label className="block text-xs text-base-content/60 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={start}
              max={end}
              onChange={(e) => handleStartChange(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-base-content/60 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={end}
              min={start}
              max={today}
              onChange={(e) => handleEndChange(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>
          <p className="text-xs text-base-content/40">
            End date limited to today
          </p>
        </div>
      )}
    </div>
  );
}
