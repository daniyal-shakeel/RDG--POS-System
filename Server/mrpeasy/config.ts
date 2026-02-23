const getEnv = (key: string, fallback: string): string => {
  const value = process.env[key]?.trim();
  if (value !== undefined && value !== '') return value;
  return process.env.NODE_ENV === 'production' ? '' : fallback;
};

const getBool = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key]?.trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
};

export const mrpeasyConfig = {
  isEnabled: (): boolean => process.env.MRPEASY_ENABLED?.toLowerCase() === 'true',
  isMockMode: (): boolean => getBool('MRPEASY_USE_MOCK', true),

  get baseUrl(): string {
    return getEnv('MRPEASY_BASE_URL', 'https://app.mrpeasy.com/rest/v1');
  },

  get apiKey(): string {
    return getEnv('MRPEASY_API_KEY', 'dummy-api-key-dev');
  },

  get accessKey(): string {
    return getEnv('MRPEASY_ACCESS_KEY', 'dummy-access-key-dev');
  },

  hasRealCredentials(): boolean {
    return Boolean(this.baseUrl && this.apiKey && this.accessKey);
  },

  get timeoutMs(): number {
    const raw = process.env.MRPEASY_TIMEOUT_MS?.trim();
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return 10000;
  },
};
