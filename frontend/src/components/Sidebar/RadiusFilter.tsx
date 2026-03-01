import React from "react";
import { Range, getTrackBackground } from "react-range";

type RadiusFilterProps = {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
};

const RADIUS_MIN = 0;
const RADIUS_MAX = 100;
const RADIUS_STEP = 5;

/**
 * Slider for "radius (miles)".
 * Client-side only: filters which past-fire markers are visible based on distance
 * from the selected region's center. No API calls on drag.
 */
export default function RadiusFilter({ filters, setFilters }: RadiusFilterProps) {
  const radiusMiles: number =
    typeof filters?.radius_miles === "number" ? filters.radius_miles : 50;

  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-2">Radius</label>

      <div className="text-xs text-base-content/70 mb-2">
        Show markers within <span className="font-semibold">{radiusMiles} mi</span>{" "}
        of region center
      </div>

      <Range
        values={[radiusMiles]}
        step={RADIUS_STEP}
        min={RADIUS_MIN}
        max={RADIUS_MAX}
        onChange={(values) =>
          setFilters((prev: any) => ({
            ...prev,
            radius_miles: values[0],
          }))
        }
        renderTrack={({ props, children }) => (
          <div
            {...props}
            className="w-full rounded"
            style={{
              height: "8px",
              background: getTrackBackground({
                values: [radiusMiles],
                // Use neutral theme-friendly colors (no hard-coded brand hex)
                colors: ["rgba(255,255,255,0.35)", "rgba(255,255,255,0.0)", "rgba(255,255,255,0.35)"],
                min: RADIUS_MIN,
                max: RADIUS_MAX,
              }),
              // Let DaisyUI handle the actual bar color via background utilities:
              // We overlay a subtle base bar behind the Range background.
              backgroundColor: "rgba(0,0,0,0.15)",
            }}
          >
            {children}
          </div>
        )}
        renderThumb={({ props }) => (
          <div
            {...props}
            className="h-4 w-4 rounded-full border border-base-300 bg-base-100 shadow"
          />
        )}
      />

      <div className="flex justify-between text-xs mt-1 text-base-content/50">
        <span>{RADIUS_MIN} mi</span>
        <span>{RADIUS_MAX} mi</span>
      </div>
    </div>
  );
}
