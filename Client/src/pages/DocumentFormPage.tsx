import { useState, useEffect, useRef, useMemo } from 'react';
import api from '@/services/api';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePOS } from '@/contexts/POSContext';
import { SignaturePad } from '@/components/common/SignaturePad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Save,
  Trash2,
  Plus,
  QrCode,
  ArrowLeft
} from 'lucide-react';
import { DocumentType, LineItem, SalesDocument, Customer, DocumentStatus } from '@/types/pos';
import { mockProducts, generateRefNumber } from '@/data/mockData';
import { toast } from 'sonner';
import { useBluetoothPrinter, ReceiptData } from '@/hooks/useBluetoothPrinter';
import { format } from 'date-fns';
import {
  calculateInvoice,
  canAcceptDeposit,
  calculateItemAmount,
  InvoiceCalculationResult,
} from '@/utils/invoiceCalculations';

interface DocumentFormPageProps {
  type: DocumentType;
  title: string;
}

export default function DocumentFormPage({ type, title }: DocumentFormPageProps) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    addDocument, 
    updateDocument, 
    getDocument, 
    triggerScan,
    deviceStatus 
  } = usePOS();
  const { printReceipt, isConnected: isPrinterConnected } = useBluetoothPrinter();

  const isNew = id === 'new';
  const convertFromId = searchParams.get('from');
  const convertFromState = (location.state as any)?.convertFrom;
  const invoiceState = (location.state as any)?.invoice;
  const isConvertedFromEstimate = type === 'invoice' && isNew && !!convertFromState;
  const isInvoiceEditView = type === 'invoice' && !isNew;

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [apiCustomers, setApiCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [hasFetchedCustomers, setHasFetchedCustomers] = useState(false);
  const customersAbortRef = useRef<AbortController | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [terms, setTerms] = useState('Net 15');
  const [message, setMessage] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [selectedSalesRepName, setSelectedSalesRepName] = useState('');
  const [salesReps, setSalesReps] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingSalesReps, setIsLoadingSalesReps] = useState(false);
  const [salesRepsError, setSalesRepsError] = useState<string | null>(null);
  const [hasFetchedSalesReps, setHasFetchedSalesReps] = useState(false);
  const salesRepsAbortRef = useRef<AbortController | null>(null);
  // Signature stored as base64 string (without data URL prefix) - ready for API transmission
  const [signature, setSignature] = useState<string | undefined>();
  const [deposit, setDeposit] = useState(0);
  const [existingDeposit, setExistingDeposit] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other'>('cash');
  const [refNumber, setRefNumber] = useState(
    type === 'estimate' ? '' : generateRefNumber(type)
  );
  const [creditNoteStatus, setCreditNoteStatus] = useState<'DRAFT' | 'APPROVED' | null>(null);
  const [refundStatus, setRefundStatus] = useState<'DRAFT' | 'REFUNDED' | null>(null);
  const [selectedCreditNoteId, setSelectedCreditNoteId] = useState<string>('');
  const [refundSource, setRefundSource] = useState<'FROM_CREDITNOTE' | 'STANDALONE'>('STANDALONE');

  const effectiveCustomers = apiCustomers;
    const getCustomerId = (customer: Customer, index?: number) =>
      customer.id ||
      (customer as any)._id ||
      (typeof index === 'number' ? `customer-${index}` : undefined);
  const formatAddress = (address: unknown): string => {
    if (!address) {
      return '';
    }
    if (typeof address === 'string') {
      return address;
    }
    if (typeof address === 'object') {
      const addr = address as {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      const parts = [
        addr.street,
        addr.city,
        addr.state,
        addr.postalCode,
        addr.country,
      ].filter((part) => typeof part === 'string' && part.trim().length > 0);
      if (parts.length) {
        return parts.join(', ');
      }
    }
    return String(address);
  };

  const applyEstimateToForm = (estimateState: any) => {
    if (!estimateState) {
      return;
    }
    if (estimateState.reference && estimateState.reference !== id) {
      return;
    }
    const customerSource =
      estimateState.customer ||
      estimateState.customerId ||
      {};
    const customerId =
      customerSource.id ||
      customerSource._id ||
      estimateState.customerId ||
      '';
    const customerName =
      customerSource.name ||
      estimateState.customerName ||
      '';
    const customerEmail =
      customerSource.email ||
      estimateState.customerEmail ||
      '';
    const customerPhone =
      customerSource.phone ||
      estimateState.customerPhone ||
      '';
    const customerBilling =
      customerSource.billingAddress ||
      estimateState.billingAddress ||
      estimateState.customerBillingAddress ||
      '';
    const customerShipping =
      customerSource.shippingAddress ||
      estimateState.shippingAddress ||
      estimateState.customerShippingAddress ||
      '';
    const mappedCustomer: Customer = {
      id: customerId,
      name: customerName || '',
      email: customerEmail || '',
      phone: customerPhone || '',
      billingAddress: formatAddress(customerBilling),
      shippingAddress: formatAddress(customerShipping),
    };
    const salesRepObject = estimateState.salesRep;
    const salesRepId =
      estimateState.salesRepId ||
      salesRepObject?._id ||
      salesRepObject?.id ||
      (typeof salesRepObject === 'string' ? salesRepObject : '') ||
      '';
    const salesRepName =
      estimateState.salesRepName ||
      estimateState.salesRepLabel ||
      salesRepObject?.fullName ||
      salesRepObject?.name ||
      salesRepObject?.email ||
      (typeof salesRepObject === 'string' ? salesRepObject : '') ||
      '';
    const isObjectIdLike =
      typeof salesRepName === 'string' && /^[a-fA-F0-9]{24}$/.test(salesRepName);
    setSelectedCustomer(mappedCustomer);
    setItems(mapEstimateItems(Array.isArray(estimateState.items) ? estimateState.items : []));
    setMessage(estimateState.message || '');
    setSignature(normalizeSignature(estimateState.signature));
    setSalesRep(salesRepId);
    setSelectedSalesRepName(isObjectIdLike ? '' : salesRepName);
    setRefNumber(estimateState.reference || '');
    setDeposit(0);
  };

  const applyInvoiceToForm = (invoice: any) => {
    if (!invoice) return;

    const productDetails = Array.isArray(invoice.productDetails)
      ? invoice.productDetails
      : Array.isArray(invoice.items)
      ? invoice.items
      : [];
    
    // Get customer info from the backend response
    const customerId = invoice.customerId || '';
    const customerName = invoice.customerName || '';
    const customerEmail = invoice.customerEmail || '';
    const customerPhone = invoice.customerPhone || '';
    const customerBilling = invoice.customerBillingAddress || '';
    const customerShipping = invoice.customerShippingAddress || '';
    
    const mappedCustomer: Customer = {
      id: customerId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      billingAddress: formatAddress(customerBilling),
      shippingAddress: formatAddress(customerShipping),
    };

    // Map items from backend - backend stores amount, we need to derive unitPrice
    const mappedItems: LineItem[] = Array.isArray(productDetails)
      ? productDetails.map((item: any, index: number) => {
          const quantity = Number(item?.quantity ?? 0);
          const discount = Number(item?.discount ?? 0);
          const amount = Number(item?.amount ?? 0);
          // Derive unit price from amount: amount = qty * price * (1 - discount/100)
          const discountFactor = 1 - (discount || 0) / 100;
          const price =
            quantity > 0 && discountFactor !== 0
              ? amount / (quantity * discountFactor)
              : 0;
          return {
            id: item?._id || `invoice-item-${index}`,
            productCode: item?.productCode || '',
            description: item?.description || '',
            quantity: Number.isFinite(quantity) ? quantity : 0,
            unitPrice: Number.isFinite(price) ? Number(price.toFixed(2)) : 0,
            discount: Number.isFinite(discount) ? discount : 0,
            amount: Number.isFinite(amount) ? amount : 0,
          };
        })
      : [];

    setSelectedCustomer(mappedCustomer);
    setItems(mappedItems);
    setMessage(invoice.message || '');
    setSignature(normalizeSignature(invoice.signature));
    
    // Normalize payment terms to one of the allowed options
    const term = (invoice.paymentTerms || invoice.paymentTerm || '').toString();
    const termMapping: Record<string, string> = {
      'dueonreceipt': 'Due on receipt',
      'net7': 'Net 7',
      'net15': 'Net 15',
      'net30': 'Net 30',
      'net60': 'Net 60',
    };
    const normalizedTerm = term.toLowerCase().replace(/\s+/g, '');
    const matchedTerm = termMapping[normalizedTerm] || term || terms;
    setTerms(matchedTerm);
    
    // Use backend-calculated deposit value (source of truth)
    const totalDeposit = Number(invoice.totalDepositReceived ?? invoice.depositReceived ?? 0);
    setExistingDeposit(totalDeposit);
    // For edit view, start with 0 additional deposit (user can add more)
    // For non-edit view, use the total deposit
    setDeposit(isInvoiceEditView ? 0 : totalDeposit);
    setRefNumber(invoice.invoiceReferenceNumber || invoice.invoiceNumber || refNumber);

    // Handle sales rep - backend now returns salesRepId and salesRepName directly
    const salesRepId = invoice.salesRepId || '';
    const salesRepName = invoice.salesRepName || '';
    const isObjectIdLike =
      typeof salesRepName === 'string' && /^[a-fA-F0-9]{24}$/.test(salesRepName);
    setSalesRep(typeof salesRepId === 'string' ? salesRepId : String(salesRepId || ''));
    setSelectedSalesRepName(isObjectIdLike ? '' : salesRepName);
  };

  const mapEstimateItems = (incoming: any[]): LineItem[] => {
    return incoming.map((item, index) => {
      const quantity = Number(item?.quantity ?? 0);
      const discount = Number(item?.discount ?? 0);
      const rawAmount = Number(item?.amount ?? 0);
      const price = Number(item?.price ?? item?.unitPrice ?? 0);
      const discountFactor = 1 - discount / 100;
      // Prefer explicit amount; otherwise compute from price and quantity.
      const computedAmount =
        rawAmount > 0
          ? rawAmount
          : quantity > 0
          ? Number((quantity * price * discountFactor).toFixed(2))
          : 0;
      const unitPrice =
        quantity > 0 && discountFactor > 0
          ? Number((computedAmount / quantity / discountFactor).toFixed(2))
          : price;
      return {
        id: item?.id || `estimate-item-${index}`,
        productCode: item?.productCode || '',
        description: item?.description || '',
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        discount: Number.isFinite(discount) ? discount : 0,
        amount: Number.isFinite(computedAmount)
          ? computedAmount
          : Number((quantity * unitPrice * discountFactor).toFixed(2)),
      };
    });
  };

  // Helper to normalize signature format - extract base64 from data URL if needed
  // This ensures signatures are stored as plain base64 strings for API transmission
  const normalizeSignature = (sig: string | undefined): string | undefined => {
    if (!sig) return undefined;
    // If it's already just base64 (no data URL prefix), return as-is
    if (!sig.startsWith('data:')) return sig;
    // Otherwise, extract the base64 portion (remove 'data:image/png;base64,' prefix)
    return sig.split(',')[1] || sig;
  };

  // Load existing document if editing
  useEffect(() => {
    if (!isNew && id) {
      if (type === 'estimate') {
        return;
      }
      if (type === 'invoice') {
        // Prefer invoice passed via navigation state
        if (invoiceState) {
          applyInvoiceToForm(invoiceState);
          return;
        }
        // Fallback: try local store
        const doc = getDocument(id);
        if (doc) {
          applyInvoiceToForm(doc);
        }
      }
    }
    // Load from estimate if converting
    if (convertFromId) {
      const doc = getDocument(convertFromId);
      if (doc) {
        setSelectedCustomer(doc.customer);
        setItems(doc.items);
        setMessage(`Converted from ${doc.refNumber}`);
      }
    }
    if (type === 'invoice' && isNew && convertFromState) {
      const estimateState = convertFromState;
      const customer = estimateState.customer || {};
      const mappedCustomer: Customer = {
        id: customer.id || customer._id || '',
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        billingAddress: formatAddress(customer.billingAddress),
        shippingAddress: formatAddress(customer.shippingAddress),
      };
      setSelectedCustomer(mappedCustomer);
      setItems(mapEstimateItems(Array.isArray(estimateState.items) ? estimateState.items : []));
      const estimateRef = estimateState.refNumber || estimateState.reference || '';
      const baseMessage = estimateState.message || '';
      const postfix = estimateRef ? ` Converted from estimate ${estimateRef}` : ' Converted from estimate';
      setMessage(`${baseMessage}${postfix}`);
      setSignature(normalizeSignature(estimateState.signature));
      const salesRepValue = estimateState.salesRepId || estimateState.salesRep || '';
      setSalesRep(salesRepValue);
      setSelectedSalesRepName(estimateState.salesRep || '');
      setDeposit(estimateState.deposit || 0);
    }
  }, [id, isNew, convertFromId, getDocument, type, convertFromState, invoiceState]);

  useEffect(() => {
    if (type !== 'estimate' || !id || id === 'new') {
      return;
    }
    const estimateState = (location.state as any)?.estimate;
    if (!estimateState) {
      return;
    }
    applyEstimateToForm(estimateState);
  }, [type, id, location.state]);

  useEffect(() => {
    const fetchEstimate = async () => {
      if (type !== 'estimate' || !id || id === 'new') {
        return;
      }
      const estimateState = (location.state as any)?.estimate;
      if (estimateState) {
        return;
      }
      try {
        const token = localStorage.getItem('token') || '';
        const response = await api.get(`/api/v1/estimate/${id}`, {
          params: {
            token,
            id,
          },
        });
        applyEstimateToForm(response.data?.estimate);
      } catch (error) {
        console.error('Estimate fetch error:', error);
        toast.error('Unable to load estimate');
      }
    };

    fetchEstimate();
  }, [type, id, location.state]);

  // Fetch invoice details when editing an invoice (if not provided via state)
  useEffect(() => {
    const fetchInvoice = async () => {
      if (type !== 'invoice' || !id || id === 'new') {
        return;
      }
      if (invoiceState) {
        return;
      }
      try {
        const response = await api.get(`/api/v1/invoice/${id}`);
        applyInvoiceToForm(response.data?.invoice);
      } catch (error) {
        console.error('Invoice fetch error:', error);
        toast.error('Unable to load invoice');
      }
    };

    fetchInvoice();
  }, [type, id, invoiceState]);

  // Fetch credit note details when viewing a credit note
  useEffect(() => {
    const fetchCreditNote = async () => {
      if (type !== 'credit_note' || !id || id === 'new') {
        return;
      }
      try {
        const response = await api.get(`/api/v1/credit-notes/${id}`);
        const cn = response.data?.creditNote;
        if (cn) {
          // Set status
          setCreditNoteStatus(cn.status || null);
          
          // If APPROVED, redirect to view page
          if (cn.status === 'APPROVED') {
            navigate(`/credit-notes/${id}/view`, { replace: true });
            return;
          }
          
          // Set customer
          if (cn.customerId) {
            const customer = {
              id: cn.customerId,
              name: cn.customerName || '',
              email: cn.customerEmail || '',
              phone: cn.customerPhone || '',
              billingAddress: cn.customerBillingAddress || '',
              shippingAddress: cn.customerShippingAddress || '',
            };
            setSelectedCustomer(customer);
          }
          
          // Set sales rep
          if (cn.salesRepId) {
            setSalesRep(cn.salesRepId);
            setSelectedSalesRepName(cn.salesRepName || '');
          }
          
          // Set items/products
          const mappedItems = (cn.products || []).map((p: any, idx: number) => ({
            id: `item-${idx}`,
            productCode: p.productCode || '',
            description: p.description || '',
            quantity: p.quantity || 0,
            unitPrice: p.price || 0,
            discount: 0,
            amount: (p.quantity || 0) * (p.price || 0),
          }));
          setItems(mappedItems);
          
          // Set message and signature
          if (cn.message) {
            setMessage(cn.message);
          }
          if (cn.salesRepSignature) {
            setSignature(cn.salesRepSignature);
          }
          
          // Set ref number
          if (cn.creditNoteNumber) {
            setRefNumber(cn.creditNoteNumber);
          }
        }
      } catch (error) {
        console.error('Credit note fetch error:', error);
        toast.error('Unable to load credit note');
      }
    };

    fetchCreditNote();
  }, [type, id, navigate]);

  // Fetch refund details when viewing a refund
  useEffect(() => {
    const fetchRefund = async () => {
      if (type !== 'refund' || !id || id === 'new') {
        return;
      }
      try {
        const response = await api.get(`/api/v1/refunds/${id}`);
        const ref = response.data?.refund;
        if (ref) {
          // Set status
          setRefundStatus(ref.status || null);
          
          // If REFUNDED, redirect to view page
          if (ref.status === 'REFUNDED') {
            navigate(`/refunds/${id}/view`, { replace: true });
            return;
          }
          
          // Set source
          setRefundSource(ref.source || 'STANDALONE');
          if (ref.creditNoteId) {
            setSelectedCreditNoteId(ref.creditNoteId);
          }
          
          // Set customer
          if (ref.customerId) {
            const customer = {
              id: ref.customerId,
              name: ref.customerName || '',
              email: ref.customerEmail || '',
              phone: ref.customerPhone || '',
              billingAddress: ref.customerBillingAddress || '',
              shippingAddress: ref.customerShippingAddress || '',
            };
            setSelectedCustomer(customer);
          }
          
          // Set sales rep
          if (ref.salesRepId) {
            setSalesRep(ref.salesRepId);
            setSelectedSalesRepName(ref.salesRepName || '');
          }
          
          // Set items/products
          const mappedItems = (ref.products || []).map((p: any, idx: number) => ({
            id: `item-${idx}`,
            productCode: p.productCode || '',
            description: p.description || '',
            quantity: p.quantity || 0,
            unitPrice: p.price || 0,
            discount: 0,
            amount: (p.quantity || 0) * (p.price || 0),
          }));
          setItems(mappedItems);
          
          // Set message and signature
          if (ref.message) {
            setMessage(ref.message);
          }
          if (ref.salesRepSignature) {
            setSignature(ref.salesRepSignature);
          }
          
          // Set ref number
          if (ref.refundNumber) {
            setRefNumber(ref.refundNumber);
          }
        }
      } catch (error) {
        console.error('Refund fetch error:', error);
        toast.error('Unable to load refund');
      }
    };

    fetchRefund();
  }, [type, id, navigate]);

  useEffect(() => {
    if (selectedCustomer && !hasFetchedCustomers) {
      loadCustomers();
    }
    if (salesRep && !hasFetchedSalesReps) {
      loadSalesReps();
    }
  }, [selectedCustomer, salesRep, hasFetchedCustomers, hasFetchedSalesReps]);

  const loadCustomers = async () => {
    if (isLoadingCustomers || hasFetchedCustomers) {
      return;
    }
    setIsLoadingCustomers(true);
    setCustomersError(null);
    try {
      const stored = localStorage.getItem('customerNames');
      const rawCustomers = stored ? JSON.parse(stored) : [];
      const safeCustomers = Array.isArray(rawCustomers) ? rawCustomers : [];
      const mappedCustomers: Customer[] = safeCustomers
        .map((customer: any, index: number) => ({
          id: customer?.id || `customer-${index}`,
          name: customer?.name || '',
          email: '',
          phone: '',
          billingAddress: customer?.billingAddress || '',
          shippingAddress: customer?.shippingAddress || '',
        }))
        .filter((customer) => customer.id && customer.name);
      setApiCustomers(mappedCustomers);
      setHasFetchedCustomers(true);
      if (mappedCustomers.length === 0) {
        setCustomersError('No customers found');
      }
    } catch (error: any) {
      console.error('Customer fetch error:', error);
      setCustomersError('Unable to load customers');
      setApiCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const loadSalesReps = async () => {
    if (isLoadingSalesReps || hasFetchedSalesReps) {
      return;
    }
    setIsLoadingSalesReps(true);
    setSalesRepsError(null);
    try {
      const stored = localStorage.getItem('salesReps');
      const reps = stored ? JSON.parse(stored) : [];
      const safeReps = Array.isArray(reps) ? reps : [];
      const mapped = safeReps
        .map((rep: any, index: number) => ({
          id: rep?.id || rep?.email || `sales-rep-${index}`,
          name: rep?.name || rep?.email || 'Unnamed Sales Rep',
        }))
        .filter((rep: any) => rep.name);
      setSalesReps(mapped);
      // Preserve existing selection if provided (e.g., from invoice/estimate)
      const selectedRep = mapped.find((rep) => rep.id === salesRep);
      const matchByName =
        !selectedRep && selectedSalesRepName
          ? mapped.find(
              (rep) => rep.name.toLowerCase() === selectedSalesRepName.toLowerCase()
            )
          : undefined;

      if (selectedRep) {
        setSelectedSalesRepName(selectedRep.name);
      } else if (matchByName) {
        setSalesRep(matchByName.id);
        setSelectedSalesRepName(matchByName.name);
      }
      setHasFetchedSalesReps(true);
      if (mapped.length === 0) {
        setSalesRepsError('No sales representatives found');
      }
    } catch (error: any) {
      console.error('Sales rep fetch error:', error);
      setSalesRepsError('Unable to load sales representatives');
      setSalesReps([]);
    } finally {
      setIsLoadingSalesReps(false);
    }
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      productCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const handleScan = async () => {
    const barcode = await triggerScan();
    const product = mockProducts.find(p => p.code === barcode);
    if (product) {
      const newItem: LineItem = {
        id: `item-${Date.now()}`,
        productCode: product.code,
        description: product.name,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        amount: product.price
      };
      setItems([...items, newItem]);
      toast.success(`Added: ${product.name}`);
    }
  };

  // Helper function to get base product name from description
  const getBaseProductName = (description: string): string => {
    // If description already has the format "Product Name - quantity X - discount Y%", extract base name
    const match = description.match(/^(.+?)\s*-\s*quantity/i);
    return match ? match[1].trim() : description;
  };

  // Helper function to format description with quantity and discount
  const formatDescription = (baseName: string, quantity: number, discount: number): string => {
    if (discount > 0) {
      return `${baseName} - quantity ${quantity} - discount ${discount}%`;
    }
    return baseName;
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    const currentItem = updated[index];
    const baseName = getBaseProductName(currentItem.description);
    
    (updated[index] as any)[field] = value;
    
    // Recalculate amount
    const item = updated[index];
    item.amount = item.quantity * item.unitPrice * (1 - item.discount / 100);
    
    // Auto-format description when discount or quantity changes
    if (field === 'discount' || field === 'quantity') {
      item.description = formatDescription(baseName, item.quantity, item.discount);
    }
    
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const selectProduct = (index: number, code: string) => {
    const product = mockProducts.find(p => p.code === code);
    if (product) {
      const updated = [...items];
      const currentItem = updated[index];
      const description = formatDescription(
        product.name,
        currentItem.quantity,
        currentItem.discount
      );
      updated[index] = {
        ...updated[index],
        productCode: product.code,
        description,
        unitPrice: product.price,
        amount: currentItem.quantity * product.price * (1 - currentItem.discount / 100)
      };
      setItems(updated);
    }
  };

  // Calculate subtotal before discounts (for display purposes)
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  // Calculate total discount amount
  const discountAmount = subtotalBeforeDiscount - items.reduce((sum, item) => sum + item.amount, 0);
  
  // For invoices, use the shared calculation utility (mirrors backend logic exactly)
  // This ensures client and server calculations are always consistent
  const effectiveDeposit = isInvoiceEditView ? existingDeposit + deposit : deposit;
  
  const invoiceCalculation: InvoiceCalculationResult = useMemo(() => {
    if (type !== 'invoice') {
      // For non-invoices, return a simple calculation without tax
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      return {
        subtotal,
        tax: 0,
        total: subtotal,
        depositReceived: 0,
        balanceDue: subtotal,
        due: subtotal,
        status: 'draft' as const,
      };
    }
    // Use the shared calculation utility for invoices
    return calculateInvoice({
      items: items.map(item => ({
        productCode: item.productCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        amount: item.amount,
      })),
      depositReceived: effectiveDeposit,
    });
  }, [items, effectiveDeposit, type]);
  
  // Extract calculated values
  const subtotal = invoiceCalculation.subtotal;
  const tax = invoiceCalculation.tax;
  const total = invoiceCalculation.total;
  const balanceDue = invoiceCalculation.balanceDue;
  const computedStatus: DocumentStatus = type === 'invoice' ? invoiceCalculation.status : 'draft';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD'
    }).format(amount);
  };

  // Prepare receipt data for printing
  const prepareReceiptData = (document: SalesDocument): ReceiptData => {
    return {
      companyName: 'THE XYZ Company Ltd. LTD.',
      companyAddress: '22 Macoya Road West, Macoya Industrial Estate, Tunapuna, Trinidad & Tobago',
      companyPhone: '+1(868)739-5025',
      documentType: type === 'credit_note' ? 'Credit Note' : type.charAt(0).toUpperCase() + type.slice(1),
      refNumber: document.refNumber,
      date: format(document.date, 'dd/MM/yyyy HH:mm'),
      customerName: document.customer.name,
      items: document.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        amount: item.amount
      })),
      subtotal: document.subtotal,
      discount: document.discount,
      tax: document.tax,
      total: document.total,
      deposit: document.deposit,
      balanceDue: document.balanceDue,
      salesRep: document.salesRep
    };
  };

  const handleSave = async (status: 'draft' | 'pending') => {
    if (isInvoiceEditView) {
      return;
    }
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    const selectedSalesRep =
      salesReps.find((rep) => rep.id === salesRep) || {
        id: salesRep || '',
        name: selectedSalesRepName || salesRep || '',
      };
    if (!selectedSalesRep?.id) {
      toast.error('Please select a sales representative');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Receipt validation
    if (type === 'receipt') {
      if (!signature?.trim()) {
        toast.error('Signature is required for receipts');
        return;
      }
      
      // Validate items have productCode
      const invalidItems = items.filter(item => !item.productCode?.trim());
      if (invalidItems.length > 0) {
        toast.error('All items must have a product code');
        return;
      }

      // Validate all items have valid quantities and prices
      const invalidItemData = items.filter(
        item => !item.quantity || item.quantity <= 0 || !item.unitPrice || item.unitPrice < 0
      );
      if (invalidItemData.length > 0) {
        toast.error('All items must have valid quantity (> 0) and price (>= 0)');
        return;
      }

      // For receipts: draft = save draft (print: false), pending = save and print (status: completed, print: true)
      const receiptStatus = status === 'draft' ? 'draft' : 'completed';
      const shouldPrint = status === 'pending';

      const receiptPayload = {
        customerId: getCustomerId(selectedCustomer),
        salesRepId: selectedSalesRep.id,
        saleType: 'cash', // Only cash sales allowed
        items: items.map((item) => ({
          productCode: item.productCode.trim(),
          description: item.description?.trim() || undefined,
          quantity: item.quantity,
          price: item.unitPrice,
          discount: item.discount || 0,
        })),
        message: message?.trim() || undefined,
        signature: signature.trim(),
        status: receiptStatus,
        print: shouldPrint,
      };

      try {
        const response = await api.post('/api/v1/receipt', receiptPayload);
        toast.success('Receipt created successfully');
        
        // If print is true and printer is connected, print the receipt
        if (shouldPrint && isPrinterConnected) {
          try {
            // Calculate receipt totals for printing
            const receiptSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
            const receiptTax = Number((receiptSubtotal * 0.125).toFixed(2));
            const receiptTotal = Number((receiptSubtotal + receiptTax).toFixed(2));
            
            // Build receipt document for printing
            const receiptDocument: SalesDocument = {
              id: response.data?.receipt?.id || `DOC-${Date.now()}`,
              type: 'receipt',
              refNumber: response.data?.receipt?.receiptNumber || refNumber,
              date: new Date(),
              customer: selectedCustomer,
              items,
              subtotal: receiptSubtotal,
              discount: discountAmount,
              tax: receiptTax,
              total: receiptTotal,
              balanceDue: 0,
              deposit: receiptTotal,
              status: 'completed',
              salesRep: selectedSalesRep?.name || '',
              signature,
              message,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            const receiptData = prepareReceiptData(receiptDocument);
            const printSuccess = await printReceipt(receiptData);
            if (printSuccess) {
              toast.success('Receipt saved and printed successfully');
            } else {
              toast.error('Receipt saved but printing failed. Please check printer connection.');
            }
          } catch (error) {
            console.error('Print error:', error);
            toast.error('Receipt saved but printing failed. Please check printer connection.');
          }
        }

        navigate('/receipts');
        return;
      } catch (error: any) {
        console.error('Create receipt error:', error);
        const errorMessage = error.response?.data?.message || 'Failed to create receipt';
        toast.error(errorMessage);
        return;
      }
    }

    // Credit note creation or update
    if (type === 'credit_note') {
      if (!signature?.trim()) {
        toast.error('Signature is required for credit notes');
        return;
      }
      
      // Validate items have productCode
      const invalidItems = items.filter(item => !item.productCode?.trim());
      if (invalidItems.length > 0) {
        toast.error('All items must have a product code');
        return;
      }

      // Validate all items have valid quantities and prices
      const invalidItemData = items.filter(
        item => !item.quantity || item.quantity <= 0 || !item.unitPrice || item.unitPrice < 0
      );
      if (invalidItemData.length > 0) {
        toast.error('All items must have valid quantity (> 0) and price (>= 0)');
        return;
      }

      // For credit notes: draft = saveDraft = true (status: DRAFT), pending = saveDraft = false (status: APPROVED)
      // Save & Print always sets status to APPROVED (no printer logic)
      const saveDraft = status === 'draft';

      const creditNotePayload = {
        customerId: getCustomerId(selectedCustomer),
        salesRepId: selectedSalesRep.id,
        products: items.map((item) => ({
          productCode: item.productCode.trim(),
          description: item.description?.trim() || undefined,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        message: message?.trim() || undefined,
        salesRepSignature: signature.trim(),
        saveDraft,
      };

      try {
        if (isNew) {
          // Create new credit note
          const response = await api.post('/api/v1/credit-notes', creditNotePayload);
          toast.success('Credit note created successfully');
          navigate('/credit-notes');
        } else {
          // Update existing DRAFT credit note
          if (creditNoteStatus !== 'DRAFT') {
            toast.error('Only draft credit notes can be edited');
            return;
          }
          const response = await api.put(`/api/v1/credit-notes/${id}`, creditNotePayload);
          toast.success('Credit note updated successfully');
          navigate('/credit-notes');
        }
        return;
      } catch (error: any) {
        console.error('Credit note save error:', error);
        const errorMessage = error.response?.data?.message || 'Failed to save credit note';
        toast.error(errorMessage);
        return;
      }
    }

    // Refund creation or update
    if (type === 'refund') {
      if (!signature?.trim()) {
        toast.error('Signature is required for refunds');
        return;
      }
      
      // Validate items have productCode
      const invalidItems = items.filter(item => !item.productCode?.trim());
      if (invalidItems.length > 0) {
        toast.error('All items must have a product code');
        return;
      }

      // Validate all items have valid quantities and prices
      const invalidItemData = items.filter(
        item => !item.quantity || item.quantity <= 0 || !item.unitPrice || item.unitPrice < 0
      );
      if (invalidItemData.length > 0) {
        toast.error('All items must have valid quantity (> 0) and price (>= 0)');
        return;
      }

      // Validate creditNoteId if source is FROM_CREDITNOTE
      let creditNoteObjectId: string | undefined = undefined;
      if (refundSource === 'FROM_CREDITNOTE') {
        if (!selectedCreditNoteId) {
          toast.error('Credit note is required when source is FROM_CREDITNOTE');
          return;
        }
        
        // Try to find credit note by number or ID
        try {
          // First, try to fetch credit notes to find the one matching the number
          const creditNotesResponse = await api.get('/api/v1/credit-notes', {
            params: { limit: 100 }
          });
          const creditNotes = creditNotesResponse.data?.creditNotes || [];
          const matchingCreditNote = creditNotes.find(
            (cn: any) => cn.creditNoteNumber === selectedCreditNoteId || cn.id === selectedCreditNoteId
          );
          
          if (matchingCreditNote) {
            creditNoteObjectId = matchingCreditNote.id;
          } else {
            // If not found by number, assume it's already an ObjectId
            creditNoteObjectId = selectedCreditNoteId;
          }
        } catch (error) {
          console.error('Error fetching credit notes:', error);
          // If fetch fails, assume the input is already an ObjectId
          creditNoteObjectId = selectedCreditNoteId;
        }
      }

      // For refunds: draft = saveDraft = true (status: DRAFT), pending = saveDraft = false (status: REFUNDED)
      // Save & Print always sets status to REFUNDED (no printer logic)
      const saveDraft = status === 'draft';

      const refundPayload = {
        customerId: getCustomerId(selectedCustomer),
        salesRepId: selectedSalesRep.id,
        source: refundSource,
        creditNoteId: creditNoteObjectId,
        products: items.map((item) => ({
          productCode: item.productCode.trim(),
          description: item.description?.trim() || undefined,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        message: message?.trim() || undefined,
        salesRepSignature: signature.trim(),
        saveDraft,
      };

      try {
        if (isNew) {
          // Create new refund
          const response = await api.post('/api/v1/refunds', refundPayload);
          toast.success('Refund created successfully');
          navigate('/refunds');
        } else {
          // Update existing DRAFT refund
          if (refundStatus !== 'DRAFT') {
            toast.error('Only draft refunds can be edited');
            return;
          }
          const response = await api.put(`/api/v1/refunds/${id}`, refundPayload);
          toast.success('Refund updated successfully');
          navigate('/refunds');
        }
        return;
      } catch (error: any) {
        console.error('Refund save error:', error);
        const errorMessage = error.response?.data?.message || 'Failed to save refund';
        toast.error(errorMessage);
        return;
      }
    }

    if (type === 'invoice') {
      if (!message.trim()) {
        toast.error('Message is required for invoices');
        return;
      }
      if (!signature?.trim()) {
        toast.error('Signature is required for invoices');
        return;
      }
      if (!terms.trim()) {
        toast.error('Payment terms are required for invoices');
        return;
      }
    }

    const document: SalesDocument = {
      id: isNew ? `DOC-${Date.now()}` : id!,
      type,
      refNumber,
      date: new Date(),
      dueDate: type === 'invoice' ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) : undefined,
      terms,
      customer: selectedCustomer,
      items,
      subtotal,
      discount: discountAmount,
      tax,
      total,
      balanceDue,
      deposit: effectiveDeposit,
      status: type === 'invoice' ? computedStatus : status,
      salesRep: selectedSalesRep?.name || '',
      // Signature is stored as base64 string (without data URL prefix) - ready for API transmission
      // Backend can reconstruct data URL if needed: `data:image/png;base64,${signature}`
      signature,
      message,
      createdAt: new Date(),
      updatedAt: new Date(),
      convertedFrom: convertFromId || undefined
    };

    // Invoice creation (new or convert) must hit the API and only succeed on backend success
    if (type === 'invoice' && isNew) {
      const invoicePayload = {
        customerId: getCustomerId(document.customer),
        salesRepId: selectedSalesRep?.id?.trim() || '',
        items: document.items
          .filter(
            (item) =>
              item.productCode?.trim() &&
              item.description?.trim() &&
              typeof item.quantity === 'number' &&
              item.quantity > 0
          )
          .map((item) => ({
            productCode: item.productCode,
            description: item.description,
            quantity: item.quantity,
            price: item.unitPrice,
            discount: item.discount ?? 0,
          })),
        message: document.message?.trim() || '',
        signature: document.signature?.trim() || '',
        paymentTerms: terms,
        depositReceived: deposit,
        paymentMethod: deposit > 0 ? paymentMethod : undefined,
        estimateId:
          (convertFromState && (convertFromState._id || convertFromState.id || convertFromState.reference || convertFromState.refNumber)) ||
          undefined,
      };

      console.log('Invoice ready payload (new):', invoicePayload);

      try {
        const estimateReference =
          (convertFromState &&
            (convertFromState.reference || convertFromState.refNumber)) ||
          '';
        const response = await api.post(
          '/api/v1/invoice',
          invoicePayload,
          estimateReference ? { params: { estimateReference } } : undefined
        );
        toast.success('Invoice created successfully');

        // If created from estimate, update status after successful invoice creation
        if (invoicePayload.estimateId) {
          try {
            await api.put(`/api/v1/estimate/${invoicePayload.estimateId}`, {
              status: 'converted',
            });
          } catch (statusErr) {
            console.warn('Failed to update estimate status', statusErr);
          }
        }

        // Navigate to invoices list and stop further local optimistic handling
        navigate('/invoices');
        return;
      } catch (error) {
        console.error('Create invoice error:', error);
        toast.error('Failed to create invoice');
        return;
      }
    }

    if (type === 'estimate') {
      const customerId = getCustomerId(document.customer);
      const salesRepId = selectedSalesRep?.id?.trim();
      const hasValidItems = document.items.some(
        (item) =>
          item.productCode?.trim() &&
          item.description?.trim() &&
          typeof item.quantity === 'number' &&
          item.quantity > 0
      );
      const messageText = document.message?.trim();
      const signatureBase64 = document.signature?.trim();

      if (!customerId) {
        toast.error('Customer is required for estimates');
        return;
      }
      if (!salesRepId) {
        toast.error('Sales representative is required for estimates');
        return;
      }
      if (!hasValidItems) {
        toast.error('At least one valid product is required for estimates');
        return;
      }
      if (!messageText) {
        toast.error('Message is required for estimates');
        return;
      }
      if (!signatureBase64) {
        toast.error('Signature is required for estimates');
        return;
      }

      const payload = {
        customerId,
        salesRep: salesRepId,
        message: messageText,
        signature: signatureBase64,
        items: document.items
          .filter(
            (item) =>
              item.productCode?.trim() &&
              item.description?.trim() &&
              typeof item.quantity === 'number' &&
              item.quantity > 0
          )
          .map((item) => ({
            productCode: item.productCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount ?? 0,
          })),
        status,
        ...(status === 'pending' ? { print: true } : {}),
      };

      console.log('Estimate ready payload:', payload);

      try {
        if (!isNew) {
          if (!refNumber) {
            toast.error('Reference number is required for edit estimate');
            return;
          }
          const token = localStorage.getItem('token') || '';
          await api.put(`/api/v1/estimate/${refNumber}`, { token, payload });
        } else {
          await api.post('/api/v1/estimate/save', payload);
        }
      } catch (error) {
        console.error('Estimate save error:', error);
        toast.error('Unable to save estimate');
        return;
      }
    }

    if (isNew) {
      // Skip optimistic add for invoices; they are handled via API above
      if (type !== 'invoice') {
        addDocument(document);
        toast.success(`${title.replace(/s$/, '')} created successfully`);
      }
    } else {
      updateDocument(id!, document);
      toast.success(`${title.replace(/s$/, '')} updated successfully`);
    }

    // Print receipt if status is 'pending'
    if (status === 'pending') {
      if (isPrinterConnected) {
        // Print to physical printer if connected
        try {
          const receiptData = prepareReceiptData(document);
          const printSuccess = await printReceipt(receiptData);
          if (printSuccess) {
            toast.success('Document saved and printed successfully');
          } else {
            toast.error('Document saved but printing failed. Please check printer connection.');
          }
        } catch (error) {
          console.error('Print error:', error);
          toast.error('Document saved but printing failed. Please check printer connection.');
        }
      } else {
        toast.error('Printer not connected. Please connect a printer to print.');
      }
    }

    // Navigate based on document type
    // Note: credit_note, refund, and receipt are handled above with early returns
    if (type === 'invoice') {
      navigate('/invoices');
    } else if (type === 'estimate') {
      navigate('/estimates');
    } else {
      // Fallback for any other document types
      navigate(`/${type}s`);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!isInvoiceEditView || type !== 'invoice') {
      return;
    }

    if (!id) {
      toast.error('Invoice id is missing');
      return;
    }

    if (!refNumber) {
      toast.error('Invoice reference is missing');
      return;
    }

    const validItems = items
      .filter(
        (item) =>
          item.productCode?.trim() &&
          item.description?.trim() &&
          typeof item.quantity === 'number' &&
          item.quantity > 0
      )
      .map((item) => ({
        productCode: item.productCode,
        description: item.description,
        quantity: item.quantity,
        price: item.unitPrice,
        discount: item.discount ?? 0,
      }));

    if (validItems.length === 0) {
      toast.error('Please add at least one valid item');
      return;
    }

    // Client-side deposit validation (mirrors backend logic)
    // Calculate what the balance would be with new items but existing deposit
    const newItemsCalc = calculateInvoice({
      items: items.map(item => ({
        productCode: item.productCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        amount: item.amount,
      })),
      depositReceived: existingDeposit,
    });
    
    // Check if the new deposit can be accepted
    const depositCheck = canAcceptDeposit(
      newItemsCalc.balanceDue,
      effectiveDeposit,
      existingDeposit
    );
    
    if (!depositCheck.allowed) {
      toast.error(depositCheck.message || 'Cannot accept this deposit');
      return;
    }

    const payload = {
      invoiceId: id,
      invoiceReference: refNumber,
      items: validItems,
      depositReceived: effectiveDeposit,
      paymentMethod: deposit > 0 ? paymentMethod : undefined,
    };

    try {
      await api.post(`/api/v1/invoice/${id}/edits`, payload);
      toast.success('Invoice updated successfully');
      navigate('/invoices');
    } catch (error: any) {
      console.error('Update invoice error:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to update invoice';
      toast.error(errorMessage);
    }
  };





  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-display font-bold truncate">
                {isNew ? `New ${title.replace(/s$/, '')}` : `Edit ${title.replace(/s$/, '')}`}
              </h1>
              {!(type === 'invoice' && isNew) && (
                <p className="text-muted-foreground text-xs sm:text-sm font-mono">{refNumber}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary save actions */}
            {!isInvoiceEditView && type !== 'credit_note' && type !== 'refund' && (
              <>
                <Button variant="outline" onClick={() => handleSave('draft')} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                  <span className="sm:hidden">Draft</span>
                  <span className="hidden sm:inline">Save Draft</span>
                </Button>
                <Button onClick={() => handleSave('pending')} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                  <Save className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Save & Print</span>
                  <span className="sm:hidden">Save & Print</span>
                </Button>
              </>
            )}
            {type === 'credit_note' && creditNoteStatus !== 'APPROVED' && (
              <>
                <Button variant="outline" onClick={() => handleSave('draft')} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                  <span className="sm:hidden">Draft</span>
                  <span className="hidden sm:inline">Save Draft</span>
                </Button>
                <Button onClick={() => handleSave('pending')} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                  <Save className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Save & Print</span>
                  <span className="sm:hidden">Save & Print</span>
                </Button>
              </>
            )}
            {type === 'refund' && refundStatus !== 'REFUNDED' && (
              <>
                <Button variant="outline" onClick={() => handleSave('draft')} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                  <span className="sm:hidden">Draft</span>
                  <span className="hidden sm:inline">Save Draft</span>
                </Button>
                <Button onClick={() => handleSave('pending')} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                  <Save className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Save & Print</span>
                  <span className="sm:hidden">Save & Print</span>
                </Button>
              </>
            )}
            {isInvoiceEditView && (
              <Button onClick={handleUpdateInvoice} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                <Save className="h-4 w-4 sm:mr-2" />
                Update Invoice
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Form */}
          <fieldset
            disabled={isConvertedFromEstimate || (type === 'credit_note' && creditNoteStatus === 'APPROVED') || (type === 'refund' && refundStatus === 'REFUNDED')}
            className="xl:col-span-2 space-y-4 sm:space-y-6"
          >
            {/* Customer Selection */}
            <div className="glass-card rounded-xl p-4 sm:p-6">
              <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Customer Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Customer</Label>
                  <Select 
                    disabled={isConvertedFromEstimate || isInvoiceEditView}
                    value={selectedCustomer ? getCustomerId(selectedCustomer) : undefined} 
                    onOpenChange={(open) => {
                      if (open) {
                        loadCustomers();
                      }
                    }}
                    onValueChange={(v) => {
                      const match =
                        effectiveCustomers.find((c, idx) => getCustomerId(c, idx) === v) || null;
                      if (match) {
                        setSelectedCustomer(match);
                        return;
                      }
                      if (selectedCustomer && getCustomerId(selectedCustomer) === v) {
                        setSelectedCustomer(selectedCustomer);
                        return;
                      }
                      setSelectedCustomer(null);
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue
                        placeholder={
                          selectedCustomer?.name ||
                          (isLoadingCustomers ? 'Loading customers...' : 'Select customer...')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCustomers && (
                        <SelectItem key="loading" value="loading" disabled>
                          Loading customers...
                        </SelectItem>
                      )}
                      {!isLoadingCustomers && customersError && (
                        <SelectItem key="error" value="error" disabled>
                          {customersError}
                        </SelectItem>
                      )}
                      {!isLoadingCustomers &&
                        !customersError &&
                        effectiveCustomers
                          .map((customer, index) => {
                            const customerId = getCustomerId(customer, index);
                            if (!customerId) return null;
                            return (
                              <SelectItem key={customerId} value={customerId}>
                                {customer.name}
                              </SelectItem>
                            );
                          })
                          .filter(Boolean)}
                      {!isLoadingCustomers &&
                        !customersError &&
                        selectedCustomer &&
                        !effectiveCustomers.some(
                          (customer, index) =>
                            getCustomerId(customer, index) === getCustomerId(selectedCustomer)
                        ) && (
                          <SelectItem value={getCustomerId(selectedCustomer) || 'selected-customer'}>
                            {selectedCustomer.name}
                          </SelectItem>
                        )}
                      {!isLoadingCustomers &&
                        !customersError &&
                        effectiveCustomers.length === 0 && (
                          <SelectItem key="empty" value="empty" disabled>
                            No customers available
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Sales Representative</Label>
                  <Select
                    disabled={isConvertedFromEstimate || isInvoiceEditView}
                    value={salesRep}
                    onValueChange={(value) => {
                      setSalesRep(value);
                      const selectedRep = salesReps.find((rep) => rep.id === value);
                      setSelectedSalesRepName((prev) => selectedRep?.name || prev);
                    }}
                    onOpenChange={(open) => {
                      if (open) {
                        loadSalesReps();
                      }
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue
                        placeholder={
                          selectedSalesRepName ||
                          (isLoadingSalesReps ? 'Loading sales reps...' : 'Select sales rep...')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingSalesReps && (
                        <SelectItem key="loading-sales-reps" value="loading-sales-reps" disabled>
                          Loading sales reps...
                        </SelectItem>
                      )}
                      {!isLoadingSalesReps && salesRepsError && (
                        <SelectItem key="sales-reps-error" value="sales-reps-error" disabled>
                          {salesRepsError}
                        </SelectItem>
                      )}
                      {!isLoadingSalesReps &&
                        !salesRepsError &&
                        salesReps
                          .map((rep, index) => {
                            const repId = rep.id || `sales-rep-${index}`;
                            return (
                              <SelectItem key={repId} value={repId}>
                                {rep.name}
                              </SelectItem>
                            );
                          })
                          .filter(Boolean)}
                      {!isLoadingSalesReps &&
                        !salesRepsError &&
                        salesRep &&
                        !salesReps.some((rep) => rep.id === salesRep) && (
                          <SelectItem value={salesRep}>
                            {selectedSalesRepName || 'Sales Rep'}
                          </SelectItem>
                        )}
                      {!isLoadingSalesReps &&
                        !salesRepsError &&
                        salesReps.length === 0 && (
                          <SelectItem key="sales-reps-empty" value="sales-reps-empty" disabled>
                            No sales reps available
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                {/* Refund Source Selection */}
                {type === 'refund' && (
                  <div>
                    <Label className="text-xs sm:text-sm">Source</Label>
                    <Select
                      value={refundSource}
                      onValueChange={(value: 'FROM_CREDITNOTE' | 'STANDALONE') => {
                        setRefundSource(value);
                        if (value === 'STANDALONE') {
                          setSelectedCreditNoteId('');
                        }
                      }}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STANDALONE">Standalone</SelectItem>
                        <SelectItem value="FROM_CREDITNOTE">From Credit Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Credit Note Selection (only if source is FROM_CREDITNOTE) */}
                {type === 'refund' && refundSource === 'FROM_CREDITNOTE' && (
                  <div>
                    <Label className="text-xs sm:text-sm">Credit Note</Label>
                    <Input
                      type="text"
                      placeholder="Credit Note ID"
                      value={selectedCreditNoteId}
                      onChange={(e) => setSelectedCreditNoteId(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the credit note ID to reference
                    </p>
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-muted-foreground">Billing Address</p>
                    <p className="line-clamp-2">
                      {formatAddress(selectedCustomer.billingAddress)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shipping Address</p>
                    <p className="line-clamp-2">
                      {formatAddress(selectedCustomer.shippingAddress)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="glass-card rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                <h2 className="font-display font-semibold text-sm sm:text-base">Product Details</h2>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleScan}
                    disabled={deviceStatus.ct60 !== 'connected'}
                    className="text-xs flex-1 sm:flex-none"
                  >
                    <QrCode className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Scan Item</span>
                    <span className="sm:hidden">Scan</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={addItem} className="text-xs flex-1 sm:flex-none">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Item</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-16 text-center">Qty</TableHead>
                      <TableHead className="w-24 text-center">Price</TableHead>
                      <TableHead className="w-16 text-center">Disc%</TableHead>
                      <TableHead className="w-24 text-center">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                          No items added. Click "Add Item" or scan with CT60.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Select 
                              value={item.productCode}
                              onValueChange={(v) => selectProduct(index, v)}
                            >
                              <SelectTrigger className="h-8 text-xs w-[110px]">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {mockProducts.map((product) => (
                                  <SelectItem key={product.code} value={product.code}>
                                    {product.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell >
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              className="h-8 text-xs pl-4 "
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="h-8 text-xs  w-[80px] text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs text-center w-[80px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs text-center w-[80px] "
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No items added. Tap "Add" or scan with CT60.
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.id} className="p-3 rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <Select 
                            value={item.productCode}
                            onValueChange={(v) => selectProduct(index, v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select product..." />
                            </SelectTrigger>
                            <SelectContent>
                              {mockProducts.map((product) => (
                                <SelectItem key={product.code} value={product.code}>
                                  {product.code} - {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Disc%</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">Amount</span>
                        <span className="font-medium text-sm">{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Message & Signature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Message</h2>
                <Textarea
                  placeholder="Add a note or message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="text-sm"
                  disabled={isInvoiceEditView}
                />
              </div>
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Signature</h2>
                <div className={isInvoiceEditView ? 'pointer-events-none opacity-70' : ''}>
                  <SignaturePad
                    onSave={(sig) => setSignature(sig)}
                    onClear={() => setSignature(undefined)}
                    initialSignature={signature}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Summary Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Terms */}
            {type === 'invoice' && (
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Payment Terms</h2>
                <Select value={terms} onValueChange={setTerms} disabled={isInvoiceEditView}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                    <SelectItem value="Net 7">Net 7</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Deposit */}
            {( type === 'invoice') && (
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Deposit Received</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs sm:text-sm mb-2 block">Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={deposit}
                      onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-sm pl-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm mb-2 block">Payment Method</Label>
                    <Select 
                      value={paymentMethod} 
                      onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}
                      disabled={isInvoiceEditView && deposit === 0}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="glass-card rounded-xl p-4 sm:p-6 ">
              <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Summary</h2>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                {type !== 'estimate' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>
                      {formatCurrency(
                        type === 'invoice' && isConvertedFromEstimate
                          ? subtotal
                          : subtotalBeforeDiscount
                      )}
                    </span>
                  </div>
                )}
                {items.filter(item => item.discount <= 0).map((item, index) => {
                  const baseName = getBaseProductName(item.description);
                  return (
                    <div key={`${item.id}-no-discount`}>
                      {index === 0 && (
                        <div className="text-muted-foreground mb-1">Items</div>
                      )}
                      <div className="flex justify-between ml-0">
                        <span className="text-muted-foreground">{baseName}</span>
                        <span className="text-muted-foreground">{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                  );
                })}
                {items.filter(item => item.discount > 0).map((item, index) => {
                  const itemDiscountAmount = item.quantity * item.unitPrice * (item.discount / 100);
                  const baseName = getBaseProductName(item.description);
                  return (
                    <div key={item.id}>
                      {index === 0 && (
                        <div className="text-muted-foreground mb-1">Discount</div>
                      )}
                      <div className="flex justify-between ml-0">
                        <span className="text-muted-foreground">{baseName}</span>
                        <span className="text-success">
                          {item.discount}% (-{formatCurrency(itemDiscountAmount)})
                        </span>
                      </div>
                    </div>
                  );
                })}
                {type === 'estimate' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Discount</span>
                    <span className="text-success">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {type === 'invoice' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT (12.5%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-2 sm:pt-3 flex justify-between font-semibold text-sm sm:text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
                {effectiveDeposit > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deposit</span>
                      <span className="text-success">-{formatCurrency(effectiveDeposit)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Balance Due</span>
                      <span>{formatCurrency(balanceDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
