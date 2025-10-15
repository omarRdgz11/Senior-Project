interface ZoomSliderProps {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const ZoomSlider: React.FC<ZoomSliderProps> = ({ filters, setFilters }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Zoom</label>
      <input
        type="range"
        min="6"
        max="20"
        step="1"
        value={filters.zoom || 10}
        onChange={(e) => {
          setFilters(() => ({
            zoom: Number(e.target.value),
          }));
        }}
        className="range range-sm"
      />
      <div className="text-xs text-right mt-1">Zoom: {filters.zoom}</div>
    </div>
  );
};

export default ZoomSlider;
