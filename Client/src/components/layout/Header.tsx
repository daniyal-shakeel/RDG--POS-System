import { useState } from 'react';
import { Search, Plus, QrCode } from 'lucide-react';
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

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { triggerScan, deviceStatus } = usePOS();
  const navigate = useNavigate();

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

      </div>
    </header>
  );
}
