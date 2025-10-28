interface DateRangeFilterProps {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ filters, setFilters }) => {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: "start" | "end") => {
    const value = e.target.value;
    setFilters((prev: any) => ({
      ...prev,
      dateRange: { ...prev.dateRange, [type]: value },
    }));
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Date Range</label>
      <input
        type="date"
        value={filters.dateRange?.start || ""}
        onChange={(e) => handleDateChange(e, "start")}
        className="input input-bordered input-sm w-full mb-2"
      />
      <input
        type="date"
        value={filters.dateRange?.end || ""}
        onChange={(e) => handleDateChange(e, "end")}
        className="input input-bordered input-sm w-full"
      />
    </div>
  );
};

export default DateRangeFilter;
