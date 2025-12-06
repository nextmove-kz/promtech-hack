'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { PipelineObject } from '@/app/types/pipeline';
import { PipelineMarker } from './PipelineMarker';
import {
  calculateBounds,
  toBounds,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from './map-utils';

interface PipelineMapProps {
  objects: PipelineObject[];
  onMarkerClick?: (object: PipelineObject) => void;
  height?: string;
  className?: string;
  fitBounds?: boolean;
}

/**
 * Component to handle map bounds fitting
 */
function MapBoundsHandler({
  objects,
  fitBounds,
}: {
  objects: PipelineObject[];
  fitBounds: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (fitBounds && objects.length > 0) {
      const bounds = calculateBounds(objects);
      if (bounds) {
        map.fitBounds(toBounds(bounds), { padding: [50, 50] });
      }
    }
  }, [objects, fitBounds, map]);

  return null;
}

export function PipelineMap({
  objects,
  onMarkerClick,
  height = '500px',
  className = '',
  fitBounds = true,
}: PipelineMapProps) {
  return (
    <div className={className}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height, width: '100%', borderRadius: '0.5rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsHandler objects={objects} fitBounds={fitBounds} />

        {objects.map((object) => (
          <PipelineMarker
            key={object.object_id}
            object={object}
            onClick={onMarkerClick}
          />
        ))}
      </MapContainer>
    </div>
  );
}
