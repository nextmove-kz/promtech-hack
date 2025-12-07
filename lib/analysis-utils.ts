import type {
  DiagnosticsMethodOptions,
  DiagnosticsMlLabelOptions,
  DiagnosticsQualityGradeOptions,
  DiagnosticsResponse,
  ObjectsResponse,
} from '@/app/api/api_types';

/**
 * Risk scoring weights for prioritization
 */
const RISK_WEIGHTS = {
  // Quality grade weights (highest priority)
  qualityGrade: {
    недопустимо: 100,
    требует_мер: 70,
    допустимо: 30,
    удовлетворительно: 0,
  } as Record<DiagnosticsQualityGradeOptions, number>,

  // ML label weights
  mlLabel: {
    high: 80,
    medium: 40,
    normal: 0,
  } as Record<DiagnosticsMlLabelOptions, number>,

  // Method reliability weights (for conflict detection)
  methodReliability: {
    MFL: 95, // Magnetic Flux - best for internal
    UZK: 90, // Ultrasonic - precise wall thickness
    RGK: 85, // Radiographic - subsurface defects
    TFI: 85, // Transverse Field Inspection
    UTWM: 80, // Ultrasonic Wall Measurement
    GEO: 75, // Geometric - deformations
    MPK: 70, // Magnetic Particle - surface cracks
    PVK: 65, // Penetrant - surface cracks
    TVK: 60, // Television/Video
    VIK: 50, // Visual - surface only
    VIBRO: 50, // Vibration
  } as Record<DiagnosticsMethodOptions, number>,
};

/**
 * Calculate a composite risk score for an object based on its diagnostics
 */
export function calculateRiskScore(diagnostics: DiagnosticsResponse[]): number {
  if (diagnostics.length === 0) return 0;

  let maxScore = 0;
  let hasDefect = false;
  let defectCount = 0;
  let hasConflict = false;

  // Track findings by method type
  const mflFindings = diagnostics.filter((d) => d.method === 'MFL');
  const visualFindings = diagnostics.filter(
    (d) => d.method === 'VIK' || d.method === 'TVK',
  );

  // Check for MFL vs Visual conflict
  const mflHasDefect = mflFindings.some((d) => d.defect_found);
  const visualClean = visualFindings.every((d) => !d.defect_found);
  if (mflHasDefect && visualClean && visualFindings.length > 0) {
    hasConflict = true;
  }

  for (const d of diagnostics) {
    let score = 0;

    // Quality grade score
    if (d.quality_grade) {
      score = Math.max(score, RISK_WEIGHTS.qualityGrade[d.quality_grade] || 0);
    }

    // ML label score
    if (d.ml_label) {
      score = Math.max(score, RISK_WEIGHTS.mlLabel[d.ml_label] || 0);
    }

    // Defect presence
    if (d.defect_found) {
      hasDefect = true;
      defectCount++;
      score = Math.max(score, 40); // Minimum 40 if defect found
    }

    maxScore = Math.max(maxScore, score);
  }

  // Boost score for conflicts
  if (hasConflict) {
    maxScore = Math.min(100, maxScore + 20);
  }

  // Boost score for multiple defects
  if (defectCount > 2) {
    maxScore = Math.min(100, maxScore + 10);
  }

  // Ensure minimum score if any defect found
  if (hasDefect && maxScore < 30) {
    maxScore = 30;
  }

  return Math.round(maxScore);
}

/**
 * Categorize risk level based on score
 */
export function getRiskLevel(
  score: number,
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL' {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'NORMAL';
}

/**
 * Sort objects by risk priority (highest risk first)
 * This is useful for batch analysis to process critical items first
 */
export function sortByRiskPriority(
  objects: ObjectsResponse[],
  diagnosticsMap: Map<string, DiagnosticsResponse[]>,
): ObjectsResponse[] {
  return [...objects].sort((a, b) => {
    const diagA = diagnosticsMap.get(a.id) || [];
    const diagB = diagnosticsMap.get(b.id) || [];
    const scoreA = calculateRiskScore(diagA);
    const scoreB = calculateRiskScore(diagB);
    return scoreB - scoreA; // Descending order
  });
}

/**
 * Filter objects that need immediate analysis (high risk only)
 * Useful for saving API tokens by prioritizing critical items
 */
export function filterHighRiskObjects(
  objects: ObjectsResponse[],
  diagnosticsMap: Map<string, DiagnosticsResponse[]>,
  threshold: number = 40,
): ObjectsResponse[] {
  return objects.filter((obj) => {
    const diagnostics = diagnosticsMap.get(obj.id) || [];
    const score = calculateRiskScore(diagnostics);
    return score >= threshold;
  });
}

/**
 * Get analysis priority queue - returns object IDs sorted by priority
 * Filters and sorts objects for optimal batch processing
 */
export async function getAnalysisPriorityQueue(
  objects: ObjectsResponse[],
  diagnosticsMap: Map<string, DiagnosticsResponse[]>,
  options: {
    highRiskOnly?: boolean;
    riskThreshold?: number;
    maxObjects?: number;
  } = {},
): Promise<string[]> {
  const { highRiskOnly = false, riskThreshold = 40, maxObjects } = options;

  let filteredObjects = objects;

  // Filter high risk if requested
  if (highRiskOnly) {
    filteredObjects = filterHighRiskObjects(
      objects,
      diagnosticsMap,
      riskThreshold,
    );
  }

  // Sort by priority
  const sortedObjects = sortByRiskPriority(filteredObjects, diagnosticsMap);

  // Limit if specified
  const limitedObjects = maxObjects
    ? sortedObjects.slice(0, maxObjects)
    : sortedObjects;

  return limitedObjects.map((obj) => obj.id);
}

/**
 * Check if diagnostics indicate potential data conflict
 */
export function hasDataConflict(diagnostics: DiagnosticsResponse[]): boolean {
  // Group by method type
  const internalMethods = diagnostics.filter(
    (d) =>
      d.method === 'MFL' ||
      d.method === 'UZK' ||
      d.method === 'RGK' ||
      d.method === 'TFI',
  );
  const surfaceMethods = diagnostics.filter(
    (d) => d.method === 'VIK' || d.method === 'TVK' || d.method === 'PVK',
  );

  // Check for internal defect with clean surface
  const internalDefect = internalMethods.some((d) => d.defect_found);
  const surfaceClean = surfaceMethods.every((d) => !d.defect_found);

  if (internalDefect && surfaceClean && surfaceMethods.length > 0) {
    return true;
  }

  // Check for contradicting quality grades in same timeframe
  const recentDiagnostics = diagnostics
    .filter((d): d is DiagnosticsResponse & { date: string } => Boolean(d.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const grades = recentDiagnostics.map((d) => d.quality_grade).filter(Boolean);
  const hasGoodGrade = grades.some(
    (g) => g === 'удовлетворительно' || g === 'допустимо',
  );
  const hasBadGrade = grades.some(
    (g) => g === 'недопустимо' || g === 'требует_мер',
  );

  if (hasGoodGrade && hasBadGrade) {
    return true;
  }

  return false;
}

/**
 * Generate a summary of diagnostics for an object
 */
export function summarizeDiagnostics(diagnostics: DiagnosticsResponse[]): {
  totalInspections: number;
  defectsFound: number;
  latestGrade: DiagnosticsQualityGradeOptions | null;
  methodsCovered: DiagnosticsMethodOptions[];
  riskScore: number;
  riskLevel: ReturnType<typeof getRiskLevel>;
  hasConflict: boolean;
} {
  const sorted = [...diagnostics].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );

  const methods = [
    ...new Set(diagnostics.map((d) => d.method).filter(Boolean)),
  ] as DiagnosticsMethodOptions[];

  const riskScore = calculateRiskScore(diagnostics);

  return {
    totalInspections: diagnostics.length,
    defectsFound: diagnostics.filter((d) => d.defect_found).length,
    latestGrade: sorted[0]?.quality_grade || null,
    methodsCovered: methods,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    hasConflict: hasDataConflict(diagnostics),
  };
}
