import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePOS } from '@/contexts/POSContext';
import api from '@/services/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Printer, Eye, FileDown, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { DocumentStatus, DocumentType } from '@/types/pos';
import { ESTIMATE_STATUS_FILTER_OPTIONS, EstimateStatus } from '@/constants/estimateStatuses';
import { useBluetoothPrinter, ReceiptData } from '@/hooks/useBluetoothPrinter';
import { toast } from 'sonner';

interface DocumentListPageProps {
  type: DocumentType;
  title: string;
}

// Company info for printing
const COMPANY_INFO = {
  name: 'XYZ Company Ltd. Ltd.',
  address: '22 Macoya Road West, Macoya Industrial Estate, Tunapuna, Trinidad & Tobago',
  phone: '+1(868)739-5025',
};

export default function DocumentListPage({ type, title }: DocumentListPageProps) {
  const { documents, getDocument, deviceStatus } = usePOS();
  const { printReceipt, isConnected } = useBluetoothPrinter();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const isStockKeeper = user?.role === 'stock_keeper';
  const [apiDocuments, setApiDocuments] = useState<any[]>([]);
  const [apiInvoices, setApiInvoices] = useState<any[]>([]);
  const [apiReceipts, setApiReceipts] = useState<any[]>([]);
  const [apiCreditNotes, setApiCreditNotes] = useState<any[]>([]);
  const [apiRefunds, setApiRefunds] = useState<any[]>([]);
  const [hasFetchedEstimates, setHasFetchedEstimates] = useState(false);
  const [hasFetchedInvoices, setHasFetchedInvoices] = useState(false);
  const [hasFetchedReceipts, setHasFetchedReceipts] = useState(false);
  const [hasFetchedCreditNotes, setHasFetchedCreditNotes] = useState(false);
  const [hasFetchedRefunds, setHasFetchedRefunds] = useState(false);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [isLoadingCreditNotes, setIsLoadingCreditNotes] = useState(false);
  const [isLoadingRefunds, setIsLoadingRefunds] = useState(false);
  const [isLoadingMoreInvoices, setIsLoadingMoreInvoices] = useState(false);
  const [isLoadingMoreReceipts, setIsLoadingMoreReceipts] = useState(false);
  const [invoicePage, setInvoicePage] = useState(0);
  const [receiptPage, setReceiptPage] = useState(0);
  const [invoiceHasMore, setInvoiceHasMore] = useState(true);
  const [receiptHasMore, setReceiptHasMore] = useState(true);
  const invoicePageSize = 50;
  const receiptPageSize = 50;
  const isLoading =
    (type === 'estimate' && isLoadingEstimates) ||
    (type === 'invoice' && isLoadingInvoices) ||
    (type === 'receipt' && isLoadingReceipts) ||
    (type === 'credit_note' && isLoadingCreditNotes) ||
    (type === 'refund' && isLoadingRefunds);

  useEffect(() => {
    const fetchEstimates = async () => {
      if (type !== 'estimate') {
        return;
      }
      setIsLoadingEstimates(true);
      try {
        const response = await api.get('/api/v1/estimate');
        const incoming = Array.isArray(response.data?.estimates)
          ? response.data.estimates
          : [];
        const mapped = incoming.map((estimate: any) => ({
          id: estimate.reference,
          refNumber: estimate.reference,
          type: 'estimate',
          date: estimate.createdAt ? new Date(estimate.createdAt) : new Date(),
          dueDate: undefined,
          status: estimate.status || 'draft',
          customer: {
            name: estimate.customerName || '',
            email: estimate.customerEmail || '',
            id: estimate.customerId || estimate.customer?._id || '',
            phone: estimate.customer?.phone || '',
            billingAddress: estimate.customer?.billingAddress || '',
            shippingAddress: estimate.customer?.shippingAddress || '',
          },
          items: Array.isArray(estimate.items) ? estimate.items : [],
          subtotal: estimate.total || 0,
          discount: 0,
          tax: 0,
          total: estimate.total || 0,
          balanceDue: estimate.total || 0,
          deposit: 0,
          salesRep: estimate.salesRep || '',
          salesRepId: estimate.salesRepId || '',
          message: estimate.message || '',
          signature: estimate.signature || '',
        }));
        setApiDocuments(mapped);
      } catch (error) {
        console.error('Estimate fetch error:', error);
        toast.error('Unable to load estimates');
        setApiDocuments([]);
      } finally {
        setHasFetchedEstimates(true);
        setIsLoadingEstimates(false);
      }
    };

    fetchEstimates();
  }, [type]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (type !== 'invoice') {
        return;
      }
      const isFirstPage = invoicePage === 0;
      isFirstPage ? setIsLoadingInvoices(true) : setIsLoadingMoreInvoices(true);
      try {
        const response = await api.get('/api/v1/invoice', {
          params: {
            limit: invoicePageSize,
            offset: invoicePage * invoicePageSize,
          },
        });
        const incoming = Array.isArray(response.data?.invoices)
          ? response.data.invoices
          : [];
        // Map invoices from backend - all values are already calculated correctly
        // Backend returns: total (with tax), balance (current balance), status (derived from balance)
        const mapped = incoming.map((inv: any) => {
          // Backend returns the correct invoice total (subtotal + tax)
          const total = Number(inv.total ?? 0);
          // Backend returns the current balance (can be negative if overpaid)
          const balance = Number(inv.balance ?? inv.balanceDue ?? 0);
          // Deposit is the total received (total - balance, but backend may provide it directly)
          const deposit = Number(inv.depositReceived ?? Math.max(total - balance, 0));
          // Status is already correctly derived by backend based on balance
          const status = inv.status || 'draft';
          
          return {
            id: inv.id || inv._id || inv.reference,
            refNumber: inv.reference || inv.invoiceNumber || '',
            type: 'invoice' as const,
            date: inv.date ? new Date(inv.date) : inv.issuedAt ? new Date(inv.issuedAt) : new Date(),
            dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
            status,
            customer: {
              name: inv.customer || '',
              email: '',
              id: inv.customerId || '',
            },
            items: [],
            subtotal: total, // For display, we use total since subtotal isn't returned in list
            discount: 0,
            tax: 0,
            total, // Invoice total WITH tax (from backend)
            balanceDue: balance, // Current balance (from backend, can be negative)
            deposit, // Total deposit received
            salesRep: inv.salesRep || '',
          };
        });
        setApiInvoices(prev => (isFirstPage ? mapped : [...prev, ...mapped]));
        const meta = response.data?.meta || {};
        const hasMore = meta.hasMore ?? mapped.length === invoicePageSize;
        setInvoiceHasMore(hasMore);
      } catch (error) {
        console.error('Invoice fetch error:', error);
        toast.error('Unable to load invoices');
        if (invoicePage === 0) {
          setApiInvoices([]);
        }
        setInvoiceHasMore(false);
      } finally {
        setHasFetchedInvoices(true);
        setIsLoadingInvoices(false);
        setIsLoadingMoreInvoices(false);
      }
    };

    fetchInvoices();
  }, [type, invoicePage]);

  useEffect(() => {
    const fetchReceipts = async () => {
      if (type !== 'receipt') {
        return;
      }
      const isFirstPage = receiptPage === 0;
      isFirstPage ? setIsLoadingReceipts(true) : setIsLoadingMoreReceipts(true);
      try {
        const response = await api.get('/api/v1/receipt', {
          params: {
            limit: receiptPageSize,
            offset: receiptPage * receiptPageSize,
          },
        });
        const incoming = Array.isArray(response.data?.receipts)
          ? response.data.receipts
          : [];
        // Map receipts from backend
        const mapped = incoming.map((receipt: any) => {
          return {
            id: receipt.id || receipt.receiptId,
            refNumber: receipt.receiptNumber || '',
            type: 'receipt' as const,
            date: receipt.receiptDate ? new Date(receipt.receiptDate) : new Date(),
            status: receipt.receiptStatus || 'draft',
            customer: {
              name: receipt.customerName || '',
              email: receipt.customerEmail || '',
              id: '',
            },
            items: [],
            subtotal: receipt.subtotalAfterDiscount || 0,
            discount: 0,
            tax: receipt.tax || 0,
            total: receipt.total || 0,
            balanceDue: 0, // Receipts are always paid
            deposit: receipt.total || 0,
            salesRep: receipt.salesRepName || '',
            saleType: receipt.saleType || 'cash',
            invoiceId: receipt.invoiceId || null,
            invoiceNumber: receipt.invoiceNumber || null,
          };
        });
        setApiReceipts(prev => (isFirstPage ? mapped : [...prev, ...mapped]));
        const meta = response.data?.meta || {};
        const hasMore = meta.hasMore ?? mapped.length === receiptPageSize;
        setReceiptHasMore(hasMore);
      } catch (error) {
        console.error('Receipt fetch error:', error);
        toast.error('Unable to load receipts');
        if (receiptPage === 0) {
          setApiReceipts([]);
        }
        setReceiptHasMore(false);
      } finally {
        setHasFetchedReceipts(true);
        setIsLoadingReceipts(false);
        setIsLoadingMoreReceipts(false);
      }
    };

    fetchReceipts();
  }, [type, receiptPage]);

  useEffect(() => {
    const fetchCreditNotes = async () => {
      if (type !== 'credit_note') {
        return;
      }
      setIsLoadingCreditNotes(true);
      try {
        const response = await api.get('/api/v1/credit-notes', {
          params: {
            limit: 50,
            offset: 0,
            status: statusFilter !== 'all' ? statusFilter : undefined,
          },
        });
        const incoming = Array.isArray(response.data?.creditNotes)
          ? response.data.creditNotes
          : [];
        // Map credit notes from backend
        const mapped = incoming.map((cn: any) => {
          // Calculate totals from products
          const subtotal = (cn.products || []).reduce(
            (sum: number, p: any) => sum + (Number(p.quantity || 0) * Number(p.price || 0)),
            0
          );
          
          return {
            id: cn.id || cn._id,
            refNumber: cn.creditNoteNumber || '',
            type: 'credit_note' as const,
            date: cn.date ? new Date(cn.date) : cn.createdAt ? new Date(cn.createdAt) : new Date(),
            status: cn.status || 'DRAFT',
            customer: {
              name: cn.customer || '',
              email: '',
              id: cn.customerId || '',
            },
            items: (cn.products || []).map((p: any) => ({
              id: p.productCode,
              productCode: p.productCode,
              description: p.description || '',
              quantity: p.quantity,
              unitPrice: p.price,
              discount: 0,
              amount: p.quantity * p.price,
            })),
            subtotal,
            discount: 0,
            tax: 0,
            total: subtotal,
            balanceDue: 0,
            deposit: 0,
            salesRep: cn.salesRep || '',
            message: cn.message,
            createdAt: cn.createdAt ? new Date(cn.createdAt) : new Date(),
            updatedAt: cn.updatedAt ? new Date(cn.updatedAt) : new Date(),
          };
        });
        setApiCreditNotes(mapped);
      } catch (error) {
        console.error('Credit note fetch error:', error);
        toast.error('Unable to load credit notes');
        setApiCreditNotes([]);
      } finally {
        setHasFetchedCreditNotes(true);
        setIsLoadingCreditNotes(false);
      }
    };

    fetchCreditNotes();
  }, [type, statusFilter]);

  useEffect(() => {
    const fetchRefunds = async () => {
      if (type !== 'refund') {
        return;
      }
      setIsLoadingRefunds(true);
      try {
        const response = await api.get('/api/v1/refunds', {
          params: {
            limit: 50,
            offset: 0,
            status: statusFilter !== 'all' ? statusFilter : undefined,
          },
        });
        const incoming = Array.isArray(response.data?.refunds)
          ? response.data.refunds
          : [];
        // Map refunds from backend
        const mapped = incoming.map((ref: any) => {
          // Calculate totals from products
          const subtotal = (ref.products || []).reduce(
            (sum: number, p: any) => sum + (Number(p.quantity || 0) * Number(p.price || 0)),
            0
          );
          
          return {
            id: ref.id || ref._id,
            refNumber: ref.refundNumber || '',
            type: 'refund' as const,
            date: ref.date ? new Date(ref.date) : ref.createdAt ? new Date(ref.createdAt) : new Date(),
            status: ref.status || 'DRAFT',
            customer: {
              name: ref.customer || '',
              email: '',
              id: ref.customerId || '',
            },
            items: (ref.products || []).map((p: any) => ({
              id: p.productCode,
              productCode: p.productCode,
              description: p.description || '',
              quantity: p.quantity,
              unitPrice: p.price,
              discount: 0,
              amount: p.quantity * p.price,
            })),
            subtotal,
            discount: 0,
            tax: 0,
            total: subtotal,
            balanceDue: 0,
            deposit: 0,
            salesRep: ref.salesRep || '',
            message: ref.message,
            creditNoteId: ref.creditNoteId || null,
            creditNoteNumber: ref.creditNoteNumber || null,
            createdAt: ref.createdAt ? new Date(ref.createdAt) : new Date(),
            updatedAt: ref.updatedAt ? new Date(ref.updatedAt) : new Date(),
          };
        });
        setApiRefunds(mapped);
      } catch (error) {
        console.error('Refund fetch error:', error);
        toast.error('Unable to load refunds');
        setApiRefunds([]);
      } finally {
        setHasFetchedRefunds(true);
        setIsLoadingRefunds(false);
      }
    };

    fetchRefunds();
  }, [type, statusFilter]);

  // Reset pagination when switching types
  useEffect(() => {
    if (type === 'invoice') {
      setInvoicePage(0);
      setInvoiceHasMore(true);
    } else if (type === 'receipt') {
      setReceiptPage(0);
      setReceiptHasMore(true);
    }
  }, [type]);

  const baseDocuments =
    type === 'estimate' && hasFetchedEstimates
      ? apiDocuments
      : type === 'invoice' && hasFetchedInvoices
      ? apiInvoices
      : type === 'receipt' && hasFetchedReceipts
      ? apiReceipts
      : type === 'credit_note' && hasFetchedCreditNotes
      ? apiCreditNotes
      : type === 'refund' && hasFetchedRefunds
      ? apiRefunds
      : documents;

  const filteredDocuments = baseDocuments
    .filter(doc => doc.type === type)
    .filter(doc => 
      statusFilter === 'all' || doc.status === statusFilter
    )
    .filter(doc =>
      doc.refNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD'
    }).format(amount);
  };

  const handleConvertToInvoice = async (docId: string) => {
    const doc = baseDocuments.find((d: any) => d.id === docId);
    if (!doc) {
      toast.error('Estimate not found');
      return;
    }

    // Try to fetch the full estimate details before navigating so we have
    // addresses, items, message, and signature available to prefill.
    try {
      const token = localStorage.getItem('token') || '';
      const response = await api.get(`/api/v1/estimate/${doc.refNumber}`, {
        params: {
          token,
          id: doc.refNumber,
        },
      });
      const fullEstimate = response.data?.estimate || doc;
      navigate(`/invoices/new`, {
        state: {
          convertFrom: fullEstimate,
        },
      });
    } catch (error) {
      console.error('Convert to invoice fetch error:', error);
      // Fallback to existing doc data if detail fetch fails
      navigate(`/invoices/new`, {
        state: {
          convertFrom: doc,
        },
      });
    }
  };

  const handleViewDocument = async (doc: any) => {
    if (doc.type === 'receipt') {
      // Navigate to receipt view page (read-only)
      navigate(`/receipts/${doc.id}/view`);
      return;
    }

    if (doc.type === 'estimate') {
      try {
        const token = localStorage.getItem('token') || '';
        const response = await api.get(`/api/v1/estimate/${doc.refNumber}`, {
          params: {
            token,
            id: doc.refNumber,
          },
        });
        navigate(`/estimates/${doc.id}`, {
          state: {
            estimate: response.data?.estimate,
          },
        });
        return;
      } catch (error) {
        console.error('Estimate fetch error:', error);
        toast.error('Unable to load estimate');
        return;
      }
    }

    if (doc.type === 'invoice') {
      try {
        const response = await api.get(`/api/v1/invoice/${doc.id}`);
        navigate(`/invoices/${doc.id}`, {
          state: {
            invoice: response.data?.invoice,
          },
        });
        return;
      } catch (error) {
        console.error('Invoice fetch error:', error);
        toast.error('Unable to load invoice');
      }
    }

    // For APPROVED credit notes, navigate to view page; for DRAFT, navigate to edit page
    // For REFUNDED refunds, navigate to view page; for DRAFT, navigate to edit page
    if (type === 'credit_note' && doc.status === 'APPROVED') {
      navigate(`/credit-notes/${doc.id}/view`);
    } else if (type === 'refund' && doc.status === 'REFUNDED') {
      navigate(`/refunds/${doc.id}/view`);
    } else {
      navigate(`/${type === 'credit_note' ? 'credit-notes' : type === 'refund' ? 'refunds' : type + 's'}/${doc.id}`);
    }
  };

  const getDocumentById = (docId: string) => {
    if (type === 'estimate' && hasFetchedEstimates) {
      return baseDocuments.find((doc: any) => doc.id === docId);
    }
    return getDocument(docId);
  };

  const handlePrint = async (docId: string) => {
    const doc = getDocumentById(docId);
    if (!doc) {
      toast.error('Document not found');
      return;
    }

    // If printer is connected, use Bluetooth printer
    if (isConnected) {
      try {
        // Transform document to ReceiptData format
        const receiptData: ReceiptData = {
          companyName: COMPANY_INFO.name,
          companyAddress: COMPANY_INFO.address,
          companyPhone: COMPANY_INFO.phone,
          documentType: doc.type.replace('_', ' '), // e.g., "credit_note" -> "credit note"
          refNumber: doc.refNumber,
          date: format(doc.date, 'dd/MM/yyyy HH:mm'),
          customerName: doc.customer.name,
          items: doc.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            amount: item.amount,
          })),
          subtotal: doc.subtotal,
          discount: doc.discount,
          tax: doc.tax,
          total: doc.total,
          deposit: doc.deposit,
          balanceDue: doc.balanceDue,
          salesRep: doc.salesRep,
        };

        const success = await printReceipt(receiptData);
        if (success) {
          toast.success('Document printed successfully');
        } else {
          toast.error('Failed to print document. Please try again.');
        }
      } catch (error: any) {
        console.error('Print error:', error);
        toast.error(error.message || 'Failed to print document. Please try again.');
      }
    } else {
      // If printer not connected, use browser print (PDF)
      printAsPDF(doc);
    }
  };

  const printAsPDF = (doc: any) => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print PDF');
        return;
      }

      // Write HTML content with ReceiptPrintView rendered
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print ${doc.refNumber}</title>
            <style>
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 10mm;
                  font-family: monospace;
                  font-size: 12px;
                }
              }
              body {
                font-family: monospace;
                font-size: 12px;
                padding: 20px;
                background: white;
                color: black;
              }
              .text-center { text-align: center; }
              .mb-4 { margin-bottom: 16px; }
              .mb-2 { margin-bottom: 8px; }
              .mt-4 { margin-top: 16px; }
              .mt-1 { margin-top: 4px; }
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              .mb-1 { margin-bottom: 4px; }
              .pl-2 { padding-left: 8px; }
              .font-bold { font-weight: bold; }
              .text-sm { font-size: 14px; }
              .text-\\[10px\\] { font-size: 10px; }
              .italic { font-style: italic; }
              .border-t { border-top: 1px solid black; }
              .border-dashed { border-style: dashed; }
              .border-foreground { border-color: black; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .text-right { text-align: right; }
              .h-12 { height: 48px; }
              .border-b { border-bottom: 1px solid black; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="module">
              // We'll inject React component via React.createElement
              // For now, we'll render the receipt HTML directly
              const root = document.getElementById('root');
              root.innerHTML = \`${generateReceiptHTML(doc)}\`;
              
              // Trigger print after content loads
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 250);
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    } catch (error: any) {
      console.error('PDF print error:', error);
      toast.error('Failed to open print dialog');
    }
  };

  const generateReceiptHTML = (doc: any): string => {
    // Format all dates and currency values before generating HTML
    const formattedDate = format(doc.date, 'dd/MM/yyyy HH:mm');
    const formattedDueDate = doc.dueDate ? format(doc.dueDate, 'dd/MM/yyyy') : '';
    const formattedPrintDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-TT', {
        style: 'currency',
        currency: 'TTD'
      }).format(amount);
    };

    // Format all currency values
    const formattedItems = doc.items.map((item: any, index: number) => ({
      ...item,
      formattedUnitPrice: formatCurrency(item.unitPrice),
      formattedAmount: formatCurrency(item.amount),
      index: index + 1,
    }));

    const formattedSubtotal = formatCurrency(doc.subtotal);
    const formattedDiscount = formatCurrency(doc.discount);
    const formattedTax = formatCurrency(doc.tax);
    const formattedTotal = formatCurrency(doc.total);
    const formattedDeposit = formatCurrency(doc.deposit);
    const formattedBalanceDue = formatCurrency(doc.balanceDue);

    return `
      <div class="text-center mb-4">
        <p class="font-bold text-sm">THE XYZ Company Ltd. LTD.</p>
        <p>22 Macoya Road West</p>
        <p>Macoya Industrial Estate, Tunapuna</p>
        <p>Trinidad & Tobago</p>
        <p>+1(868)739-5025</p>
        <p>www.royaldatesgalore.com</p>
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      <div class="mb-2">
        <div class="flex justify-between">
          <span>${doc.type.toUpperCase().replace('_', ' ')}</span>
          <span>${doc.refNumber}</span>
        </div>
        <div class="flex justify-between">
          <span>Date:</span>
          <span>${formattedDate}</span>
        </div>
        ${doc.dueDate ? `<div class="flex justify-between">
          <span>Due:</span>
          <span>${formattedDueDate}</span>
        </div>` : ''}
        <div class="flex justify-between">
          <span>Sales Rep:</span>
          <span>${doc.salesRep}</span>
        </div>
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      <div class="mb-2">
        <p class="font-bold">BILL TO:</p>
        <p>${doc.customer.name}</p>
        <p class="text-[10px]">${doc.customer.billingAddress}</p>
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      <div class="mb-2">
        ${formattedItems.map((item: any) => `
          <div class="mb-1">
            <p class="font-bold">${item.index}. ${item.description}</p>
            <div class="flex justify-between pl-2">
              <span>${item.quantity} x ${item.formattedUnitPrice}</span>
              <span>${item.formattedAmount}</span>
            </div>
            ${item.discount > 0 ? `<p class="text-right text-[10px]">Disc: -${item.discount}%</p>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      <div class="mb-2">
        <div class="flex justify-between">
          <span>Subtotal:</span>
          <span>${formattedSubtotal}</span>
        </div>
        ${doc.discount > 0 ? `<div class="flex justify-between">
          <span>Discount:</span>
          <span>-${formattedDiscount}</span>
        </div>` : ''}
        <div class="flex justify-between">
          <span>Tax (12.5%):</span>
          <span>${formattedTax}</span>
        </div>
        <div class="flex justify-between font-bold text-sm mt-1">
          <span>TOTAL:</span>
          <span>${formattedTotal}</span>
        </div>
        ${doc.deposit > 0 ? `<div class="flex justify-between">
          <span>Deposit:</span>
          <span>-${formattedDeposit}</span>
        </div>` : ''}
        ${doc.balanceDue > 0 ? `<div class="flex justify-between font-bold">
          <span>Balance Due:</span>
          <span>${formattedBalanceDue}</span>
        </div>` : ''}
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      ${doc.signature ? `
        <div class="mb-2">
          <p class="text-center text-[10px]">RECEIVED</p>
          <div class="h-12 border-b border-foreground my-1"></div>
          <p class="text-center text-[10px]">Date & Signature</p>
        </div>
      ` : ''}
      ${doc.message ? `<p class="text-center text-[10px] italic my-2">${doc.message}</p>` : ''}
      <div class="text-center mt-4">
        <p class="font-bold">Thank you for your business!</p>
        <p class="text-[10px] mt-1">Printed: ${formattedPrintDate}</p>
      </div>
    `;
  };

  const handlePrint = async (docId: string) => {
    const doc = getDocument(docId);
    if (!doc) {
      toast.error('Document not found');
      return;
    }

    // If printer is connected, use Bluetooth printer
    if (isConnected) {
      try {
        // Transform document to ReceiptData format
        const receiptData: ReceiptData = {
          companyName: COMPANY_INFO.name,
          companyAddress: COMPANY_INFO.address,
          companyPhone: COMPANY_INFO.phone,
          documentType: doc.type.replace('_', ' '), // e.g., "credit_note" -> "credit note"
          refNumber: doc.refNumber,
          date: format(doc.date, 'dd/MM/yyyy HH:mm'),
          customerName: doc.customer.name,
          items: doc.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            amount: item.amount,
          })),
          subtotal: doc.subtotal,
          discount: doc.discount,
          tax: doc.tax,
          total: doc.total,
          deposit: doc.deposit,
          balanceDue: doc.balanceDue,
          salesRep: doc.salesRep,
        };

        const success = await printReceipt(receiptData);
        if (success) {
          toast.success('Document printed successfully');
        } else {
          toast.error('Failed to print document. Please try again.');
        }
      } catch (error: any) {
        console.error('Print error:', error);
        toast.error(error.message || 'Failed to print document. Please try again.');
      }
    } else {
      // If printer not connected, use browser print (PDF)
      printAsPDF(doc);
    }
  };

  const printAsPDF = (doc: any) => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print PDF');
        return;
      }

      // Write HTML content with ReceiptPrintView rendered
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print ${doc.refNumber}</title>
            <style>
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 10mm;
                  font-family: monospace;
                  font-size: 12px;
                }
              }
              body {
                font-family: monospace;
                font-size: 12px;
                padding: 20px;
                background: white;
                color: black;
              }
              .text-center { text-align: center; }
              .mb-4 { margin-bottom: 16px; }
              .mb-2 { margin-bottom: 8px; }
              .mt-4 { margin-top: 16px; }
              .mt-1 { margin-top: 4px; }
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              .mb-1 { margin-bottom: 4px; }
              .pl-2 { padding-left: 8px; }
              .font-bold { font-weight: bold; }
              .text-sm { font-size: 14px; }
              .text-\\[10px\\] { font-size: 10px; }
              .italic { font-style: italic; }
              .border-t { border-top: 1px solid black; }
              .border-dashed { border-style: dashed; }
              .border-foreground { border-color: black; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .text-right { text-align: right; }
              .h-12 { height: 48px; }
              .border-b { border-bottom: 1px solid black; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="module">
              // We'll inject React component via React.createElement
              // For now, we'll render the receipt HTML directly
              const root = document.getElementById('root');
              root.innerHTML = \`${generateReceiptHTML(doc)}\`;
              
              // Trigger print after content loads
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 250);
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    } catch (error: any) {
      console.error('PDF print error:', error);
      toast.error('Failed to open print dialog');
    }
  };

  const generateReceiptHTML = (doc: any): string => {
    // Format all dates and currency values before generating HTML
    const formattedDate = format(doc.date, 'dd/MM/yyyy HH:mm');
    const formattedDueDate = doc.dueDate ? format(doc.dueDate, 'dd/MM/yyyy') : '';
    const formattedPrintDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-TT', {
        style: 'currency',
        currency: 'TTD'
      }).format(amount);
    };

    // Format all currency values
    const formattedItems = doc.items.map((item: any, index: number) => ({
      ...item,
      formattedUnitPrice: formatCurrency(item.unitPrice),
      formattedAmount: formatCurrency(item.amount),
      index: index + 1,
    }));

    const formattedSubtotal = formatCurrency(doc.subtotal);
    const formattedDiscount = formatCurrency(doc.discount);
    const formattedTax = formatCurrency(doc.tax);
    const formattedTotal = formatCurrency(doc.total);
    const formattedDeposit = formatCurrency(doc.deposit);
    const formattedBalanceDue = formatCurrency(doc.balanceDue);

    return `
      <div class="text-center mb-4">
        <p class="font-bold text-sm">THE XYZ Company Ltd. LTD.</p>
        <p>22 Macoya Road West</p>
        <p>Macoya Industrial Estate, Tunapuna</p>
        <p>Trinidad & Tobago</p>
        <p>+1(868)739-5025</p>
        <p>www.royaldatesgalore.com</p>
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      <div class="mb-2">
        <div class="flex justify-between">
          <span>${doc.type.toUpperCase().replace('_', ' ')}</span>
          <span>${doc.refNumber}</span>
        </div>
        <div class="flex justify-between">
          <span>Date:</span>
          <span>${formattedDate}</span>
        </div>
        ${doc.dueDate ? `<div class="flex justify-between">
          <span>Due:</span>
          <span>${formattedDueDate}</span>
        </div>` : ''}
        <div class="flex justify-between">
          <span>Sales Rep:</span>
          <span>${doc.salesRep}</span>
        </div>
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      <div class="mb-2">
        <p class="font-bold">BILL TO:</p>
        <p>${doc.customer.name}</p>
        <p class="text-[10px]">${doc.customer.billingAddress}</p>
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      <div class="mb-2">
        ${formattedItems.map((item: any) => `
          <div class="mb-1">
            <p class="font-bold">${item.index}. ${item.description}</p>
            <div class="flex justify-between pl-2">
              <span>${item.quantity} x ${item.formattedUnitPrice}</span>
              <span>${item.formattedAmount}</span>
            </div>
            ${item.discount > 0 ? `<p class="text-right text-[10px]">Disc: -${item.discount}%</p>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      <div class="mb-2">
        <div class="flex justify-between">
          <span>Subtotal:</span>
          <span>${formattedSubtotal}</span>
        </div>
        ${doc.discount > 0 ? `<div class="flex justify-between">
          <span>Discount:</span>
          <span>-${formattedDiscount}</span>
        </div>` : ''}
        <div class="flex justify-between">
          <span>Tax (12.5%):</span>
          <span>${formattedTax}</span>
        </div>
        <div class="flex justify-between font-bold text-sm mt-1">
          <span>TOTAL:</span>
          <span>${formattedTotal}</span>
        </div>
        ${doc.deposit > 0 ? `<div class="flex justify-between">
          <span>Deposit:</span>
          <span>-${formattedDeposit}</span>
        </div>` : ''}
        ${doc.balanceDue > 0 ? `<div class="flex justify-between font-bold">
          <span>Balance Due:</span>
          <span>${formattedBalanceDue}</span>
        </div>` : ''}
      </div>
      <div class="border-t border-dashed border-foreground my-2"></div>
      ${doc.signature ? `
        <div class="mb-2">
          <p class="text-center text-[10px]">RECEIVED</p>
          <div class="h-12 border-b border-foreground my-1"></div>
          <p class="text-center text-[10px]">Date & Signature</p>
        </div>
      ` : ''}
      ${doc.message ? `<p class="text-center text-[10px] italic my-2">${doc.message}</p>` : ''}
      <div class="text-center mt-4">
        <p class="font-bold">Thank you for your business!</p>
        <p class="text-[10px] mt-1">Printed: ${formattedPrintDate}</p>
      </div>
    `;
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">{title}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Manage your {title.toLowerCase()}
            </p>
          </div>
          {!isStockKeeper && (
            <Button
              onClick={() =>
                navigate(`/${type === 'credit_note' ? 'credit-notes' : type + 's'}/new`)
              }
              className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              New {title.replace(/s$/, '')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by reference or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-40 text-sm">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {(type === 'estimate'
                ? ESTIMATE_STATUS_FILTER_OPTIONS
                : type === 'invoice'
                ? INVOICE_STATUS_FILTER_OPTIONS
                : type === 'credit_note'
                ? CREDIT_NOTE_STATUS_FILTER_OPTIONS
                : type === 'refund'
                ? REFUND_STATUS_FILTER_OPTIONS
                : RECEIPT_STATUS_FILTER_OPTIONS
              ).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Table */}
        <div className="glass-card rounded-xl overflow-hidden hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                {type === 'invoice' && <TableHead>Due Date</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Sales Rep</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {type !== 'credit_note' && type !== 'refund' && (
                  <TableHead className="text-right">{type === 'receipt' ? 'Source' : 'Balance'}</TableHead>
                )}
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    {type === 'invoice' && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    {type !== 'credit_note' && type !== 'refund' && <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>}
                    <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={type === 'invoice' ? 9 : type === 'credit_note' || type === 'refund' ? 7 : 8} className="text-center py-8 text-muted-foreground text-sm">
                    No {title.toLowerCase()} found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="font-mono font-medium text-sm">{doc.refNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{doc.customer.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-32">{doc.customer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{format(doc.date, 'MMM d, yyyy')}</TableCell>
                    {type === 'invoice' && (
                      <TableCell className="text-sm">
                        {doc.dueDate ? format(doc.dueDate, 'MMM d, yyyy') : '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="text-sm">{doc.salesRep}</TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(doc.total)}
                    </TableCell>
                    {type !== 'credit_note' && type !== 'refund' && (
                      <TableCell className="text-right text-sm">
                        {type === 'receipt' ? (
                          // Receipt source logic
                          doc.saleType === 'cash' ? (
                            <span className="text-success">Cash</span>
                          ) : doc.saleType === 'invoice' && doc.invoiceId ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto px-0 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/invoices/${doc.invoiceId}`);
                              }}
                            >
                              {doc.invoiceNumber || 'View Invoice'}
                            </Button>
                          ) : (
                            <span className="text-success">Cash</span>
                          )
                        ) : (
                          // Invoice/Estimate balance logic
                          doc.balanceDue > 0 ? (
                            <span className="text-warning font-medium">
                              {formatCurrency(doc.balanceDue)}
                            </span>
                          ) : doc.balanceDue < 0 ? (
                            <span className="text-info font-medium">
                              Overpaid ({formatCurrency(Math.abs(doc.balanceDue))})
                            </span>
                          ) : (
                            <span className="text-success">Paid</span>
                          )
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(doc.id)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        {type === 'invoice' && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto px-0 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/${doc.id}/edits`);
                            }}
                          >
                            See invoice edits
                          </Button>
                        )}
                        {type === 'estimate' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleConvertToInvoice(doc.id)}
                            title={doc.status === 'converted' ? 'Estimate already converted' : 'Convert to Invoice'}
                            disabled={doc.status === 'converted'}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {type === 'invoice' && !isLoading && filteredDocuments.length > 0 && (
            <div className="p-4 border-t border-border flex justify-center">
              {invoiceHasMore ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicePage((p) => p + 1)}
                  disabled={isLoadingMoreInvoices}
                  className="text-sm"
                >
                  {isLoadingMoreInvoices ? 'Loading...' : 'Load more'}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">All invoices loaded</p>
              )}
            </div>
          )}
          {type === 'receipt' && !isLoading && filteredDocuments.length > 0 && (
            <div className="p-4 border-t border-border flex justify-center">
              {receiptHasMore ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReceiptPage((p) => p + 1)}
                  disabled={isLoadingMoreReceipts}
                  className="text-sm"
                >
                  {isLoadingMoreReceipts ? 'Loading...' : 'Load more'}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">All receipts loaded</p>
              )}
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`mobile-skeleton-${idx}`} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))
          ) : filteredDocuments.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center text-muted-foreground text-sm">
              No {title.toLowerCase()} found
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div key={doc.id} className="glass-card rounded-xl p-4" >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-medium text-sm">{doc.refNumber}</p>
                    <p className="text-sm truncate">{doc.customer.name}</p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{format(doc.date, 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium">{formatCurrency(doc.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sales Rep</p>
                    <p className="font-medium truncate">{doc.salesRep}</p>
                  </div>
                  {type !== 'credit_note' && type !== 'refund' && (
                    <div>
                      <p className="text-muted-foreground">{type === 'receipt' ? 'Source' : 'Balance'}</p>
                      {type === 'receipt' ? (
                        // Receipt source logic
                        doc.saleType === 'cash' ? (
                          <p className="font-medium text-success">Cash</p>
                        ) : doc.saleType === 'invoice' && doc.invoiceId ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto px-0 text-xs font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/${doc.invoiceId}`);
                            }}
                          >
                            {doc.invoiceNumber || 'View Invoice'}
                          </Button>
                        ) : (
                          <p className="font-medium text-success">Cash</p>
                        )
                      ) : (
                        // Invoice/Estimate balance logic
                        <p className={`font-medium ${doc.balanceDue > 0 ? 'text-warning' : doc.balanceDue < 0 ? 'text-info' : 'text-success'}`}>
                          {doc.balanceDue > 0 
                            ? formatCurrency(doc.balanceDue) 
                            : doc.balanceDue < 0 
                            ? `Overpaid (${formatCurrency(Math.abs(doc.balanceDue))})`
                            : 'Paid'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                      onClick={(e) => {
                      e.stopPropagation();
                      // For APPROVED credit notes, navigate to view page; for DRAFT, navigate to edit page
                      // For REFUNDED refunds, navigate to view page; for DRAFT, navigate to edit page
                if (type === 'credit_note' && doc.status === 'APPROVED') {
                  navigate(`/credit-notes/${doc.id}/view`);
                } else if (type === 'refund' && doc.status === 'REFUNDED') {
                  navigate(`/refunds/${doc.id}/view`);
                } else {
                  navigate(`/${type === 'credit_note' ? 'credit-notes' : type === 'refund' ? 'refunds' : type + 's'}/${doc.id}`);
                }
                    }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); handlePrint(doc.id); }} disabled={!isConnected}>
                    <Printer className="h-3.5 w-3.5 mr-1" /> Print
                  </Button>
                  {type === 'invoice' && (
                    <Button
                      variant="link"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/invoices/${doc.id}/edits`);
                      }}
                    >
                      See invoice edits
                    </Button>
                  )}
                  {type === 'estimate' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleConvertToInvoice(doc.id); }}
                      disabled={doc.status === 'converted'}
                      title={doc.status === 'converted' ? 'Estimate already converted' : 'Convert to Invoice'}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1" /> Convert
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
