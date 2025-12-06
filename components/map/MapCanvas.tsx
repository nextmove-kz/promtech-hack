"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useObjects } from "@/hooks/useObjects";
import type { PipelineId } from "@/lib/generator-utils";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

// Dynamic imports for our layers
const PipelinesLayer = dynamic(
  () => import("./layers/PipelinesLayer").then((mod) => mod.PipelinesLayer),
  { ssr: false }
);
const ObjectsLayer = dynamic(
  () => import("./layers/ObjectsLayer").then((mod) => mod.ObjectsLayer),
  { ssr: false }
);
const MapCenterController = dynamic(
  () => import("./MapCenterController").then((mod) => mod.MapCenterController),
  { ssr: false }
);

interface MapCanvasProps {
  onObjectSelect: (id: string) => void;
  selectedObjectId?: string | null;
  activePipelineId?: PipelineId | null;
  height?: string;
  className?: string;
}

const KAZAKHSTAN_CENTER: [number, number] = [48.0, 66.5];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;

// Kazakhstan approximate bounds: [southwest, northeast]
const KAZAKHSTAN_BOUNDS: [[number, number], [number, number]] = [
  [40.0, 46.0], // Southwest corner
  [55.5, 87.5], // Northeast corner
];

// CartoDB Positron (Light) tile layer
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function MapCanvas({
  onObjectSelect,
  selectedObjectId,
  activePipelineId,
  height = "100%",
  className = "",
}: MapCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const { data: objectsData, isLoading } = useObjects({ perPage: 500 });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`bg-slate-100 animate-pulse rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-slate-500 text-sm">Загрузка карты...</div>
      </div>
    );
  }

  const objects = objectsData?.items ?? [];

  return (
    <div className={`relative ${className}`} style={{ height, zIndex: 0 }}>
      <MapContainer
        center={KAZAKHSTAN_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={KAZAKHSTAN_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{
          height: "100%",
          width: "100%",
          background: "#f8fafc",
          zIndex: 0,
        }}
        scrollWheelZoom={true}
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />

        {/* Map center controller for auto-zoom */}
        <MapCenterController
          selectedObjectId={selectedObjectId || null}
          objects={objects}
        />

        {/* Pipeline routes (bottom layer) */}
        <PipelinesLayer activePipelineId={activePipelineId} />

        {/* Object markers (top layer) */}
        {!isLoading && (
          <ObjectsLayer
            items={objects}
            onObjectSelect={onObjectSelect}
            selectedObjectId={selectedObjectId}
          />
        )}
      </MapContainer>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 pointer-events-none z-[1000]">
          <div className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm shadow-md border border-slate-200">
            Загрузка объектов...
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] rounded-md border border-slate-200 bg-white/95 p-3 backdrop-blur-sm shadow-sm">
        <div className="space-y-2 text-xs">
          <div className="text-slate-600 font-medium mb-2">Легенда</div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-6 rounded-full bg-blue-500 opacity-70" />
            <span className="text-slate-600">Трубопровод</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
            <span className="text-slate-600">Критический</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#f97316]" />
            <span className="text-slate-600">Предупреждение</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#10b981]" />
            <span className="text-slate-600">Норма</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#9ca3af]" />
            <span className="text-slate-600">Неизвестно</span>
          </div>
        </div>
      </div>
    </div>
  );
}
