import React from "react";
import { Range, getTrackBackground } from "react-range";

interface CoordinateFilterProps {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}
const LONG_MIN = -98.0998;
const LONG_MAX = -97.50;
const LAT_MIN = 30.00;
const LAT_MAX = 30.60;

const CoordinateFilter: React.FC<CoordinateFilterProps> = ({ filters, setFilters }) => {
  const coordinates = filters.coordinates || {
    minLon: -98.0998,
    maxLon: -97.50,
    minLat: 30.00,
    maxLat: 30.6,
  };

  const handleLongitudeChange = (values: number[]) => {
    setFilters((prev: any) => ({
      ...prev,
      coordinates: {
        ...prev.coordinates,
        minLon: values[0],
        maxLon: values[1],
      },
    }));
  };

  const handleLatitudeChange = (values: number[]) => {
    setFilters((prev: any) => ({
      ...prev,
      coordinates: {
        ...prev.coordinates,
        minLat: values[0],
        maxLat: values[1],
      },
    }));
  };

  return (
    <div className="mb-6">
      <h3 className="block text-sm font-medium mb-1">Coordinate Range</h3>

      {/* Longitude Slider */}
      <div className="mb-4">
        <label className="block text-xs mb-2">Longitude</label>
        <Range
          values={[coordinates.minLon, coordinates.maxLon]}
          step={0.0001}
          min={LONG_MIN}
          max={LONG_MAX}
          onChange={handleLongitudeChange}
          renderTrack={({ props, children }) => (
            <div
              {...props}
              style={{
                height: "6px",
                width: "100%",
                background: getTrackBackground({
                  values: [coordinates.minLon, coordinates.maxLon],
                  colors: ["#ccc", "#945b14", "#ccc"],
                  min: LONG_MIN,
                  max: LONG_MAX,
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
                backgroundColor: "#945b14",
              }}
            />
          )}
        />
        <div className="flex justify-between text-xs mt-2">
          <span>{coordinates.minLon.toFixed(4)}</span>
          <span>{coordinates.maxLon.toFixed(4)}</span>
        </div>
      </div>

      {/* Latitude Slider */}
      <div>
        <label className="block text-xs mb-2">Latitude</label>
        <Range
          values={[coordinates.minLat, coordinates.maxLat]}
          step={0.0001}
          min={LAT_MIN}
          max={LAT_MAX}
          onChange={handleLatitudeChange}
          renderTrack={({ props, children }) => (
            <div
              {...props}
              style={{
                height: "6px",
                width: "100%",
                background: getTrackBackground({
                  values: [coordinates.minLat, coordinates.maxLat],
                  colors: ["#ccc", "#a4a726", "#ccc"],
                  min: LAT_MIN,
                  max: LAT_MAX,
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
        <div className="flex justify-between text-xs mt-2">
          <span>{coordinates.minLat.toFixed(4)}</span>
          <span>{coordinates.maxLat.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
};

export default CoordinateFilter;
