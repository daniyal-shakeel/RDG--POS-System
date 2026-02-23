import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Search, Truck, X, Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getMrpeasyShipments, getMrpeasyShipmentById, type MrpeasyShipment } from '@/services/mrpeasy';

type ShipmentRow = {
  id: string;
  number: string;
  status: string;
  customerName: string;
  warehouse: string;
  sourceDocument: string;
  plannedDate: string;
  shipDate: string;
  trackingNumber: string;
  carrier: string;
  lineCount: number;
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [detailShipmentId, setDetailShipmentId] = useState<string | null>(null);
  const [detailShipment, setDetailShipment] = useState<MrpeasyShipment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const mapShipment = (shipment: MrpeasyShipment): ShipmentRow => ({
    id: shipment.id,
    number: shipment.number ?? shipment.id,
    status: shipment.status ?? '-',
    customerName: shipment.customerName ?? '-',
    warehouse: shipment.warehouse ?? '-',
    sourceDocument: shipment.sourceDocument ?? '-',
    plannedDate: shipment.plannedDate ?? '',
    shipDate: shipment.shipDate ?? '',
    trackingNumber: shipment.trackingNumber ?? '-',
    carrier: shipment.carrier ?? '-',
    lineCount: shipment.lines?.length ?? 0,
  });

  const validateFilters = (): boolean => {
    if (status.trim().length > 100) {
      toast.error('Status filter must be 100 characters or less');
      return false;
    }
    if (fromDate && Number.isNaN(Date.parse(fromDate))) {
      toast.error('From date is invalid');
      return false;
    }
    if (toDate && Number.isNaN(Date.parse(toDate))) {
      toast.error('To date is invalid');
      return false;
    }
    if (fromDate && toDate && Date.parse(fromDate) > Date.parse(toDate)) {
      toast.error('From date must be before or equal to To date');
      return false;
    }
    return true;
  };

  const fetchShipments = async (showToast: boolean = false) => {
    if (!validateFilters()) return;
    setIsLoading(true);
    try {
      const result = await getMrpeasyShipments({
        limit: 200,
        offset: 0,
        status: status.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      const rows = Array.isArray(result.data) ? result.data.map(mapShipment) : [];
      setShipments(rows);
      if (showToast) {
        toast.success(`Loaded ${rows.length} shipment documents`);
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load shipments';
      toast.error(message);
      setShipments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  useEffect(() => {
    if (!detailShipmentId) {
      setDetailShipment(null);
      return;
    }
    setDetailLoading(true);
    getMrpeasyShipmentById(detailShipmentId)
      .then((res) => {
        setDetailShipment(res.data ?? null);
      })
      .catch((err: any) => {
        toast.error(err?.response?.data?.error || err?.message || 'Failed to load shipment details');
        setDetailShipmentId(null);
      })
      .finally(() => setDetailLoading(false));
  }, [detailShipmentId]);

  const filtered = useMemo(
    () =>
      shipments.filter((row) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          row.number.toLowerCase().includes(q) ||
          row.customerName.toLowerCase().includes(q) ||
          row.trackingNumber.toLowerCase().includes(q) ||
          row.sourceDocument.toLowerCase().includes(q)
        );
      }),
    [shipments, searchQuery]
  );

  const hasFilterValue = useMemo(
    () => !!(searchQuery.trim() || status.trim() || fromDate || toDate),
    [searchQuery, status, fromDate, toDate]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setStatus('');
    setFromDate('');
    setToDate('');
    setIsLoading(true);
    getMrpeasyShipments({ limit: 200, offset: 0 })
      .then((result) => {
        const rows = Array.isArray(result.data) ? result.data.map(mapShipment) : [];
        setShipments(rows);
        toast.success('Filters cleared');
      })
      .catch((error: any) => {
        const message = error?.response?.data?.error || error?.message || 'Failed to load shipments';
        toast.error(message);
        setShipments([]);
      })
      .finally(() => setIsLoading(false));
  };

  const formatDateTime = (value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-TT', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Shipments</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Pick and ship documents synced from MRPeasy
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 text-xs sm:text-sm"
            onClick={() => fetchShipments(true)}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="glass-card rounded-xl p-4 sm:p-5 space-y-4">
          <p className="text-sm font-medium text-foreground">Filters</p>
          <div className="grid grid-cols-1 gap-4 lg:gap-5">
            <div className="w-full">
              <Label htmlFor="shipments-search" className="text-muted-foreground text-xs sm:text-sm">
                Search
              </Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="shipments-search"
                  placeholder="Search shipment #, customer, tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg h-10 w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-4 lg:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="shipments-status" className="text-muted-foreground text-xs sm:text-sm">
                  Status
                </Label>
                <Input
                  id="shipments-status"
                  placeholder="e.g. shipped"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-lg h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shipments-from" className="text-muted-foreground text-xs sm:text-sm">
                  From date
                </Label>
                <Input
                  id="shipments-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shipments-to" className="text-muted-foreground text-xs sm:text-sm">
                  To date
                </Label>
                <Input
                  id="shipments-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg h-10"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-nowrap lg:flex-nowrap">
                <Button
                  onClick={() => fetchShipments(true)}
                  disabled={isLoading || !hasFilterValue}
                  className="rounded-lg h-10 flex-1 sm:flex-none min-w-[120px] bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={isLoading || !hasFilterValue}
                  className="rounded-lg h-10 gap-2 shrink-0"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Source Doc</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Shipped</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`shipment-skeleton-${idx}`}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-10" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                    No shipment documents found
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="font-medium">{row.number}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.warehouse}</TableCell>
                    <TableCell>{row.sourceDocument}</TableCell>
                    <TableCell>{formatDateTime(row.plannedDate)}</TableCell>
                    <TableCell>{formatDateTime(row.shipDate)}</TableCell>
                    <TableCell>{`${row.carrier !== '-' ? `${row.carrier} / ` : ''}${row.trackingNumber}`}</TableCell>
                    <TableCell className="text-right">{row.lineCount}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailShipmentId(row.id)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={detailShipmentId !== null} onOpenChange={(open) => !open && setDetailShipmentId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {detailLoading ? (
                  <Skeleton className="h-6 w-40" />
                ) : (
                  `Shipment ${detailShipment?.number ?? detailShipment?.id ?? detailShipmentId}`
                )}
              </DialogTitle>
            </DialogHeader>
            {detailLoading && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </div>
                  ))}
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <div className="rounded-md border">
                    <div className="flex gap-4 border-b bg-muted/50 px-4 py-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-10 ml-auto" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-4 px-4 py-3 border-b last:border-b-0">
                        <Skeleton className="h-4 w-14" />
                        <Skeleton className="h-4 w-28 flex-1" />
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-6" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {!detailLoading && detailShipment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{detailShipment.status ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{detailShipment.customerName ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Warehouse</p>
                    <p className="font-medium">{detailShipment.warehouse ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Source document</p>
                    <p className="font-medium">{detailShipment.sourceDocument ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Planned date</p>
                    <p className="font-medium">{formatDateTime(detailShipment.plannedDate ?? '')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ship date</p>
                    <p className="font-medium">{formatDateTime(detailShipment.shipDate ?? '')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Carrier</p>
                    <p className="font-medium">{detailShipment.carrier ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tracking</p>
                    <p className="font-medium">{detailShipment.trackingNumber ?? '-'}</p>
                  </div>
                </div>
                {detailShipment.lines && detailShipment.lines.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Line items</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Picked</TableHead>
                          <TableHead className="text-right">Shipped</TableHead>
                          <TableHead>Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailShipment.lines.map((line, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{line.sku ?? '-'}</TableCell>
                            <TableCell>{line.name ?? '-'}</TableCell>
                            <TableCell className="text-right">{line.qty ?? '-'}</TableCell>
                            <TableCell className="text-right">{line.pickedQty ?? '-'}</TableCell>
                            <TableCell className="text-right">{line.shippedQty ?? '-'}</TableCell>
                            <TableCell>{line.unit ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
