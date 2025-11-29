import React from "react";
import { Range, getTrackBackground } from "react-range";

type FilterSidebarProps = {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
};

const THRESHOLD_MIN = 0;
const THRESHOLD_MAX = 1;

export default function FilterSidebar({ filters, setFilters }: FilterSidebarProps) {
  return (
    <div className="mb-4">
    <label className="block text-xs mb-2">
        Prediction Threshold: {filters.threshold.toFixed(2)}
    </label>
    <Range
        values={[filters.threshold]} // single value as an array
        step={0.01}
        min={THRESHOLD_MIN}
        max={THRESHOLD_MAX}
        onChange={(values) =>
        setFilters((prev: any) => ({
            ...prev,
            threshold: values[0],
        }))
        }
        renderTrack={({ props, children }) => (
        <div
            {...props}
            style={{
            height: "6px",
            width: "100%",
            background: getTrackBackground({
                values: [filters.threshold],
                colors: ["#ccc", "#a4a726", "#ccc"],
                min: THRESHOLD_MIN,
                max: THRESHOLD_MAX,
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
            backgroundColor: "#a4a726",
            }}
        />
        )}
    />
    </div>
  );
}
