"use client"

import { CircleMarker, Popup } from "react-leaflet"
import type { ObjectsResponse, DiagnosticsMlLabelOptions } from "@/app/api/api_types"

export type ObjectStatus = "critical" | "warning" | "normal"

interface ObjectWithDiagnostic extends ObjectsResponse {
  diagnosticMlLabel?: DiagnosticsMlLabelOptions
}

interface ObjectsLayerProps {
  items: ObjectWithDiagnostic[]
  onObjectSelect: (id: string) => void
}

function getStatusFromMlLabel(mlLabel?: DiagnosticsMlLabelOptions): ObjectStatus {
  switch (mlLabel) {
    case "high":
      return "critical"
    case "medium":
      return "warning"
    case "normal":
    default:
      return "normal"
  }
}

function getMarkerColor(status: ObjectStatus): string {
  switch (status) {
    case "critical":
      return "#ef4444" // red-500
    case "warning":
      return "#f97316" // orange-500
    case "normal":
    default:
      return "#10b981" // emerald-500
  }
}

function getStatusLabel(status: ObjectStatus): string {
  switch (status) {
    case "critical":
      return "Критический"
    case "warning":
      return "Предупреждение"
    case "normal":
    default:
      return "Норма"
  }
}

export function ObjectsLayer({ items, onObjectSelect }: ObjectsLayerProps) {
  return (
    <>
      {items.map((item) => {
        if (!item.lat || !item.lon) return null
        
        const status = getStatusFromMlLabel(item.diagnosticMlLabel)
        const color = getMarkerColor(status)
        const isCritical = status === "critical"
        
        return (
          <CircleMarker
            key={item.id}
            center={[item.lat, item.lon]}
            radius={isCritical ? 8 : 6}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.9,
              color: color,
              weight: 2,
              opacity: 1,
              className: isCritical ? "marker-pulse" : undefined,
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
                    <span
                      className="font-medium"
                      style={{ color }}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </div>
                  {item.type && (
                    <div>
                      <span className="text-gray-500">Тип:</span>{" "}
                      <span className="capitalize">{item.type.replace("_", " ")}</span>
                    </div>
                  )}
                  {item.year && (
                    <div>
                      <span className="text-gray-500">Год:</span> {item.year}
                    </div>
                  )}
                  {item.material && (
                    <div>
                      <span className="text-gray-500">Материал:</span> {item.material}
                    </div>
                  )}
                </div>
                <button
                  className="mt-2 w-full text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded transition-colors"
                  onClick={() => onObjectSelect(item.id)}
                >
                  Подробнее
                </button>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

