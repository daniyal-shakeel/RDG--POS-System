import { MainLayout } from '@/components/layout/MainLayout';
import { mockProducts } from '@/data/mockData';
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
import { Plus, Search, Package, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const inventory = mockProducts.map(product => ({
    ...product,
    stock: Math.floor(Math.random() * 500) + 10,
    reorderLevel: 50,
    location: ['Warehouse A', 'Warehouse B', 'Store Front'][Math.floor(Math.random() * 3)]
  }));

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD'
    }).format(amount);
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Inventory</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Stock levels synced with MRPEasy
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Sync MRPEasy</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <Button 
              className="gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
              onClick={() => navigate('/inventory/new')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Product</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Table - Desktop */}
        <div className="glass-card rounded-xl overflow-hidden hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
                  <TableCell className="text-right text-sm">{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-right font-medium text-sm">{item.stock}</TableCell>
                  <TableCell className="text-sm">{item.location}</TableCell>
                  <TableCell>
                    {item.stock <= item.reorderLevel ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning border border-warning/30">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
                        In Stock
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

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
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
                {item.stock <= item.reorderLevel ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning border border-warning/30 shrink-0">
                    Low
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30 shrink-0">
                    In Stock
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">{formatCurrency(item.price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stock</p>
                  <p className="font-medium">{item.stock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium truncate">{item.location}</p>
                </div>
              </div>
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
