# API Integration Documentation

This document provides comprehensive information about all APIs with business logic in the RDG - POS System.

**Base URL:** `http://localhost:5500/api/v1`

---

## Table of Contents

1. [Customer APIs](#customer-apis)
2. [Product APIs](#product-apis)
3. [Invoice APIs](#invoice-apis)
4. [Receipt APIs](#receipt-apis)
5. [Estimate APIs](#estimate-apis)

---

## Customer APIs

### 1. Create Customer
**Endpoint:** `POST /customer`  
**Description:** Creates a new customer with duplicate email validation.

**Request Body:**
```json
{
  "customerName": "string (required, min 1 char)",
  "customerEmail": "string (required, valid email format)",
  "customerPhone": "string (required, min 10 digits, format: digits/spaces/dashes/plus/parentheses)",
  "customerBillingAddress": "string (required, min 1 char)"
}
```

**Response (201 Created):**
```json
{
  "message": "Customer created successfully",
  "customer": {
    "_id": "MongoDB ObjectId",
    "customerCode": "string (auto-generated, e.g., C001)",
    "customerName": "string",
    "customerEmail": "string (lowercase)",
    "customerPhone": "string",
    "customerBillingAddress": "string",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed or customer already exists
- `500 Internal Server Error`: Server error

---

### 2. Get All Customers
**Endpoint:** `GET /customer`  
**Description:** Retrieves all customers (limited to 10 records).

**Request:** No body required

**Response (200 OK):**
```json
{
  "message": "Customers fetched successfully",
  "customers": [
    {
      "_id": "MongoDB ObjectId",
      "customerCode": "string",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "customerBillingAddress": "string",
      "createdAt": "ISO date string",
      "updatedAt": "ISO date string"
    }
  ],
  "length": "number"
}
```

**Error Responses:**
- `500 Internal Server Error`: Server error

---

### 3. Get Customer by ID
**Endpoint:** `GET /customer/:id`  
**Description:** Retrieves a specific customer by MongoDB ObjectId.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Response (200 OK):**
```json
{
  "message": "Customer fetched successfully",
  "customer": {
    "_id": "MongoDB ObjectId",
    "customerCode": "string",
    "customerName": "string",
    "customerEmail": "string",
    "customerPhone": "string",
    "customerBillingAddress": "string",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid MongoDB ID format
- `404 Not Found`: Customer not found
- `500 Internal Server Error`: Server error

---

### 4. Update Customer
**Endpoint:** `PUT /customer/:id`  
**Description:** Updates an existing customer with validation.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Request Body:**
```json
{
  "customerName": "string (required, min 1 char)",
  "customerEmail": "string (required, valid email format)",
  "customerPhone": "string (required, min 10 digits)",
  "customerBillingAddress": "string (required, min 1 char)"
}
```

**Response (200 OK):**
```json
{
  "message": "Customer updated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid ID format or validation failed
- `404 Not Found`: Customer not found
- `500 Internal Server Error`: Server error

---

### 5. Delete Customer
**Endpoint:** `DELETE /customer/:id`  
**Description:** Deletes a customer by ID.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Response (200 OK):**
```json
{
  "message": "Customer deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid MongoDB ID format
- `404 Not Found`: Customer not found
- `500 Internal Server Error`: Server error

---

## Product APIs

### 1. Create Product
**Endpoint:** `POST /product`  
**Description:** Creates a new product with duplicate product code and barcode validation.

**Request Body:**
```json
{
  "product_code": "string (required, unique)",
  "barcode": "string (optional, unique if provided)",
  "product_name": "string (required)",
  "category": "string (required)",
  "description": "string (required)",
  "pricing_inventory": {
    "selling_price": "number (required, >= 0, must be >= cost_price)",
    "cost_price": "number (required, >= 0)",
    "current_stock": "number (required, >= 0)",
    "minimum_stock_alert": "number (required, >= 0)"
  }
}
```

**Response (201 Created):**
```json
{
  "message": "Product created successfully",
  "product": {
    "id": "MongoDB ObjectId",
    "product_code": "string",
    "barcode": "string or null",
    "product_name": "string",
    "category": "string",
    "description": "string",
    "pricing_inventory": {
      "selling_price": "number",
      "cost_price": "number",
      "current_stock": "number",
      "minimum_stock_alert": "number"
    },
    "price_summary": {
      "selling_price": "number (auto-calculated)",
      "cost_price": "number (auto-calculated)",
      "profit_margin": "number (auto-calculated)"
    },
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed
- `409 Conflict`: Product code or barcode already exists
- `500 Internal Server Error`: Server error

---

### 2. Get All Products
**Endpoint:** `GET /product`  
**Description:** Retrieves all products with calculated stock status.

**Request:** No body required

**Response (200 OK):**
```json
{
  "message": "Products fetched successfully",
  "products": [
    {
      "product_name": "string",
      "product_code": "string",
      "price": "number (selling_price)",
      "stock": "number (current_stock)",
      "stock_status": "string (one of: 'in stock', 'low stock', 'out of stock')"
    }
  ],
  "count": "number"
}
```

**Note:** Stock status is calculated as:
- `"out of stock"` if current_stock === 0
- `"low stock"` if current_stock <= minimum_stock_alert
- `"in stock"` otherwise

**Error Responses:**
- `500 Internal Server Error`: Server error

---

## Invoice APIs

### 1. Create Invoice
**Endpoint:** `POST /invoice`  
**Description:** Creates a new invoice with customer/product validation and automatic due date calculation from payment terms.

**Request Body:**
```json
{
  "customer_id": "string (required, MongoDB ObjectId)",
  "items": [
    {
      "product_id": "string (required, MongoDB ObjectId)",
      "quantity": "number (required, > 0.01)",
      "unit_price": "number (required, >= 0)"
    }
  ],
  "tax_type": "string (optional, 'percentage' or 'fixed')",
  "tax_value": "number (optional, >= 0, required if tax_type provided, 0-100 if percentage)",
  "discount_type": "string (optional, 'percentage' or 'fixed')",
  "discount_value": "number (optional, >= 0, required if discount_type provided, 0-100 if percentage)",
  "paymentTerms": "string (required, e.g., 'Net 15', 'Net 30', 'Due on Receipt')",
  "deposit_received": "number (optional, >= 0, default: 0)",
  "notes": "string (optional)",
  "signature": "string (optional)",
  "sales_rep_id": "string (required, MongoDB ObjectId)",
  "estimate_id": "string (optional, MongoDB ObjectId)"
}
```

**Payment Terms Format:**
- `"Net 15"`, `"Net 30"`, etc. - Adds specified days to invoice date
- `"Due on Receipt"` or `"Immediate"` - Due date equals invoice date
- Default: 30 days if no number found

**Response (201 Created):**
```json
{
  "message": "Invoice created successfully",
  "invoice": {
    "id": "MongoDB ObjectId",
    "invoiceReference": "string (auto-generated)",
    "customer_id": {
      "_id": "MongoDB ObjectId",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "customerBillingAddress": "string"
    },
    "items": [
      {
        "product_id": {
          "_id": "MongoDB ObjectId",
          "product_name": "string",
          "product_code": "string",
          "description": "string",
          "pricing_inventory": {}
        },
        "quantity": "number",
        "unit_price": "number"
      }
    ],
    "subtotal": "number (auto-calculated)",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number (auto-calculated)",
    "balance": "number (auto-calculated)",
    "total_paid": "number (default: 0)",
    "due_payment": "number (auto-calculated)",
    "deposit_received": "number",
    "status": "string (default: 'Pending')",
    "paymentTerms": "string",
    "due_date": "ISO date string (auto-calculated from payment terms)",
    "notes": "string",
    "signature": "string or null",
    "sales_rep_id": "MongoDB ObjectId",
    "estimate_id": "MongoDB ObjectId or null",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed or invalid MongoDB IDs
- `404 Not Found`: Customer or product(s) not found
- `500 Internal Server Error`: Server error

---

### 2. Get All Invoices
**Endpoint:** `GET /invoice`  
**Description:** Retrieves all invoices with populated customer, product, and sales rep data.

**Request:** No body required

**Response (200 OK):**
```json
{
  "message": "Invoices fetched successfully",
  "invoices": [
    {
      "_id": "MongoDB ObjectId",
      "invoiceReference": "string",
      "customer_id": {
        "_id": "MongoDB ObjectId",
        "customerName": "string",
        "customerEmail": "string",
        "customerPhone": "string",
        "customerBillingAddress": "string"
      },
      "items": [
        {
          "product_id": {
            "_id": "MongoDB ObjectId",
            "product_name": "string",
            "product_code": "string",
            "description": "string",
            "pricing_inventory": {}
          },
          "quantity": "number",
          "unit_price": "number"
        }
      ],
      "subtotal": "number",
      "tax_type": "string or null",
      "tax_value": "number or null",
      "discount_type": "string or null",
      "discount_value": "number or null",
      "total": "number",
      "balance": "number",
      "total_paid": "number",
      "due_payment": "number",
      "status": "string",
      "paymentTerms": "string",
      "due_date": "ISO date string",
      "sales_rep_id": {
        "_id": "MongoDB ObjectId",
        "name": "string",
        "email": "string"
      },
      "createdAt": "ISO date string",
      "updatedAt": "ISO date string"
    }
  ],
  "length": "number"
}
```

**Error Responses:**
- `500 Internal Server Error`: Server error

---

### 3. Get Invoice by ID
**Endpoint:** `GET /invoice/:id`  
**Description:** Retrieves a specific invoice with all populated data.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Response (200 OK):**
```json
{
  "message": "Invoice fetched successfully",
  "invoice": {
    "_id": "MongoDB ObjectId",
    "invoiceReference": "string",
    "customer_id": {
      "_id": "MongoDB ObjectId",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "customerBillingAddress": "string"
    },
    "items": [
      {
        "product_id": {
          "_id": "MongoDB ObjectId",
          "product_name": "string",
          "product_code": "string",
          "description": "string",
          "pricing_inventory": {}
        },
        "quantity": "number",
        "unit_price": "number"
      }
    ],
    "subtotal": "number",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number",
    "balance": "number",
    "total_paid": "number",
    "due_payment": "number",
    "status": "string",
    "paymentTerms": "string",
    "due_date": "ISO date string",
    "estimate_id": {
      "_id": "MongoDB ObjectId",
      "estimateReference": "string",
      "status": "string"
    } or null,
    "sales_rep_id": {
      "_id": "MongoDB ObjectId",
      "name": "string",
      "email": "string"
    },
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid MongoDB ID format
- `404 Not Found`: Invoice not found
- `500 Internal Server Error`: Server error

---

### 4. Update Invoice Status
**Endpoint:** `PATCH /invoice/:id/status`  
**Description:** Updates invoice status with complex business logic including payment handling and status transition validation.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Request Body:**
```json
{
  "status": "string (required, one of: 'Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled')",
  "payment_amount": "number (required if status is 'Partially Paid', must be > 0 and <= remaining balance)",
  "payment_method": "string (optional)",
  "payment_notes": "string (optional)"
}
```

**Status Transition Rules:**
- `Pending` → `Paid`, `Partially Paid`, `Overdue`, `Cancelled`
- `Partially Paid` → `Paid`, `Partially Paid`, `Overdue`, `Cancelled`
- `Overdue` → `Paid`, `Partially Paid`, `Cancelled`
- `Paid` → No transitions allowed (final status)
- `Cancelled` → No transitions allowed (final status)

**Business Logic:**
- **Partially Paid**: Requires `payment_amount`. Adds payment to payments array, updates `total_paid`, `due_payment`, and `balance`. If fully paid, status automatically changes to `Paid`.
- **Paid**: If there's remaining balance, adds final payment to cover full amount. Sets `total_paid = total`, `due_payment = 0`, `balance = 0`.
- **Other statuses**: Simply updates status.

**Response (200 OK):**
```json
{
  "message": "Invoice status updated successfully" or "Invoice status updated to Partially Paid. Payment recorded successfully.",
  "invoice": {
    "id": "MongoDB ObjectId",
    "invoiceReference": "string",
    "status": "string",
    "previousStatus": "string",
    "statusChanged": "boolean",
    "total": "number",
    "total_paid": "number",
    "due_payment": "number",
    "balance": "number",
    "payments": [
      {
        "amount": "number",
        "payment_date": "ISO date string",
        "payment_method": "string",
        "notes": "string"
      }
    ]
  },
  "payment_details": {
    "payment_amount": "number (only for Partially Paid)",
    "payment_date": "ISO date string (only for Partially Paid)",
    "remaining_balance": "number (only for Partially Paid)"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid ID, validation failed, invalid status transition, payment amount exceeds balance, or trying to change finalized invoice
- `404 Not Found`: Invoice not found
- `500 Internal Server Error`: Server error

---

## Receipt APIs

### 1. Create Receipt
**Endpoint:** `POST /receipt`  
**Description:** Creates a new receipt with customer/product/invoice validation.

**Request Body:**
```json
{
  "customer_id": "string (required, MongoDB ObjectId)",
  "items": [
    {
      "product_id": "string (required, MongoDB ObjectId)",
      "quantity": "number (required, > 0.01)",
      "unit_price": "number (required, >= 0)",
      "discount_percentage": "number (optional, 0-100, default: 0)"
    }
  ],
  "tax_type": "string (optional, 'percentage' or 'fixed')",
  "tax_value": "number (optional, >= 0, required if tax_type provided, 0-100 if percentage)",
  "discount_type": "string (optional, 'percentage' or 'fixed')",
  "discount_value": "number (optional, >= 0, required if discount_type provided, 0-100 if percentage)",
  "deposit_received": "number (optional, >= 0, default: 0)",
  "billing_address": "string (required)",
  "shipping_address": "string (required)",
  "notes": "string (optional)",
  "signature": "string (optional)",
  "sales_rep_id": "string (required, MongoDB ObjectId)",
  "invoice_id": "string (optional, MongoDB ObjectId)"
}
```

**Response (201 Created):**
```json
{
  "message": "Receipt created successfully",
  "receipt": {
    "id": "MongoDB ObjectId",
    "receiptReference": "string (auto-generated)",
    "invoice_id": "MongoDB ObjectId or null",
    "customer_id": {
      "_id": "MongoDB ObjectId",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "customerBillingAddress": "string"
    },
    "items": [
      {
        "product_id": {
          "_id": "MongoDB ObjectId",
          "product_name": "string",
          "product_code": "string",
          "description": "string",
          "pricing_inventory": {}
        },
        "quantity": "number",
        "unit_price": "number",
        "discount_percentage": "number"
      }
    ],
    "subtotal": "number (auto-calculated)",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number (auto-calculated)",
    "deposit_received": "number",
    "balance_due": "number (auto-calculated)",
    "billing_address": "string",
    "shipping_address": "string",
    "notes": "string",
    "signature": "string or null",
    "sales_rep_id": {
      "_id": "MongoDB ObjectId",
      "name": "string",
      "email": "string"
    },
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed or invalid MongoDB IDs
- `404 Not Found`: Customer, product(s), or invoice not found
- `500 Internal Server Error`: Server error

---

### 2. Get All Receipts
**Endpoint:** `GET /receipt`  
**Description:** Retrieves all receipts with populated data.

**Request:** No body required

**Response (200 OK):**
```json
{
  "message": "Receipts fetched successfully",
  "receipts": [
    {
      "_id": "MongoDB ObjectId",
      "receiptReference": "string",
      "invoice_id": {
        "_id": "MongoDB ObjectId",
        "invoiceReference": "string",
        "status": "string",
        "total": "number"
      } or null,
      "customer_id": {
        "_id": "MongoDB ObjectId",
        "customerName": "string",
        "customerEmail": "string",
        "customerPhone": "string",
        "customerBillingAddress": "string"
      },
      "items": [
        {
          "product_id": {
            "_id": "MongoDB ObjectId",
            "product_name": "string",
            "product_code": "string",
            "description": "string",
            "pricing_inventory": {}
          },
          "quantity": "number",
          "unit_price": "number",
          "discount_percentage": "number"
        }
      ],
      "subtotal": "number",
      "tax_type": "string or null",
      "tax_value": "number or null",
      "discount_type": "string or null",
      "discount_value": "number or null",
      "total": "number",
      "deposit_received": "number",
      "balance_due": "number",
      "billing_address": "string",
      "shipping_address": "string",
      "notes": "string",
      "signature": "string or null",
      "sales_rep_id": {
        "_id": "MongoDB ObjectId",
        "name": "string",
        "email": "string"
      },
      "createdAt": "ISO date string",
      "updatedAt": "ISO date string"
    }
  ],
  "length": "number"
}
```

**Error Responses:**
- `500 Internal Server Error`: Server error

---

### 3. Get Receipt by ID
**Endpoint:** `GET /receipt/:id`  
**Description:** Retrieves a specific receipt with all populated data.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Response (200 OK):**
```json
{
  "message": "Receipt fetched successfully",
  "receipt": {
    "_id": "MongoDB ObjectId",
    "receiptReference": "string",
    "invoice_id": {
      "_id": "MongoDB ObjectId",
      "invoiceReference": "string",
      "status": "string",
      "total": "number"
    } or null,
    "customer_id": {
      "_id": "MongoDB ObjectId",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "customerBillingAddress": "string"
    },
    "items": [
      {
        "product_id": {
          "_id": "MongoDB ObjectId",
          "product_name": "string",
          "product_code": "string",
          "description": "string",
          "pricing_inventory": {}
        },
        "quantity": "number",
        "unit_price": "number",
        "discount_percentage": "number"
      }
    ],
    "subtotal": "number",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number",
    "deposit_received": "number",
    "balance_due": "number",
    "billing_address": "string",
    "shipping_address": "string",
    "notes": "string",
    "signature": "string or null",
    "sales_rep_id": {
      "_id": "MongoDB ObjectId",
      "name": "string",
      "email": "string"
    },
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid MongoDB ID format
- `404 Not Found`: Receipt not found
- `500 Internal Server Error`: Server error

---

### 4. Update Receipt
**Endpoint:** `PUT /receipt/:id`  
**Description:** Updates an existing receipt with full validation and recalculation.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Request Body:** (Same as Create Receipt)

**Response (200 OK):**
```json
{
  "message": "Receipt updated successfully",
  "receipt": {
    "id": "MongoDB ObjectId",
    "receiptReference": "string",
    "invoice_id": "MongoDB ObjectId or null",
    "customer_id": {
      "_id": "MongoDB ObjectId",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "customerBillingAddress": "string"
    },
    "items": [
      {
        "product_id": {
          "_id": "MongoDB ObjectId",
          "product_name": "string",
          "product_code": "string",
          "description": "string",
          "pricing_inventory": {}
        },
        "quantity": "number",
        "unit_price": "number",
        "discount_percentage": "number"
      }
    ],
    "subtotal": "number (recalculated)",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number (recalculated)",
    "deposit_received": "number",
    "balance_due": "number (recalculated)",
    "billing_address": "string",
    "shipping_address": "string",
    "notes": "string",
    "signature": "string or null",
    "sales_rep_id": {
      "_id": "MongoDB ObjectId",
      "name": "string",
      "email": "string"
    },
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid ID format or validation failed
- `404 Not Found`: Receipt, customer, product(s), or invoice not found
- `500 Internal Server Error`: Server error

---

### 5. Delete Receipt
**Endpoint:** `DELETE /receipt/:id`  
**Description:** Deletes a receipt by ID.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Response (200 OK):**
```json
{
  "message": "Receipt deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid MongoDB ID format
- `404 Not Found`: Receipt not found
- `500 Internal Server Error`: Server error

---

## Estimate APIs

### 1. Create Estimate
**Endpoint:** `POST /estimate`  
**Description:** Creates a new estimate with customer/product validation and valid_until date validation.

**Request Body:**
```json
{
  "customer_id": "string (required, MongoDB ObjectId)",
  "items": [
    {
      "product_id": "string (required, MongoDB ObjectId)",
      "quantity": "number (required, > 0.01)",
      "unit_price": "number (required, >= 0)"
    }
  ],
  "tax_type": "string (optional, 'percentage' or 'fixed')",
  "tax_value": "number (optional, >= 0, required if tax_type provided, 0-100 if percentage)",
  "discount_type": "string (optional, 'percentage' or 'fixed')",
  "discount_value": "number (optional, >= 0, required if discount_type provided, 0-100 if percentage)",
  "valid_until": "ISO date string (required, must be in the future)",
  "notes": "string (optional)",
  "sales_rep_id": "string (required, MongoDB ObjectId)"
}
```

**Response (201 Created):**
```json
{
  "message": "Estimate created successfully",
  "estimate": {
    "id": "MongoDB ObjectId",
    "estimateReference": "string (auto-generated)",
    "customer_id": {
      "_id": "MongoDB ObjectId",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "customerBillingAddress": "string"
    },
    "items": [
      {
        "product_id": {
          "_id": "MongoDB ObjectId",
          "product_name": "string",
          "product_code": "string",
          "description": "string",
          "pricing_inventory": {}
        },
        "quantity": "number",
        "unit_price": "number"
      }
    ],
    "subtotal": "number (auto-calculated)",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number (auto-calculated)",
    "balance": "string (default: 'N/A')",
    "status": "string (default: 'Draft')",
    "valid_until": "ISO date string",
    "notes": "string",
    "sales_rep_id": "MongoDB ObjectId",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed, invalid MongoDB IDs, or valid_until date not in future
- `404 Not Found`: Customer or product(s) not found
- `500 Internal Server Error`: Server error

---

### 2. Get Estimates
**Endpoint:** `GET /estimate` or `GET /estimate/:id`  
**Description:** Retrieves all estimates (limited to 50) or a specific estimate by ID.

**Request Parameters (for single estimate):**
- `id`: MongoDB ObjectId (24 hex characters)

**Response for All Estimates (200 OK):**
```json
{
  "message": "Estimates fetched successfully",
  "estimates": [
    {
      "_id": "MongoDB ObjectId",
      "estimateReference": "string",
      "customer_id": {
        "_id": "MongoDB ObjectId",
        "customerName": "string",
        "customerEmail": "string"
      },
      "items": [
        {
          "product_id": {
            "_id": "MongoDB ObjectId",
            "product_name": "string",
            "product_code": "string"
          },
          "quantity": "number",
          "unit_price": "number"
        }
      ],
      "subtotal": "number",
      "tax_type": "string or null",
      "tax_value": "number or null",
      "discount_type": "string or null",
      "discount_value": "number or null",
      "total": "number",
      "status": "string",
      "valid_until": "ISO date string",
      "createdAt": "ISO date string",
      "updatedAt": "ISO date string"
    }
  ],
  "count": "number"
}
```

**Response for Single Estimate (200 OK):**
```json
{
  "message": "Estimate fetched successfully",
  "estimate": {
    "_id": "MongoDB ObjectId",
    "estimateReference": "string",
    "customer_id": {
      "_id": "MongoDB ObjectId",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "customerBillingAddress": "string"
    },
    "items": [
      {
        "product_id": {
          "_id": "MongoDB ObjectId",
          "product_name": "string",
          "product_code": "string",
          "description": "string",
          "pricing_inventory": {}
        },
        "quantity": "number",
        "unit_price": "number"
      }
    ],
    "subtotal": "number",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number",
    "balance": "string",
    "status": "string",
    "valid_until": "ISO date string",
    "notes": "string",
    "sales_rep_id": "MongoDB ObjectId",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid MongoDB ID format
- `404 Not Found`: Estimate not found
- `500 Internal Server Error`: Server error

---

### 3. Update Estimate
**Endpoint:** `PUT /estimate/:id`  
**Description:** Updates an existing estimate.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Request Body:** (Same as Create Estimate)

**Response (200 OK):**
```json
{
  "message": "Estimate updated successfully",
  "estimate": {
    "_id": "MongoDB ObjectId",
    "estimateReference": "string",
    "customer_id": "MongoDB ObjectId",
    "items": [],
    "subtotal": "number",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number",
    "status": "string",
    "valid_until": "ISO date string",
    "notes": "string",
    "sales_rep_id": "MongoDB ObjectId",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid ID format or validation failed
- `404 Not Found`: Estimate not found
- `500 Internal Server Error`: Server error

---

### 4. Update Estimate Status
**Endpoint:** `PATCH /estimate/:id/status`  
**Description:** Updates estimate status with complex business logic including expiration handling and automatic invoice creation.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Request Body:**
```json
{
  "status": "string (required, one of: 'Draft', 'Pending', 'Accepted', 'Rejected', 'Expired')"
}
```

**Status Transition Rules:**
- `Draft` → `Pending`, `Accepted`, `Rejected`, `Expired`
- `Pending` → `Accepted`, `Rejected`, `Expired`
- `Accepted` → No transitions allowed (final status)
- `Rejected` → No transitions allowed (final status)
- `Expired` → No transitions allowed (final status)

**Business Logic:**
- **Expiration Check**: If `valid_until` date has passed, estimate is automatically set to `Expired` (unless already finalized).
- **Accepted Status**: When status changes to `Accepted`, automatically creates an invoice from the estimate. If invoice already exists for this estimate, returns existing invoice.
- **Invoice Creation**: New invoice uses estimate data with:
  - Due date: `valid_until` date if in future, otherwise 30 days from now
  - Payment terms: `"Net 30"`
  - Status: `"Pending"`
  - Notes: Includes reference to source estimate

**Response (200 OK):**
```json
{
  "message": "Estimate status updated successfully" or "Estimate status updated successfully and invoice created",
  "estimate": {
    "id": "MongoDB ObjectId",
    "estimateReference": "string",
    "status": "string",
    "previousStatus": "string",
    "statusChanged": "boolean",
    "validUntil": "ISO date string",
    "isExpired": "boolean"
  },
  "invoice": {
    "id": "MongoDB ObjectId (only if status is 'Accepted')",
    "invoiceReference": "string",
    "estimate_id": "MongoDB ObjectId",
    "customer_id": {},
    "items": [],
    "subtotal": "number",
    "tax_type": "string or null",
    "tax_value": "number or null",
    "discount_type": "string or null",
    "discount_value": "number or null",
    "total": "number",
    "balance": "number",
    "status": "string",
    "paymentTerms": "string",
    "due_date": "ISO date string",
    "notes": "string",
    "sales_rep_id": "MongoDB ObjectId",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid ID, validation failed, invalid status transition, or trying to change finalized estimate
- `404 Not Found`: Estimate not found
- `500 Internal Server Error`: Server error

---

### 5. Delete Estimate
**Endpoint:** `DELETE /estimate/:id`  
**Description:** Deletes an estimate by ID.

**Request Parameters:**
- `id`: MongoDB ObjectId (24 hex characters)

**Response (200 OK):**
```json
{
  "message": "Estimate deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid MongoDB ID format
- `404 Not Found`: Estimate not found
- `500 Internal Server Error`: Server error

---

## Common Error Response Format

All APIs return errors in the following format:

```json
{
  "message": "Error message",
  "errors": [
    {
      "field": "field_name",
      "message": "Specific error message"
    }
  ]
}
```

---

## Notes

1. **MongoDB ObjectId Format**: All IDs must be 24-character hexadecimal strings (e.g., `"507f1f77bcf86cd799439011"`).

2. **Date Format**: All dates should be in ISO 8601 format (e.g., `"2024-01-15T10:30:00.000Z"`).

3. **Auto-Generated Fields**: 
   - Customer codes (e.g., `C001`, `C002`)
   - Invoice/Receipt/Estimate reference numbers
   - Calculated totals, subtotals, balances
   - Timestamps (`createdAt`, `updatedAt`)

4. **Validation**: All APIs validate input data using Zod schemas. Invalid data returns `400 Bad Request` with detailed error messages.

5. **Status Fields**: 
   - Invoice statuses: `Pending`, `Paid`, `Partially Paid`, `Overdue`, `Cancelled`
   - Estimate statuses: `Draft`, `Pending`, `Accepted`, `Rejected`, `Expired`

6. **Tax and Discount**: 
   - Type can be `"percentage"` (0-100) or `"fixed"` (any positive number)
   - If type is provided, value must also be provided

