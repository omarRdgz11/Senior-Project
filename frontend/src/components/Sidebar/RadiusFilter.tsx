import React from "react";
import { Range, getTrackBackground } from "react-range";

type FilterSidebarProps = {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
};

const RADIUS_MIN = 0;
const RADIUS_MAX = 100;

export default function FilterSidebar({ filters, setFilters }: FilterSidebarProps) {
  return (
    <div className="mb-4">
    <label className="block text-xs mb-2">
        Prediction Radius: {filters.radius_km.toFixed(2)}
    </label>
    <Range
        values={[filters.radius_km]}
        step={0.01}
        min={RADIUS_MIN}
        max={RADIUS_MAX}
        onChange={(values) =>
        setFilters((prev: any) => ({
            ...prev,
            radius_km: values[0],
        }))
        }
        renderTrack={({ props, children }) => (
        <div
            {...props}
            style={{
            height: "6px",
            width: "100%",
            background: getTrackBackground({
                values: [filters.radius_km],
                colors: ["#ccc", "#AC4425", "#ccc"],
                min: RADIUS_MIN,
                max: RADIUS_MAX,
            }),
            borderRadius: "4px",
            }}
        >
            {children}
        </div>
        )}
        renderThumb={({ props }) => (
        <div
            {...props}
            style={{
            height: "10px",
            width: "10px",
            borderRadius: "50%",
            backgroundColor: "#AC4425",
            }}
        />
        )}
    />
    </div>
  );
}
