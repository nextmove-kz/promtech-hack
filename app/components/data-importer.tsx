"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDataImport } from "@/app/hooks/use-data-import";

export function DataImporter({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  const { state, isWorking, progress, onDrop, abort } = useDataImport({
    onComplete: () => setOpen(false),
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 2,
    disabled: isWorking,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`gap-2 ${className ?? ""}`}>
          <Upload className="h-4 w-4" />
          Импорт
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Импорт данных</DialogTitle>
          <DialogDescription>
            Загрузите CSV-файлы с объектами и/или диагностиками
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"}
            ${isWorking ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
              <Upload className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-600">
              {isDragActive ? "Отпустите файлы..." : "Перетащите CSV-файлы сюда"}
            </p>
            <p className="text-xs text-zinc-400">или нажмите для выбора (макс. 2 файла)</p>
          </div>
        </div>

        {/* Progress */}
        {isWorking && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">
                {state.phase === "parsing" ? "Чтение файлов..." : "Загрузка..."}
              </span>
              <span className="text-zinc-500">
                {state.processed} / {state.total}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {state.errors > 0 && (
              <p className="text-xs text-amber-600">Ошибок: {state.errors}</p>
            )}
          </div>
        )}

        {/* Cancel button */}
        {isWorking && (
          <Button variant="outline" size="sm" className="w-full" onClick={abort}>
            Отменить
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
