import type { ReactNode } from 'react';

const hasValue = (value?: number | string | null) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value);
  if (typeof value === 'string')
    return value.trim() !== '' && value.trim() !== '0';
  return true;
};

export const renderDiagnosticParams = (
  method?: string,
  p1?: number | string,
  p2?: number | string,
  p3?: number | string,
): ReactNode => {
  const v1 = hasValue(p1);
  const v2 = hasValue(p2);
  const v3 = hasValue(p3);
  const hasAny = v1 || v2 || v3;

  if (!hasAny) return null;

  switch (method) {
    case 'VIBRO':
      return (
        <>
          {v1 && (
            <div>
              Виброскорость: <b>{p1} мм/с</b>
            </div>
          )}
          {v2 && <div>Ускорение: {p2} м/с²</div>}
          {v3 && <div>Частота/Температура: {p3}</div>}
        </>
      );
    case 'MFL':
    case 'UTWM':
      return (
        <>
          {v1 && (
            <div>
              Глубина коррозии: <b className="text-red-500">{p1} мм</b>
            </div>
          )}
          {v2 && <div>Остаток стенки: {p2} мм</div>}
          {v3 && <div>Длина дефекта: {p3} мм</div>}
        </>
      );
    case 'TVK':
      // TVK параметры без названий не показываем
      return null;
    default:
      if (v1 && v2) {
        return (
          <div>
            Размеры (ДхШ): {p1} x {p2} мм
          </div>
        );
      }

      return null;
  }
};
