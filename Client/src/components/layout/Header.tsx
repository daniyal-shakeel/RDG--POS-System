import { useState } from 'react';
import { Search, Bell, Plus, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOS } from '@/contexts/POSContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Notification {
  id: string;
  title: string;
  time: string;
  icon?: string;
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { triggerScan, deviceStatus } = usePOS();
  const navigate = useNavigate();

  // Sample notifications - in a real app, this would come from an API or context
  const notifications: Notification[] = [
    {
      id: '1',
      title: 'User created an estimate for Customer 1',
      time: '2:54 PM',
    },
    {
      id: '2',
      title: 'User created an invoice for Customer 2',
      time: '2:51 PM',
    },
    {
      id: '3',
      title: 'User created a receipt for Customer 3',
      time: '12:38 PM',
    },
  ];

  const handleScan = async () => {
    const barcode = await triggerScan();
    console.log('Scanned barcode:', barcode);
    // Could navigate to product or invoice lookup
  };

  return (
    <header className="sticky top-0 z-30 h-14 xl:h-16 bg-background/80 backdrop-blur-md border-b border-border px-4 xl:px-6 flex items-center justify-between">
      {/* Search */}
      <div className="relative w-64 xl:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search invoices, customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9 xl:h-10 text-sm bg-muted border-0 focus-visible:ring-primary"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Scan Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={deviceStatus.ct60 !== 'connected'}
          className="gap-2"
        >
          <QrCode className="h-4 w-4" />
          Scan
        </Button>

        {/* New Document Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/invoices/new')}>
              Sales Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/receipts/new')}>
              Sales Receipt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/credit-notes/new')}>
              Credit Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/refunds/new')}>
              Refund Receipt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/estimates/new')}>
              Estimate / Quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
                {notifications.length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            align="end" 
            className="w-96 p-0 bg-background border-border"
          >
            <div className="flex flex-col">
              {/* Notification Items */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-border">
                      <span className="text-xs font-medium text-black">up</span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* See all notifications link */}
              <div className="p-3 border-t border-border">
                <button
                  className="text-sm text-primary hover:text-primary/80 font-medium w-full text-center"
                  onClick={() => {
                    // Navigate to notifications page or handle "see all"
                    console.log('See all notifications');
                  }}
                >
                  See all notifications
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
