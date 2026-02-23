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
import { ArrowLeft, Save, Package } from 'lucide-react';
import { toast } from 'sonner';
import { adjustMrpeasyInventory } from '@/services/mrpeasy';

const adjustSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  quantityDelta: z.number().int('Quantity delta must be a whole number').refine((n) => n !== 0, {
    message: 'Quantity delta cannot be 0',
  }),
  reason: z.string().max(1000, 'Reason must be 1000 characters or less').optional(),
  idempotencyKey: z.string().max(256, 'Idempotency key must be 256 characters or less').optional(),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

const ProductNewPage: React.FC = () => {
  const navigate = useNavigate();
  
  const form = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      sku: '',
      quantityDelta: 0,
      reason: '',
      idempotencyKey: '',
    },
  });

  const onSubmit = async (data: AdjustFormData) => {
    try {
      await adjustMrpeasyInventory({
        sku: data.sku.trim(),
        quantityDelta: data.quantityDelta,
        reason: data.reason?.trim() || undefined,
        idempotencyKey: data.idempotencyKey?.trim() || undefined,
      });
      toast.success('Inventory adjusted successfully');
      navigate(`/inventory/${encodeURIComponent(data.sku.trim())}`);
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to adjust inventory';
      toast.error(message);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {}
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
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Adjust Inventory</h1>
            <p className="text-sm text-muted-foreground">Submit a stock adjustment for an existing SKU</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-3 md:pb-4">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Package className="h-4 w-4 md:h-5 md:w-5" />
                  Adjustment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="MOCK-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantityDelta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Delta</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            placeholder="-5 or 10"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Received stock / Damaged goods / Correction"
                          className="min-h-[90px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="idempotencyKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idempotency Key (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="optional-unique-key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/inventory')}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Apply Adjustment
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

export default ProductNewPage;
