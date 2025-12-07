'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { ObjectsResponse } from '@/app/api/api_types';
import type { LatLngBoundsExpression } from 'leaflet';

interface MapExportProps {
  objects: ObjectsResponse[];
  bounds?: LatLngBoundsExpression;
}

// CartoDB Positron (Light) tile layer - same as main map
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const KAZAKHSTAN_CENTER: [number, number] = [48.0, 66.5];

// Kazakhstan full bounds - extended to show entire country
// Format: [[south, west], [north, east]]
const KAZAKHSTAN_BOUNDS: [[number, number], [number, number]] = [
  [40.5, 46.5], // Southwest corner (a bit inside border)
  [55.0, 87.3], // Northeast corner (a bit inside border)
];

export function MapExport({ objects, bounds }: MapExportProps) {
  // Always use Kazakhstan bounds to show full country
  const center: [number, number] = KAZAKHSTAN_CENTER;

  // Get color based on health status
  const getMarkerColor = (healthStatus?: string): string => {
    switch (healthStatus) {
      case 'CRITICAL':
        return '#ef4444'; // red
      case 'WARNING':
        return '#f97316'; // orange
      case 'OK':
        return '#10b981'; // emerald
      default:
        return '#9ca3af'; // gray
    }
  };

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{
        height: '600px',
        width: '1200px',
        background: '#f8fafc',
      }}
      bounds={KAZAKHSTAN_BOUNDS}
      boundsOptions={{ padding: [20, 20] }}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      {/* Render object markers */}
      {objects.map((obj) => {
        if (!obj.lat || !obj.lon) return null;

        const color = getMarkerColor(obj.health_status);
        const isCritical = obj.health_status === 'CRITICAL';

        return (
          <CircleMarker
            key={obj.id}
            center={[obj.lat, obj.lon]}
            radius={isCritical ? 8 : 6}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.8,
              color: '#ffffff',
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">{obj.name}</div>
                <div className="text-slate-500 text-xs">
                  {obj.health_status || 'UNKNOWN'}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Legend overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontSize: '12px', fontFamily: 'sans-serif' }}>
          <div
            style={{
              fontWeight: '500',
              marginBottom: '8px',
              color: '#475569',
            }}
          >
            Легенда
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ef4444',
              }}
            />
            <span style={{ color: '#475569' }}>Критический</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#f97316',
              }}
            />
            <span style={{ color: '#475569' }}>Предупреждение</span>
          </div>
        </div>
      </div>
    </MapContainer>
  );
}
