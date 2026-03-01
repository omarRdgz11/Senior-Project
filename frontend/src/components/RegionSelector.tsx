// src/components/RegionSelector.tsx
import { useEffect, useState } from "react";
import { fetchRegions, type RegionInfo } from "../api/regions";

type RegionSelectorProps = {
  value: string; // Current region slug
  onChange: (slug: string, region: RegionInfo | undefined) => void;
  className?: string;
};

export default function RegionSelector({
  value,
  onChange,
  className = "",
}: RegionSelectorProps) {
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRegions() {
      try {
        setLoading(true);
        const data = await fetchRegions();
        setRegions(data.regions);
      } catch (err: any) {
        console.error("Error loading regions:", err);
        setError(err.message ?? String(err));
      } finally {
        setLoading(false);
      }
    }
    loadRegions();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    const region = regions.find((r) => r.slug === slug);
    onChange(slug, region);
  };

  if (loading) {
    return (
      <select className={`select select-bordered w-full ${className}`} disabled>
        <option>Loading regions...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select className={`select select-bordered w-full ${className}`} disabled>
        <option>Error loading regions</option>
      </select>
    );
  }

  return (
    <select
      className={`select select-bordered w-full ${className}`}
      value={value}
      onChange={handleChange}
    >
      {regions.map((r) => (
        <option key={r.slug} value={r.slug}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
