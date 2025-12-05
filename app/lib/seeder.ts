import type { ObjectRow, DiagnosticRow, ObjectType, Method, QualityGrade, MlLabel } from "./schemas";

// Pipeline definitions
const PIPELINES = [
  { id: "MT-01", name: "Магистраль Атырау-Самара" },
  { id: "MT-02", name: "Магистраль Актау-Актобе" },
  { id: "MT-03", name: "Магистраль Павлодар-Шымкент" },
] as const;

// Object types distribution
const OBJECT_TYPES: ObjectType[] = ["crane", "compressor", "pipeline_section"];
const OBJECT_TYPE_WEIGHTS = [0.3, 0.15, 0.55]; // 30% cranes, 15% compressors, 55% pipeline sections

// Diagnostic methods
const METHODS: Method[] = ["VIK", "PVK", "MPK", "UZK", "RGK", "TVK", "VIBRO", "MFL", "TFI", "GEO", "UTWM"];

// Quality grades
const QUALITY_GRADES: QualityGrade[] = ["удовлетворительно", "допустимо", "требует_мер", "недопустимо"];

// ML labels
const ML_LABELS: MlLabel[] = ["normal", "medium", "high"];

// Materials
const MATERIALS = ["Ст3", "09Г2С", "17Г1С", "13ХФА", "20А", "10Г2"];

// Object name templates
const OBJECT_NAMES: Record<ObjectType, string[]> = {
  crane: ["Кран шаровой", "Кран запорный", "Кран подвесной", "Задвижка"],
  compressor: ["Турбокомпрессор ТВ-80", "Компрессорная станция", "Нагнетатель ГПА"],
  pipeline_section: ["Участок трубопровода", "Переход подводный", "Переход надземный", "Узел запуска СОД"],
};

/**
 * Generates a pseudo-random number based on seed
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generates snake-like coordinates for a pipeline route across Kazakhstan
 * @param startLat Starting latitude
 * @param startLon Starting longitude
 * @param endLat Ending latitude
 * @param endLon Ending longitude
 * @param numPoints Number of points to generate
 * @param seed Random seed for reproducibility
 */
function generatePipelineRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  numPoints: number,
  seed: number
): { lat: number; lon: number }[] {
  const random = seededRandom(seed);
  const points: { lat: number; lon: number }[] = [];

  // Create main path with some meandering
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    
    // Base linear interpolation
    let lat = startLat + (endLat - startLat) * t;
    let lon = startLon + (endLon - startLon) * t;
    
    // Add sinusoidal variation for snake-like path
    const waveAmplitude = 0.5;
    const waveFrequency = 4;
    lat += Math.sin(t * Math.PI * waveFrequency) * waveAmplitude;
    lon += Math.cos(t * Math.PI * waveFrequency * 0.7) * waveAmplitude * 0.5;
    
    // Add small random noise
    lat += (random() - 0.5) * 0.1;
    lon += (random() - 0.5) * 0.1;
    
    // Clamp to Kazakhstan bounds
    lat = Math.max(43, Math.min(52, lat));
    lon = Math.max(50, Math.min(80, lon));
    
    points.push({ lat: parseFloat(lat.toFixed(4)), lon: parseFloat(lon.toFixed(4)) });
  }

  return points;
}

/**
 * Selects an item based on weighted probabilities
 */
function weightedSelect<T>(items: T[], weights: number[], random: () => number): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  
  return items[items.length - 1];
}

/**
 * Generates a random date between start and end
 */
function randomDate(start: Date, end: Date, random: () => number): string {
  const timestamp = start.getTime() + random() * (end.getTime() - start.getTime());
  return new Date(timestamp).toISOString().split("T")[0];
}

/**
 * Generates synthetic objects data
 * @param count Number of objects to generate (default: ~1000)
 * @param seed Random seed for reproducibility
 */
export function generateObjects(count: number = 1000, seed: number = 42): ObjectRow[] {
  const random = seededRandom(seed);
  const objects: ObjectRow[] = [];
  
  // Generate pipeline routes
  const routes = [
    // MT-01: Western Kazakhstan (Atyrau to Samara direction)
    generatePipelineRoute(46.8, 51.8, 49.5, 56.0, Math.ceil(count / 3), seed + 1),
    // MT-02: Western to Central (Aktau to Aktobe)
    generatePipelineRoute(43.6, 51.2, 50.3, 57.2, Math.ceil(count / 3), seed + 2),
    // MT-03: Eastern route (Pavlodar to Shymkent)
    generatePipelineRoute(52.3, 76.9, 42.3, 69.6, Math.ceil(count / 3), seed + 3),
  ];

  let objectId = 1;

  routes.forEach((route, pipelineIdx) => {
    const pipeline = PIPELINES[pipelineIdx];
    
    route.forEach((point) => {
      const objectType = weightedSelect(OBJECT_TYPES, OBJECT_TYPE_WEIGHTS, random);
      const nameTemplates = OBJECT_NAMES[objectType];
      const baseName = nameTemplates[Math.floor(random() * nameTemplates.length)];
      
      objects.push({
        object_id: objectId,
        object_name: `${baseName} №${objectId}`,
        object_type: objectType,
        pipeline_id: pipeline.id,
        lat: point.lat,
        lon: point.lon,
        year: 1960 + Math.floor(random() * 64), // 1960-2024
        material: MATERIALS[Math.floor(random() * MATERIALS.length)],
      });
      
      objectId++;
    });
  });

  return objects;
}

/**
 * Generates synthetic diagnostics data
 * @param objects Array of objects to generate diagnostics for
 * @param avgDiagnosticsPerObject Average number of diagnostics per object
 * @param highRiskPercentage Percentage of diagnostics that should be high risk (default: 10%)
 * @param seed Random seed for reproducibility
 */
export function generateDiagnostics(
  objects: ObjectRow[],
  avgDiagnosticsPerObject: number = 5,
  highRiskPercentage: number = 0.10,
  seed: number = 123
): DiagnosticRow[] {
  const random = seededRandom(seed);
  const diagnostics: DiagnosticRow[] = [];
  
  const startDate = new Date("2020-01-01");
  const endDate = new Date("2024-12-01");
  
  let diagId = 1;

  objects.forEach((obj) => {
    // Vary the number of diagnostics per object
    const numDiagnostics = Math.max(1, Math.floor(avgDiagnosticsPerObject * (0.5 + random())));
    
    for (let i = 0; i < numDiagnostics; i++) {
      const isHighRisk = random() < highRiskPercentage;
      const method = METHODS[Math.floor(random() * METHODS.length)];
      
      // Generate realistic parameters based on method
      let param1: number | undefined;
      let param2: number | undefined;
      let param3: number | undefined;
      
      switch (method) {
        case "UZK": // Ultrasonic - wall thickness
          param1 = parseFloat((5 + random() * 15).toFixed(2)); // thickness mm
          param2 = parseFloat((random() * 5).toFixed(2)); // corrosion depth
          break;
        case "VIBRO": // Vibration
          param1 = parseFloat((random() * 20).toFixed(2)); // vibration speed mm/s
          param2 = parseFloat((10 + random() * 500).toFixed(1)); // frequency Hz
          break;
        case "MFL": // Magnetic flux leakage
          param1 = parseFloat((random() * 50).toFixed(1)); // signal amplitude %
          param2 = parseFloat((random() * 100).toFixed(0)); // defect length mm
          break;
        case "TFI": // Transverse field inspection
          param1 = parseFloat((random() * 40).toFixed(1)); // crack depth %
          break;
        default:
          if (random() > 0.5) {
            param1 = parseFloat((random() * 100).toFixed(2));
          }
      }
      
      // Determine quality grade and ml_label based on risk
      let qualityGrade: QualityGrade;
      let mlLabel: MlLabel;
      let defectFound: boolean;
      let defectDescription: string;
      
      if (isHighRisk) {
        // High risk - intentional defects for testing
        qualityGrade = random() > 0.5 ? "недопустимо" : "требует_мер";
        mlLabel = "high";
        defectFound = true;
        defectDescription = getDefectDescription(method, random);
      } else if (random() < 0.2) {
        // Medium risk
        qualityGrade = "требует_мер";
        mlLabel = "medium";
        defectFound = random() > 0.3;
        defectDescription = defectFound ? getDefectDescription(method, random) : "";
      } else {
        // Normal
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
        temperature: parseFloat((-20 + random() * 60).toFixed(1)), // -20 to 40 C
        humidity: parseFloat((30 + random() * 60).toFixed(1)), // 30-90%
        illumination: parseFloat((100 + random() * 900).toFixed(0)), // 100-1000 lux
        defect_found: defectFound,
        defect_description: defectDescription,
        quality_grade: qualityGrade,
        param1,
        param2,
        param3,
        ml_label: mlLabel,
      });
      
      diagId++;
    }
  });

  return diagnostics;
}

/**
 * Generates a defect description based on the diagnostic method
 */
function getDefectDescription(method: Method, random: () => number): string {
  const descriptions: Record<Method, string[]> = {
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
  
  const options = descriptions[method];
  return options[Math.floor(random() * options.length)];
}

/**
 * Converts objects array to CSV string
 */
export function objectsToCsv(objects: ObjectRow[]): string {
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

/**
 * Converts diagnostics array to CSV string
 */
export function diagnosticsToCsv(diagnostics: DiagnosticRow[]): string {
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
    diag.param3 ?? "",
    diag.ml_label ?? "",
  ].join(","));
  
  return [headers.join(","), ...rows].join("\n");
}

/**
 * Generates both objects and diagnostics CSVs as Blobs
 */
export function generateSyntheticData(
  objectCount: number = 1000,
  avgDiagnosticsPerObject: number = 5,
  highRiskPercentage: number = 0.10
): { objectsBlob: Blob; diagnosticsBlob: Blob; objectsCsv: string; diagnosticsCsv: string } {
  const objects = generateObjects(objectCount);
  const diagnostics = generateDiagnostics(objects, avgDiagnosticsPerObject, highRiskPercentage);
  
  const objectsCsv = objectsToCsv(objects);
  const diagnosticsCsv = diagnosticsToCsv(diagnostics);
  
  return {
    objectsBlob: new Blob([objectsCsv], { type: "text/csv" }),
    diagnosticsBlob: new Blob([diagnosticsCsv], { type: "text/csv" }),
    objectsCsv,
    diagnosticsCsv,
  };
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads synthetic data files
 */
export function downloadSyntheticData(
  objectCount: number = 1000,
  avgDiagnosticsPerObject: number = 5
): void {
  const { objectsBlob, diagnosticsBlob } = generateSyntheticData(objectCount, avgDiagnosticsPerObject);
  
  downloadBlob(objectsBlob, "Objects.csv");
  setTimeout(() => {
    downloadBlob(diagnosticsBlob, "Diagnostics.csv");
  }, 100);
}

