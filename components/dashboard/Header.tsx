'use client';

import Link from 'next/link';
import { Gauge, LineChart } from 'lucide-react';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { DataImporter } from '@/components/data-importer';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="absolute left-0 right-0 top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Gauge className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex items-center">
            <span className="text-lg font-semibold text-foreground">
              IntegrityOS
            </span>
            <Link
              href="/stats"
              className="ml-2  text-sm font-normal hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 p-1 rounded-md"
            >
              <LineChart className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/plans">Трекер задач</Link>
          </Button>
          <DataImporter />
        </div>
      </div>
      <FilterBar />
    </header>
  );
}
