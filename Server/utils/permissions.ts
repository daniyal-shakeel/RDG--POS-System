/**
 * Default permissions for system roles
 * These permissions are assigned when creating new roles
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Super Admin has all permissions
  superAdmin: ["*"],
  // Admin can view and modify all modules and actions
  admin: [
    "dashboard.view",
    "invoice.view",
    "invoice.create",
    "invoice.update",
    "invoice.delete",
    "receipt.view",
    "receipt.create",
    "receipt.update",
    "receipt.delete",
    "estimate.view",
    "estimate.create",
    "estimate.update",
    "estimate.convertToInvoice",
    "estimate.delete",
    "creditNote.view",
    "creditNote.create",
    "creditNote.update",
    "creditNote.delete",
    "refund.view",
    "refund.create",
    "refund.update",
    "refund.delete",
    "customer.view",
    "customer.create",
    "customer.update",
    "customer.delete",
    "product.view",
    "product.create",
    "product.update",
    "product.delete",
    "inventory.view",
    "inventory.update",
    "settings.view",
    "settings.update",
    "integration.manage",
    "device.manage",
    "user.manage"
  ],
  // Sales Rep can create and edit sales documents, but cannot modify inventory or settings
  salesRep: [
    "dashboard.view",
    "invoice.view",
    "invoice.create",
    "invoice.update",
    "receipt.view",
    "receipt.create",
    "receipt.update",
    "estimate.view",
    "estimate.create",
    "estimate.update",
    "estimate.convertToInvoice",
    "creditNote.view",
    "creditNote.create",
    "refund.view",
    "refund.create",
    "customer.view",
    "customer.create",
    "customer.update",
    "product.view",
    "inventory.view"
  ],
  // Stock Keeper can manage products and inventory, view documents
  stockKeeper: [
    "dashboard.view",
    "product.view",
    "product.create",
    "product.update",
    "inventory.view",
    "inventory.update",
    "invoice.view",
    "receipt.view",
    "estimate.view",
    "estimate.create",
    "creditNote.view",
    "refund.view",
    "customer.view"
  ]
};

/**
 * Maps display role names to permission role keys
 */
export const ROLE_NAME_MAP: Record<string, string> = {
  "Super Admin": "superAdmin",
  "Admin": "admin",
  "Stock-Keeper": "stockKeeper",
  "Sales Representative": "salesRep"
};

/**
 * Get default permissions for a role
 * @param roleName - Display name of the role (e.g., "Admin", "Stock-Keeper")
 * @returns Array of permission keys for the role, or empty array if role not found
 */
export const getDefaultPermissionsForRole = (roleName: string): string[] => {
  const roleKey = ROLE_NAME_MAP[roleName] || roleName.toLowerCase();
  return ROLE_PERMISSIONS[roleKey] || [];
};

