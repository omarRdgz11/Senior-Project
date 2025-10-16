import DateRangeFilter from "./DateRangeFilter";
import ConfidenceFilter from "./ConfidenceFilter";
import ZoomSlider from "./ZoomSlider";

interface FilterSidebarProps {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, setFilters }) => {
  return (
    <aside className="w-72 bg-base-200 p-4 border-r border-base-300 space-y-4">
      <h2 className="text-lg font-semibold">Filters</h2>

      {/* Date Range Filter */}
      <DateRangeFilter filters={filters} setFilters={setFilters} />

      {/* Confidence Filter */}
      <ConfidenceFilter filters={filters} setFilters={setFilters} />

      {/* Zoom Slider */}
      <ZoomSlider filters={filters} setFilters={setFilters} />
    </aside>
  );
};

export default FilterSidebar;
