# MRPeasy Inventory Module

Isolated, feature-flagged module for MRPeasy inventory integration. It can be disabled without affecting the rest of the backend.

## Environment configuration example

Create or extend your `.env` (or `.env.example` for documentation) with:

```env
# MRPeasy (optional module)
MRPEASY_ENABLED=false
MRPEASY_USE_MOCK=true
MRPEASY_BASE_URL=https://app.mrpeasy.com/rest/v1
MRPEASY_API_KEY=your-api-key-here
MRPEASY_ACCESS_KEY=your-access-key-here
# Optional: MRPEASY_TIMEOUT_MS=10000
```

## Environment variables

| Variable | Description | Default (non-production) |
|----------|-------------|---------------------------|
| `MRPEASY_ENABLED` | Set to `true` to enable the module | `false` |
| `MRPEASY_USE_MOCK` | Force mock mode (no real API calls) | `true` |
| `MRPEASY_BASE_URL` | MRPeasy API base URL | `https://app.mrpeasy.com/rest/v1` |
| `MRPEASY_API_KEY` | API key for MRPeasy | `dummy-api-key-dev` |
| `MRPEASY_ACCESS_KEY` | Access key/secret for MRPeasy | `dummy-access-key-dev` |
| `MRPEASY_TIMEOUT_MS` | HTTP timeout in milliseconds | `10000` |

- In real mode, requests send both headers required by MRPeasy examples: `api_key` and `access_key`.
- **No credentials are hardcoded.** All values come from `process.env`.

## Dummy vs real credentials

- **Development:** Keep `MRPEASY_USE_MOCK=true`; module uses in-memory mock data.
- **Real API mode:** Set `MRPEASY_USE_MOCK=false` and provide `MRPEASY_BASE_URL`, `MRPEASY_API_KEY`, `MRPEASY_ACCESS_KEY`.
- If real mode is selected but required credentials are missing, MRPeasy routes return `503` config error (no mock fallback).

## Switching to real credentials later

1. Set `MRPEASY_ENABLED=true`.
2. Set `MRPEASY_USE_MOCK=false`.
3. Set `MRPEASY_BASE_URL`, `MRPEASY_API_KEY`, and `MRPEASY_ACCESS_KEY`.
4. Keep the same internal routes; only upstream endpoint mapping may need fine-tuning to match your MRPeasy account docs.

## Internal API (when enabled)

Base path: `GET /api/v1/mrpeasy`

- `GET /inventory` – list inventory (query: `limit`, `offset`)
- `GET /inventory/low-stock` – list items below threshold (query: `threshold`)
- `GET /inventory/:sku` – get one item by SKU
- `PATCH /inventory/:sku` – partial update (e.g. quantity, reorderPoint)
- `POST /inventory/adjust` – body: `{ sku, quantityDelta, reason? }`

All routes require authentication and permission `mrpeasy.view`; PATCH and POST also require `mrpeasy.manage`.

## Disabling or removing

- **Disable:** Set `MRPEASY_ENABLED=false` and restart. Requests to `/api/v1/mrpeasy` return 503.
- **Remove:** Delete the `Server/mrpeasy/` folder and remove the MRPeasy import and mount block from `app.ts`.
