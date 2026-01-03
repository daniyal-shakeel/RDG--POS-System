import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, FileText, DollarSign, Calendar } from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { format } from 'date-fns';

const CustomerViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { customers, documents } = usePOS();
  
  const customer = customers.find(c => c.id === id);
  const customerDocuments = documents.filter(d => d.customer.id === id);
  
  if (!customer) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">Customer not found</p>
          <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
        </div>
      </MainLayout>
    );
  }

  const totalSpent = customerDocuments
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + d.total, 0);
  
  const pendingAmount = customerDocuments
    .filter(d => d.status === 'pending' || d.status === 'partial')
    .reduce((sum, d) => sum + d.balanceDue, 0);

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/customers')}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{customer.name}</h1>
              <p className="text-sm text-muted-foreground">Customer ID: {customer.id}</p>
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
                <FileText className="h-4 w-4" />
                <span className="text-xs md:text-sm">Total Orders</span>
              </div>
              <p className="text-lg md:text-2xl font-bold">{customerDocuments.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs md:text-sm">Total Spent</span>
              </div>
              <p className="text-lg md:text-2xl font-bold text-green-600">${totalSpent.toFixed(2)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs md:text-sm">Pending</span>
              </div>
              <p className="text-lg md:text-2xl font-bold text-orange-600">${pendingAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs md:text-sm">Last Order</span>
              </div>
              <p className="text-sm md:text-base font-medium">
                {customerDocuments.length > 0 
                  ? format(new Date(customerDocuments[0].date), 'MMM dd, yyyy')
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                    {customer.email}
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                    {customer.phone}
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Billing Address</p>
                  <p className="text-foreground">{customer.billingAddress}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Shipping Address</p>
                  <p className="text-foreground">{customer.shippingAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {customerDocuments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {customerDocuments.slice(0, 5).map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/${doc.type === 'credit_note' ? 'credit-notes' : doc.type + 's'}/${doc.id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{doc.refNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">${doc.total.toFixed(2)}</p>
                        <Badge 
                          variant={doc.status === 'paid' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {doc.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default CustomerViewPage;
