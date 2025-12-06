/**
 * Script to generate synthetic Objects and Diagnostics CSV files
 * Run with: bun run scripts/generate-data.ts
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Import generator utils
import { PIPELINE_ROUTES, type PipelineId } from '../lib/generator-utils';

// Types
type ObjectType = 'crane' | 'compressor' | 'pipeline_section';
type Method =
  | 'VIK'
  | 'PVK'
  | 'MPK'
  | 'UZK'
  | 'RGK'
  | 'TVK'
  | 'VIBRO'
  | 'MFL'
  | 'TFI'
  | 'GEO'
  | 'UTWM';
type QualityGrade =
  | 'удовлетворительно'
  | 'допустимо'
  | 'требует_мер'
  | 'недопустимо';
type MlLabel = 'normal' | 'medium' | 'high';
type ObjectHealth = 'good' | 'medium' | 'bad';

interface ObjectRow {
  object_id: number;
  object_name: string;
  object_type: ObjectType;
  pipeline_id: string;
  lat: number;
  lon: number;
  year?: number;
  material?: string;
}

interface DiagnosticRow {
  diag_id: number;
  object_id: number;
  method: Method;
  date: string;
  temperature?: number;
  humidity?: number;
  illumination?: number;
  defect_found: boolean;
  defect_description?: string;
  quality_grade?: QualityGrade;
  param1?: number;
  param2?: number;
  param3?: number;
  ml_label?: MlLabel;
}

// Pipeline definitions with weights (MT-02 gets more objects)
const PIPELINES: { id: PipelineId; name: string; weight: number }[] = [
  { id: 'MT-01', name: 'Магистраль Атырау-Актобе-Костанай', weight: 0.31 },
  { id: 'MT-02', name: 'Магистраль Актау-Атырау-Астана', weight: 0.38 }, // Longest pipeline, gets more
  { id: 'MT-03', name: 'Магистраль Алматы-Караганда-Астана', weight: 0.31 },
];

const OBJECT_TYPES: ObjectType[] = ['crane', 'compressor', 'pipeline_section'];
const OBJECT_TYPE_WEIGHTS = [0.3, 0.15, 0.55];
const METHODS: Method[] = [
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
];
const MATERIALS = ['Ст3', '09Г2С', '17Г1С', '13ХФА', '20А', '10Г2'];

const OBJECT_NAMES: Record<ObjectType, string[]> = {
  crane: ['Кран шаровой', 'Кран запорный', 'Кран подвесной', 'Задвижка'],
  compressor: [
    'Турбокомпрессор ТВ-80',
    'Компрессорная станция',
    'Нагнетатель ГПА',
  ],
  pipeline_section: [
    'Участок трубопровода',
    'Переход подводный',
    'Переход надземный',
    'Узел запуска СОД',
  ],
};

const DEFECT_DESCRIPTIONS: Record<Method, string[]> = {
  VIK: [
    'Коррозия поверхности',
    'Механическое повреждение',
    'Трещина сварного шва',
  ],
  PVK: [
    'Подповерхностная трещина',
    'Расслоение металла',
    'Несплошность сварки',
  ],
  MPK: ['Магнитная аномалия', 'Скопление дефектов', 'Потеря металла'],
  UZK: ['Потеря толщины стенки', 'Внутренняя коррозия', 'Язвенная коррозия'],
  RGK: ['Внутренний дефект', 'Пора в сварном шве', 'Шлаковое включение'],
  TVK: ['Термическое повреждение', 'Аномалия теплопередачи', 'Зона перегрева'],
  VIBRO: ['Повышенная вибрация', 'Дисбаланс ротора', 'Износ подшипников'],
  MFL: ['Потеря металла', 'Внешняя коррозия', 'Механическое повреждение'],
  TFI: ['Продольная трещина', 'Усталостная трещина', 'Стресс-коррозия'],
  GEO: ['Смещение оси', 'Осадка грунта', 'Деформация трубы'],
  UTWM: [
    'Критическая потеря толщины',
    'Локальная коррозия',
    'Эрозионный износ',
  ],
};

// Small dataset bounds (Karaganda area on MT-03)
const SMALL_DATASET_BOUNDS = {
  latMin: 49.80641889166585,
  latMax: 49.83156066034795,
  lonMin: 73.00416578095535,
  lonMax: 73.16278089326002,
};

// Seeded random generator
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function weightedSelect<T>(
  items: T[],
  weights: number[],
  random: () => number,
): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomDate(start: Date, end: Date, random: () => number): string {
  const timestamp =
    start.getTime() + random() * (end.getTime() - start.getTime());
  return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * Linear interpolation between two points
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Generate a random point along a pipeline path
 */
function generateRandomPointOnPath(
  path: [number, number][],
  random: () => number,
): { lat: number; lon: number } {
  // Pick a random segment
  const segmentIndex = Math.floor(random() * (path.length - 1));
  const start = path[segmentIndex];
  const end = path[segmentIndex + 1];

  // Pick a random position along the segment
  const t = random();

  // Add slight random offset perpendicular to the line (for natural look)
  const offset = (random() - 0.5) * 0.15; // Small random offset

  return {
    lat: lerp(start[0], end[0], t) + offset,
    lon: lerp(start[1], end[1], t) + offset,
  };
}

/**
 * Generate a random point within bounds (for small dataset)
 */
function generateRandomPointInBounds(
  bounds: typeof SMALL_DATASET_BOUNDS,
  random: () => number,
): { lat: number; lon: number } {
  return {
    lat: bounds.latMin + random() * (bounds.latMax - bounds.latMin),
    lon: bounds.lonMin + random() * (bounds.lonMax - bounds.lonMin),
  };
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate objects with weighted pipeline distribution
 * MT-02 gets slightly more objects than others
 */
function generateObjects(totalCount: number, seed: number = 42): ObjectRow[] {
  const random = seededRandom(seed);
  const objects: ObjectRow[] = [];

  // Pre-calculate how many objects go to each pipeline based on weights
  const pipelineWeights = PIPELINES.map((p) => p.weight);

  for (let objectId = 1; objectId <= totalCount; objectId++) {
    // Select pipeline using weights
    const pipeline = weightedSelect(PIPELINES, pipelineWeights, random);
    const route = PIPELINE_ROUTES[pipeline.id];

    // Generate random point along the pipeline
    const point = generateRandomPointOnPath(route, random);

    const objectType = weightedSelect(
      OBJECT_TYPES,
      OBJECT_TYPE_WEIGHTS,
      random,
    );
    const nameTemplates = OBJECT_NAMES[objectType];
    const baseName = nameTemplates[Math.floor(random() * nameTemplates.length)];

    objects.push({
      object_id: objectId,
      object_name: `${baseName} №${objectId}`,
      object_type: objectType,
      pipeline_id: pipeline.id,
      lat: parseFloat(point.lat.toFixed(6)),
      lon: parseFloat(point.lon.toFixed(6)),
      year: 1960 + Math.floor(random() * 64),
      material: MATERIALS[Math.floor(random() * MATERIALS.length)],
    });
  }

  return objects;
}

/**
 * Generate objects within specific bounds (for small dataset)
 */
function generateObjectsInBounds(
  totalCount: number,
  bounds: typeof SMALL_DATASET_BOUNDS,
  pipelineId: PipelineId,
  seed: number = 99,
): ObjectRow[] {
  const random = seededRandom(seed);
  const objects: ObjectRow[] = [];

  for (let objectId = 1; objectId <= totalCount; objectId++) {
    const point = generateRandomPointInBounds(bounds, random);

    const objectType = weightedSelect(
      OBJECT_TYPES,
      OBJECT_TYPE_WEIGHTS,
      random,
    );
    const nameTemplates = OBJECT_NAMES[objectType];
    const baseName = nameTemplates[Math.floor(random() * nameTemplates.length)];

    objects.push({
      object_id: objectId,
      object_name: `${baseName} №${objectId}`,
      object_type: objectType,
      pipeline_id: pipelineId,
      lat: parseFloat(point.lat.toFixed(6)),
      lon: parseFloat(point.lon.toFixed(6)),
      year: 1960 + Math.floor(random() * 64),
      material: MATERIALS[Math.floor(random() * MATERIALS.length)],
    });
  }

  return objects;
}

/**
 * Assign health categories to objects based on 30-50-20 distribution
 * @returns Map of object_id to health category
 */
function assignObjectHealthBuckets(
  objects: ObjectRow[],
  goodPct: number,
  mediumPct: number,
  random: () => number,
): Map<number, ObjectHealth> {
  const healthMap = new Map<number, ObjectHealth>();
  const shuffled = shuffleArray(objects, random);

  const goodCount = Math.round(objects.length * goodPct);
  const mediumCount = Math.round(objects.length * mediumPct);
  // Rest are bad

  shuffled.forEach((obj, index) => {
    if (index < goodCount) {
      healthMap.set(obj.object_id, 'good');
    } else if (index < goodCount + mediumCount) {
      healthMap.set(obj.object_id, 'medium');
    } else {
      healthMap.set(obj.object_id, 'bad');
    }
  });

  return healthMap;
}

/**
 * Generate diagnostics with controlled health distribution
 * - Some objects may have 0 diagnostics, some up to 5
 * - Object health determined by worst diagnostic
 */
function generateDiagnostics(
  objects: ObjectRow[],
  targetTotal: number,
  healthDistribution: { good: number; medium: number; bad: number },
  seed: number = 123,
): DiagnosticRow[] {
  const random = seededRandom(seed);
  const diagnostics: DiagnosticRow[] = [];
  const startDate = new Date('2020-01-01');
  const endDate = new Date('2025-12-01'); // Extended to 2025

  // Assign health buckets to objects (30% good, 50% medium, 20% bad)
  const healthMap = assignObjectHealthBuckets(
    objects,
    healthDistribution.good,
    healthDistribution.medium,
    random,
  );

  // Calculate diagnostics per object (0-5 range, some have none)
  // We need to distribute targetTotal diagnostics across objects
  const objectDiagCounts = new Map<number, number>();
  let totalAssigned = 0;

  // First pass: assign 0-5 diagnostics randomly to each object
  for (const obj of objects) {
    // 15% chance of no diagnostics
    const hasDiagnostics = random() > 0.15;
    if (!hasDiagnostics) {
      objectDiagCounts.set(obj.object_id, 0);
    } else {
      // 1-5 diagnostics
      const count = 1 + Math.floor(random() * 5);
      objectDiagCounts.set(obj.object_id, count);
      totalAssigned += count;
    }
  }

  // Adjust to hit target total
  const adjustmentFactor = targetTotal / Math.max(totalAssigned, 1);
  for (const [objId, count] of objectDiagCounts.entries()) {
    const adjusted = Math.round(count * adjustmentFactor);
    objectDiagCounts.set(objId, Math.min(adjusted, 5)); // Cap at 5
  }

  // Recalculate and add/remove to hit exact target
  let currentTotal = Array.from(objectDiagCounts.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const objectIds = shuffleArray(Array.from(objectDiagCounts.keys()), random);

  // Add diagnostics if under target
  while (currentTotal < targetTotal) {
    for (const objId of objectIds) {
      if (currentTotal >= targetTotal) break;
      const current = objectDiagCounts.get(objId) || 0;
      if (current < 5) {
        objectDiagCounts.set(objId, current + 1);
        currentTotal++;
      }
    }
  }

  // Remove diagnostics if over target
  while (currentTotal > targetTotal) {
    for (const objId of objectIds) {
      if (currentTotal <= targetTotal) break;
      const current = objectDiagCounts.get(objId) || 0;
      if (current > 0) {
        objectDiagCounts.set(objId, current - 1);
        currentTotal--;
      }
    }
  }

  let diagId = 1;

  for (const obj of objects) {
    const numDiag = objectDiagCounts.get(obj.object_id) || 0;
    if (numDiag === 0) continue;

    const objectHealth = healthMap.get(obj.object_id) || 'good';

    // For medium/bad objects, ensure at least one diagnostic has the required severity
    let hasRequiredSeverity = false;

    for (let i = 0; i < numDiag; i++) {
      const method = METHODS[Math.floor(random() * METHODS.length)];

      let param1: number | undefined;
      let param2: number | undefined;

      switch (method) {
        case 'UZK':
          param1 = parseFloat((5 + random() * 15).toFixed(2));
          param2 = parseFloat((random() * 5).toFixed(2));
          break;
        case 'VIBRO':
          param1 = parseFloat((random() * 20).toFixed(2));
          param2 = parseFloat((10 + random() * 500).toFixed(1));
          break;
        case 'MFL':
          param1 = parseFloat((random() * 50).toFixed(1));
          param2 = parseFloat((random() * 100).toFixed(0));
          break;
        case 'TFI':
          param1 = parseFloat((random() * 40).toFixed(1));
          break;
        default:
          if (random() > 0.5) {
            param1 = parseFloat((random() * 100).toFixed(2));
          }
      }

      let qualityGrade: QualityGrade;
      let mlLabel: MlLabel;
      let defectFound: boolean;
      let defectDescription: string;

      // Determine diagnostic severity based on object health bucket
      const isLastDiagnostic = i === numDiag - 1;
      const needsRequiredSeverity = !hasRequiredSeverity && isLastDiagnostic;

      if (objectHealth === 'bad' && (needsRequiredSeverity || random() < 0.4)) {
        // Bad object: ensure at least one high-risk diagnostic
        qualityGrade = random() > 0.5 ? 'недопустимо' : 'требует_мер';
        mlLabel = 'high';
        defectFound = true;
        defectDescription =
          DEFECT_DESCRIPTIONS[method][Math.floor(random() * 3)];
        hasRequiredSeverity = true;
      } else if (
        objectHealth === 'medium' &&
        (needsRequiredSeverity || random() < 0.5)
      ) {
        // Medium object: use "допустимо" (acceptable) - AI interprets as OK or WARNING
        // This prevents over-classification to CRITICAL
        qualityGrade = 'допустимо';
        mlLabel = 'medium';
        defectFound = random() > 0.5; // 50% chance of minor defect
        defectDescription = defectFound ? 'Незначительное отклонение' : '';
        hasRequiredSeverity = true;
      } else {
        // Good object or remaining diagnostics: normal severity only
        qualityGrade = random() > 0.3 ? 'удовлетворительно' : 'допустимо';
        mlLabel = 'normal';
        defectFound = random() < 0.05;
        defectDescription = defectFound ? 'Незначительное отклонение' : '';
      }

      diagnostics.push({
        diag_id: diagId,
        object_id: obj.object_id,
        method,
        date: randomDate(startDate, endDate, random),
        temperature: parseFloat((-20 + random() * 60).toFixed(1)),
        humidity: parseFloat((30 + random() * 60).toFixed(1)),
        illumination: parseFloat((100 + random() * 900).toFixed(0)),
        defect_found: defectFound,
        defect_description: defectDescription,
        quality_grade: qualityGrade,
        param1,
        param2,
        ml_label: mlLabel,
      });
      diagId++;
    }
  }

  return diagnostics;
}

function objectsToCsv(objects: ObjectRow[]): string {
  const headers = [
    'object_id',
    'object_name',
    'object_type',
    'pipeline_id',
    'lat',
    'lon',
    'year',
    'material',
  ];
  const rows = objects.map((obj) =>
    [
      obj.object_id,
      `"${obj.object_name}"`,
      obj.object_type,
      obj.pipeline_id,
      obj.lat,
      obj.lon,
      obj.year ?? '',
      obj.material ?? '',
    ].join(','),
  );
  return `${[headers.join(','), ...rows].join('\n')}\n`;
}

function diagnosticsToCsv(diagnostics: DiagnosticRow[]): string {
  const headers = [
    'diag_id',
    'object_id',
    'method',
    'date',
    'temperature',
    'humidity',
    'illumination',
    'defect_found',
    'defect_description',
    'quality_grade',
    'param1',
    'param2',
    'param3',
    'ml_label',
  ];
  const rows = diagnostics.map((diag) =>
    [
      diag.diag_id,
      diag.object_id,
      diag.method,
      diag.date,
      diag.temperature ?? '',
      diag.humidity ?? '',
      diag.illumination ?? '',
      diag.defect_found ? 'true' : 'false',
      `"${diag.defect_description ?? ''}"`,
      diag.quality_grade ?? '',
      diag.param1 ?? '',
      diag.param2 ?? '',
      '',
      diag.ml_label ?? '',
    ].join(','),
  );
  return `${[headers.join(','), ...rows].join('\n')}\n`;
}

/**
 * Get object health statistics based on worst diagnostic
 */
function getObjectHealthStats(
  objects: ObjectRow[],
  diagnostics: DiagnosticRow[],
): { good: number; medium: number; bad: number; noDiagnostics: number } {
  const objectWorstHealth = new Map<number, MlLabel>();

  for (const diag of diagnostics) {
    const current = objectWorstHealth.get(diag.object_id);
    const diagLabel = diag.ml_label || 'normal';

    if (!current) {
      objectWorstHealth.set(diag.object_id, diagLabel);
    } else if (
      diagLabel === 'high' ||
      (diagLabel === 'medium' && current === 'normal')
    ) {
      objectWorstHealth.set(diag.object_id, diagLabel);
    }
  }

  let good = 0,
    medium = 0,
    bad = 0,
    noDiagnostics = 0;

  for (const obj of objects) {
    const health = objectWorstHealth.get(obj.object_id);
    if (!health) {
      noDiagnostics++;
      good++; // Objects with no diagnostics count as good
    } else if (health === 'high') {
      bad++;
    } else if (health === 'medium') {
      medium++;
    } else {
      good++;
    }
  }

  return { good, medium, bad, noDiagnostics };
}

// Main execution
console.log('🚀 Generating synthetic data with controlled distribution...\n');

// Configuration for main dataset
const TOTAL_OBJECTS = 80;
const TOTAL_DIAGNOSTICS = 200;
const HEALTH_DISTRIBUTION = { good: 0.3, medium: 0.5, bad: 0.2 };

// Configuration for small dataset
const SMALL_OBJECTS = 10;
const SMALL_DIAGNOSTICS = 25;

console.log(`📍 Pipeline routes defined:`);
for (const pipeline of PIPELINES) {
  const route = PIPELINE_ROUTES[pipeline.id];
  console.log(
    `   ${pipeline.id}: ${pipeline.name} (${route.length} waypoints, weight: ${(pipeline.weight * 100).toFixed(0)}%)`,
  );
}

console.log(
  `\n📊 Generating ${TOTAL_OBJECTS} objects with weighted pipeline distribution...`,
);
const objects = generateObjects(TOTAL_OBJECTS);

// Count per pipeline
const perPipeline: Record<string, number> = {};
for (const obj of objects) {
  perPipeline[obj.pipeline_id] = (perPipeline[obj.pipeline_id] || 0) + 1;
}
console.log(`   ✅ Generated ${objects.length} objects`);
console.log(
  `   📊 Distribution: ${Object.entries(perPipeline)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')}`,
);

console.log(
  `\n🔍 Generating ${TOTAL_DIAGNOSTICS} diagnostics with 30-50-20 health distribution...`,
);
const diagnostics = generateDiagnostics(
  objects,
  TOTAL_DIAGNOSTICS,
  HEALTH_DISTRIBUTION,
);
console.log(`   ✅ Generated ${diagnostics.length} diagnostic records`);

// Count risk levels
const highRisk = diagnostics.filter((d) => d.ml_label === 'high').length;
const mediumRisk = diagnostics.filter((d) => d.ml_label === 'medium').length;
const normalRisk = diagnostics.filter((d) => d.ml_label === 'normal').length;
console.log(
  `   📈 Diagnostic risk levels: High=${highRisk}, Medium=${mediumRisk}, Normal=${normalRisk}`,
);

// Object health statistics
const healthStats = getObjectHealthStats(objects, diagnostics);
console.log(
  `   🏥 Object health: Good=${healthStats.good} (${((healthStats.good / objects.length) * 100).toFixed(0)}%), Medium=${healthStats.medium} (${((healthStats.medium / objects.length) * 100).toFixed(0)}%), Bad=${healthStats.bad} (${((healthStats.bad / objects.length) * 100).toFixed(0)}%)`,
);
console.log(`   📋 Objects with no diagnostics: ${healthStats.noDiagnostics}`);

// Date range check
const dates = diagnostics.map((d) => new Date(d.date).getFullYear());
const minYear = Math.min(...dates);
const maxYear = Math.max(...dates);
console.log(`   📅 Date range: ${minYear}-${maxYear}`);

// Write to files
const projectRoot = process.cwd();
const objectsPath = join(projectRoot, 'Objects.csv');
const diagnosticsPath = join(projectRoot, 'Diagnostics.csv');
const smallObjectsPath = join(projectRoot, 'small_objects.csv');
const smallDiagnosticsPath = join(projectRoot, 'small_diagnostics.csv');

console.log(`\n💾 Writing CSV files...`);
writeFileSync(objectsPath, objectsToCsv(objects), 'utf-8');
console.log(`   ✅ ${objectsPath}`);

writeFileSync(diagnosticsPath, diagnosticsToCsv(diagnostics), 'utf-8');
console.log(`   ✅ ${diagnosticsPath}`);

// Small dataset for Karaganda area (specific bounds on MT-03)
console.log(`\n📦 Generating small dataset for Karaganda area...`);
console.log(
  `   📍 Bounds: lat ${SMALL_DATASET_BOUNDS.latMin.toFixed(4)}-${SMALL_DATASET_BOUNDS.latMax.toFixed(4)}, lon ${SMALL_DATASET_BOUNDS.lonMin.toFixed(4)}-${SMALL_DATASET_BOUNDS.lonMax.toFixed(4)}`,
);

const smallObjects = generateObjectsInBounds(
  SMALL_OBJECTS,
  SMALL_DATASET_BOUNDS,
  'MT-03',
  99,
);
const smallDiagnostics = generateDiagnostics(
  smallObjects,
  SMALL_DIAGNOSTICS,
  HEALTH_DISTRIBUTION, // Same 30-50-20 distribution
  456,
);

// Renumber small diagnostics to have contiguous IDs
const renumberedSmallDiagnostics = smallDiagnostics.map((diag, idx) => ({
  ...diag,
  diag_id: idx + 1,
}));

writeFileSync(smallObjectsPath, objectsToCsv(smallObjects), 'utf-8');
console.log(`   ✅ ${smallObjectsPath} (${smallObjects.length} objects)`);

writeFileSync(
  smallDiagnosticsPath,
  diagnosticsToCsv(renumberedSmallDiagnostics),
  'utf-8',
);
console.log(
  `   ✅ ${smallDiagnosticsPath} (${renumberedSmallDiagnostics.length} diagnostics)`,
);

// Small dataset health stats
const smallHealthStats = getObjectHealthStats(
  smallObjects,
  renumberedSmallDiagnostics,
);
console.log(
  `   🏥 Small dataset health: Good=${smallHealthStats.good}, Medium=${smallHealthStats.medium}, Bad=${smallHealthStats.bad}`,
);

console.log(`\n🎉 Done! Files are ready for import.`);
