export class MrpeasyError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode: number = 500,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'MrpeasyError';
    Object.setPrototypeOf(this, MrpeasyError.prototype);
  }
}

export const ErrorCodes = {
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  NEGATIVE_STOCK: 'NEGATIVE_STOCK',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  MODULE_DISABLED: 'MODULE_DISABLED',
} as const;

export function toStatusCode(error: unknown): number {
  if (error instanceof MrpeasyError) return error.statusCode;
  const err = error as { statusCode?: number };
  if (typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    return err.statusCode;
  }
  return 500;
}

export function toSafeMessage(error: unknown): string {
  if (error instanceof MrpeasyError) return error.message;
  if (error instanceof Error) return 'An error occurred';
  return 'An error occurred';
}

export function toErrorCode(error: unknown): string | undefined {
  if (error instanceof MrpeasyError) return error.code;
  return undefined;
}
