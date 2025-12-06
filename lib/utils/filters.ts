import type { AdvancedFilterState, FilterOptionId } from "@/store/filterStore";

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface BuildObjectsFilterOptions {
  activeFilters: FilterOptionId[];
  advanced: AdvancedFilterState;
  searchQuery?: string;
  bounds?: Bounds;
}

export function buildObjectsFilter({
  activeFilters,
  advanced,
  searchQuery,
  bounds,
}: BuildObjectsFilterOptions): string | undefined {
  const filters: string[] = [];

  if (bounds) {
    filters.push(
      `lat >= ${bounds.south} && lat <= ${bounds.north} && lon >= ${bounds.west} && lon <= ${bounds.east}`
    );
  }

  if (activeFilters.includes("critical")) {
    filters.push(`health_status = "CRITICAL"`);
  }

  if (activeFilters.includes("defective")) {
    filters.push(`has_defects = true`);
  }

  if (advanced.type) {
    filters.push(`type = "${advanced.type}"`);
  }

  if (advanced.healthStatus) {
    filters.push(`health_status = "${advanced.healthStatus}"`);
  }

  if (advanced.material) {
    const value = advanced.material.replace(/"/g, '\\"');
    filters.push(`material = "${value}"`);
  }

  if (advanced.yearFrom) {
    filters.push(`year >= ${advanced.yearFrom}`);
  }

  if (advanced.yearTo) {
    filters.push(`year <= ${advanced.yearTo}`);
  }

  if (advanced.pipeline) {
    const value = advanced.pipeline.replace(/"/g, '\\"');
    filters.push(`pipeline = "${value}"`);
  }

  if (searchQuery) {
    filters.push(`name ~ "${searchQuery}"`);
  }

  return filters.length > 0 ? filters.join(" && ") : undefined;
}

