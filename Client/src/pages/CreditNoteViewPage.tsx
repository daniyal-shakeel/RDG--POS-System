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
import { ArrowLeft, FileText, DollarSign, Calendar, User, Mail, Phone, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/services/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface CreditNoteProduct {
  productCode: string;
  description?: string;
  quantity: number;
  price: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  shippingAddress?: string;
}

interface SalesRep {
  id: string;
  fullName: string;
  email?: string;
}

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  source: 'FROM_INVOICE' | 'STANDALONE';
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerBillingAddress?: string;
  customerShippingAddress?: string;
  salesRepId: string;
  salesRepName: string;
  products: CreditNoteProduct[];
  message?: string;
  salesRepSignature: string;
  status: 'DRAFT' | 'APPROVED';
  createdAt: string;
  updatedAt: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-TT', {
    style: 'currency',
    currency: 'TTD',
  }).format(amount);

// Helper function to format address (handles both string and object formats)
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

const CreditNoteViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCreditNote = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await api.get(`/api/v1/credit-notes/${id}`);
        setCreditNote(response.data.creditNote);
      } catch (error: any) {
        console.error('Error fetching credit note:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch credit note';
        toast.error(errorMessage);
        setCreditNote(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditNote();
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

  if (!creditNote) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">Credit note not found</p>
          <Button onClick={() => navigate('/credit-notes')}>Back to Credit Notes</Button>
        </div>
      </MainLayout>
    );
  }

  // Calculate totals
  const subtotal = creditNote.products.reduce(
    (sum, product) => sum + (product.quantity * product.price),
    0
  );

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/credit-notes')}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  {creditNote.creditNoteNumber}
                </h1>
                <StatusBadge status={creditNote.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Created {format(new Date(creditNote.createdAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Credit Note Information */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Credit Note Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Credit Note Number</p>
                  <p className="font-medium">{creditNote.creditNoteNumber}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(creditNote.createdAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Source</p>
                  <Badge variant={creditNote.source === 'STANDALONE' ? 'default' : 'secondary'}>
                    {creditNote.source === 'STANDALONE' ? 'Standalone' : 'From Invoice'}
                  </Badge>
                </div>
              </div>

              {creditNote.message && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Message</p>
                    <p className="text-sm">{creditNote.message}</p>
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
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{creditNote.customerName}</p>
                </div>
              </div>

              {creditNote.customerEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${creditNote.customerEmail}`} className="text-primary hover:underline text-sm">
                      {creditNote.customerEmail}
                    </a>
                  </div>
                </div>
              )}

              {creditNote.customerPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a href={`tel:${creditNote.customerPhone}`} className="text-primary hover:underline text-sm">
                      {creditNote.customerPhone}
                    </a>
                  </div>
                </div>
              )}

              {creditNote.customerBillingAddress && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Billing Address</p>
                    <p className="text-sm">{formatAddress(creditNote.customerBillingAddress)}</p>
                  </div>
                </div>
              )}

              {creditNote.customerShippingAddress && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Shipping Address</p>
                    <p className="text-sm">{formatAddress(creditNote.customerShippingAddress)}</p>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/customers/${creditNote.customerId}`)}
                className="w-full"
              >
                View Customer Details
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sales Representative and Items Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Sales Representative */}
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
                  <p className="font-medium">{creditNote.salesRepName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Products</CardTitle>
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
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNote.products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.productCode}</TableCell>
                        <TableCell>{product.description || 'N/A'}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.quantity * product.price)}
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
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Credit</span>
                  <span className="font-bold text-lg">{formatCurrency(subtotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature and Metadata Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Signature */}
          {creditNote.salesRepSignature && (
            <Card>
              <CardHeader className="pb-3 md:pb-4">
                <CardTitle className="text-base md:text-lg">Sales Representative Signature</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-center min-h-[120px]">
                  <img 
                    src={formatSignatureSrc(creditNote.salesRepSignature)} 
                    alt="Sales representative signature" 
                    className="max-w-full h-auto max-h-32 object-contain pointer-events-none select-none"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                    onError={(e) => {
                      console.error('Signature image failed to load');
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
                  <p className="font-medium">{format(new Date(creditNote.createdAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated At</p>
                  <p className="font-medium">{format(new Date(creditNote.updatedAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={creditNote.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <Badge variant={creditNote.source === 'STANDALONE' ? 'default' : 'secondary'}>
                    {creditNote.source === 'STANDALONE' ? 'Standalone' : 'From Invoice'}
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

export default CreditNoteViewPage;
