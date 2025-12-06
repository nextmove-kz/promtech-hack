"use client"

import { Polyline, Tooltip } from "react-leaflet"
import { PIPELINE_ROUTES, type PipelineId } from "@/lib/generator-utils"

interface PipelinesLayerProps {
  activePipelineId?: PipelineId | null
}

const PIPELINE_NAMES: Record<PipelineId, string> = {
  "MT-01": "MT-01: Атырау → Актобе → Костанай",
  "MT-02": "MT-02: Актау → Атырау → Астана",
  "MT-03": "MT-03: Алматы → Караганда → Астана",
}

export function PipelinesLayer({ activePipelineId }: PipelinesLayerProps) {
  return (
    <>
      {Object.entries(PIPELINE_ROUTES).map(([id, coordinates]) => {
        const pipelineId = id as PipelineId
        const isActive = activePipelineId === pipelineId
        
        return (
          <Polyline
            key={pipelineId}
            positions={coordinates}
            pathOptions={{
              weight: 5,
              color: isActive ? "#2563eb" : "#3b82f6", // blue-600 : blue-500
              opacity: isActive ? 0.9 : 0.7,
            }}
          >
            <Tooltip sticky>
              {PIPELINE_NAMES[pipelineId]}
            </Tooltip>
          </Polyline>
        )
      })}
    </>
  )
}
