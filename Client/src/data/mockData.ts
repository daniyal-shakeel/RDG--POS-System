import { Customer, SalesDocument, User, SalesStats, LineItem } from '@/types/pos';

export const mockCustomers: Customer[] = [
  {
    id: 'C001',
    name: 'Caribbean Trading Co.',
    email: 'orders@caribtrade.com',
    phone: '+1 (868) 625-1234',
    billingAddress: '45 Frederick Street, Port of Spain, Trinidad',
    shippingAddress: '45 Frederick Street, Port of Spain, Trinidad'
  },
  {
    id: 'C002',
    name: 'Island Fresh Markets',
    email: 'purchasing@islandfresh.tt',
    phone: '+1 (868) 662-5678',
    billingAddress: '12 Southern Main Road, San Fernando, Trinidad',
    shippingAddress: '12 Southern Main Road, San Fernando, Trinidad'
  },
  {
    id: 'C003',
    name: 'Tropical Delights Ltd.',
    email: 'info@tropicaldelights.com',
    phone: '+1 (868) 645-9012',
    billingAddress: '78 Eastern Main Road, Tunapuna, Trinidad',
    shippingAddress: 'Warehouse B, Macoya Industrial Estate'
  },
  {
    id: 'C004',
    name: 'Gulf City Wholesale',
    email: 'wholesale@gulfcity.tt',
    phone: '+1 (868) 657-3456',
    billingAddress: 'Gulf City Mall, San Fernando, Trinidad',
    shippingAddress: 'Gulf City Mall, San Fernando, Trinidad'
  }
];

export const mockProducts = [
  { code: 'RDG-001', name: 'Premium Medjool Dates 500g', price: 89.99 },
  { code: 'RDG-002', name: 'Organic Deglet Noor Dates 1kg', price: 65.00 },
  { code: 'RDG-003', name: 'Date Syrup 350ml', price: 45.50 },
  { code: 'RDG-004', name: 'Stuffed Dates Assortment 12pc', price: 120.00 },
  { code: 'RDG-005', name: 'Date & Nut Energy Bars 6pk', price: 55.00 },
  { code: 'RDG-006', name: 'Dried Fig & Date Mix 400g', price: 72.00 },
  { code: 'RDG-007', name: 'Premium Gift Box - Luxury', price: 250.00 },
  { code: 'RDG-008', name: 'Bulk Medjool Dates 5kg', price: 399.99 }
];

export const mockSalesReps = [
  'Marcus Johnson',
  'Alicia Mohammed',
  'David Singh',
  'Keisha Williams',
  'Andre Baptiste'
];

const generateMockLineItems = (): LineItem[] => {
  const numItems = Math.floor(Math.random() * 4) + 1;
  const items: LineItem[] = [];
  
  for (let i = 0; i < numItems; i++) {
    const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
    const quantity = Math.floor(Math.random() * 10) + 1;
    const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 0;
    const amount = quantity * product.price * (1 - discount / 100);
    
    items.push({
      id: `item-${i + 1}`,
      productCode: product.code,
      description: product.name,
      quantity,
      unitPrice: product.price,
      discount,
      amount
    });
  }
  
  return items;
};

const calculateTotals = (items: LineItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discount = subtotal * 0.05;
  const tax = (subtotal - discount) * 0.125;
  const total = subtotal - discount + tax;
  return { subtotal, discount, tax, total };
};

export const mockDocuments: SalesDocument[] = [
  (() => {
    const items = generateMockLineItems();
    const totals = calculateTotals(items);
    return {
      id: 'DOC001',
      type: 'invoice' as const,
      refNumber: 'INV-2025-0001',
      date: new Date('2025-01-15'),
      dueDate: new Date('2025-01-30'),
      terms: 'Net 15',
      customer: mockCustomers[0],
      items,
      ...totals,
      balanceDue: totals.total,
      deposit: 0,
      status: 'pending' as const,
      salesRep: 'Marcus Johnson',
      message: 'Thank you for your business!',
      createdAt: new Date('2025-01-15T10:30:00'),
      updatedAt: new Date('2025-01-15T10:30:00')
    };
  })(),
  (() => {
    const items = generateMockLineItems();
    const totals = calculateTotals(items);
    return {
      id: 'DOC002',
      type: 'receipt' as const,
      refNumber: 'RCP-2025-0001',
      date: new Date('2025-01-14'),
      customer: mockCustomers[1],
      items,
      ...totals,
      balanceDue: 0,
      deposit: totals.total,
      status: 'paid' as const,
      salesRep: 'Alicia Mohammed',
      signature: 'data:image/png;base64,signature...',
      createdAt: new Date('2025-01-14T14:20:00'),
      updatedAt: new Date('2025-01-14T14:25:00')
    };
  })(),
  (() => {
    const items = generateMockLineItems();
    const totals = calculateTotals(items);
    return {
      id: 'DOC003',
      type: 'estimate' as const,
      refNumber: 'EST-2025-0003',
      date: new Date('2025-01-13'),
      customer: mockCustomers[2],
      items,
      ...totals,
      balanceDue: totals.total,
      deposit: 0,
      status: 'pending' as const,
      salesRep: 'David Singh',
      message: 'Valid for 30 days',
      createdAt: new Date('2025-01-13T09:15:00'),
      updatedAt: new Date('2025-01-13T09:15:00')
    };
  })(),
  (() => {
    const items = generateMockLineItems();
    const totals = calculateTotals(items);
    return {
      id: 'DOC004',
      type: 'credit_note' as const,
      refNumber: 'CN-2025-0001',
      date: new Date('2025-01-12'),
      customer: mockCustomers[0],
      items,
      ...totals,
      balanceDue: 0,
      deposit: 0,
      status: 'approved' as const,
      salesRep: 'Marcus Johnson',
      message: 'Returned goods - quality issue',
      createdAt: new Date('2025-01-12T11:00:00'),
      updatedAt: new Date('2025-01-12T11:30:00')
    };
  })(),
  (() => {
    const items = generateMockLineItems();
    const totals = calculateTotals(items);
    return {
      id: 'DOC005',
      type: 'invoice' as const,
      refNumber: 'INV-2025-0002',
      date: new Date('2025-01-10'),
      dueDate: new Date('2025-01-25'),
      terms: 'Net 15',
      customer: mockCustomers[3],
      items,
      ...totals,
      balanceDue: totals.total * 0.5,
      deposit: totals.total * 0.5,
      status: 'partial' as const,
      salesRep: 'Keisha Williams',
      createdAt: new Date('2025-01-10T16:45:00'),
      updatedAt: new Date('2025-01-12T10:00:00')
    };
  })()
];

export const mockUser: User = {
  id: 'U001',
  name: 'Marcus Johnson',
  email: 'marcus@royaldatesgalore.com',
  role: 'sales_rep',
  avatar: undefined
};

export const mockStats: SalesStats = {
  todaySales: 4250.75,
  weekSales: 28450.00,
  monthSales: 125890.50,
  pendingInvoices: 12,
  overdueAmount: 3420.00,
  documentsToday: 8
};

export const generateRefNumber = (type: string): string => {
  const prefixes: Record<string, string> = {
    invoice: 'INV',
    receipt: 'RCP',
    credit_note: 'CN',
    refund: 'REF',
    estimate: 'EST'
  };
  const prefix = prefixes[type] || 'DOC';
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix}-${year}-${num}`;
};
