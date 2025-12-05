import { DataImporter } from "@/app/components/data-importer";

export default function ImportPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="text-center space-y-4">
        <h1 className="text-xl font-semibold">Тестирование импорта</h1>
        <DataImporter />
        <p className="text-xs text-zinc-500">
          Поддерживаются Objects.csv и Diagnostics.csv
        </p>
      </div>
    </div>
  );
}

