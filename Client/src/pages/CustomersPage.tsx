import { MainLayout } from '@/components/layout/MainLayout';
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
import { Plus, Search, Mail, Phone, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Customer } from '@/types/pos';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';

interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface BackendCustomer {
  _id: string;
  customerCode?: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: IAddress;
  shippingAddress?: IAddress;
}

// Helper function to format address object to string
const formatAddress = (address?: IAddress): string => {
  if (!address) return 'N/A';
  
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/v1/customer');
        const backendCustomers: BackendCustomer[] = response.data.customers || [];
        
        // Transform backend data to frontend Customer type
        const transformedCustomers: Customer[] = backendCustomers.map((customer) => ({
          id: customer._id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          billingAddress: formatAddress(customer.billingAddress),
          shippingAddress: formatAddress(customer.shippingAddress || customer.billingAddress),
        }));
        
        setCustomers(transformedCustomers);
      } catch (error: any) {
        console.error('Error fetching customers:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch customers';
        toast.error(errorMessage);
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Customers</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Manage your customer database
            </p>
          </div>
          {hasPermission('customer.create') && (
            <Button 
              className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
              onClick={() => navigate('/customers/new')}
            >
              <Plus className="h-4 w-4" />
              New Customer
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground">Loading customers...</p>
          </div>
        )}

        {/* Table - Desktop */}
        {!isLoading && (
          <div className="glass-card rounded-xl overflow-hidden hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Billing Address</TableHead>
                  <TableHead>Shipping Address</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No customers found matching your search.' : 'No customers found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {customer.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-32">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="max-w-36 truncate">{customer.billingAddress}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="max-w-36 truncate">{customer.shippingAddress}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mobile/Tablet Cards */}
        {!isLoading && (
          <div className="lg:hidden space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No customers found matching your search.' : 'No customers found.'}
                </p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
            <div key={customer.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.id}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground line-clamp-2">{customer.billingAddress}</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3 text-xs"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                View Details
              </Button>
            </div>
              ))
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
