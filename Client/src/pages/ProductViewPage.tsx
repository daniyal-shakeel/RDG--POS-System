import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Package, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  adjustMrpeasyInventory,
  deleteMrpeasyInventory,
  getMrpeasyInventoryBySku,
  patchMrpeasyInventory,
  type MrpeasyInventoryItem,
} from '@/services/mrpeasy';

const ProductViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState<MrpeasyInventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [patchForm, setPatchForm] = useState({
    name: '',
    quantity: '',
    reorderPoint: '',
    reorderQty: '',
    basePrice: '',
    salePrice: '',
  });
  const [adjustForm, setAdjustForm] = useState({
    quantityDelta: '',
    reason: '',
    idempotencyKey: '',
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const sku = (id ?? '').trim();

  const formatDateTime = (iso?: string) => {
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

  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const loadItem = async () => {
    if (!sku) {
      toast.error('Missing SKU');
      return;
    }
    setIsLoading(true);
    try {
      const result = await getMrpeasyInventoryBySku(sku);
      setItem(result.data);
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to load inventory item';
      toast.error(message);
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [sku]);

  if (!sku) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">SKU not found</p>
          <Button onClick={() => navigate('/inventory')}>Back to Inventory</Button>
        </div>
      </MainLayout>
    );
  }

  const isLowStock = item ? item.quantity <= (item.reorderPoint ?? 0) : false;

  const parseOptionalInt = (value: string, fieldName: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error(`${fieldName} must be a whole number`);
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) {
      throw new Error(`${fieldName} must be a whole number`);
    }
    return parsed;
  };

  const parseOptionalPrice = (value: string, fieldName: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      throw new Error(`${fieldName} must be a number`);
    }
    if (parsed < 0) {
      throw new Error(`${fieldName} cannot be negative`);
    }
    return parsed;
  };

  const handlePatch = async () => {
    try {
      const payload: {
        name?: string;
        quantity?: number;
        reorderPoint?: number;
        reorderQty?: number;
        basePrice?: number;
        salePrice?: number;
      } = {};

      const name = patchForm.name.trim();
      if (name) {
        if (name.length > 500) throw new Error('Name must be 500 characters or less');
        payload.name = name;
      }

      const quantity = parseOptionalInt(patchForm.quantity, 'Quantity');
      const reorderPoint = parseOptionalInt(patchForm.reorderPoint, 'Reorder level');
      const reorderQty = parseOptionalInt(patchForm.reorderQty, 'Reorder quantity');
      const basePrice = parseOptionalPrice(patchForm.basePrice, 'Base price');
      const salePrice = parseOptionalPrice(patchForm.salePrice, 'Sale price');

      if (quantity !== undefined && quantity < 0) throw new Error('Quantity cannot be negative');
      if (reorderPoint !== undefined && reorderPoint < 0) throw new Error('Reorder level cannot be negative');
      if (reorderQty !== undefined && reorderQty < 0) throw new Error('Reorder quantity cannot be negative');
      if (basePrice !== undefined && basePrice < 0) throw new Error('Base price cannot be negative');
      if (salePrice !== undefined && salePrice < 0) throw new Error('Sale price cannot be negative');

      if (quantity !== undefined) payload.quantity = quantity;
      if (reorderPoint !== undefined) payload.reorderPoint = reorderPoint;
      if (reorderQty !== undefined) payload.reorderQty = reorderQty;
      if (basePrice !== undefined) payload.basePrice = basePrice;
      if (salePrice !== undefined) payload.salePrice = salePrice;

      if (Object.keys(payload).length === 0) {
        toast.error('Enter at least one field to update');
        return;
      }

      setIsUpdating(true);
      await patchMrpeasyInventory(sku, payload);
      toast.success('Inventory item updated');
      setPatchForm({ name: '', quantity: '', reorderPoint: '', reorderQty: '', basePrice: '', salePrice: '' });
      await loadItem();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to update inventory item';
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdjust = async () => {
    try {
      const deltaRaw = adjustForm.quantityDelta.trim();
      if (!deltaRaw) throw new Error('Quantity delta is required');
      if (!/^-?\d+$/.test(deltaRaw)) throw new Error('Quantity delta must be a whole number');
      const quantityDelta = Number(deltaRaw);
      if (!Number.isInteger(quantityDelta)) throw new Error('Quantity delta must be a whole number');
      if (quantityDelta === 0) throw new Error('Quantity delta cannot be 0');

      const reason = adjustForm.reason.trim();
      if (reason.length > 1000) throw new Error('Reason must be 1000 characters or less');

      const idempotencyKey = adjustForm.idempotencyKey.trim();
      if (idempotencyKey.length > 256) throw new Error('Idempotency key must be 256 characters or less');

      setIsUpdating(true);
      await adjustMrpeasyInventory({
        sku,
        quantityDelta,
        reason: reason || undefined,
        idempotencyKey: idempotencyKey || undefined,
      });
      toast.success('Inventory adjusted');
      setAdjustForm({ quantityDelta: '', reason: '', idempotencyKey: '' });
      await loadItem();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to adjust inventory';
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsUpdating(true);
      await deleteMrpeasyInventory(sku);
      toast.success('Inventory item deleted');
      navigate('/inventory');
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to delete inventory item';
      toast.error(message);
    } finally {
      setIsUpdating(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/inventory')}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">{item?.name || sku}</h1>
                {isLowStock && item && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">SKU: {sku}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={loadItem} disabled={isLoading || isUpdating}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {item && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isLoading || isUpdating}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {!item && !isLoading && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Inventory item not found</CardContent>
          </Card>
        )}

        {isLoading && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={`stat-skeleton-${idx}`}>
                  <CardContent className="p-3 md:p-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-44" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-40" />
              </CardContent>
            </Card>
          </>
        )}

        {item && (
          <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs md:text-sm">In Stock</span>
              </div>
              <p className={`text-lg md:text-2xl font-bold ${isLowStock ? 'text-destructive' : ''}`}>
                {item.quantity}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs md:text-sm">Reorder Level</span>
              </div>
              <p className="text-lg md:text-2xl font-bold">{item.reorderPoint ?? 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs md:text-sm">Reorder Qty</span>
              </div>
              <p className="text-lg md:text-2xl font-bold">{item.reorderQty ?? 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <RefreshCw className="h-4 w-4" />
                <span className="text-xs md:text-sm">Updated</span>
              </div>
              <p className="text-xs md:text-sm font-semibold">{formatDateTime(item.updatedAt)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-medium">{item.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{item.name || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reorder Level</p>
                  <p className="font-medium">{item.reorderPoint ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reorder Qty</p>
                  <p className="font-medium">{item.reorderQty ?? 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Base Price</p>
                  <p className="font-medium">{formatCurrency(item.basePrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sale Price</p>
                  <p className="font-medium">{formatCurrency(item.salePrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Patch Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patch-name">Name</Label>
                    <Input
                
                      id="patch-name"
                      value={patchForm.name}
                      onChange={(e) => setPatchForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Update display name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patch-qty">Quantity</Label>
                    <Input
                      id="patch-qty"
                      value={patchForm.quantity}
                      onChange={(e) => setPatchForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      placeholder="Whole number >= 0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patch-rp">Reorder Level</Label>
                    <Input
                      id="patch-rp"
                      value={patchForm.reorderPoint}
                      onChange={(e) => setPatchForm((prev) => ({ ...prev, reorderPoint: e.target.value }))}
                      placeholder="Whole number >= 0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patch-rq">Reorder Qty</Label>
                    <Input
                      id="patch-rq"
                      value={patchForm.reorderQty}
                      onChange={(e) => setPatchForm((prev) => ({ ...prev, reorderQty: e.target.value }))}
                      placeholder="Whole number >= 0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patch-basePrice">Base Price</Label>
                    <Input
                      id="patch-basePrice"
                      type="number"
                      min={0}
                      step="0.01"
                      value={patchForm.basePrice}
                      onChange={(e) => setPatchForm((prev) => ({ ...prev, basePrice: e.target.value }))}
                      placeholder="e.g. 12.50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patch-salePrice">Sale Price</Label>
                    <Input
                      id="patch-salePrice"
                      type="number"
                      min={0}
                      step="0.01"
                      value={patchForm.salePrice}
                      onChange={(e) => setPatchForm((prev) => ({ ...prev, salePrice: e.target.value }))}
                      placeholder="e.g. 19.99"
                    />
                  </div>
                </div>

                <Button onClick={handlePatch} disabled={isUpdating || isLoading} className="w-full">
                  Save Patch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg">Adjust Quantity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="adj-delta">Quantity Delta</Label>
                <Input
                  id="adj-delta"
                  value={adjustForm.quantityDelta}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantityDelta: e.target.value }))}
                  placeholder="-5 or 10"
                />
              </div>
              <div>
                <Label htmlFor="adj-key">Idempotency Key</Label>
                <Input
                  id="adj-key"
                  value={adjustForm.idempotencyKey}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, idempotencyKey: e.target.value }))}
                  placeholder="Optional key"
                />
              </div>
              <div>
                <Label htmlFor="adj-reason">Reason</Label>
                <Textarea
                  id="adj-reason"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Optional reason"
                  className="min-h-[40px]"
                />
              </div>
            </div>
            <Button onClick={handleAdjust} disabled={isUpdating || isLoading} className="w-full md:w-auto">
              Apply Adjustment
            </Button>
          </CardContent>
        </Card>
          </>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete &quot;{item?.name || sku}&quot; (SKU: {sku}) from inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default ProductViewPage;
