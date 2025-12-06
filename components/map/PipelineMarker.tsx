'use client';

import { Marker, Popup } from 'react-leaflet';
import type { PipelineObject } from '@/app/types/pipeline';
import { getMarkerColorByType, createColoredIcon } from './map-utils';

interface PipelineMarkerProps {
  object: PipelineObject;
  onClick?: (object: PipelineObject) => void;
}

export function PipelineMarker({ object, onClick }: PipelineMarkerProps) {
  const color = getMarkerColorByType(object.object_type);
  const icon = createColoredIcon(color);

  const handleClick = () => {
    if (onClick) {
      onClick(object);
    }
  };

  return (
    <Marker
      position={[object.lat, object.lon]}
      icon={icon}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup>
        <div className="min-w-[200px]">
          <h3 className="font-bold text-lg mb-2">{object.object_name}</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold">ID:</span> {object.object_id}
            </div>
            <div>
              <span className="font-semibold">Type:</span>{' '}
              <span className="capitalize">
                {object.object_type.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="font-semibold">Pipeline:</span>{' '}
              {object.pipeline_id}
            </div>
            <div>
              <span className="font-semibold">Year:</span> {object.year}
            </div>
            <div>
              <span className="font-semibold">Material:</span> {object.material}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {object.lat.toFixed(4)}, {object.lon.toFixed(4)}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
