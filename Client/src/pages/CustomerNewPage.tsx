import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, User, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

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

const CustomerNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
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
      // Get token from localStorage and add to Authorization header
      const token = localStorage.getItem('token') || '';
      const trimmedToken = token.trim();
      
      const response = await axios.post('http://localhost:5500/api/v1/customer', customerData, {
        headers: {
          'Authorization': `Bearer ${trimmedToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      toast.success(response.data.message || 'Customer created successfully');
      navigate('/customers');
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create customer');
      }
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-xl md:text-2xl font-bold text-foreground">New Customer</h1>
            <p className="text-sm text-muted-foreground">Add a new customer to your database</p>
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
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Customer'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

export default CustomerNewPage;
