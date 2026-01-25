import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import api from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type EditItem = {
  productCode: string;
  description: string;
  quantity: number;
  discount: number;
  amount: number;
};

type InvoiceEdit = {
  id: string;
  createdAt: Date;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'overpaid';
  depositAdded: number;
  depositReceived?: number; // Total deposit received (from invoice edit)
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';
  total: number;
  balanceDue: number;
  items: EditItem[];
  note?: string;
};

export default function InvoiceEditsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedEdit, setSelectedEdit] = useState<InvoiceEdit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceDetails, setInvoiceDetails] = useState<{
    id: string;
    reference: string;
    customer: string;
    issuedAt: Date;
    salesRep: string;
    status: 'draft' | 'pending' | 'partial' | 'paid' | 'overpaid';
    total: number;
    depositReceived: number;
    balanceDue: number;
  } | null>(null);
  const [edits, setEdits] = useState<InvoiceEdit[]>([]);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD',
    }).format(amount);

  const handleGenerateReceipt = async (edit: InvoiceEdit) => {
    if (!id) {
      toast.error('Invoice ID is missing');
      return;
    }

    // Validation: Check if depositAdded > 0
    // Use depositAdded (deposit from this specific edit) not depositReceived (total from base invoice)
    const depositAdded = edit.depositAdded ?? 0;
    if (depositAdded <= 0) {
      toast.error('Receipt cannot be generated with zero deposit.');
      return;
    }

    setGeneratingReceipt(edit.id);
    try {
      const response = await api.post('/api/v1/receipt/generate-from-invoice', {
        invoiceId: id,
        editId: edit.id,
      });

      if (response.data?.receipt) {
        const receiptId = response.data.receipt.id;
        const receiptNumber = response.data.receipt.receiptNumber;
        
        if (response.data.alreadyExists) {
          // Receipt already exists for this invoice edit - show message with receipt number and action button
          toast.info(
            response.data.message || `Receipt already generated for this invoice edit. Receipt Number: ${receiptNumber}`,
            {
              duration: 5000,
              action: {
                label: 'View Receipt',
                onClick: () => navigate(`/receipts/${receiptId}/view`),
              },
            }
          );
        } else {
          // New receipt created - show success message with action button
          toast.success('Receipt generated successfully', {
            duration: 5000,
            action: {
              label: 'View Receipt',
              onClick: () => navigate(`/receipts/${receiptId}/view`),
            },
          });
        }
        // Do not auto-navigate - user can click the button in the toast
      } else {
        toast.error('Failed to generate receipt');
      }
    } catch (error: any) {
      console.error('Generate receipt error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to generate receipt';
      toast.error(errorMessage);
    } finally {
      setGeneratingReceipt(null);
    }
  };

  const formatPaymentMethod = (method?: string) => {
    if (!method) return '-';
    const methodMap: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      other: 'Other',
    };
    return methodMap[method] || method;
  };

  useEffect(() => {
    const fetchEdits = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await api.get(`/api/v1/invoice/${id}/edits`);
        const invoice = response.data?.invoice || {};
        const editsResponse = Array.isArray(response.data?.edits) ? response.data.edits : [];
        setInvoiceDetails({
          id: invoice._id || id,
          reference: invoice.invoiceNumber || invoice.reference || id,
          customer:
            invoice.customerId?.name ||
            invoice.customer?.name ||
            invoice.customer ||
            '',
          issuedAt: invoice.issuedAt ? new Date(invoice.issuedAt) : new Date(),
          salesRep: invoice.salesRep?.fullName || invoice.salesRep?.email || invoice.salesRep || '',
          status: invoice.status || 'pending',
          total: Number(invoice.total ?? 0),
          depositReceived: Number(invoice.depositReceived ?? 0),
          balanceDue: Number(invoice.balanceDue ?? 0),
        });
        const mappedEdits: InvoiceEdit[] = editsResponse.map((edit: any) => ({
          id: edit._id || edit.id,
          createdAt: edit.createdAt ? new Date(edit.createdAt) : new Date(),
          status: edit.status || 'pending',
          depositAdded: Number(edit.depositAdded ?? 0),
          depositReceived: Number(edit.depositReceived ?? 0),
          paymentMethod: edit.paymentMethod,
          total: Number(edit.total ?? 0),
          balanceDue: Number(edit.balanceDue ?? 0),
          items: Array.isArray(edit.items) ? edit.items : [],
          note: edit.note,
        }));
        setEdits(mappedEdits);
      } catch (error) {
        console.error('Invoice edits fetch error:', error);
        toast.error('Unable to load invoice edits');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEdits();
  }, [id]);

  const invoiceSummary = useMemo(() => {
    if (invoiceDetails) return invoiceDetails;
    return {
      id: id || '',
      reference: typeof id === 'string' ? id : 'INV-',
      customer: '',
      issuedAt: new Date(),
      salesRep: '',
      status: 'pending' as const,
      total: 0,
      depositReceived: 0,
      balanceDue: 0,
    };
  }, [id, invoiceDetails]);

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Invoice Edits</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Review the edit history for this invoice
            </p>
          </div>
          <Button
            variant="outline"
            className="text-xs sm:text-sm"
            onClick={() => navigate(`/invoices/${invoiceSummary.id}`)}
          >
            Back to Invoice
          </Button>
        </div>

        <div className="glass-card rounded-xl p-4 sm:p-6 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Reference</p>
              {isLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <p className="font-mono text-base font-semibold">{invoiceSummary.reference}</p>
              )}
            </div>
            {!isLoading && <StatusBadge status={invoiceSummary.status} />}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Customer</p>
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <p className="font-medium">{invoiceSummary.customer || '-'}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Issued</p>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className="font-medium">{format(invoiceSummary.issuedAt, 'MMM d, yyyy')}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Sales Rep</p>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className="font-medium">{invoiceSummary.salesRep || '-'}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm pt-2 border-t border-sidebar-border">
            <div>
              <p className="text-muted-foreground">Total</p>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className="font-medium">{formatCurrency(invoiceSummary.total)}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Total Deposit Received</p>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className="font-medium">{formatCurrency(invoiceSummary.depositReceived)}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Balance</p>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className={`font-medium ${invoiceSummary.balanceDue > 0 ? 'text-warning' : invoiceSummary.balanceDue < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                  {invoiceSummary.balanceDue > 0 
                    ? formatCurrency(invoiceSummary.balanceDue)
                    : invoiceSummary.balanceDue < 0
                    ? `Overpaid ${formatCurrency(Math.abs(invoiceSummary.balanceDue))}`
                    : 'Paid'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`edit-skeleton-${index}`} className="glass-card rounded-xl p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-32" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))
          ) : edits.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-sm text-muted-foreground">
              No edits available for this invoice.
            </div>
          ) : (
            edits.map((edit) => (
            <button
              key={edit.id}
              type="button"
              className="glass-card rounded-xl p-4 text-left transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => setSelectedEdit(edit)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Edited on</p>
                  <p className="text-sm font-semibold">{format(edit.createdAt, 'MMM d, yyyy')}</p>
                </div>
                <StatusBadge status={edit.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(edit.total)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deposit</p>
                  <p className="font-medium">{formatCurrency(edit.depositAdded)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className={`font-medium ${edit.balanceDue > 0 ? 'text-warning' : 'text-success'}`}>
                    {edit.balanceDue > 0 ? formatCurrency(edit.balanceDue) : 'Paid'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Items</p>
                  <p className="font-medium">{edit.items.length}</p>
                </div>
                {edit.depositAdded > 0 && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="font-medium">{formatPaymentMethod(edit.paymentMethod)}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-primary">Tap to view details</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateReceipt(edit);
                  }}
                  disabled={generatingReceipt === edit.id}
                >
                  <Receipt className="h-3 w-3 mr-1" />
                  {generatingReceipt === edit.id ? 'Generating...' : 'Generate Receipt'}
                </Button>
              </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedEdit} onOpenChange={(open) => !open && setSelectedEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Edit Details</DialogTitle>
            <DialogDescription>
              View item changes for the selected edit. Details appear only when an edit is selected.
            </DialogDescription>
          </DialogHeader>
          {selectedEdit && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Edited</p>
                  <p className="font-medium">{format(selectedEdit.createdAt, 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(selectedEdit.total)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deposit</p>
                  <p className="font-medium">{formatCurrency(selectedEdit.depositAdded)}</p>
                </div>
                {selectedEdit.depositAdded > 0 && (
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{formatPaymentMethod(selectedEdit.paymentMethod)}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-2 bg-muted px-3 py-2 text-xs font-semibold">
                  <span className="col-span-4">Item</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-3 text-right">Discount</span>
                  <span className="col-span-3 text-right">Amount</span>
                </div>
                <div className="divide-y">
                  {selectedEdit.items.map((item) => (
                    <div key={item.productCode} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs sm:text-sm">
                      <div className="col-span-4">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground">{item.productCode}</p>
                      </div>
                      <span className="col-span-2 text-right">{item.quantity}</span>
                      <span className="col-span-3 text-right">{item.discount}%</span>
                      <span className="col-span-3 text-right">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedEdit.note && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="text-muted-foreground text-xs uppercase">Note</p>
                  <p className="mt-1">{selectedEdit.note}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (selectedEdit) {
                      handleGenerateReceipt(selectedEdit);
                      setSelectedEdit(null);
                    }
                  }}
                  disabled={generatingReceipt === selectedEdit?.id}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {generatingReceipt === selectedEdit?.id ? 'Generating...' : 'Generate Receipt'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
