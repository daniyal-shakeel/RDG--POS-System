import { MainLayout } from '@/components/layout/MainLayout';
import { usePOS } from '@/contexts/POSContext';
import { BluetoothPrinterCard } from '@/components/settings/BluetoothPrinterCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Building, 
  Smartphone, 
  Database, 
  RefreshCw,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, deviceStatus } = usePOS();

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Settings</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Configure your POS system
            </p>
          </div>
          <Button onClick={handleSave} className="gap-2 w-full sm:w-auto">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>

        {/* User Profile */}
        <div className="glass-card rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-sm sm:text-base">User Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Full Name</Label>
              <Input defaultValue={user?.name} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Email</Label>
              <Input defaultValue={user?.email} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Role</Label>
              <Select defaultValue={user?.role}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="sales_rep">Sales Representative</SelectItem>
                  <SelectItem value="warehouse">Warehouse Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="glass-card rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Building className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-sm sm:text-base">Company Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Company Name</Label>
              <Input defaultValue="The Royal Dates Galore Ltd." className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Phone</Label>
              <Input defaultValue="+1(868)739-5025" className="text-sm" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs sm:text-sm">Address</Label>
              <Input defaultValue="22 Macoya Road West, Macoya Industrial Estate, Tunapuna" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Tax Rate (%)</Label>
              <Input type="number" defaultValue="12.5" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Currency</Label>
              <Select defaultValue="TTD">
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TTD">TTD - Trinidad Dollar</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Device Configuration */}
        <div className="glass-card rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-sm sm:text-base">Device Configuration</h2>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* CT60 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 gap-3">
              <div className="flex items-center gap-4">
                <Smartphone className="h-6 w-6" />
                <div>
                  <p className="font-medium text-sm sm:text-base">Honeywell CT60</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Mobile Computer / Scanner</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <span className={`flex items-center gap-2 text-xs sm:text-sm ${
                  deviceStatus.ct60 === 'connected' ? 'text-success' : 'text-destructive'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    deviceStatus.ct60 === 'connected' ? 'bg-success' : 'bg-destructive'
                  }`} />
                  {deviceStatus.ct60 === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Configure
                </Button>
              </div>
            </div>

            {/* RP4 with Bluetooth Connection */}
            <BluetoothPrinterCard />

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-sm sm:text-base">Auto-print receipts</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Automatically print after completing a sale
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-sm sm:text-base">Continuous receipt format</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Use variable-length paper for RP4
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="glass-card rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-sm sm:text-base">Integrations</h2>
          </div>

          <div className="space-y-4">
            {/* QuickBooks */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 gap-3">
              <div>
                <p className="font-medium text-sm sm:text-base">QuickBooks Online Advanced</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Sync invoices, receipts, and financial data
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <span className="flex items-center gap-2 text-xs sm:text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Connected
                </span>
                <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </Button>
              </div>
            </div>

            {/* MRPEasy */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 gap-3">
              <div>
                <p className="font-medium text-sm sm:text-base">MRPEasy Starter</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Inventory, warehouse, and supply chain management
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <span className="flex items-center gap-2 text-xs sm:text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Connected
                </span>
                <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </Button>
              </div>
            </div>

            {/* SharePoint */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 gap-3">
              <div>
                <p className="font-medium text-sm sm:text-base">SharePoint / Excel Export</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Export invoice fields to SharePoint list or Excel
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <span className="flex items-center gap-2 text-xs sm:text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Configured
                </span>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Configure
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
