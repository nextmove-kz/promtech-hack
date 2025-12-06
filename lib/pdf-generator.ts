import { jsPDF } from 'jspdf'
import robotoFont from './fonts/roboto-regular.json'

export interface ActionPlanPdfData {
  object_data: {
    name: string
    type: string
    pipeline_name: string
    health_status: string
    urgency_score: number
    last_diagnostic?: {
      date: string
      method: string
      params: Record<string, unknown>
      ml_label?: string
      quality_grade?: string
      temperature?: number
      illumination?: number
      defect_found?: boolean
    }
  }
  result: {
    problem_description: string
    suggested_actions: string
    expected_result: string
  }
}

const FONT_SIZE = {
  title: 18,
  sectionTitle: 14,
  label: 11,
  text: 10,
}

const COLORS = {
  primary: [0, 0, 0] as [number, number, number], // Black for formal look
  text: [30, 30, 30] as [number, number, number],
  muted: [80, 80, 80] as [number, number, number], // Darker gray
  border: [0, 0, 0] as [number, number, number], // Black lines
  success: [0, 0, 0] as [number, number, number], // No colors in text
  warning: [0, 0, 0] as [number, number, number],
  critical: [0, 0, 0] as [number, number, number],
}

const healthStatusLabels: Record<string, string> = {
  OK: 'Норма',
  WARNING: 'Предупреждение',
  CRITICAL: 'Критический',
  UNKNOWN: 'Неизвестно',
}

const getHealthColor = (status: string): [number, number, number] => {
  switch (status) {
    case 'OK':
      return COLORS.success
    case 'WARNING':
      return COLORS.warning
    case 'CRITICAL':
      return COLORS.critical
    default:
      return COLORS.muted
  }
}

// Helper to split text into lines that fit within maxWidth
const splitTextToLines = (
  doc: jsPDF,
  text: string,
  maxWidth: number
): string[] => {
  return doc.splitTextToSize(text, maxWidth)
}

// Setup custom font with Cyrillic support
const setupCyrillicFont = (doc: jsPDF): void => {
  // Add the Roboto font file to jsPDF's virtual file system
  doc.addFileToVFS('Roboto-Regular.ttf', robotoFont.data)
  // Register the font
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  // Set as default font
  doc.setFont('Roboto', 'normal')
}

export function generateActionPlanPdf(data: ActionPlanPdfData): void {
  const { object_data, result } = data

  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Setup Cyrillic font support
  setupCyrillicFont(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let yPos = margin

  // Header
  doc.setFontSize(FONT_SIZE.title)
  doc.setTextColor(...COLORS.primary)
  doc.text('ПЛАН ДЕЙСТВИЙ', pageWidth / 2, yPos, { align: 'center' })
  yPos += 12

  // Date
  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.muted)
  const dateStr = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Дата генерации: ${dateStr}`, pageWidth / 2, yPos, {
    align: 'center',
  })
  yPos += 15

  // Object Info Section
  // Removed gray background for formal look
  
  yPos += 8
  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  // Removed bold font switch as we only have regular loaded
  doc.text('ИНФОРМАЦИЯ ОБ ОБЪЕКТЕ', margin, yPos)
  yPos += 8

  // Object details as a list
  doc.setFontSize(FONT_SIZE.text)
  const lineHeight = 6
  const labelWidth = 60
  
  const drawField = (label: string, value: string | number) => {
    doc.setTextColor(...COLORS.muted)
    doc.text(label, margin, yPos)
    doc.setTextColor(...COLORS.text)
    doc.text(String(value), margin + labelWidth, yPos)
    yPos += lineHeight
  }

  drawField('Название:', object_data.name)
  drawField('Тип:', object_data.type)
  drawField('Трубопровод:', object_data.pipeline_name)
  
  const statusLabel = healthStatusLabels[object_data.health_status] || object_data.health_status
  drawField('Статус:', `${statusLabel} (${object_data.urgency_score}/100)`)

  yPos += 5

  // Diagnostic Info
  if (object_data.last_diagnostic) {
    doc.setFontSize(FONT_SIZE.sectionTitle)
    doc.setTextColor(...COLORS.primary)
    doc.text('ПОСЛЕДНЯЯ ДИАГНОСТИКА', margin, yPos)
    yPos += 8

    doc.setFontSize(FONT_SIZE.text)
    const diag = object_data.last_diagnostic
    
    const diagDate = diag.date
      ? new Date(diag.date).toLocaleDateString('ru-RU')
      : '-'
    
    drawField('Дата:', diagDate)
    drawField('Метод:', diag.method || '-')
    
    if (diag.temperature !== undefined) drawField('Температура:', `${diag.temperature}°C`)
    if (diag.illumination !== undefined) drawField('Освещенность:', diag.illumination)
    
    if (diag.ml_label) {
      const label = diag.ml_label === 'normal' ? 'Норма' : diag.ml_label === 'medium' ? 'Средний риск' : 'Высокий риск'
      drawField('AI Анализ:', label)
    }
    
    if (diag.quality_grade) drawField('Качество:', diag.quality_grade)
    
    if (diag.defect_found !== undefined) {
      drawField('Дефект:', diag.defect_found ? 'Обнаружен' : 'Не обнаружен')
    }

    // Params
    const params = diag.params as Record<string, unknown>
    if (params.param1 !== undefined && params.param1 !== null && params.param1 !== 0) drawField('Параметр 1:', params.param1 as string)
    if (params.param2 !== undefined && params.param2 !== null && params.param2 !== 0) drawField('Параметр 2:', params.param2 as string)
    if (params.param3 !== undefined && params.param3 !== null && params.param3 !== 0) drawField('Параметр 3:', params.param3 as string)
  }

  yPos += 10

  // Problem Description Section
  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  doc.text('ОПИСАНИЕ ПРОБЛЕМЫ', margin, yPos)
  yPos += 2

  // Underline
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2) // Thinner line
  doc.line(margin, yPos, margin + contentWidth, yPos)
  yPos += 8

  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const problemLines = splitTextToLines(
    doc,
    result.problem_description,
    contentWidth
  )
  for (const line of problemLines) {
    if (yPos > pageHeight - margin - 10) {
      doc.addPage()
      setupCyrillicFont(doc)
      yPos = margin
    }
    doc.text(line, margin, yPos)
    yPos += 5
  }
  yPos += 10

  // Suggested Actions Section
  if (yPos > pageHeight - 60) {
    doc.addPage()
    setupCyrillicFont(doc)
    yPos = margin
  }

  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  doc.text('ПРЕДЛАГАЕМЫЕ ДЕЙСТВИЯ', margin, yPos)
  yPos += 2

  doc.setDrawColor(...COLORS.border)
  doc.line(margin, yPos, margin + contentWidth, yPos)
  yPos += 8

  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const actionLines = splitTextToLines(
    doc,
    result.suggested_actions,
    contentWidth
  )
  for (const line of actionLines) {
    if (yPos > pageHeight - margin - 10) {
      doc.addPage()
      setupCyrillicFont(doc)
      yPos = margin
    }
    doc.text(line, margin, yPos)
    yPos += 5
  }
  yPos += 10

  // Expected Result Section
  if (yPos > pageHeight - 40) {
    doc.addPage()
    setupCyrillicFont(doc)
    yPos = margin
  }

  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  doc.text('ПЛАНИРУЕМЫЙ РЕЗУЛЬТАТ', margin, yPos)
  yPos += 2

  doc.setDrawColor(...COLORS.border)
  doc.line(margin, yPos, margin + contentWidth, yPos)
  yPos += 8

  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const resultLines = splitTextToLines(
    doc,
    result.expected_result,
    contentWidth
  )
  for (const line of resultLines) {
    if (yPos > pageHeight - margin - 10) {
      doc.addPage()
      setupCyrillicFont(doc)
      yPos = margin
    }
    doc.text(line, margin, yPos)
    yPos += 5
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    setupCyrillicFont(doc) // Ensure font is set for footer
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.muted)
    doc.text(`Страница ${i} из ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: 'center',
    })
  }

  // Generate filename and save
  const sanitizedName = object_data.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')
  const dateForFile = new Date().toISOString().split('T')[0]
  const filename = `action_plan_${sanitizedName}_${dateForFile}.pdf`

  doc.save(filename)
}
