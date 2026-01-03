import { useEffect, useState, useCallback } from 'react';
import { bluetoothPrinter, ReceiptData } from '@/services/BluetoothPrinterService';

interface UseBluetoothPrinter {
  isConnected: boolean;
  isSupported: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  printReceipt: (data: ReceiptData) => Promise<boolean>;
}

export function useBluetoothPrinter(): UseBluetoothPrinter {
  const [isConnected, setIsConnected] = useState(false);
  const isSupported = bluetoothPrinter.isSupported();

  useEffect(() => {
    // Check initial status
    setIsConnected(bluetoothPrinter.getConnectionStatus());

    // Subscribe to connection changes
    const unsubscribe = bluetoothPrinter.onConnectionChange(setIsConnected);

    return () => {
      unsubscribe();
    };
  }, []);

  const connect = useCallback(async () => {
    return bluetoothPrinter.connect();
  }, []);

  const disconnect = useCallback(async () => {
    return bluetoothPrinter.disconnect();
  }, []);

  const printReceipt = useCallback(async (data: ReceiptData) => {
    return bluetoothPrinter.printReceipt(data);
  }, []);

  return {
    isConnected,
    isSupported,
    connect,
    disconnect,
    printReceipt
  };
}

export type { ReceiptData };
