/**
 * Script to generate synthetic Objects and Diagnostics CSV files
 * Run with: bun run scripts/generate-data.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";

// Import generator utils
import { PIPELINE_ROUTES, type PipelineId } from "../lib/generator-utils";

// Types
type ObjectType = "crane" | "compressor" | "pipeline_section";
type Method = "VIK" | "PVK" | "MPK" | "UZK" | "RGK" | "TVK" | "VIBRO" | "MFL" | "TFI" | "GEO" | "UTWM";
type QualityGrade = "удовлетворительно" | "допустимо" | "требует_мер" | "недопустимо";
type MlLabel = "normal" | "medium" | "high";

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

// Pipeline definitions
const PIPELINES: { id: PipelineId; name: string }[] = [
  { id: "MT-01", name: "Магистраль Атырау-Актобе-Костанай" },
  { id: "MT-02", name: "Магистраль Актау-Атырау-Астана" },
  { id: "MT-03", name: "Магистраль Алматы-Караганда-Астана" },
];

const OBJECT_TYPES: ObjectType[] = ["crane", "compressor", "pipeline_section"];
const OBJECT_TYPE_WEIGHTS = [0.3, 0.15, 0.55];
const METHODS: Method[] = ["VIK", "PVK", "MPK", "UZK", "RGK", "TVK", "VIBRO", "MFL", "TFI", "GEO", "UTWM"];
const MATERIALS = ["Ст3", "09Г2С", "17Г1С", "13ХФА", "20А", "10Г2"];

const OBJECT_NAMES: Record<ObjectType, string[]> = {
  crane: ["Кран шаровой", "Кран запорный", "Кран подвесной", "Задвижка"],
  compressor: ["Турбокомпрессор ТВ-80", "Компрессорная станция", "Нагнетатель ГПА"],
  pipeline_section: ["Участок трубопровода", "Переход подводный", "Переход надземный", "Узел запуска СОД"],
};

const DEFECT_DESCRIPTIONS: Record<Method, string[]> = {
  VIK: ["Коррозия поверхности", "Механическое повреждение", "Трещина сварного шва"],
  PVK: ["Подповерхностная трещина", "Расслоение металла", "Несплошность сварки"],
  MPK: ["Магнитная аномалия", "Скопление дефектов", "Потеря металла"],
  UZK: ["Потеря толщины стенки", "Внутренняя коррозия", "Язвенная коррозия"],
  RGK: ["Внутренний дефект", "Пора в сварном шве", "Шлаковое включение"],
  TVK: ["Термическое повреждение", "Аномалия теплопередачи", "Зона перегрева"],
  VIBRO: ["Повышенная вибрация", "Дисбаланс ротора", "Износ подшипников"],
  MFL: ["Потеря металла", "Внешняя коррозия", "Механическое повреждение"],
  TFI: ["Продольная трещина", "Усталостная трещина", "Стресс-коррозия"],
  GEO: ["Смещение оси", "Осадка грунта", "Деформация трубы"],
  UTWM: ["Критическая потеря толщины", "Локальная коррозия", "Эрозионный износ"],
};

// Seeded random generator
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function weightedSelect<T>(items: T[], weights: number[], random: () => number): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomDate(start: Date, end: Date, random: () => number): string {
  const timestamp = start.getTime() + random() * (end.getTime() - start.getTime());
  return new Date(timestamp).toISOString().split("T")[0];
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
  random: () => number
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

function generateObjects(totalCount: number, seed: number = 42): ObjectRow[] {
  const random = seededRandom(seed);
  const objects: ObjectRow[] = [];
  
  for (let objectId = 1; objectId <= totalCount; objectId++) {
    // Randomly pick a pipeline
    const pipeline = PIPELINES[Math.floor(random() * PIPELINES.length)];
    const route = PIPELINE_ROUTES[pipeline.id];
    
    // Generate random point along the pipeline
    const point = generateRandomPointOnPath(route, random);
    
    const objectType = weightedSelect(OBJECT_TYPES, OBJECT_TYPE_WEIGHTS, random);
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

function generateDiagnostics(
  objects: ObjectRow[],
  avgPerObject: number = 5,
  highRiskPct: number = 0.10,
  seed: number = 123
): DiagnosticRow[] {
  const random = seededRandom(seed);
  const diagnostics: DiagnosticRow[] = [];
  const startDate = new Date("2020-01-01");
  const endDate = new Date("2024-12-01");
  let diagId = 1;

  for (const obj of objects) {
    const numDiag = Math.max(1, Math.floor(avgPerObject * (0.5 + random())));
    
    for (let i = 0; i < numDiag; i++) {
      const isHighRisk = random() < highRiskPct;
      const method = METHODS[Math.floor(random() * METHODS.length)];
      
      let param1: number | undefined;
      let param2: number | undefined;
      
      switch (method) {
        case "UZK":
          param1 = parseFloat((5 + random() * 15).toFixed(2));
          param2 = parseFloat((random() * 5).toFixed(2));
          break;
        case "VIBRO":
          param1 = parseFloat((random() * 20).toFixed(2));
          param2 = parseFloat((10 + random() * 500).toFixed(1));
          break;
        case "MFL":
          param1 = parseFloat((random() * 50).toFixed(1));
          param2 = parseFloat((random() * 100).toFixed(0));
          break;
        case "TFI":
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
      
      if (isHighRisk) {
        qualityGrade = random() > 0.5 ? "недопустимо" : "требует_мер";
        mlLabel = "high";
        defectFound = true;
        defectDescription = DEFECT_DESCRIPTIONS[method][Math.floor(random() * 3)];
      } else if (random() < 0.2) {
        qualityGrade = "требует_мер";
        mlLabel = "medium";
        defectFound = random() > 0.3;
        defectDescription = defectFound ? DEFECT_DESCRIPTIONS[method][Math.floor(random() * 3)] : "";
      } else {
        qualityGrade = random() > 0.3 ? "удовлетворительно" : "допустимо";
        mlLabel = "normal";
        defectFound = random() < 0.05;
        defectDescription = defectFound ? "Незначительное отклонение" : "";
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
  const headers = ["object_id", "object_name", "object_type", "pipeline_id", "lat", "lon", "year", "material"];
  const rows = objects.map((obj) => [
    obj.object_id,
    `"${obj.object_name}"`,
    obj.object_type,
    obj.pipeline_id,
    obj.lat,
    obj.lon,
    obj.year ?? "",
    obj.material ?? "",
  ].join(","));
  return [headers.join(","), ...rows].join("\n");
}

function diagnosticsToCsv(diagnostics: DiagnosticRow[]): string {
  const headers = [
    "diag_id", "object_id", "method", "date", "temperature", "humidity", 
    "illumination", "defect_found", "defect_description", "quality_grade",
    "param1", "param2", "param3", "ml_label"
  ];
  const rows = diagnostics.map((diag) => [
    diag.diag_id,
    diag.object_id,
    diag.method,
    diag.date,
    diag.temperature ?? "",
    diag.humidity ?? "",
    diag.illumination ?? "",
    diag.defect_found ? "true" : "false",
    `"${diag.defect_description ?? ""}"`,
    diag.quality_grade ?? "",
    diag.param1 ?? "",
    diag.param2 ?? "",
    "",
    diag.ml_label ?? "",
  ].join(","));
  return [headers.join(","), ...rows].join("\n");
}

// Main execution
console.log("🚀 Generating synthetic data with random distribution...\n");

const TOTAL_OBJECTS = 200;
const AVG_DIAGNOSTICS_PER_OBJECT = 4;
const HIGH_RISK_PERCENTAGE = 0.12;

console.log(`📍 Pipeline routes defined:`);
for (const pipeline of PIPELINES) {
  const route = PIPELINE_ROUTES[pipeline.id];
  console.log(`   ${pipeline.id}: ${pipeline.name} (${route.length} waypoints)`);
}

console.log(`\n📊 Generating ${TOTAL_OBJECTS} objects randomly across all pipelines...`);
const objects = generateObjects(TOTAL_OBJECTS);

// Count per pipeline
const perPipeline: Record<string, number> = {};
for (const obj of objects) {
  perPipeline[obj.pipeline_id] = (perPipeline[obj.pipeline_id] || 0) + 1;
}
console.log(`   ✅ Generated ${objects.length} objects`);
console.log(`   📊 Distribution: ${Object.entries(perPipeline).map(([k, v]) => `${k}=${v}`).join(", ")}`);

console.log(`\n🔍 Generating diagnostics (~${AVG_DIAGNOSTICS_PER_OBJECT} per object)...`);
const diagnostics = generateDiagnostics(objects, AVG_DIAGNOSTICS_PER_OBJECT, HIGH_RISK_PERCENTAGE);
console.log(`   ✅ Generated ${diagnostics.length} diagnostic records`);

// Count risk levels
const highRisk = diagnostics.filter(d => d.ml_label === "high").length;
const mediumRisk = diagnostics.filter(d => d.ml_label === "medium").length;
const normalRisk = diagnostics.filter(d => d.ml_label === "normal").length;
console.log(`   📈 Risk distribution: High=${highRisk}, Medium=${mediumRisk}, Normal=${normalRisk}`);

// Write to files
const projectRoot = process.cwd();
const objectsPath = join(projectRoot, "Objects.csv");
const diagnosticsPath = join(projectRoot, "Diagnostics.csv");

console.log(`\n💾 Writing CSV files...`);
writeFileSync(objectsPath, objectsToCsv(objects), "utf-8");
console.log(`   ✅ ${objectsPath}`);

writeFileSync(diagnosticsPath, diagnosticsToCsv(diagnostics), "utf-8");
console.log(`   ✅ ${diagnosticsPath}`);

console.log(`\n🎉 Done! Files are ready for import.`);
