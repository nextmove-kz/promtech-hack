import type { DiagnosticWithObject } from '@/lib/types/api';
import { withDerivedUrgencyScore } from '@/lib/utils/urgency';
import clientPocketBase from './client_pb';

export type { DiagnosticWithObject } from '@/lib/types/api';

const normalizeDiagnostic = (
  record: DiagnosticWithObject,
): DiagnosticWithObject => {
  const normalizedObject = record.expand?.object
    ? withDerivedUrgencyScore(record.expand.object)
    : record.expand?.object;

  return record.expand
    ? {
        ...record,
        expand: {
          ...record.expand,
          object: normalizedObject,
        },
      }
    : record;
};

export async function getDiagnosticByObjectId(
  objectId: string,
): Promise<DiagnosticWithObject | null> {
  try {
    const record = await clientPocketBase
      .collection('diagnostics')
      .getFirstListItem<DiagnosticWithObject>(`object="${objectId}"`, {
        expand: 'object,object.pipeline',
      });

    return normalizeDiagnostic(record);
  } catch {
    return null;
  }
}

export async function getAllDiagnosticsByObjectId(
  objectId: string,
): Promise<DiagnosticWithObject[]> {
  try {
    const records = await clientPocketBase
      .collection('diagnostics')
      .getFullList<DiagnosticWithObject>({
        filter: `object="${objectId}"`,
        sort: 'date',
        expand: 'object,object.pipeline',
      });

    return records.map(normalizeDiagnostic);
  } catch {
    return [];
  }
}
