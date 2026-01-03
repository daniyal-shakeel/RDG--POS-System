import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Save, User, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().min(1, 'Phone is required').max(20),
  billingAddress: z.string().min(1, 'Billing address is required').max(500),
  shippingAddress: z.string().max(500).optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const CustomerNewPage: React.FC = () => {
  const navigate = useNavigate();
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      billingAddress: '',
      shippingAddress: '',
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    console.log('New customer:', data);
    toast.success('Customer created successfully');
    navigate('/customers');
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
                          <Input placeholder="Enter customer name" {...field} />
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

              {/* Address Information */}
              <Card>
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="billingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter billing address" 
                            className="min-h-[80px] md:min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="shippingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Address (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter shipping address (leave blank if same as billing)" 
                            className="min-h-[80px] md:min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

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
              <Button type="submit" className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Customer
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

export default CustomerNewPage;
