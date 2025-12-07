import { z } from 'zod';

// Enum definitions
export const ObjectTypeEnum = z.enum([
  'crane',
  'compressor',
  'pipeline_section',
]);
export type ObjectType = z.infer<typeof ObjectTypeEnum>;

export const MethodEnum = z.enum([
  'VIK',
  'PVK',
  'MPK',
  'UZK',
  'RGK',
  'TVK',
  'VIBRO',
  'MFL',
  'TFI',
  'GEO',
  'UTWM',
]);
export type Method = z.infer<typeof MethodEnum>;

export const QualityGradeEnum = z.enum([
  'удовлетворительно',
  'допустимо',
  'требует_мер',
  'недопустимо',
]);
export type QualityGrade = z.infer<typeof QualityGradeEnum>;

export const MlLabelEnum = z.enum(['normal', 'medium', 'high']);
export type MlLabel = z.infer<typeof MlLabelEnum>;

// Helper to parse numeric values from CSV (handles empty strings)
const numericString = z.union([z.string(), z.number()]).transform((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return Number.isNaN(num) ? undefined : num;
});

const requiredNumericString = z
  .union([z.string(), z.number()])
  .transform((val, ctx) => {
    if (val === '' || val === null || val === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Обязательное числовое поле',
      });
      return z.NEVER;
    }
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (Number.isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Неверный числовой формат',
      });
      return z.NEVER;
    }
    return num;
  });

// Helper to parse boolean from CSV
const booleanString = z
  .union([z.string(), z.boolean(), z.number()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    const lower = val.toLowerCase().trim();
    return (
      lower === 'true' || lower === '1' || lower === 'да' || lower === 'yes'
    );
  });

// Helper to parse date from CSV
const dateString = z.string().transform((val, ctx) => {
  if (!val || val.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Дата обязательна',
    });
    return z.NEVER;
  }
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Неверный формат даты',
    });
    return z.NEVER;
  }
  return date.toISOString().split('T')[0];
});

// Object row schema for CSV validation
export const ObjectRowSchema = z.object({
  object_id: requiredNumericString,
  object_name: z.string().min(1, 'Название объекта обязательно'),
  object_type: ObjectTypeEnum,
  pipeline_id: z.string().optional().default(''),
  lat: requiredNumericString.pipe(
    z.number().min(-90).max(90, 'Широта должна быть от -90 до 90'),
  ),
  lon: requiredNumericString.pipe(
    z.number().min(-180).max(180, 'Долгота должна быть от -180 до 180'),
  ),
  year: numericString.optional(),
  material: z.string().optional().default(''),
});

export type ObjectRow = z.infer<typeof ObjectRowSchema>;

// Diagnostic row schema for CSV validation
export const DiagnosticRowSchema = z.object({
  diag_id: requiredNumericString,
  object_id: requiredNumericString,
  method: MethodEnum,
  date: dateString,
  temperature: numericString.optional(),
  humidity: numericString.optional(),
  illumination: numericString.optional(),
  defect_found: booleanString.optional().default(false),
  defect_description: z.string().optional().default(''),
  quality_grade: QualityGradeEnum.optional(),
  param1: numericString.optional(),
  param2: numericString.optional(),
  param3: numericString.optional(),
  ml_label: MlLabelEnum.optional(),
});

export type DiagnosticRow = z.infer<typeof DiagnosticRowSchema>;

export type DataType = 'objects' | 'diagnostics';

// Required headers for each data type
const OBJECT_REQUIRED_HEADERS = ['object_id', 'object_name', 'lat', 'lon'];
const DIAGNOSTIC_REQUIRED_HEADERS = ['diag_id', 'object_id', 'method', 'date'];

/**
 * Detects the type of CSV data based on the first row's keys
 */
export function detectDataType(row: Record<string, unknown>): DataType | null {
  const keys = Object.keys(row);

  // Check for diagnostics first (more specific - has diag_id)
  const hasDiagnosticHeaders = DIAGNOSTIC_REQUIRED_HEADERS.every((h) =>
    keys.includes(h),
  );
  if (hasDiagnosticHeaders) {
    return 'diagnostics';
  }

  // Check for objects
  const hasObjectHeaders = OBJECT_REQUIRED_HEADERS.every((h) =>
    keys.includes(h),
  );
  if (hasObjectHeaders) {
    return 'objects';
  }

  return null;
}

/**
 * Validates a single row based on the detected data type
 */
export function validateRow(
  row: Record<string, unknown>,
  dataType: DataType,
):
  | { success: true; data: ObjectRow | DiagnosticRow }
  | { success: false; errors: string[] } {
  const schema = dataType === 'objects' ? ObjectRowSchema : DiagnosticRowSchema;
  const result = schema.safeParse(row);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
  return { success: false, errors };
}
