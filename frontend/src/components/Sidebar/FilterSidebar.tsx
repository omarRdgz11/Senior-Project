import PastFiresSection from "./PastFiresSection";
import PredictionsSection from "./PredictionsSection";
import RadiusFilter from "./RadiusFilter";
import { styles } from "../Sidebar/Sidebar.styles";
import RegionSelector from "../RegionSelector";
import type { RegionInfo } from "../../api/regions";

interface FilterSidebarProps {
  // Region
  selectedRegion: string;
  onRegionChange: (slug: string, regionInfo: RegionInfo | undefined) => void;

  // Past Fires layer
  pastFiresEnabled: boolean;
  pastStart: string;
  pastEnd: string;
  today: string;
  onPastFiresToggle: (v: boolean) => void;
  onPastStartChange: (v: string) => void;
  onPastEndChange: (v: string) => void;

  // Predictions layer
  predictionsEnabled: boolean;
  predictionDate: string;
  onPredictionsToggle: (v: boolean) => void;
  onPredictionDateChange: (v: string) => void;

  // Shared radius
  radiusMiles: number;
  onRadiusChange: (v: number) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  selectedRegion,
  onRegionChange,
  pastFiresEnabled,
  pastStart,
  pastEnd,
  today,
  onPastFiresToggle,
  onPastStartChange,
  onPastEndChange,
  predictionsEnabled,
  predictionDate,
  onPredictionsToggle,
  onPredictionDateChange,
  radiusMiles,
  onRadiusChange,
}) => {
  return (
    <aside
      className="w-72 h-[calc(100vh-64px)] bg-base-200 p-4 border-r border-base-300 space-y-4 overflow-y-auto"
      style={styles.sidebar}
    >
      <h2 style={styles.title}>Filters</h2>

      <div style={styles.subtitle}>
        {/* ── Region Selector ── */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">Region</label>
          <RegionSelector
            value={selectedRegion}
            onChange={onRegionChange}
            className="select-sm"
          />
        </div>

        {/* ── Divider ── */}
        <div className="divider my-2" />

        {/* ── Past Fires Section ── */}
        <PastFiresSection
          enabled={pastFiresEnabled}
          start={pastStart}
          end={pastEnd}
          today={today}
          onToggle={onPastFiresToggle}
          onStartChange={onPastStartChange}
          onEndChange={onPastEndChange}
        />

        {/* ── Divider ── */}
        <div className="divider my-2" />

        {/* ── Predictions Section ── */}
        <PredictionsSection
          enabled={predictionsEnabled}
          date={predictionDate}
          today={today}
          onToggle={onPredictionsToggle}
          onDateChange={onPredictionDateChange}
        />

        {/* ── Divider ── */}
        <div className="divider my-2" />

        {/* ── Shared Radius Filter ──
            Affects both layers: clips which markers are shown
            by distance from region center.
        */}
        <div className="mb-1">
          <p className="text-xs text-base-content/50 mb-2">
            Radius applies to both layers
          </p>
          <RadiusFilter
            filters={{ radius_miles: radiusMiles }}
            setFilters={(updater: any) => {
              const updated =
                typeof updater === "function"
                  ? updater({ radius_miles: radiusMiles })
                  : updater;
              onRadiusChange(updated.radius_miles);
            }}
          />
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
