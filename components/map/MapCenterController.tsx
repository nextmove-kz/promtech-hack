"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { ObjectsResponse } from "@/app/api/api_types";

interface MapCenterControllerProps {
  selectedObjectId: string | null;
  objects: ObjectsResponse[];
}

const KAZAKHSTAN_CENTER: [number, number] = [48.0, 66.5];
const DEFAULT_ZOOM = 6;

/**
 * Component to handle automatic map centering and zooming when an object is selected
 */
export function MapCenterController({
  selectedObjectId,
  objects,
}: MapCenterControllerProps) {
  const map = useMap();
  const previousSelectedId = useRef<string | null>(null);

  useEffect(() => {
    // Zoom in when an object is selected
    if (selectedObjectId && objects.length > 0) {
      const selectedObject = objects.find((obj) => obj.id === selectedObjectId);

      if (selectedObject && selectedObject.lat && selectedObject.lon) {
        // Zoom to the selected object with a smooth curved animation
        map.flyTo([selectedObject.lat, selectedObject.lon], 14, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    }
    // Zoom out when deselecting (going back from DiagnosticDetailsPanel)
    else if (!selectedObjectId && previousSelectedId.current !== null) {
      // Zoom out to default view with smooth animation
      map.flyTo(KAZAKHSTAN_CENTER, DEFAULT_ZOOM, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }

    // Update the previous selected ID
    previousSelectedId.current = selectedObjectId;
  }, [selectedObjectId, objects, map]);

  return null;
}
