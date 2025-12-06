'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  detectDataType,
  validateRow,
  type DataType,
  type ObjectRow,
  type DiagnosticRow,
} from '@/app/lib/schemas';
import {
  ensurePipelines,
  fetchAllObjects,
  createObjectsBatch,
  createDiagnosticsBatch,
} from '@/app/api/importer';
import type {
  DiagnosticsMethodOptions,
  DiagnosticsMlLabelOptions,
  DiagnosticsQualityGradeOptions,
  ObjectsTypeOptions,
} from '@/app/api/api_types';

const BATCH_SIZE = 50; // Smaller batches for smoother real-time updates
const BATCH_DELAY = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ImportState {
  phase: 'idle' | 'parsing' | 'uploading' | 'done';
  total: number;
  processed: number;
  errors: number;
}

interface FileData {
  name: string;
  type: DataType;
  records: { record: ObjectRow | DiagnosticRow; rowIndex: number }[];
}

// === Transform Functions ===

const toObjectPB = (o: ObjectRow, pipelines: Map<string, string>) => ({
  object_id: o.object_id,
  name: o.object_name,
  type: o.object_type as ObjectsTypeOptions,
  pipeline: o.pipeline_id ? pipelines.get(o.pipeline_id) : undefined,
  lat: o.lat,
  lon: o.lon,
  year: o.year,
  material: o.material,
});

const toDiagnosticPB = (d: DiagnosticRow, objects: Map<number, string>) => ({
  diag_id: d.diag_id,
  object: objects.get(d.object_id),
  method: d.method as DiagnosticsMethodOptions,
  date: d.date,
  temperature: d.temperature,
  humidity: d.humidity,
  illumination: d.illumination,
  defect_found: d.defect_found,
  defect_description: d.defect_description,
  quality_grade: d.quality_grade as DiagnosticsQualityGradeOptions | undefined,
  param1: d.param1,
  param2: d.param2,
  param3: d.param3,
  ml_label: d.ml_label as DiagnosticsMlLabelOptions | undefined,
});

// === File Parsing ===

const parseFile = (file: File): Promise<FileData | null> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, unknown>[];
        if (!rows.length) return resolve(null);

        const type = detectDataType(rows[0]);
        if (!type) return resolve(null);

        const records: FileData['records'] = [];
        rows.forEach((row, i) => {
          const result = validateRow(row, type);
          if (result.success)
            records.push({ record: result.data, rowIndex: i + 2 });
        });

        resolve(records.length ? { name: file.name, type, records } : null);
      },
      error: () => resolve(null),
    });
  });
};

export interface UseDataImportOptions {
  onComplete?: () => void;
}

export function useDataImport(options: UseDataImportOptions = {}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ImportState>({
    phase: 'idle',
    total: 0,
    processed: 0,
    errors: 0,
  });
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = false;
    setState({ phase: 'idle', total: 0, processed: 0, errors: 0 });
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
    toast.info('Импорт отменён');
    setTimeout(() => {
      reset();
      options.onComplete?.();
    }, 500);
  }, [reset, options]);

  // Invalidate objects query to refresh the map
  const refreshMap = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['objects'] });
  }, [queryClient]);

  const runImport = useCallback(
    async (files: File[]) => {
      reset();
      setState((s) => ({ ...s, phase: 'parsing' }));

      // Parse files
      const parsed: FileData[] = [];
      for (const f of files) {
        const data = await parseFile(f);
        if (data) parsed.push(data);
      }

      if (!parsed.length) {
        toast.error('Не удалось распознать файлы');
        reset();
        return;
      }

      // Sort: objects first
      parsed.sort((a, b) =>
        a.type === 'objects' ? -1 : b.type === 'objects' ? 1 : 0,
      );

      const objectsData = parsed.find((f) => f.type === 'objects');
      const diagData = parsed.find((f) => f.type === 'diagnostics');
      const total = parsed.reduce((n, f) => n + f.records.length, 0);

      setState((s) => ({ ...s, phase: 'uploading', total }));

      let processed = 0;
      let errors = 0;
      let objectMap = new Map<number, string>();
      let batchCount = 0;

      // Upload objects
      if (objectsData) {
        const objectRows = objectsData.records.map(
          (r) => r.record as ObjectRow,
        );
        const pipelines = await ensurePipelines(
          objectRows.map((o) => o.pipeline_id || ''),
        );

        for (let i = 0; i < objectsData.records.length; i += BATCH_SIZE) {
          if (abortRef.current) break;

          const batch = objectsData.records.slice(i, i + BATCH_SIZE);
          const pbRecords = batch.map((b) =>
            toObjectPB(b.record as ObjectRow, pipelines),
          );
          const result = await createObjectsBatch(pbRecords);

          errors += result.errors;
          result.ids.forEach((pbId, idx) => {
            const obj = batch[idx].record as ObjectRow;
            objectMap.set(obj.object_id, pbId);
          });

          processed += batch.length;
          batchCount++;
          setState((s) => ({ ...s, processed, errors }));

          // Refresh map every 2 batches for real-time effect
          if (batchCount % 2 === 0) {
            refreshMap();
          }

          if (i + BATCH_SIZE < objectsData.records.length)
            await sleep(BATCH_DELAY);
        }

        // Final refresh after all objects uploaded
        refreshMap();
      }

      // Upload diagnostics
      if (diagData && !abortRef.current) {
        // Fetch existing objects if we didn't import any
        if (!objectsData) objectMap = await fetchAllObjects();

        for (let i = 0; i < diagData.records.length; i += BATCH_SIZE) {
          if (abortRef.current) break;

          const batch = diagData.records.slice(i, i + BATCH_SIZE);
          const pbRecords = batch.map((b) =>
            toDiagnosticPB(b.record as DiagnosticRow, objectMap),
          );
          const result = await createDiagnosticsBatch(pbRecords);

          errors += result.errors;
          processed += batch.length;
          setState((s) => ({ ...s, processed, errors }));

          if (i + BATCH_SIZE < diagData.records.length)
            await sleep(BATCH_DELAY);
        }
      }

      // Done
      setState((s) => ({ ...s, phase: 'done' }));

      // Final refresh to ensure map is up to date
      refreshMap();

      const success = processed - errors;
      if (errors === 0) {
        toast.success(`Импорт завершён`, {
          description: `Загружено ${success} записей`,
        });
      } else {
        toast.warning(`Импорт завершён с ошибками`, {
          description: `Успешно: ${success}, ошибок: ${errors}`,
        });
      }

      // Auto-close after short delay
      setTimeout(() => {
        reset();
        options.onComplete?.();
      }, 1500);
    },
    [reset, options, refreshMap],
  );

  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length) runImport(files);
    },
    [runImport],
  );

  const isWorking = state.phase === 'parsing' || state.phase === 'uploading';
  const progress = state.total > 0 ? (state.processed / state.total) * 100 : 0;

  return {
    state,
    isWorking,
    progress,
    onDrop,
    reset,
    abort,
  };
}
