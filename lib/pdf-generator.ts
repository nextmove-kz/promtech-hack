import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import robotoFont from './fonts/roboto-regular.json'

export interface ActionPlanPdfData {
  object_data: {
    id: string
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
    problem_summary: string
    action_plan: string[]
    required_resources: string
    safety_requirements: string
    expected_outcome: string
  }
}

const FONT_SIZE = {
  title: 18,
  sectionTitle: 14,
  label: 11,
  text: 10,
}

const QR_SIZE = 42

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

export async function generateActionPlanPdf(
  data: ActionPlanPdfData
): Promise<void> {
  const { object_data, result } = data
  const qrLink = `https://link-integrity.netlify.app/plan/${object_data.id}`
  const qrDataUrl = await QRCode.toDataURL(qrLink, { margin: 1, scale: 6 })

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

  // QR code top-right (first page only)
  const qrX = pageWidth - margin - QR_SIZE
  const qrY = margin
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE)
  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const qrLabelY = qrY + QR_SIZE + 6
  doc.text('QR для онлайн-плана', qrX + QR_SIZE / 2, qrLabelY, {
    align: 'center',
  })
  const qrLinkY = qrLabelY + 6
  doc.text('Открыть в браузере', qrX + QR_SIZE / 2, qrLinkY, {
    align: 'center',
  })
  doc.link(qrX, qrY, QR_SIZE, QR_SIZE + 12, { url: qrLink })
  yPos = Math.max(yPos, qrLinkY + 8)

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

  // Summary Section
  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  doc.text('РЕЗЮМЕ ПРОБЛЕМЫ', margin, yPos)
  yPos += 2

  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.line(margin, yPos, margin + contentWidth, yPos)
  yPos += 8

  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const summaryLines = splitTextToLines(
    doc,
    result.problem_summary,
    contentWidth
  )
  for (const line of summaryLines) {
    if (yPos > pageHeight - margin - 10) {
      doc.addPage()
      setupCyrillicFont(doc)
      yPos = margin
    }
    doc.text(line, margin, yPos)
    yPos += 5
  }
  yPos += 10

  // Action Plan Section
  if (yPos > pageHeight - 60) {
    doc.addPage()
    setupCyrillicFont(doc)
    yPos = margin
  }

  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  doc.text('ПЛАН ДЕЙСТВИЙ', margin, yPos)
  yPos += 2

  doc.setDrawColor(...COLORS.border)
  doc.line(margin, yPos, margin + contentWidth, yPos)
  yPos += 8

  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const actions = result.action_plan || []
  for (let i = 0; i < actions.length; i++) {
    const actionText = `${i + 1}. ${actions[i]}`
    const actionLines = splitTextToLines(doc, actionText, contentWidth)
    for (const line of actionLines) {
      if (yPos > pageHeight - margin - 10) {
        doc.addPage()
        setupCyrillicFont(doc)
        yPos = margin
      }
      doc.text(line, margin, yPos)
      yPos += 5
    }
  }
  yPos += 10

  // Required Resources Section
  if (yPos > pageHeight - 50) {
    doc.addPage()
    setupCyrillicFont(doc)
    yPos = margin
  }

  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  doc.text('РЕСУРСЫ', margin, yPos)
  yPos += 2

  doc.setDrawColor(...COLORS.border)
  doc.line(margin, yPos, margin + contentWidth, yPos)
  yPos += 8

  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const resourcesLines = splitTextToLines(
    doc,
    result.required_resources,
    contentWidth
  )
  for (const line of resourcesLines) {
    if (yPos > pageHeight - margin - 10) {
      doc.addPage()
      setupCyrillicFont(doc)
      yPos = margin
    }
    doc.text(line, margin, yPos)
    yPos += 5
  }
  yPos += 10

  // Safety Requirements Section
  if (yPos > pageHeight - 50) {
    doc.addPage()
    setupCyrillicFont(doc)
    yPos = margin
  }

  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  doc.text('ТРЕБОВАНИЯ ПО БЕЗОПАСНОСТИ', margin, yPos)
  yPos += 2

  doc.setDrawColor(...COLORS.border)
  doc.line(margin, yPos, margin + contentWidth, yPos)
  yPos += 8

  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const safetyLines = splitTextToLines(
    doc,
    result.safety_requirements,
    contentWidth
  )
  for (const line of safetyLines) {
    if (yPos > pageHeight - margin - 10) {
      doc.addPage()
      setupCyrillicFont(doc)
      yPos = margin
    }
    doc.text(line, margin, yPos)
    yPos += 5
  }
  yPos += 10

  // Expected Outcome Section
  if (yPos > pageHeight - 40) {
    doc.addPage()
    setupCyrillicFont(doc)
    yPos = margin
  }

  doc.setFontSize(FONT_SIZE.sectionTitle)
  doc.setTextColor(...COLORS.primary)
  doc.text('ОЖИДАЕМЫЙ РЕЗУЛЬТАТ', margin, yPos)
  yPos += 2

  doc.setDrawColor(...COLORS.border)
  doc.line(margin, yPos, margin + contentWidth, yPos)
  yPos += 8

  doc.setFontSize(FONT_SIZE.text)
  doc.setTextColor(...COLORS.text)
  const outcomeLines = splitTextToLines(
    doc,
    result.expected_outcome,
    contentWidth
  )
  for (const line of outcomeLines) {
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
