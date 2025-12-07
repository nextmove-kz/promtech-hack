"use client";

import Link from "next/link";
import { ArrowLeft, Filter, Gauge, LineChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { filterAtom } from "@/store/filterStore";
import clientPocketBase from "@/app/api/client_pb";
import type { PipelinesResponse } from "@/app/api/api_types";
import { KPICards } from "@/components/dashboard/stats/KPICards";
import { LinearAssetVisualization } from "@/components/dashboard/stats/LinearAssetVisualization";
import { MaterialDegradationChart } from "@/components/dashboard/stats/MaterialDegradationChart";
import { AgeDefectsChart } from "@/components/dashboard/stats/AgeDefectsChart";
import { DefectTypesChart } from "@/components/dashboard/stats/DefectTypesChart";
import { GenerateReportButton } from "@/components/dashboard/stats/GenerateReportButton";
import { Header } from "@/components/dashboard/Header";
import { DataImporter } from "@/components/data-importer";

export default function StatsPage() {
  const [filters, setFilters] = useAtom(filterAtom);

  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery<
    PipelinesResponse[]
  >({
    queryKey: ["pipelines"],
    queryFn: async () =>
      clientPocketBase.collection("pipelines").getFullList<PipelinesResponse>(),
    staleTime: Infinity,
  });

  const handlePipelineChange = (pipelineId: string) => {
    setFilters({
      ...filters,
      advanced: {
        ...filters.advanced,
        pipeline: pipelineId || "",
      },
    });
  };

  const selectedPipeline = pipelines.find(
    (p) => p.id === filters.advanced.pipeline
  );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        {/* Header */}
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
        </header>
        <div className="flex items-center justify-between mt-10">
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">
                Цифровой паспорт трубопровода
              </h1>
              <p className="text-sm text-slate-500">
                Панель управления и аналитики
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline Selector */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <label
                  htmlFor="pipeline-select"
                  className="text-sm font-medium text-slate-700"
                >
                  Выберите трубопровод:
                </label>
              </div>
              <select
                id="pipeline-select"
                value={filters.advanced.pipeline || ""}
                onChange={(e) => handlePipelineChange(e.target.value)}
                disabled={pipelinesLoading}
                className="flex-1 max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Все трубопроводы</option>
                {pipelinesLoading && (
                  <option value="" disabled>
                    Загрузка...
                  </option>
                )}
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end">
              <GenerateReportButton
                selectedPipelineId={filters.advanced.pipeline}
                selectedPipeline={selectedPipeline}
              />
            </div>
          </div>

          {/* Generate Report Button */}
        </div>

        {/* KPI Cards */}
        <KPICards />

        {/* Linear Asset Visualization - Hero Section */}
        <LinearAssetVisualization />

        {/* Analytical Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <MaterialDegradationChart />
          <AgeDefectsChart />
          <DefectTypesChart />
        </div>

        {/* Footer spacing */}
        <div className="h-4" />
      </div>
    </div>
  );
}
