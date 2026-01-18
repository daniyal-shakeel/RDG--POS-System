import { useState, useEffect, useRef } from 'react';
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
import { DocumentType, LineItem, SalesDocument, Customer } from '@/types/pos';
import { mockProducts, generateRefNumber } from '@/data/mockData';
import { toast } from 'sonner';
import { useBluetoothPrinter, ReceiptData } from '@/hooks/useBluetoothPrinter';
import { format } from 'date-fns';

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
  const [refNumber, setRefNumber] = useState(
    type === 'estimate' ? '' : generateRefNumber(type)
  );

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
    const customer = estimateState.customer || {};
    const mappedCustomer: Customer = {
      id: customer.id || customer._id || '',
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      billingAddress: formatAddress(customer.billingAddress),
      shippingAddress: formatAddress(customer.shippingAddress),
    };
    const salesRepValue = estimateState.salesRepId || estimateState.salesRep || '';
    setSelectedCustomer(mappedCustomer);
    setItems(mapEstimateItems(Array.isArray(estimateState.items) ? estimateState.items : []));
    setMessage(estimateState.message || '');
    setSignature(normalizeSignature(estimateState.signature));
    setSalesRep(salesRepValue);
    setSelectedSalesRepName(estimateState.salesRep || '');
    setRefNumber(estimateState.reference || '');
    setDeposit(0);
  };

  const mapEstimateItems = (incoming: any[]): LineItem[] => {
    return incoming.map((item, index) => {
      const quantity = Number(item?.quantity ?? 0);
      const discount = Number(item?.discount ?? 0);
      const amount = Number(item?.amount ?? 0);
      const discountFactor = 1 - discount / 100;
      const unitPrice =
        quantity > 0 && discountFactor > 0 ? amount / quantity / discountFactor : 0;
      return {
        id: item?.id || `estimate-item-${index}`,
        productCode: item?.productCode || '',
        description: item?.description || '',
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        discount: Number.isFinite(discount) ? discount : 0,
        amount: Number.isFinite(amount)
          ? amount
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
      const doc = getDocument(id);
      if (doc) {
        setSelectedCustomer(doc.customer);
        setItems(doc.items);
        setTerms(doc.terms || 'Net 15');
        setMessage(doc.message || '');
        setSalesRep(doc.salesRep);
        // Normalize signature format to base64 string (ready for API)
        setSignature(normalizeSignature(doc.signature));
        setDeposit(doc.deposit);
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
  }, [id, isNew, convertFromId, getDocument]);

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

  useEffect(() => {
    if (type !== 'estimate') {
      return;
    }
    if (selectedCustomer && !hasFetchedCustomers) {
      loadCustomers();
    }
    if (salesRep && !hasFetchedSalesReps) {
      loadSalesReps();
    }
  }, [type, selectedCustomer, salesRep, hasFetchedCustomers, hasFetchedSalesReps]);

  const loadCustomers = async () => {
    if (isLoadingCustomers || hasFetchedCustomers) {
      return;
    }
    setIsLoadingCustomers(true);
    setCustomersError(null);
    const controller = new AbortController();
    customersAbortRef.current = controller;
    try {
      const response = await api.get('/api/v1/customer', {
        signal: controller.signal,
      });
      const data = response.data;
      const incoming = Array.isArray(data?.customers) ? data.customers : [];
      setApiCustomers(incoming);
      setHasFetchedCustomers(true);
      if (incoming.length === 0) {
        setCustomersError('No customers found');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
        console.error('Customer fetch error:', error);
        setCustomersError('Unable to load customers');
        setApiCustomers([]);
      }
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    return () => customersAbortRef.current?.abort();
  }, []);

  const loadSalesReps = async () => {
    if (isLoadingSalesReps || hasFetchedSalesReps) {
      return;
    }
    setIsLoadingSalesReps(true);
    setSalesRepsError(null);
    const controller = new AbortController();
    salesRepsAbortRef.current = controller;
    try {
      const response = await api.get('/api/v1/user', {
        params: { role: 'Sales Representative' },
        signal: controller.signal,
      });
      const data = response.data;
      const incoming = Array.isArray(data?.users) ? data.users : [];
      const mapped = incoming
        .map((rep: any, index: number) => ({
          id:
            rep.id ||
            rep._id ||
            rep.email ||
            `sales-rep-${index}`,
          name: rep.fullName || rep.name || rep.email || 'Unnamed Sales Rep',
        }))
        .filter((rep: any) => rep.name);
      setSalesReps(mapped);
      const hasSelectedId = mapped.some((rep: any) => rep.id === salesRep);
      const matchByName = mapped.find(
        (rep: any) => rep.name.toLowerCase() === salesRep.toLowerCase()
      );
      const nextSelection =
        hasSelectedId
          ? salesRep
          : matchByName?.id || (mapped.length > 0 ? mapped[0].id : '');
      if (nextSelection && nextSelection !== salesRep) {
        setSalesRep(nextSelection);
      }
      const selectedRep = mapped.find((rep) => rep.id === nextSelection);
      if (selectedRep?.name) {
        setSelectedSalesRepName(selectedRep.name);
      }
      setHasFetchedSalesReps(true);
      if (mapped.length === 0) {
        setSalesRepsError('No sales representatives found');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
        console.error('Sales rep fetch error:', error);
        setSalesRepsError('Unable to load sales representatives');
        setSalesReps([]);
      }
    } finally {
      setIsLoadingSalesReps(false);
    }
  };

  useEffect(() => {
    return () => salesRepsAbortRef.current?.abort();
  }, []);

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

  // Calculate subtotal before discounts
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  // Calculate subtotal after discounts (current amount)
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  // Calculate total discount amount
  const discountAmount = subtotalBeforeDiscount - subtotal;
  // VAT only applies to invoices
  const tax = type === 'invoice' ? subtotal * 0.125 : 0; // 12.5% VAT
  const total = subtotal + tax;
  const balanceDue = total - deposit;

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
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    const selectedSalesRep = salesReps.find((rep) => rep.id === salesRep);
    if (!selectedSalesRep?.id) {
      toast.error('Please select a sales representative');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
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
      deposit,
      status,
      salesRep: selectedSalesRep?.name || '',
      // Signature is stored as base64 string (without data URL prefix) - ready for API transmission
      // Backend can reconstruct data URL if needed: `data:image/png;base64,${signature}`
      signature,
      message,
      createdAt: new Date(),
      updatedAt: new Date(),
      convertedFrom: convertFromId || undefined
    };

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
      addDocument(document);
      toast.success(`${title.replace(/s$/, '')} created successfully`);
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

    navigate(`/${type === 'credit_note' ? 'credit-notes' : type + 's'}`);
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
              <p className="text-muted-foreground text-xs sm:text-sm font-mono">{refNumber}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* <Button variant="outline" onClick={handleExport} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
              <Send className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint}
              disabled={deviceStatus.rp4 !== 'connected' || isNew}
              size="sm"
              className="text-xs sm:text-sm flex-1 sm:flex-none"
            >
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button> */}
            <Button variant="outline" onClick={() => handleSave('draft')} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
              <span className="sm:hidden">Draft</span>
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button onClick={() => handleSave('pending')} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Save & Print</span>
              <span className="sm:hidden">Save & Print</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Form */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {/* Customer Selection */}
            <div className="glass-card rounded-xl p-4 sm:p-6">
              <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Customer Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Customer</Label>
                  <Select 
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
                        effectiveCustomers.map((customer, index) => {
                          const customerId = getCustomerId(customer, index);
                          return (
                            <SelectItem key={customerId} value={customerId}>
                            {customer.name}
                          </SelectItem>
                          );
                        })}
                      {!isLoadingCustomers &&
                        !customersError &&
                        selectedCustomer &&
                        !effectiveCustomers.some(
                          (customer, index) =>
                            getCustomerId(customer, index) === getCustomerId(selectedCustomer)
                        ) && (
                          <SelectItem value={getCustomerId(selectedCustomer) || ''}>
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
                        salesReps.map((rep, index) => (
                          <SelectItem
                            key={rep.id || `sales-rep-${index}`}
                            value={rep.id || `sales-rep-${index}`}
                          >
                            {rep.name}
                          </SelectItem>
                        ))}
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
                />
              </div>
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Signature</h2>
                <SignaturePad
                  onSave={(sig) => setSignature(sig)}
                  onClear={() => setSignature(undefined)}
                  initialSignature={signature}
                />
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Terms */}
            {type === 'invoice' && (
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Payment Terms</h2>
                <Select value={terms} onValueChange={setTerms}>
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
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deposit}
                  onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
            )}

            {/* Summary */}
            <div className="glass-card rounded-xl p-4 sm:p-6 ">
              <h2 className="font-display font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Summary</h2>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                {type !== 'estimate' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotalBeforeDiscount)}</span>
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
                {deposit > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deposit</span>
                      <span className="text-success">-{formatCurrency(deposit)}</span>
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
