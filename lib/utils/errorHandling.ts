export class ApiError extends Error {
  constructor(public context: string, message: string) {
    super(`[${context}] ${message}`);
    this.name = "ApiError";
  }
}

export function handleApiError(error: unknown, context: string): ApiError {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  const apiError = new ApiError(context, message);
  console.error(apiError);
  return apiError;
}

