import { useEffect, useState, useCallback } from 'react';
import { barcodeScanner } from '@/services/BarcodeScanner';

interface UseBarcodeScanner {
  isConnected: boolean;
  lastBarcode: string | null;
  lastSymbology: string | null;
  triggerScan: () => void;
}

export function useBarcodeScanner(
  onScan?: (barcode: string, symbology: string) => void
): UseBarcodeScanner {
  const [isConnected, setIsConnected] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [lastSymbology, setLastSymbology] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to connection status
    const unsubscribeStatus = barcodeScanner.onStatusChange(setIsConnected);

    // Subscribe to scans
    const unsubscribeScan = barcodeScanner.onScan((barcode, symbology) => {
      setLastBarcode(barcode);
      setLastSymbology(symbology);
      onScan?.(barcode, symbology);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeScan();
    };
  }, [onScan]);

  const triggerScan = useCallback(() => {
    barcodeScanner.triggerScan();
  }, []);

  return {
    isConnected,
    lastBarcode,
    lastSymbology,
    triggerScan
  };
}
