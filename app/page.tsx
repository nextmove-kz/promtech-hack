'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { MapView } from '@/components/dashboard/MapView';
import { TableView } from '@/components/dashboard/TableView';
import { Sidebar } from '@/components/dashboard/Sidebar';

type ViewMode = 'map' | 'table';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSelected = searchParams.get('object');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(
    initialSelected,
  );

  const handleObjectSelect = (objectId: string) => {
    setSelectedObjectId(objectId);
    router.replace('/');
  };
  const handleClosePanel = () => {
    setSelectedObjectId(null);
    router.replace('/');
  };
  const handleExpandTable = () => setViewMode('table');
  const handleBackToMap = () => setViewMode('map');

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <Header />
      <main className="flex h-full overflow-hidden pt-[120px]">
        <div className="flex min-w-0 flex-1">
          {viewMode === 'map' ? (
            <MapView
              onObjectSelect={handleObjectSelect}
              selectedObjectId={selectedObjectId}
            />
          ) : (
            <TableView
              onObjectSelect={handleObjectSelect}
              onBackToMap={handleBackToMap}
            />
          )}
          <Sidebar
            selectedObjectId={selectedObjectId}
            viewMode={viewMode}
            onObjectSelect={handleObjectSelect}
            onClosePanel={handleClosePanel}
            onExpandTable={handleExpandTable}
          />
        </div>
      </main>
    </div>
  );
}

export default function Index() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
