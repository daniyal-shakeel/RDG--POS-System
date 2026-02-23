const PREFIX = '[MRPeasy]';

function formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${PREFIX} ${new Date().toISOString()} ${level} ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(formatMessage('INFO', message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(formatMessage('WARN', message, meta));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(formatMessage('ERROR', message, meta));
  },

  audit(entry: {
    sku: string;
    operation: string;
    userId?: string;
    previousQty?: number;
    newQty?: number;
    delta?: number;
    reason?: string;
  }): void {
    console.log(
      formatMessage('AUDIT', 'inventory update', {
        ...entry,
        timestamp: new Date().toISOString(),
      })
    );
  },
};
