import type {
  DiagnosticsResponse,
  ObjectsResponse,
  PipelinesResponse,
} from '@/app/api/api_types';

export type DiagnosticWithObject = DiagnosticsResponse<{
  object?: ObjectsResponse<{
    pipeline?: PipelinesResponse;
  }>;
}>;
