"use client";

import { useEffect, useRef } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";
import type {
  ObjectsResponse,
  DiagnosticsMlLabelOptions,
  ObjectsHealthStatusOptions,
} from "@/app/api/api_types";

export type ObjectStatus = "critical" | "warning" | "normal" | "unknown";

interface ObjectWithDiagnostic extends ObjectsResponse {
  diagnosticMlLabel?: DiagnosticsMlLabelOptions;
}

interface ObjectsLayerProps {
  items: ObjectWithDiagnostic[];
  onObjectSelect: (id: string) => void;
  selectedObjectId?: string | null;
}

function getStatusFromHealthStatus(
  health_status?: ObjectsHealthStatusOptions | null
): ObjectStatus {
  if (!health_status) return "unknown";

  switch (health_status) {
    case "CRITICAL":
      return "critical";
    case "WARNING":
      return "warning";
    case "OK":
      return "normal";
    default:
      return "unknown";
  }
}

function getMarkerColor(status: ObjectStatus): string {
  switch (status) {
    case "critical":
      return "#ef4444"; // red-500
    case "warning":
      return "#f97316"; // orange-500
    case "normal":
      return "#10b981"; // emerald-500
    case "unknown":
      return "#9ca3af"; // gray-400
  }
}

function getStatusLabel(status: ObjectStatus): string {
  switch (status) {
    case "critical":
      return "Критический";
    case "warning":
      return "Предупреждение";
    case "normal":
      return "Норма";
    case "unknown":
      return "Неизвестно";
  }
}

interface ObjectMarkerProps {
  item: ObjectWithDiagnostic;
  status: ObjectStatus;
  color: string;
  isCritical: boolean;
  isSelected: boolean;
  onObjectSelect: (id: string) => void;
}

function ObjectMarker({
  item,
  status,
  color,
  isCritical,
  isSelected,
  onObjectSelect,
}: ObjectMarkerProps) {
  const markerRef = useRef<LeafletCircleMarker | null>(null);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      // Open popup when this marker is selected
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  return (
    <CircleMarker
      ref={markerRef}
      center={[item.lat!, item.lon!]}
      radius={isSelected ? 10 : isCritical ? 8 : 6}
      pathOptions={{
        fillColor: color,
        fillOpacity: isSelected ? 1 : 0.9,
        color: isSelected ? "#ffffff" : color,
        weight: isSelected ? 4 : 2,
        opacity: 1,
      }}
      eventHandlers={{
        click: () => onObjectSelect(item.id),
      }}
    >
      <Popup>
        <div className="min-w-[180px]">
          <h3 className="font-bold text-sm mb-1">
            {item.name || `Объект ${item.id}`}
          </h3>
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Статус:</span>
              <span className="font-medium" style={{ color }}>
                {getStatusLabel(status)}
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

export function ObjectsLayer({
  items,
  onObjectSelect,
  selectedObjectId,
}: ObjectsLayerProps) {
  return (
    <>
      {items.map((item) => {
        if (!item.lat || !item.lon) return null;

        const status = getStatusFromHealthStatus(item.health_status);
        const color = getMarkerColor(status);
        const isCritical = status === "critical";
        const isSelected = selectedObjectId === item.id;

        return (
          <ObjectMarker
            key={item.id}
            item={item}
            status={status}
            color={color}
            isCritical={isCritical}
            isSelected={isSelected}
            onObjectSelect={onObjectSelect}
          />
        );
      })}
    </>
  );
}
