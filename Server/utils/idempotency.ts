import { Request, Response, NextFunction } from 'express';

const TTL_MS = 2 * 60 * 1000; // 2 minutes
const store = new Map<string, number>();

function cleanup(): void {
  const now = Date.now();
  for (const [key, ts] of store.entries()) {
    if (now - ts > TTL_MS) store.delete(key);
  }
}
setInterval(cleanup, 60 * 1000);

/**
 * Rejects duplicate requests when X-Idempotency-Key is present and was already
 * used recently. Use for POST/PUT that create or update resources.
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-idempotency-key'];
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return next();
  }
  const trimmed = key.trim();
  const now = Date.now();
  const seen = store.get(trimmed);
  if (seen !== undefined && now - seen < TTL_MS) {
    res.status(409).json({
      status: 'error',
      message: 'Duplicate submission. Please wait for the previous request to complete.',
    });
    return;
  }
  store.set(trimmed, now);
  next();
}
