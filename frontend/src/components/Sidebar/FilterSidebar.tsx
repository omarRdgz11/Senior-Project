import DateRangeFilter from "./DateRangeFilter";
import ConfidenceFilter from "./ConfidenceFilter";
import ZoomSlider from "./ZoomSlider";
import { styles } from "../Sidebar/Sidebar.styles"

interface FilterSidebarProps {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, setFilters }) => {
  return (
    <aside 
      className="w-72 h-[calc(100vh-64px)] bg-base-200 p-4 border-r border-base-300 space-y-4"
      style={styles.sidebar}
    >
      <h2 style={styles.title}>Filters</h2>
      <div style={styles.subtitle}>
        {/* Date Range Filter */}
        <DateRangeFilter filters={filters} setFilters={setFilters} />

        {/* Confidence Filter */}
        <ConfidenceFilter filters={filters} setFilters={setFilters} />

        {/* Zoom Slider */}
        <ZoomSlider filters={filters} setFilters={setFilters} />
      </div>
    </aside>
  );
};

export default FilterSidebar;
