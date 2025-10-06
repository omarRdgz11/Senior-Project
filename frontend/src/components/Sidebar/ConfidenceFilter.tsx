interface ConfidenceFilterProps {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const ConfidenceFilter: React.FC<ConfidenceFilterProps> = ({ filters, setFilters }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Confidence</label>
      <select
        className="select select-bordered select-sm w-full"
        value={filters.confidence || ""}
        onChange={(e) => {
          setFilters(() => ({
            confidence: e.target.value,
          }));
        }}
      >
        <option value="">All</option>
        <option value="low">Low</option>
        <option value="nominal">Nominal</option>
        <option value="high">High</option>
      </select>
    </div>
  );
};

export default ConfidenceFilter;
