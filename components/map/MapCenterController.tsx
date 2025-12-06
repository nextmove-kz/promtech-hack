"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { ObjectsResponse } from "@/app/api/api_types";

interface MapCenterControllerProps {
  selectedObjectId: string | null;
  objects: ObjectsResponse[];
}

/**
 * Component to handle automatic map centering and zooming when an object is selected
 */
export function MapCenterController({
  selectedObjectId,
  objects,
}: MapCenterControllerProps) {
  const map = useMap();

  useEffect(() => {
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
  }, [selectedObjectId, objects, map]);

  return null;
}
