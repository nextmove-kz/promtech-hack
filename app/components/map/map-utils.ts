import L from "leaflet"
import type { PipelineObject, ObjectType, MarkerColor, MapBounds } from "@/app/types/pipeline"

/**
 * Get marker color based on object type
 */
export function getMarkerColorByType(type: ObjectType): MarkerColor {
  const colorMap: Record<ObjectType, MarkerColor> = {
    crane: "blue",
    compressor: "red",
    pipeline_section: "green",
  }
  return colorMap[type]
}

/**
 * Create a custom colored marker icon
 */
export function createColoredIcon(color: MarkerColor): L.Icon {
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
}

/**
 * Calculate bounds from array of pipeline objects
 */
export function calculateBounds(objects: PipelineObject[]): MapBounds | null {
  if (objects.length === 0) return null

  const lats = objects.map((obj) => obj.lat)
  const lons = objects.map((obj) => obj.lon)

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lons),
    west: Math.min(...lons),
  }
}

/**
 * Convert MapBounds to Leaflet LatLngBounds
 */
export function toBounds(bounds: MapBounds): L.LatLngBoundsExpression {
  return [
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  ]
}

/**
 * Default map center (Kazakhstan approximate center)
 */
export const DEFAULT_CENTER: [number, number] = [48.0196, 66.9237]
export const DEFAULT_ZOOM = 6
