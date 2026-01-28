import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Printer, FileText, DollarSign, Calendar, User, Mail, Phone, Receipt as ReceiptIcon, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface ReceiptItem {
  productId: string;
  productCode: string;
  description?: string;
  quantity: number;
  price: number;
  discount?: number;
  amount: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customerCode?: string;
  billingAddress?: any;
  shippingAddress?: any;
}

interface SalesRep {
  id: string;
  fullName: string;
  email?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  balanceDue: number;
}

interface InvoiceEdit {
  id: string;
  depositAdded: number;
  depositReceived: number;
  createdAt: string;
}

interface Receipt {
  id: string;
  receiptNumber: string;
  customer: Customer | null;
  salesRep: SalesRep | null;
  saleType: 'cash' | 'invoice';
  invoice: Invoice | null;
  invoiceEditId?: string | null;
  invoiceEdit?: InvoiceEdit | null;
  items: ReceiptItem[];
  message?: string;
  signature: string;
  status: 'draft' | 'completed';
  print: boolean;
  deposit?: number;
  subtotalBeforeDiscount: number;
  subtotalAfterDiscount: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

const formatAddress = (address?: any): string => {
  if (!address) return 'N/A';
  if (typeof address === 'string') return address;
  
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-TT', {
    style: 'currency',
    currency: 'TTD',
  }).format(amount);

// Helper function to format signature for display
const formatSignatureSrc = (signature: string | undefined | null): string | undefined => {
  if (!signature) return undefined;
  
  // If it already has a data URL prefix, return as is
  if (signature.startsWith('data:')) {
    return signature;
  }
  
  // Otherwise, add the data URL prefix for base64 image
  return `data:image/png;base64,${signature}`;
};

const ReceiptViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReceipt = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await api.get(`/api/v1/receipt/${id}`);
        setReceipt(response.data.receipt);
      } catch (error: any) {
        console.error('Error fetching receipt:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch receipt';
        toast.error(errorMessage);
        setReceipt(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceipt();
  }, [id]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  if (!receipt) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">Receipt not found</p>
          <Button onClick={() => navigate('/receipts')}>Back to Receipts</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/receipts')}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  {receipt.receiptNumber}
                </h1>
                <StatusBadge status={receipt.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Created {format(new Date(receipt.createdAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                // Print functionality can be added here
                toast.info('Print functionality coming soon');
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Receipt Information */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <ReceiptIcon className="h-5 w-5" />
                Receipt Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Receipt Number</p>
                  <p className="font-medium">{receipt.receiptNumber}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(receipt.createdAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Sale Type</p>
                  <Badge variant={receipt.saleType === 'cash' ? 'default' : 'secondary'}>
                    {receipt.saleType === 'cash' ? 'Cash Sale' : 'Invoice Payment'}
                  </Badge>
                </div>
              </div>

              {receipt.invoice && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Source Invoice</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs"
                      onClick={() => navigate(`/invoices/${receipt.invoice?.id}`)}
                    >
                      {receipt.invoice.invoiceNumber}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {receipt.invoiceEdit && receipt.invoiceEdit.depositAdded > 0 && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Invoice Edit Deposit</p>
                    <p className="font-medium text-success">
                      {formatCurrency(receipt.invoiceEdit.depositAdded)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From edit created {format(new Date(receipt.invoiceEdit.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}

              {receipt.message && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Message</p>
                    <p className="text-sm">{receipt.message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {receipt.customer ? (
                <>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{receipt.customer.name}</p>
                    </div>
                  </div>

                  {receipt.customer.customerCode && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Customer Code</p>
                        <p className="font-medium">{receipt.customer.customerCode}</p>
                      </div>
                    </div>
                  )}

                  {receipt.customer.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a href={`mailto:${receipt.customer.email}`} className="text-primary hover:underline text-sm">
                          {receipt.customer.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {receipt.customer.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <a href={`tel:${receipt.customer.phone}`} className="text-primary hover:underline text-sm">
                          {receipt.customer.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {receipt.customer.billingAddress && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Billing Address</p>
                        <p className="text-sm">{formatAddress(receipt.customer.billingAddress)}</p>
                      </div>
                    </div>
                  )}

                  {receipt.customer.shippingAddress && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Shipping Address</p>
                        <p className="text-sm">{formatAddress(receipt.customer.shippingAddress)}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/customers/${receipt.customer?.id}`)}
                    className="w-full"
                  >
                    View Customer Details
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Customer information not available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sales Representative and Items Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Sales Representative */}
          {receipt.salesRep && (
            <Card>
              <CardHeader className="pb-3 md:pb-4">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Sales Representative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{receipt.salesRep.fullName}</p>
                  </div>
                  {receipt.salesRep.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href={`mailto:${receipt.salesRep.email}`} className="text-primary hover:underline text-sm">
                        {receipt.salesRep.email}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items Table */}
          <Card className={receipt.salesRep ? '' : 'lg:col-span-2'}>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipt.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productCode}</TableCell>
                        <TableCell>{item.description || 'N/A'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">
                          {item.discount ? `${item.discount}%` : '0%'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Totals */}
        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg">Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (Before Discount)</span>
                <span className="font-medium">{formatCurrency(receipt.subtotalBeforeDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (After Discount)</span>
                <span className="font-medium">{formatCurrency(receipt.subtotalAfterDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (12.5%)</span>
                <span className="font-medium">{formatCurrency(receipt.tax)}</span>
              </div>
              {receipt.deposit && receipt.deposit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Deposit Received {receipt.invoiceEdit ? '(from Invoice Edit)' : ''}
                  </span>
                  <span className="font-medium text-success">{formatCurrency(receipt.deposit)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">{formatCurrency(receipt.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature and Metadata Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Signature */}
          {receipt.signature && (
            <Card>
              <CardHeader className="pb-3 md:pb-4">
                <CardTitle className="text-base md:text-lg">Signature</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-center min-h-[120px]">
                  <img 
                    src={formatSignatureSrc(receipt.signature)} 
                    alt="Customer signature" 
                    className="max-w-full h-auto max-h-32 object-contain pointer-events-none select-none"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                    onError={(e) => {
                      console.error('Signature image failed to load');
                      // Hide broken image icon
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created At</p>
                  <p className="font-medium">{format(new Date(receipt.createdAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated At</p>
                  <p className="font-medium">{format(new Date(receipt.updatedAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={receipt.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Print Flag</p>
                  <Badge variant={receipt.print ? 'default' : 'secondary'}>
                    {receipt.print ? 'Printed' : 'Not Printed'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReceiptViewPage;
