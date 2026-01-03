import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Package, DollarSign, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { mockProducts } from '@/data/mockData';

const ProductViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Find product by code (using id param)
  const product = mockProducts.find(p => p.code === id);
  
  // Mock extended product data
  const extendedProduct = product ? {
    ...product,
    description: 'Premium quality dates sourced from the finest farms. Perfect for snacking or gifting.',
    category: 'Dates',
    stock: Math.floor(Math.random() * 100) + 20,
    minStock: 10,
    cost: product.price * 0.6,
    barcode: `789${product.code.replace('RDG-', '')}12345`,
    totalSold: Math.floor(Math.random() * 500) + 50,
    revenue: 0,
  } : null;

  if (extendedProduct) {
    extendedProduct.revenue = extendedProduct.totalSold * extendedProduct.price;
  }
  
  if (!extendedProduct) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">Product not found</p>
          <Button onClick={() => navigate('/inventory')}>Back to Inventory</Button>
        </div>
      </MainLayout>
    );
  }

  const profitMargin = ((extendedProduct.price - extendedProduct.cost) / extendedProduct.price * 100).toFixed(1);
  const isLowStock = extendedProduct.stock <= extendedProduct.minStock;

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
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
                <h1 className="text-xl md:text-2xl font-bold text-foreground">{extendedProduct.name}</h1>
                {isLowStock && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">SKU: {extendedProduct.code}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button size="sm" variant="outline" className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs md:text-sm">In Stock</span>
              </div>
              <p className={`text-lg md:text-2xl font-bold ${isLowStock ? 'text-destructive' : ''}`}>
                {extendedProduct.stock}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs md:text-sm">Price</span>
              </div>
              <p className="text-lg md:text-2xl font-bold text-green-600">${extendedProduct.price.toFixed(2)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs md:text-sm">Total Sold</span>
              </div>
              <p className="text-lg md:text-2xl font-bold">{extendedProduct.totalSold}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs md:text-sm">Revenue</span>
              </div>
              <p className="text-lg md:text-2xl font-bold text-primary">${extendedProduct.revenue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Product Details */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product Code</p>
                  <p className="font-medium">{extendedProduct.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Barcode</p>
                  <p className="font-medium font-mono text-sm">{extendedProduct.barcode}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="secondary">{extendedProduct.category}</Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-foreground">{extendedProduct.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Inventory */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price</p>
                    <p className="text-xl font-bold text-green-600">${extendedProduct.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost Price</p>
                    <p className="text-xl font-bold">${extendedProduct.cost.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className="text-xl font-bold text-primary">{profitMargin}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profit per Unit</p>
                    <p className="text-xl font-bold text-green-600">
                      ${(extendedProduct.price - extendedProduct.cost).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                      <p className={`text-xl font-bold ${isLowStock ? 'text-destructive' : ''}`}>
                        {extendedProduct.stock} units
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Min. Stock Alert</p>
                      <p className="text-xl font-bold">{extendedProduct.minStock} units</p>
                    </div>
                  </div>
                </div>
                
                {isLowStock && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Stock Alert</p>
                      <p className="text-sm text-muted-foreground">
                        Stock is below minimum threshold. Consider reordering.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductViewPage;
