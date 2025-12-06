export type ObjectType = 'crane' | 'compressor' | 'pipeline_section';

export type PipelineObject = {
  object_id: number;
  object_name: string;
  object_type: ObjectType;
  pipeline_id: string;
  lat: number;
  lon: number;
  year: number;
  material: string;
};

export type MarkerColor = 'blue' | 'red' | 'green' | 'orange' | 'yellow';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
