import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePOS } from '@/contexts/POSContext';
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

interface DocumentListPageProps {
  type: DocumentType;
  title: string;
}

export default function DocumentListPage({ type, title }: DocumentListPageProps) {
  const { documents, triggerPrint, deviceStatus } = usePOS();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');

  const filteredDocuments = documents
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

  const handleConvertToInvoice = (docId: string) => {
    navigate(`/invoices/new?from=${docId}`);
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
          <Button onClick={() => navigate(`/${type === 'credit_note' ? 'credit-notes' : type + 's'}/new`)} className="gap-2 text-xs sm:text-sm w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New {title.replace(/s$/, '')}
          </Button>
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
              {ESTIMATE_STATUS_FILTER_OPTIONS.map((option) => (
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
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
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
                    <TableCell className="text-right text-sm">
                      {doc.balanceDue > 0 ? (
                        <span className="text-warning font-medium">
                          {formatCurrency(doc.balanceDue)}
                        </span>
                      ) : (
                        <span className="text-success">Paid</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/${type === 'credit_note' ? 'credit-notes' : type + 's'}/${doc.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => triggerPrint(doc.id)} disabled={deviceStatus.rp4 !== 'connected'}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        {type === 'estimate' && (String(doc.status) === 'accepted' || doc.status === 'approved') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleConvertToInvoice(doc.id)} title="Convert to Invoice">
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
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {filteredDocuments.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center text-muted-foreground text-sm">
              No {title.toLowerCase()} found
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div key={doc.id} className="glass-card rounded-xl p-4" onClick={() => navigate(`/${type === 'credit_note' ? 'credit-notes' : type + 's'}/${doc.id}`)}>
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
                  <div>
                    <p className="text-muted-foreground">Balance</p>
                    <p className={`font-medium ${doc.balanceDue > 0 ? 'text-warning' : 'text-success'}`}>
                      {doc.balanceDue > 0 ? formatCurrency(doc.balanceDue) : 'Paid'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/${type === 'credit_note' ? 'credit-notes' : type + 's'}/${doc.id}`); }}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); triggerPrint(doc.id); }} disabled={deviceStatus.rp4 !== 'connected'}>
                    <Printer className="h-3.5 w-3.5 mr-1" /> Print
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
