'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import type { PipelineObject, ObjectType } from '@/app/types/pipeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const PipelineMap = dynamic(
  () => import('@/components/map').then((mod) => mod.PipelineMap),
  {
    ssr: false,
  },
);

// Sample pipeline objects across Kazakhstan
const SAMPLE_OBJECTS: PipelineObject[] = [
  {
    object_id: 1,
    object_name: 'Tengiz Compressor Station',
    object_type: 'compressor',
    pipeline_id: 'KZ-001',
    lat: 45.3842,
    lon: 54.0842,
    year: 2015,
    material: 'High-grade Steel',
  },
  {
    object_id: 2,
    object_name: 'Atyrau Pipeline Section A',
    object_type: 'pipeline_section',
    pipeline_id: 'KZ-001',
    lat: 47.1164,
    lon: 51.8833,
    year: 2012,
    material: 'Carbon Steel',
  },
  {
    object_id: 3,
    object_name: 'Aktau Crane Station',
    object_type: 'crane',
    pipeline_id: 'KZ-002',
    lat: 43.6508,
    lon: 51.1603,
    year: 2018,
    material: 'Reinforced Steel',
  },
  {
    object_id: 4,
    object_name: 'Astana Pipeline Section B',
    object_type: 'pipeline_section',
    pipeline_id: 'KZ-003',
    lat: 51.1694,
    lon: 71.4491,
    year: 2016,
    material: 'Stainless Steel',
  },
  {
    object_id: 5,
    object_name: 'Almaty Compressor Unit',
    object_type: 'compressor',
    pipeline_id: 'KZ-004',
    lat: 43.222,
    lon: 76.8512,
    year: 2019,
    material: 'High-grade Steel',
  },
  {
    object_id: 6,
    object_name: 'Shymkent Crane Hub',
    object_type: 'crane',
    pipeline_id: 'KZ-005',
    lat: 42.3,
    lon: 69.6,
    year: 2017,
    material: 'Composite Steel',
  },
  {
    object_id: 7,
    object_name: 'Karaganda Pipeline Section C',
    object_type: 'pipeline_section',
    pipeline_id: 'KZ-006',
    lat: 49.8047,
    lon: 73.1094,
    year: 2014,
    material: 'Carbon Steel',
  },
  {
    object_id: 8,
    object_name: 'Pavlodar Compressor',
    object_type: 'compressor',
    pipeline_id: 'KZ-007',
    lat: 52.2873,
    lon: 76.9674,
    year: 2020,
    material: 'Titanium Alloy',
  },
  {
    object_id: 9,
    object_name: 'Aktobe Crane Facility',
    object_type: 'crane',
    pipeline_id: 'KZ-008',
    lat: 50.2839,
    lon: 57.167,
    year: 2013,
    material: 'Industrial Steel',
  },
  {
    object_id: 10,
    object_name: 'Oral Pipeline Junction',
    object_type: 'pipeline_section',
    pipeline_id: 'KZ-009',
    lat: 51.2333,
    lon: 51.3667,
    year: 2021,
    material: 'Advanced Composite',
  },
];

const OBJECT_TYPE_COLORS: Record<ObjectType, string> = {
  crane: 'bg-blue-500',
  compressor: 'bg-red-500',
  pipeline_section: 'bg-green-500',
};

const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  crane: 'Crane',
  compressor: 'Compressor',
  pipeline_section: 'Pipeline Section',
};

export default function MapExamplePage() {
  const [selectedObject, setSelectedObject] = useState<PipelineObject | null>(
    null,
  );
  const [filterType, setFilterType] = useState<ObjectType | 'all'>('all');

  const filteredObjects = useMemo(() => {
    if (filterType === 'all') return SAMPLE_OBJECTS;
    return SAMPLE_OBJECTS.filter((obj) => obj.object_type === filterType);
  }, [filterType]);

  const handleMarkerClick = (object: PipelineObject) => {
    setSelectedObject(object);
  };

  const handleObjectClick = (object: PipelineObject) => {
    setSelectedObject(object);
    // Optionally scroll map to this object
  };

  const stats = useMemo(() => {
    return {
      total: SAMPLE_OBJECTS.length,
      cranes: SAMPLE_OBJECTS.filter((o) => o.object_type === 'crane').length,
      compressors: SAMPLE_OBJECTS.filter((o) => o.object_type === 'compressor')
        .length,
      pipeline_sections: SAMPLE_OBJECTS.filter(
        (o) => o.object_type === 'pipeline_section',
      ).length,
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            IntegrityOS - Pipeline Map Example
          </h1>
          <p className="text-muted-foreground">
            Interactive map showing pipeline infrastructure across Kazakhstan
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Objects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cranes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.cranes}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Compressors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.compressors}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline Sections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.pipeline_sections}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Map View</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={filterType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterType === 'crane' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('crane')}
                    >
                      Cranes
                    </Button>
                    <Button
                      variant={
                        filterType === 'compressor' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setFilterType('compressor')}
                    >
                      Compressors
                    </Button>
                    <Button
                      variant={
                        filterType === 'pipeline_section'
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => setFilterType('pipeline_section')}
                    >
                      Sections
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PipelineMap
                  objects={filteredObjects}
                  onMarkerClick={handleMarkerClick}
                  height="600px"
                  fitBounds={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Object Details */}
            <Card>
              <CardHeader>
                <CardTitle>Selected Object</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedObject ? (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-lg mb-1">
                        {selectedObject.object_name}
                      </h3>
                      <Badge
                        className={
                          OBJECT_TYPE_COLORS[selectedObject.object_type]
                        }
                      >
                        {OBJECT_TYPE_LABELS[selectedObject.object_type]}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Object ID:
                        </span>
                        <span className="font-medium">
                          {selectedObject.object_id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Pipeline ID:
                        </span>
                        <span className="font-medium">
                          {selectedObject.pipeline_id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Year:</span>
                        <span className="font-medium">
                          {selectedObject.year}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Material:</span>
                        <span className="font-medium">
                          {selectedObject.material}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Coordinates:
                        </span>
                        <span className="font-mono text-xs">
                          {selectedObject.lat.toFixed(4)},{' '}
                          {selectedObject.lon.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        View Details
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Generate Report
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Click on a marker or select from the list below to view
                    details
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Objects List */}
            <Card>
              <CardHeader>
                <CardTitle>All Objects ({filteredObjects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredObjects.map((object) => (
                      <button
                        type="button"
                        key={object.object_id}
                        onClick={() => handleObjectClick(object)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedObject?.object_id === object.object_id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-card hover:bg-muted/50 border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {object.object_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {object.pipeline_id} • {object.year}
                            </p>
                          </div>
                          <Badge
                            className={`${OBJECT_TYPE_COLORS[object.object_type]} shrink-0`}
                            variant="secondary"
                          >
                            {object.object_type === 'crane' && 'C'}
                            {object.object_type === 'compressor' && 'CO'}
                            {object.object_type === 'pipeline_section' && 'PS'}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Map Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm">Crane Stations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm">Compressor Stations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm">Pipeline Sections</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
