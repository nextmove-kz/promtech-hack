import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HEALTH_STATUS_LABELS, getObjectTypeLabel } from './constants';
import robotoFont from './fonts/roboto-regular.json';
import type { StatsReportData } from '@/hooks/useStatsReportData';
import type { ObjectsResponse } from '@/app/api/api_types';

// Constants
const PAGE_CONFIG = {
  margin: 20,
  lineHeight: 6,
  fontSize: {
    title: 18,
    section: 14,
    body: 10,
    small: 8,
  },
  colors: {
    primary: [0, 0, 0] as [number, number, number], // Black for formal look
    text: [30, 30, 30] as [number, number, number],
    muted: [80, 80, 80] as [number, number, number],
    border: [0, 0, 0] as [number, number, number],
  },
};

// Helper function to setup Cyrillic font
function setupCyrillicFont(doc: jsPDF): void {
  doc.addFileToVFS('Roboto-Regular.ttf', robotoFont.data);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto', 'normal');
}

// Helper function to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Helper function to format datetime
function formatDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Helper function to sanitize filename
function sanitizeName(name?: string): string {
  if (!name) return 'unknown';
  return name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_');
}

// Helper function to translate health status
function translateHealthStatus(status?: string): string {
  if (!status) return 'Неизвестно';
  const labels: Record<string, string> = {
    OK: 'Норма',
    WARNING: 'Предупреждение',
    CRITICAL: 'Критический',
  };
  return labels[status] || status;
}

// Helper function to translate ML label
function translateMLLabel(label?: string): string {
  if (!label) return '-';
  const labels: Record<string, string> = {
    normal: 'Норма',
    medium: 'Средний',
    high: 'Высокий',
  };
  return labels[label] || label;
}

// Helper function to add page numbers
function addPageNumbers(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(PAGE_CONFIG.fontSize.small);
    doc.setTextColor(...PAGE_CONFIG.colors.muted);
    doc.text(`Страница ${i} из ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: 'center',
    });
  }
}

// Section 1: Cover page with general statistics
function addCoverPage(doc: jsPDF, data: StatsReportData): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PAGE_CONFIG.margin;
  let yPos = margin;

  // Title
  doc.setFontSize(PAGE_CONFIG.fontSize.title);
  doc.setTextColor(...PAGE_CONFIG.colors.primary);
  doc.text('ОТЧЕТ ПО ТРУБОПРОВОДУ', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Pipeline name
  if (data.pipeline?.name) {
    doc.setFontSize(PAGE_CONFIG.fontSize.section);
    doc.text(data.pipeline.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
  }

  // Date
  doc.setFontSize(PAGE_CONFIG.fontSize.body);
  doc.setTextColor(...PAGE_CONFIG.colors.muted);
  doc.text(
    `Дата генерации: ${formatDateTime(new Date())}`,
    pageWidth / 2,
    yPos,
    {
      align: 'center',
    },
  );
  yPos += 20;

  // KPI Metrics Section
  doc.setFontSize(PAGE_CONFIG.fontSize.section);
  doc.setTextColor(...PAGE_CONFIG.colors.primary);
  doc.text('КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ', margin, yPos);
  yPos += 2;

  doc.setDrawColor(...PAGE_CONFIG.colors.border);
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Draw KPI cards in 2x2 grid
  const cardWidth = (pageWidth - margin * 2 - 10) / 2;
  const cardHeight = 25;
  const spacing = 10;

  const kpis = [
    {
      label: 'Индекс безопасности',
      value: data.kpiMetrics.safetyScore,
      unit: 'шкала 0-100',
    },
    {
      label: 'Средняя срочность',
      value: data.kpiMetrics.avgUrgency.toFixed(1),
      unit: `по ${data.kpiMetrics.totalObjects} объектам`,
    },
    {
      label: 'Требуют внимания',
      value: data.kpiMetrics.activeAnomalies,
      unit: 'объектов с проблемами',
    },
    {
      label: 'Открытые задачи',
      value: data.kpiMetrics.pendingActions,
      unit: 'в плане действий',
    },
  ];

  for (let i = 0; i < kpis.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cardWidth + spacing);
    const y = yPos + row * (cardHeight + spacing);

    // Draw card border
    doc.setDrawColor(...PAGE_CONFIG.colors.border);
    doc.setLineWidth(0.5);
    doc.rect(x, y, cardWidth, cardHeight);

    // Label
    doc.setFontSize(PAGE_CONFIG.fontSize.small);
    doc.setTextColor(...PAGE_CONFIG.colors.muted);
    doc.text(kpis[i].label, x + 5, y + 7);

    // Value
    doc.setFontSize(16);
    doc.setTextColor(...PAGE_CONFIG.colors.primary);
    doc.text(String(kpis[i].value), x + 5, y + 16);

    // Unit
    doc.setFontSize(PAGE_CONFIG.fontSize.small);
    doc.setTextColor(...PAGE_CONFIG.colors.muted);
    doc.text(kpis[i].unit, x + 5, y + 22);
  }

  yPos += 2 * (cardHeight + spacing) + 10;

  // Summary Statistics
  doc.setFontSize(PAGE_CONFIG.fontSize.section);
  doc.setTextColor(...PAGE_CONFIG.colors.primary);
  doc.text('СВОДНАЯ СТАТИСТИКА', margin, yPos);
  yPos += 2;

  doc.setDrawColor(...PAGE_CONFIG.colors.border);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(PAGE_CONFIG.fontSize.body);
  doc.setTextColor(...PAGE_CONFIG.colors.text);

  const summaryItems = [
    `Всего объектов: ${data.kpiMetrics.totalObjects}`,
    `Всего диагностик: ${data.kpiMetrics.totalDiagnostics}`,
    `Планов действий: ${data.plans.length}`,
    `Критических объектов: ${data.kpiMetrics.criticalCount}`,
    `Объектов с предупреждением: ${data.kpiMetrics.warningCount}`,
    `Обнаружено дефектов: ${data.defectiveDiagnostics.length}`,
  ];

  for (const item of summaryItems) {
    doc.text(item, margin, yPos);
    yPos += PAGE_CONFIG.lineHeight;
  }
}

// Section 2: Defects table
function addDefectsTable(doc: jsPDF, data: StatsReportData): void {
  const margin = PAGE_CONFIG.margin;
  let yPos = margin;

  // Section title
  doc.setFontSize(PAGE_CONFIG.fontSize.section);
  doc.setTextColor(...PAGE_CONFIG.colors.primary);
  doc.text('ТАБЛИЦА ДЕФЕКТОВ', margin, yPos);
  yPos += 2;

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...PAGE_CONFIG.colors.border);
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Total defects count
  const totalDefects = data.defectiveDiagnostics.length;
  doc.setFontSize(PAGE_CONFIG.fontSize.body);
  doc.setTextColor(...PAGE_CONFIG.colors.text);
  doc.text(`Всего обнаружено дефектов: ${totalDefects}`, margin, yPos);
  yPos += 8;

  // Prepare table data
  const tableData = data.defectiveDiagnostics.map((diag) => {
    const objectName = diag.expand?.object?.name || '-';
    const method = diag.method || '-';
    const description = diag.defect_description || '-';
    const risk = translateMLLabel(diag.ml_label);
    const date = diag.date ? formatDate(new Date(diag.date)) : '-';

    return [objectName, method, description, risk, date];
  });

  if (tableData.length === 0) {
    doc.setFontSize(PAGE_CONFIG.fontSize.body);
    doc.setTextColor(...PAGE_CONFIG.colors.muted);
    doc.text('Дефектов не обнаружено', margin, yPos);
    return;
  }

  // Generate table using jspdf-autotable
  autoTable(doc, {
    head: [['Объект', 'Метод', 'Описание дефекта', 'Риск', 'Дата']],
    body: tableData,
    startY: yPos,
    margin: { left: margin, right: margin },
    styles: {
      font: 'Roboto',
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'normal',
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Object name
      1: { cellWidth: 25 }, // Method
      2: { cellWidth: 70 }, // Description
      3: { cellWidth: 20 }, // Risk
      4: { cellWidth: 25 }, // Date
    },
    didDrawPage: () => {
      // Ensure font is set after each page
      doc.setFont('Roboto', 'normal');
    },
  });
}

// Section 3: Critical objects
function addCriticalObjects(doc: jsPDF, data: StatsReportData): void {
  const margin = PAGE_CONFIG.margin;
  let yPos = margin;

  // Section title
  doc.setFontSize(PAGE_CONFIG.fontSize.section);
  doc.setTextColor(...PAGE_CONFIG.colors.primary);
  doc.text('НАИБОЛЕЕ КРИТИЧЕСКИЕ ОБЪЕКТЫ (ТОП-5)', margin, yPos);
  yPos += 2;

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...PAGE_CONFIG.colors.border);
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  if (data.criticalObjects.length === 0) {
    doc.setFontSize(PAGE_CONFIG.fontSize.body);
    doc.setTextColor(...PAGE_CONFIG.colors.muted);
    doc.text('Критических объектов не найдено', margin, yPos);
    return;
  }

  doc.setFontSize(PAGE_CONFIG.fontSize.body);

  for (let i = 0; i < data.criticalObjects.length; i++) {
    const obj = data.criticalObjects[i];

    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      doc.setFont('Roboto', 'normal');
      yPos = margin;
    }

    // Object number and name
    doc.setTextColor(...PAGE_CONFIG.colors.primary);
    doc.text(`${i + 1}. ${obj.name}`, margin, yPos);
    yPos += PAGE_CONFIG.lineHeight;

    // Risk score
    doc.setTextColor(...PAGE_CONFIG.colors.text);
    doc.text(`   Риск: ${obj.urgency_score}/100`, margin, yPos);
    yPos += PAGE_CONFIG.lineHeight;

    // Health status
    const status = translateHealthStatus(obj.health_status);
    doc.text(`   Статус: ${status}`, margin, yPos);
    yPos += PAGE_CONFIG.lineHeight;

    // Type
    if (obj.type) {
      const typeLabel = getObjectTypeLabel(obj.type);
      doc.text(`   Тип: ${typeLabel}`, margin, yPos);
      yPos += PAGE_CONFIG.lineHeight;
    }

    // AI Summary if available
    if (obj.ai_summary) {
      const summary =
        obj.ai_summary.length > 200
          ? obj.ai_summary.substring(0, 200) + '...'
          : obj.ai_summary;
      const lines = doc.splitTextToSize(summary, pageWidth - margin * 2 - 10);
      doc.setTextColor(...PAGE_CONFIG.colors.muted);
      for (const line of lines) {
        if (yPos > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          doc.setFont('Roboto', 'normal');
          yPos = margin;
        }
        doc.text(`   ${line}`, margin, yPos);
        yPos += 5;
      }
    }

    yPos += 8; // Space between objects
  }
}

// Section 4: Load static map image
async function loadStaticMapImage(): Promise<string | null> {
  try {
    // Use static Kazakhstan map image instead of dynamic rendering
    const mapImagePath = '/assets/kazakhstan-pipeline-map.png';

    // Fetch the image and convert to base64
    const response = await fetch(mapImagePath);
    if (!response.ok) {
      console.warn('Static map image not found, skipping map section');
      return null;
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading static map:', error);
    return null;
  }
}

// Section 4: Add map section
function addMapSection(
  doc: jsPDF,
  mapImageDataUrl: string,
  data: StatsReportData,
): void {
  const margin = PAGE_CONFIG.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = margin;

  // Section title
  doc.setFontSize(PAGE_CONFIG.fontSize.section);
  doc.setTextColor(...PAGE_CONFIG.colors.primary);
  doc.text('КАРТА РАСПОЛОЖЕНИЯ КРИТИЧЕСКИХ ОБЪЕКТОВ', margin, yPos);
  yPos += 2;

  doc.setDrawColor(...PAGE_CONFIG.colors.border);
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Map scope description
  doc.setFontSize(PAGE_CONFIG.fontSize.small);
  doc.setTextColor(...PAGE_CONFIG.colors.muted);
  doc.text('Охват: Вся территория Казахстана', margin, yPos);
  yPos += 8;

  // Add map image - static Kazakhstan pipeline map
  const imgWidth = pageWidth - margin * 2;
  // Calculate height to fit available space while maintaining aspect ratio
  const availableHeight = pageHeight - yPos - margin - 35; // Reserve space for legend
  // Assuming landscape orientation, use a reasonable aspect ratio
  const imgHeight = Math.min(imgWidth * 0.6, availableHeight, 100); // 5:3 aspect ratio

  doc.addImage(mapImageDataUrl, 'PNG', margin, yPos, imgWidth, imgHeight);
  yPos += imgHeight + 8;

  // Legend section
  doc.setFontSize(PAGE_CONFIG.fontSize.body);
  doc.setTextColor(...PAGE_CONFIG.colors.text);
  doc.text('Легенда:', margin, yPos);
  yPos += PAGE_CONFIG.lineHeight;

  // Legend items with counts
  doc.setFontSize(PAGE_CONFIG.fontSize.small);
  doc.setTextColor(...PAGE_CONFIG.colors.text);

  const legendItems = [
    {
      symbol: '🔴',
      label: 'Критический',
      count: data.kpiMetrics.criticalCount,
    },
    {
      symbol: '🟡',
      label: 'Предупреждение',
      count: data.kpiMetrics.warningCount,
    },
  ];

  for (const item of legendItems) {
    doc.text(
      `${item.symbol} ${item.label}: ${item.count} объектов`,
      margin + 5,
      yPos,
    );
    yPos += 5;
  }
}

// Main export function
export async function generateStatsReport(
  data: StatsReportData,
  options?: { includeMap?: boolean },
): Promise<void> {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Setup Cyrillic font
  setupCyrillicFont(doc);

  // Page 1: Cover & KPIs
  addCoverPage(doc, data);

  // Page 2: Defects table
  doc.addPage();
  setupCyrillicFont(doc);
  addDefectsTable(doc, data);

  // Page 3: Critical objects
  doc.addPage();
  setupCyrillicFont(doc);
  addCriticalObjects(doc, data);

  // Page 4: Map (optional)
  if (options?.includeMap) {
    const mapImage = await loadStaticMapImage();
    if (mapImage) {
      doc.addPage();
      setupCyrillicFont(doc);
      addMapSection(doc, mapImage, data);
    }
  }

  // Add page numbers to all pages
  addPageNumbers(doc);

  // Generate filename and save
  const pipelineName = sanitizeName(data.pipeline?.name);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `pipeline_report_${pipelineName}_${dateStr}.pdf`;

  doc.save(filename);
}
