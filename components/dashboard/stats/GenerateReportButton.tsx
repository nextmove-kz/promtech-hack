'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateStatsReport } from '@/lib/stats-report-generator';
import { useStatsReportData } from '@/hooks/useStatsReportData';
import type { PipelinesResponse } from '@/app/api/api_types';

interface GenerateReportButtonProps {
  selectedPipelineId: string | null | undefined;
  selectedPipeline?: PipelinesResponse | null;
}

export function GenerateReportButton({
  selectedPipelineId,
}: GenerateReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { data, isLoading, error } = useStatsReportData(selectedPipelineId);

  const handleGenerate = async () => {
    if (!data) {
      toast.error('Нет данных для генерации отчета');
      return;
    }

    if (!selectedPipelineId) {
      toast.error('Пожалуйста, выберите трубопровод');
      return;
    }

    setIsGenerating(true);
    try {
      await generateStatsReport(data, { includeMap: false });
      toast.success('Отчет успешно создан');
    } catch (err) {
      console.error('Report generation error:', err);
      toast.error('Ошибка при создании отчета');
    } finally {
      setIsGenerating(false);
    }
  };

  const isDisabled = isLoading || isGenerating || error !== null || !data;

  return (
    <Button
      onClick={handleGenerate}
      disabled={isDisabled}
      variant="default"
      size="default"
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Генерация отчета...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Сгенерировать отчет
        </>
      )}
    </Button>
  );
}
