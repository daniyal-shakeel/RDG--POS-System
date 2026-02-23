# MRPeasy Inventory Module - Simple User Guide

This guide explains, in simple terms, how to use the MRPeasy inventory routes in this backend.

It is written for non-technical users who may call these routes from Postman or a frontend app.

## 1) Before you start

- Base URL (local): `http://localhost:5500`
- Module base path: `/api/v1/mrpeasy`
- Full base URL: `http://localhost:5500/api/v1/mrpeasy`

### Mode setup (important)

For this module, there are 2 modes:

- Mock mode (dummy data): `MRPEASY_USE_MOCK=true`
- Real MRPeasy mode: `MRPEASY_USE_MOCK=false`

For real MRPeasy mode, set these environment values:

- `MRPEASY_BASE_URL=https://app.mrpeasy.com/rest/v1`
- `MRPEASY_API_KEY=...`
- `MRPEASY_ACCESS_KEY=...`

If real mode is selected and credentials are missing, API returns `503` until configuration is completed.

In real mode, backend calls MRPeasy using both required headers:

- `api_key`
- `access_key`

### Access requirements

- You must be logged in and send a valid Bearer token.
- Read routes require permission: `mrpeasy.view`
- Update routes require permission: `mrpeasy.manage` (and view permission)

If the module is disabled, you will get:
- HTTP `503`
- Response:
```json
{
  "success": false,
  "error": "MRPeasy module is disabled"
}
```

## 2) Standard response format

### Success format
```json
{
  "success": true,
  "data": {}
}
```

### Error format
```json
{
  "success": false,
  "error": "Error message",
  "code": "OPTIONAL_ERROR_CODE",
  "details": {}
}
```

## 3) Route summary

| Purpose | Method | Endpoint |
|---|---|---|
| List inventory | GET | `/inventory` |
| Get one item by SKU | GET | `/inventory/:sku` |
| Get low stock items | GET | `/inventory/low-stock` |
| List shipment documents | GET | `/shipments` |
| Get one shipment by ID | GET | `/shipments/:id` |
| Update fields for one SKU | PATCH | `/inventory/:sku` |
| Adjust stock by delta (+/-) | POST | `/inventory/adjust` |

## 4) Route details

## A) List inventory

- Method: `GET`
- URL: `/api/v1/mrpeasy/inventory`
- Permission: `mrpeasy.view`

### Optional query options

- `limit` (number)
  - Minimum: `1`
  - Maximum: `200`
  - Default: `50`
- `offset` (number)
  - Minimum: `0`
  - Default: `0`

### Example call

`GET http://localhost:5500/api/v1/mrpeasy/inventory?limit=20&offset=0`

### Example success
```json
{
  "success": true,
  "data": [
    {
      "sku": "MOCK-001",
      "quantity": 10,
      "reorderPoint": 5,
      "reorderQty": 20,
      "name": "Mock Item 1",
      "updatedAt": "2026-02-19T18:00:51.088Z"
    }
  ]
}
```

## B) Get one inventory item by SKU

- Method: `GET`
- URL: `/api/v1/mrpeasy/inventory/:sku`
- Permission: `mrpeasy.view`

Replace `:sku` with a real SKU value, for example `MOCK-001`.

### Example call

`GET http://localhost:5500/api/v1/mrpeasy/inventory/MOCK-001`

### If SKU does not exist

- HTTP `404`
```json
{
  "success": false,
  "error": "Inventory item not found: MOCK-999",
  "code": "NOT_FOUND"
}
```

## C) Get low-stock items

- Method: `GET`
- URL: `/api/v1/mrpeasy/inventory/low-stock`
- Permission: `mrpeasy.view`

### Optional query option

- `threshold` (number)
  - Minimum: `0`
  - Default: `5`

This returns items where quantity is lower than the threshold.

### Example call

`GET http://localhost:5500/api/v1/mrpeasy/inventory/low-stock?threshold=5`

## D) Update an inventory item fields

- Method: `PATCH`
- URL: `/api/v1/mrpeasy/inventory/:sku`
- Permission: `mrpeasy.manage`

You can update one or more of these fields:

- `quantity` (integer, `0` or more)
- `reorderPoint` (integer, `0` or more)
- `reorderQty` (integer, `0` or more)
- `name` (text, max 500 chars)

### Example payload
```json
{
  "quantity": 25,
  "reorderPoint": 7,
  "reorderQty": 15,
  "name": "Main Warehouse Item"
}
```

### Example call

`PATCH http://localhost:5500/api/v1/mrpeasy/inventory/MOCK-001`

### Important rule

- Negative quantity is not allowed.

## E) Adjust inventory quantity by delta

- Method: `POST`
- URL: `/api/v1/mrpeasy/inventory/adjust`
- Permission: `mrpeasy.manage`

Use this route to add or subtract stock by a delta amount.

### Required payload fields

- `sku` (string, required)
- `quantityDelta` (integer, required)
  - Positive number: add stock
  - Negative number: reduce stock

### Optional payload fields

- `reason` (string, max 1000 chars)
- `idempotencyKey` (string, max 256 chars)

### Example payload (add stock)
```json
{
  "sku": "MOCK-001",
  "quantityDelta": 10,
  "reason": "Received supplier shipment"
}
```

### Example payload (reduce stock)
```json
{
  "sku": "MOCK-001",
  "quantityDelta": -2,
  "reason": "Damaged items"
}
```

### Important rule

- The system blocks updates that would make stock negative.
- If it would become negative, you get HTTP `400`.

## F) List shipment documents (pick/ship)

- Method: `GET`
- URL: `/api/v1/mrpeasy/shipments`
- Permission: `mrpeasy.view`

### Optional query options

- `limit` (number)
  - Minimum: `1`
  - Maximum: `200`
  - Default: `50`
- `offset` (number)
  - Minimum: `0`
  - Default: `0`
- `status` (string, optional)
- `fromDate` (ISO date string, optional)
- `toDate` (ISO date string, optional)
  - If both dates are provided: `fromDate <= toDate`

### Example call

`GET http://localhost:5500/api/v1/mrpeasy/shipments?status=shipped&fromDate=2026-02-01&toDate=2026-02-28`

### Example success
```json
{
  "success": true,
  "data": [
    {
      "id": "SHP-1002",
      "number": "SHP-1002",
      "status": "shipped",
      "customerName": "Bluewater Retail",
      "warehouse": "Secondary Warehouse",
      "sourceDocument": "SO-2051",
      "plannedDate": "2026-02-22T10:00:00.000Z",
      "shipDate": "2026-02-22T14:00:00.000Z",
      "trackingNumber": "TRK-7891011",
      "carrier": "UPS",
      "lines": [
        { "sku": "MOCK-004", "name": "Mock Item 4", "qty": 2, "pickedQty": 2, "shippedQty": 2, "unit": "pcs" }
      ]
    }
  ]
}
```

## G) Get one shipment by ID

- Method: `GET`
- URL: `/api/v1/mrpeasy/shipments/:id`
- Permission: `mrpeasy.view`

Replace `:id` with shipment id (for example `SHP-1002`).

### Example call

`GET http://localhost:5500/api/v1/mrpeasy/shipments/SHP-1002`

### If shipment does not exist

- HTTP `404`
```json
{
  "success": false,
  "error": "Shipment not found: SHP-9999",
  "code": "NOT_FOUND"
}
```

## 5) Common error cases (plain language)

- `400 Invalid query`  
  One or more query parameters are wrong (for example limit too high).

- `400 Invalid body`  
  Request body format/fields are wrong.

- `400 NEGATIVE_STOCK`  
  Your update/adjustment would make stock less than zero.

- `401 Unauthorized`  
  Missing or invalid token.

- `403 Access denied`  
  Your user does not have required permission.

- `404 NOT_FOUND`  
  SKU not found.

- `503 Module disabled`  
  MRPeasy module is currently turned off.

## 6) Quick Postman checklist

For all calls:
- Add header: `Authorization: Bearer <your_token>`
- Add header: `Content-Type: application/json` (for PATCH/POST)
- Use correct HTTP method (GET/PATCH/POST)
- Use correct path under `/api/v1/mrpeasy`

## 7) Current data source note

If `MRPEASY_USE_MOCK=true`, inventory data is served from in-memory mock records.

If `MRPEASY_USE_MOCK=false` and credentials are set, the backend will call MRPeasy with:

- `api_key` header
- `access_key` header
