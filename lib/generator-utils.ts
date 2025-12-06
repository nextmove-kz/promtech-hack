/**
 * Pipeline route definitions for Kazakhstan
 */
export const PIPELINE_ROUTES = {
  "MT-01": [
    [46.9, 51.9],   // Atyrau
    [50.3, 57.2],   // Aktobe
    [53.2, 63.6],   // Kostanay
  ] as [number, number][],
  "MT-02": [
    [43.6, 51.2],   // Aktau
    [46.9, 51.9],   // Atyrau
    [51.2, 71.4],   // Astana
  ] as [number, number][],
  "MT-03": [
    [43.2, 76.9],   // Almaty
    [49.8, 73.1],   // Karaganda
    [51.2, 71.4],   // Astana
  ] as [number, number][],
} as const

export type PipelineId = keyof typeof PIPELINE_ROUTES

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate total path length
 */
function calculatePathLength(path: [number, number][]): number {
  let total = 0
  for (let i = 0; i < path.length - 1; i++) {
    total += haversineDistance(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])
  }
  return total
}

/**
 * Linear interpolation between two points
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

export interface GeneratedObject {
  lat: number
  lon: number
  pipelineId: string
}

/**
 * Generate objects evenly distributed along a pipeline path
 * Uses linear interpolation to place points exactly on path segments
 */
export function generateObjectsAlongPath(
  pathCoordinates: [number, number][],
  count: number,
  pipelineId: string
): GeneratedObject[] {
  if (pathCoordinates.length < 2 || count < 1) {
    return []
  }

  const objects: GeneratedObject[] = []
  const totalLength = calculatePathLength(pathCoordinates)
  
  // Calculate segment lengths
  const segments: { start: [number, number]; end: [number, number]; length: number }[] = []
  for (let i = 0; i < pathCoordinates.length - 1; i++) {
    const start = pathCoordinates[i]
    const end = pathCoordinates[i + 1]
    const length = haversineDistance(start[0], start[1], end[0], end[1])
    segments.push({ start, end, length })
  }

  // Generate evenly spaced points
  for (let i = 0; i < count; i++) {
    // Calculate target distance along path (evenly distributed)
    const targetDistance = (totalLength * (i + 0.5)) / count
    
    // Find which segment this point falls on
    let accumulatedDistance = 0
    for (const segment of segments) {
      if (accumulatedDistance + segment.length >= targetDistance) {
        // Point is on this segment
        const segmentProgress = (targetDistance - accumulatedDistance) / segment.length
        const lat = lerp(segment.start[0], segment.end[0], segmentProgress)
        const lon = lerp(segment.start[1], segment.end[1], segmentProgress)
        
        objects.push({
          lat,
          lon,
          pipelineId,
        })
        break
      }
      accumulatedDistance += segment.length
    }
  }

  return objects
}

/**
 * Generate objects for all pipelines
 */
export function generateAllPipelineObjects(
  objectsPerPipeline: number = 10
): GeneratedObject[] {
  const allObjects: GeneratedObject[] = []
  
  for (const [pipelineId, path] of Object.entries(PIPELINE_ROUTES)) {
    const objects = generateObjectsAlongPath(path, objectsPerPipeline, pipelineId)
    allObjects.push(...objects)
  }
  
  return allObjects
}

