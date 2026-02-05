import { appendFile } from 'fs/promises';
import { resolve } from 'path';
import type { Request } from 'express';

const LOG_FILE = resolve(process.cwd(), 'request.log');

export interface RequestMeta {
  timestamp: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, unknown>;
  ip: string;
  userAgent: string;
  contentLength?: string;
  contentType?: string;
}

function getRequestMeta(req: Request): RequestMeta {
  return {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query as Record<string, unknown>,
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? '',
    userAgent: (req.headers['user-agent'] as string) ?? '',
    contentLength: req.headers['content-length'] as string | undefined,
    contentType: req.headers['content-type'] as string | undefined,
  };
}

/**
 * Logs request metadata to a single file. Async, fire-and-forget — does not block the main thread.
 */
export function logRequestAsync(req: Request): void {
  console.log("Request is logged in logRequestAsync!")
  const meta = getRequestMeta(req);
  const line = JSON.stringify(meta) + '\n';
  appendFile(LOG_FILE, line).catch((err) => {
    console.error('[requestLogger] Failed to write to request.log:', err?.message);
  });
}
