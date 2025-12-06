export const OBJECT_TYPE_LABELS = {
  crane: "Кран",
  compressor: "Компрессор",
  pipeline_section: "Участок трубопровода",
} as const;

export type ObjectTypeKey = keyof typeof OBJECT_TYPE_LABELS;

export const getObjectTypeLabel = (type?: string) => {
  const key = (type ?? "") as ObjectTypeKey;
  return OBJECT_TYPE_LABELS[key] ?? type ?? "Неизвестный тип";
};

