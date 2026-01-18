import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, User, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required').max(255),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
});

const shippingAddressSchema = z.object({
  street: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().min(1, 'Phone is required').max(20),
  billingAddress: addressSchema,
  shippingAddress: shippingAddressSchema.optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

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

const CustomerNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(isEditMode);
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      billingAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      shippingAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
    },
  });

  // Fetch customer data when in edit mode
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!isEditMode || !id) return;

      try {
        setIsLoadingCustomer(true);
        const response = await api.get(`/api/v1/customer/${id}`);
        const backendCustomer: BackendCustomer = response.data.customer;
        
        // Pre-fill form with customer data
        form.reset({
          name: backendCustomer.name || '',
          email: backendCustomer.email || '',
          phone: backendCustomer.phone || '',
          billingAddress: {
            street: backendCustomer.billingAddress?.street || '',
            city: backendCustomer.billingAddress?.city || '',
            state: backendCustomer.billingAddress?.state || '',
            postalCode: backendCustomer.billingAddress?.postalCode || '',
            country: backendCustomer.billingAddress?.country || '',
          },
          shippingAddress: backendCustomer.shippingAddress ? {
            street: backendCustomer.shippingAddress.street || '',
            city: backendCustomer.shippingAddress.city || '',
            state: backendCustomer.shippingAddress.state || '',
            postalCode: backendCustomer.shippingAddress.postalCode || '',
            country: backendCustomer.shippingAddress.country || '',
          } : undefined,
        });

        // Check if shipping address is the same as billing
        const billing = backendCustomer.billingAddress;
        const shipping = backendCustomer.shippingAddress;
        if (billing && shipping) {
          const isSame = 
            billing.street === shipping.street &&
            billing.city === shipping.city &&
            billing.state === shipping.state &&
            billing.postalCode === shipping.postalCode &&
            billing.country === shipping.country;
          setUseSameAddress(isSame);
        }
      } catch (error: any) {
        console.error('Error fetching customer:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch customer';
        toast.error(errorMessage);
        navigate('/customers');
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    fetchCustomer();
  }, [id, isEditMode, form, navigate]);

  // Watch billing address to copy to shipping when checkbox is checked
  const billingAddress = form.watch('billingAddress');

  useEffect(() => {
    if (useSameAddress && billingAddress) {
      form.setValue('shippingAddress', { ...billingAddress });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSameAddress, billingAddress]);

  const handleSameAddressChange = (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    setUseSameAddress(isChecked);
    if (isChecked) {
      // Copy billing address to shipping
      const currentBilling = form.getValues('billingAddress');
      form.setValue('shippingAddress', { ...currentBilling });
    } else {
      // Clear shipping address
      form.setValue('shippingAddress', {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      });
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    // Prepare data for backend
    const customerData: {
      name: string;
      email: string;
      phone: string;
      billingAddress: typeof data.billingAddress;
      shippingAddress?: typeof data.billingAddress;
    } = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      billingAddress: data.billingAddress,
    };

    // Handle shipping address
    if (useSameAddress) {
      // Use billing address as shipping address
      customerData.shippingAddress = data.billingAddress;
    } else if (data.shippingAddress) {
      // Check if shipping address has any values
      const hasShippingData = Object.values(data.shippingAddress).some(
        (v) => v && v.trim() !== ''
      );
      if (hasShippingData) {
        customerData.shippingAddress = data.shippingAddress;
      }
      // If no shipping data, shippingAddress will be undefined (optional)
    }
    
    setIsLoading(true);
    try {
      let response;
      
      if (isEditMode && id) {
        // Update existing customer
        response = await api.put(`/api/v1/customer/${id}`, customerData);
        toast.success(response.data.message || 'Customer updated successfully');
      } else {
        // Create new customer
        response = await api.post('/api/v1/customer', customerData);
        toast.success(response.data.message || 'Customer created successfully');
      }
      
      navigate('/customers');
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        const errorMessage = isEditMode 
          ? error.response?.data?.message || 'Failed to update customer'
          : error.response?.data?.message || 'Failed to create customer';
        toast.error(errorMessage);
      }
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingCustomer) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-muted-foreground">Loading customer data...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
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
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {isEditMode ? 'Edit Customer' : 'New Customer'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? 'Update customer information' : 'Add a new customer to your database'}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company/Customer Name</FormLabel>
                        <FormControl>
                          <Input className="pl-4" placeholder="Enter customer name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-10" placeholder="email@example.com" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-10" placeholder="+1 (868) 000-0000" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card>
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="billingAddress.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input className="pl-4" placeholder="Enter street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billingAddress.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input className="pl-4" placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="billingAddress.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input className="pl-4" placeholder="Enter state" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billingAddress.postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input className="pl-4" placeholder="Enter postal code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="billingAddress.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input className="pl-4" placeholder="Enter country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Shipping Address */}
            <Card>
              <CardHeader className="pb-3 md:pb-4">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id="sameAddress"
                    checked={useSameAddress}
                    onCheckedChange={handleSameAddressChange}
                  />
                  <label
                    htmlFor="sameAddress"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Use shipping address same as billing address
                  </label>
                </div>

                {!useSameAddress && (
                  <div className="space-y-4 pt-2">
                    <FormField
                      control={form.control}
                      name="shippingAddress.street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input className="pl-4" placeholder="Enter street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shippingAddress.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input className="pl-4" placeholder="Enter city" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="shippingAddress.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input className="pl-4" placeholder="Enter state" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shippingAddress.postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input className="pl-4" placeholder="Enter postal code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="shippingAddress.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input className="pl-4" placeholder="Enter country" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {useSameAddress && (
                  <div className="pt-2 pb-2">
                    <p className="text-sm text-muted-foreground">
                      Shipping address will use the same information as billing address.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/customers')}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || isLoadingCustomer}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading 
                  ? (isEditMode ? 'Updating...' : 'Saving...') 
                  : (isEditMode ? 'Update Customer' : 'Save Customer')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

export default CustomerNewPage;
