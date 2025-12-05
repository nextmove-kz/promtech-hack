# Map Components Usage Guide

## Overview

The map system consists of three main components:
- `PipelineMap` - Main map container with OpenStreetMap
- `PipelineMarker` - Individual markers for pipeline objects
- Utility functions for colors, icons, and bounds calculation

## Basic Usage

```tsx
"use client"

import { PipelineMap } from "@/app/components/map"
import type { PipelineObject } from "@/app/types/pipeline"

const mockData: PipelineObject[] = [
  {
    object_id: 1,
    object_name: "Compressor Station A",
    object_type: "compressor",
    pipeline_id: "KZ-001",
    lat: 48.0196,
    lon: 66.9237,
    year: 2015,
    material: "Steel",
  },
  {
    object_id: 2,
    object_name: "Pipeline Section B",
    object_type: "pipeline_section",
    pipeline_id: "KZ-001",
    lat: 48.5,
    lon: 67.5,
    year: 2018,
    material: "Carbon Steel",
  },
]

export default function MapPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pipeline Objects Map</h1>
      <PipelineMap objects={mockData} height="600px" />
    </div>
  )
}
```

## Advanced Usage with Click Handler

```tsx
"use client"

import { useState } from "react"
import { PipelineMap } from "@/app/components/map"
import type { PipelineObject } from "@/app/types/pipeline"

export default function InteractiveMapPage() {
  const [selectedObject, setSelectedObject] = useState<PipelineObject | null>(null)

  const handleMarkerClick = (object: PipelineObject) => {
    setSelectedObject(object)
    console.log("Selected object:", object)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PipelineMap
            objects={mockData}
            onMarkerClick={handleMarkerClick}
            height="600px"
            fitBounds={true}
          />
        </div>

        <div className="bg-card p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Selected Object</h2>
          {selectedObject ? (
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedObject.object_name}</p>
              <p><strong>Type:</strong> {selectedObject.object_type}</p>
              <p><strong>Year:</strong> {selectedObject.year}</p>
              {/* Add more details or actions */}
            </div>
          ) : (
            <p className="text-muted-foreground">Click a marker to view details</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

## Using Utility Functions

```tsx
import {
  calculateBounds,
  toBounds,
  getMarkerColorByType,
} from "@/app/components/map"

// Calculate bounds for filtering
const objects = [...] // your pipeline objects
const bounds = calculateBounds(objects)

if (bounds) {
  console.log("Map bounds:", bounds)
  // { north: 48.5, south: 48.0, east: 67.5, west: 66.9 }
}

// Get marker color for object type
const color = getMarkerColorByType("compressor") // "red"
```

## Component Props

### PipelineMap

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `objects` | `PipelineObject[]` | required | Array of pipeline objects to display |
| `onMarkerClick` | `(object: PipelineObject) => void` | - | Callback when marker is clicked |
| `height` | `string` | `"500px"` | Map container height |
| `className` | `string` | `""` | Additional CSS classes |
| `fitBounds` | `boolean` | `true` | Auto-fit map to show all markers |

### PipelineMarker

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | `PipelineObject` | required | Pipeline object to display |
| `onClick` | `(object: PipelineObject) => void` | - | Callback when marker is clicked |

## Marker Colors

Object types are automatically color-coded:
- **Crane**: Blue
- **Compressor**: Red
- **Pipeline Section**: Green

Colors can be customized in `map-utils.ts` by modifying the `getMarkerColorByType` function.

## Performance Tips

1. **Large datasets**: The map handles hundreds of markers well. For thousands, consider:
   - Marker clustering (add `react-leaflet-cluster`)
   - Filtering data before passing to map
   - Lazy loading markers based on viewport

2. **Server-side rendering**: The map component uses `"use client"` and handles SSR automatically with a loading state.

3. **Memory**: When unmounting, React Leaflet cleans up resources automatically.

## Integration with PocketBase

```tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { PipelineMap } from "@/app/components/map"
import type { PipelineObject } from "@/app/types/pipeline"
import { clientPocketBase } from "@/app/api/client_pb"

export default function LiveMapPage() {
  const { data: objects = [], isLoading } = useQuery({
    queryKey: ["pipeline-objects"],
    queryFn: async () => {
      const records = await clientPocketBase
        .collection("pipeline_objects")
        .getFullList<PipelineObject>()
      return records
    },
  })

  if (isLoading) {
    return <div>Loading map data...</div>
  }

  return <PipelineMap objects={objects} height="calc(100vh - 200px)" />
}
```

## Customization

### Custom Marker Icons

Edit `createColoredIcon` in `map-utils.ts` to use custom icons:

```typescript
export function createColoredIcon(color: MarkerColor): L.Icon {
  return L.icon({
    iconUrl: `/icons/marker-${color}.png`, // Use local icons
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}
```

### Custom Popup Content

Extend `PipelineMarker.tsx` to customize popup appearance or add buttons/actions.

### Different Map Tiles

Replace OpenStreetMap with other tile providers in `PipelineMap.tsx`:

```tsx
// Satellite view
<TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />

// Dark mode
<TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" />
```

## Troubleshooting

**Markers not showing**: Check that lat/lon are valid numbers and within bounds (-90 to 90 for lat, -180 to 180 for lon).

**Map not loading**: Ensure Leaflet CSS is imported in `globals.css`.

**Hydration errors**: The component already handles SSR by checking `mounted` state.
