import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Package, RefreshCw, Truck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getMrpeasyInventory,
  getMrpeasyInventorySum,
  type MrpeasyInventoryItem,
} from '@/services/mrpeasy';

type InventoryRow = {
  code: string;
  name: string;
  stock: number;
  reorderLevel: number;
  reorderQty: number;
  updatedAt: string;
};

type StockStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type SortByOption = 'name' | 'code' | 'stock' | 'updatedAt';

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [isCostLoading, setIsCostLoading] = useState(false);
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('all');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [sortBy, setSortBy] = useState<SortByOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [appliedStockStatus, setAppliedStockStatus] = useState<StockStatusFilter>('all');
  const [appliedLowStockThreshold, setAppliedLowStockThreshold] = useState('5');
  const [appliedMinStock, setAppliedMinStock] = useState('');
  const [appliedMaxStock, setAppliedMaxStock] = useState('');
  const [appliedSortBy, setAppliedSortBy] = useState<SortByOption>('name');
  const [appliedSortOrder, setAppliedSortOrder] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();
  const location = useLocation();

  const mapItem = (item: MrpeasyInventoryItem): InventoryRow => ({
    code: item.sku,
    name: item.name?.trim() || item.sku,
    stock: item.quantity,
    reorderLevel: item.reorderPoint ?? 0,
    reorderQty: item.reorderQty ?? 0,
    updatedAt: item.updatedAt ?? '',
  });

  const fetchInventory = async (showToast: boolean = false) => {
    setIsLoading(true);
    try {
      const result = await getMrpeasyInventory({ limit: 200, offset: 0 });
      const rows = Array.isArray(result.data) ? result.data.map(mapItem) : [];
      setItems(rows);
      if (showToast) {
        toast.success(`MRPEasy sync completed (${rows.length} products)`);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to load MRPEasy inventory';
      toast.error(message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventorySum = async (showToast: boolean = false) => {
    setIsCostLoading(true);
    try {
      const result = await getMrpeasyInventorySum();
      const cost = typeof result.data?.totalInventoryCost === 'number' ? result.data.totalInventoryCost : 0;
      setTotalCost(cost);
      if (showToast) {
        toast.success('Inventory total cost updated');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to load inventory total cost';
      toast.error(message);
      setTotalCost(null);
    } finally {
      setIsCostLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory(Boolean((location.state as { forceMrpeasySync?: boolean } | null)?.forceMrpeasySync));
    fetchInventorySum();
  }, []);

  const filteredInventory = useMemo(() => {
    const lowThreshold = /^\d+$/.test(appliedLowStockThreshold.trim())
      ? Math.max(0, Number(appliedLowStockThreshold.trim()))
      : 5;
    let list = items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      if (q && !item.name.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) return false;
      if (appliedStockStatus !== 'all') {
        const isOut = item.stock === 0;
        const isLow =
          item.stock > 0 &&
          (item.stock <= lowThreshold || item.stock <= item.reorderLevel);
        if (appliedStockStatus === 'in_stock' && (isLow || isOut)) return false;
        if (appliedStockStatus === 'low_stock' && (!isLow || isOut)) return false;
        if (appliedStockStatus === 'out_of_stock' && !isOut) return false;
      }
      const min = appliedMinStock.trim() !== '' && /^-?\d+$/.test(appliedMinStock.trim()) ? Number(appliedMinStock.trim()) : null;
      const max = appliedMaxStock.trim() !== '' && /^-?\d+$/.test(appliedMaxStock.trim()) ? Number(appliedMaxStock.trim()) : null;
      if (min !== null && item.stock < min) return false;
      if (max !== null && item.stock > max) return false;
      return true;
    });
    const mult = appliedSortOrder === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (appliedSortBy === 'name') return mult * (a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      if (appliedSortBy === 'code') return mult * (a.code.localeCompare(b.code, undefined, { sensitivity: 'base' }));
      if (appliedSortBy === 'stock') return mult * (a.stock - b.stock);
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return mult * (ta - tb);
    });
    return list;
  }, [items, searchQuery, appliedStockStatus, appliedLowStockThreshold, appliedMinStock, appliedMaxStock, appliedSortBy, appliedSortOrder]);

  const hasFilterValue = useMemo(
    () =>
      stockStatusFilter !== 'all' ||
      lowStockThreshold.trim() !== '5' ||
      minStock.trim() !== '' ||
      maxStock.trim() !== '' ||
      sortBy !== 'name' ||
      sortOrder !== 'asc',
    [stockStatusFilter, lowStockThreshold, minStock, maxStock, sortBy, sortOrder]
  );

  const hasAppliedFilterValue = useMemo(
    () =>
      appliedStockStatus !== 'all' ||
      appliedLowStockThreshold.trim() !== '5' ||
      appliedMinStock.trim() !== '' ||
      appliedMaxStock.trim() !== '' ||
      appliedSortBy !== 'name' ||
      appliedSortOrder !== 'asc',
    [appliedStockStatus, appliedLowStockThreshold, appliedMinStock, appliedMaxStock, appliedSortBy, appliedSortOrder]
  );

  const applyFilters = () => {
    setAppliedStockStatus(stockStatusFilter);
    setAppliedLowStockThreshold(lowStockThreshold.trim() !== '' ? lowStockThreshold : '5');
    setAppliedMinStock(minStock);
    setAppliedMaxStock(maxStock);
    setAppliedSortBy(sortBy);
    setAppliedSortOrder(sortOrder);
    toast.success('Filters applied');
  };

  const clearAdvancedFilters = () => {
    setStockStatusFilter('all');
    setLowStockThreshold('5');
    setMinStock('');
    setMaxStock('');
    setSortBy('name');
    setSortOrder('asc');
    setAppliedStockStatus('all');
    setAppliedLowStockThreshold('5');
    setAppliedMinStock('');
    setAppliedMaxStock('');
    setAppliedSortBy('name');
    setAppliedSortOrder('asc');
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-TT', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Inventory</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Stock levels synced with MRPEasy
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
              onClick={() => {
                fetchInventory(true);
                fetchInventorySum();
              }}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Sync MRPEasy</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <Button 
              className="gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
              onClick={() => navigate('/inventory/new')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Adjust Stock</span>
              <span className="sm:hidden">Adjust</span>
            </Button>
            <Button
              variant="outline"
              className="gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
              onClick={() => navigate('/shipments')}
            >
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Shipments</span>
              <span className="sm:hidden">Ship</span>
            </Button>
          </div>
        </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>

        <div className="glass-card rounded-xl p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <p className="text-sm font-medium text-foreground shrink-0">Advanced filters</p>
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-xs uppercase tracking-wide text-muted-foreground hidden sm:inline">Total cost</span>
                <span className="text-lg sm:text-xl font-semibold tabular-nums">
                  {isCostLoading ? '…' : totalCost === null ? '–' : formatCurrency(totalCost)}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchInventorySum(true)} disabled={isCostLoading} className="shrink-0 h-9">
                Calculate
              </Button>
              <Button
                size="sm"
                onClick={applyFilters}
                disabled={!hasFilterValue}
                className="shrink-0 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Apply filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAdvancedFilters}
                disabled={!hasAppliedFilterValue}
                className="gap-1.5 shrink-0 h-9"
              >
                <X className="h-3.5 w-3.5" />
                Remove filters
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 w-full">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="inv-stock-status" className="text-muted-foreground text-xs">Stock status</Label>
              <Select value={stockStatusFilter} onValueChange={(v) => setStockStatusFilter(v as StockStatusFilter)}>
                <SelectTrigger id="inv-stock-status" className="rounded-lg h-9 text-xs sm:text-sm w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in_stock">In stock</SelectItem>
                  <SelectItem value="low_stock">Low stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="inv-low-threshold" className="text-muted-foreground text-xs">Low stock ≤</Label>
              <Input
                id="inv-low-threshold"
                type="number"
                min={0}
                placeholder="5"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="rounded-lg h-9 text-xs sm:text-sm w-full"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="inv-min-stock" className="text-muted-foreground text-xs">Min</Label>
              <Input
                id="inv-min-stock"
                type="number"
                placeholder="Min"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="rounded-lg h-9 text-xs sm:text-sm w-full"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="inv-max-stock" className="text-muted-foreground text-xs">Max</Label>
              <Input
                id="inv-max-stock"
                type="number"
                placeholder="Max"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                className="rounded-lg h-9 text-xs sm:text-sm w-full"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="inv-sort-by" className="text-muted-foreground text-xs">Sort by</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortByOption)}>
                <SelectTrigger id="inv-sort-by" className="rounded-lg h-9 text-xs sm:text-sm w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="updatedAt">Last updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="inv-sort-order" className="text-muted-foreground text-xs">Order</Label>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger id="inv-sort-order" className="rounded-lg h-9 text-xs sm:text-sm w-full">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {}
        <div className="glass-card rounded-xl overflow-hidden hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead className="text-right">Reorder Qty</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`skeleton-row-${idx}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-14" /></TableCell>
                  </TableRow>
                ))}
              {filteredInventory.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                    No inventory items found
                  </TableCell>
                </TableRow>
              )}
              {filteredInventory.map((item) => (
                <TableRow key={item.code}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="text-right font-medium text-sm">{item.stock}</TableCell>
                  <TableCell className="text-right text-sm">{item.reorderLevel}</TableCell>
                  <TableCell className="text-right text-sm">{item.reorderQty}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(item.updatedAt)}</TableCell>
                  <TableCell>
                    {item.stock === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive border border-destructive/30">
                        Out of stock
                      </span>
                    ) : item.stock <= item.reorderLevel ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning border border-warning/30">
                        Low stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
                        In stock
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate(`/inventory/${item.code}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {}
        <div className="md:hidden space-y-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`mobile-skeleton-${idx}`} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          {filteredInventory.length === 0 && !isLoading && (
            <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground text-center">
              No inventory items found
            </div>
          )}
          {filteredInventory.map((item) => (
            <div key={item.code} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                  </div>
                </div>
                {item.stock === 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive border border-destructive/30 shrink-0">
                    Out of stock
                  </span>
                ) : item.stock <= item.reorderLevel ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning border border-warning/30 shrink-0">
                    Low stock
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30 shrink-0">
                    In stock
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Reorder Level</p>
                  <p className="font-medium">{item.reorderLevel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stock</p>
                  <p className="font-medium">{item.stock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reorder Qty</p>
                  <p className="font-medium">{item.reorderQty}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Updated: {formatDateTime(item.updatedAt)}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 text-xs"
                onClick={() => navigate(`/inventory/${item.code}`)}
              >
                View Details
              </Button>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
