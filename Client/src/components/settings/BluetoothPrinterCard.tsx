import { useState } from 'react';
import { useBluetoothPrinter } from '@/hooks/useBluetoothPrinter';
import { Button } from '@/components/ui/button';
import { Printer, Bluetooth, BluetoothOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function BluetoothPrinterCard() {
  const { isConnected, isSupported, connect, disconnect } = useBluetoothPrinter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!isSupported) {
      toast.error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setIsConnecting(true);
    try {
      const success = await connect();
      if (success) {
        toast.success('Successfully connected to Honeywell RP4 printer!');
      } else {
        toast.error('Failed to connect. Make sure the printer is on and in pairing mode.');
      }
    } catch (error) {
      toast.error('Connection failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.info('Printer disconnected');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-muted/50 gap-4">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${isConnected ? 'bg-success/20' : 'bg-muted'}`}>
          <Printer className={`h-6 w-6 ${isConnected ? 'text-success' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="font-medium">Honeywell RP4</p>
          <p className="text-sm text-muted-foreground">Mobile Receipt Printer (Bluetooth)</p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
        {/* Status Indicator */}
        <div className={`flex items-center gap-2 text-sm ${
          isConnected ? 'text-success' : 'text-destructive'
        }`}>
          {isConnected ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Disconnected</span>
            </>
          )}
        </div>
        
        {/* Action Buttons */}
        {isConnected ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDisconnect}
            className="gap-2 w-full sm:w-auto"
          >
            <BluetoothOff className="h-4 w-4" />
            Disconnect
          </Button>
        ) : (
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleConnect}
            disabled={isConnecting || !isSupported}
            className="gap-2 w-full sm:w-auto"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Bluetooth className="h-4 w-4" />
                Connect Printer
              </>
            )}
          </Button>
        )}
      </div>
      
      {!isSupported && (
        <p className="text-xs text-destructive mt-2 w-full">
          Web Bluetooth not supported. Use Chrome or Edge browser.
        </p>
      )}
    </div>
  );
}
