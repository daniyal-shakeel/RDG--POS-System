// Honeywell DataCollection SDK Integration for CT60
// This service bridges with the Honeywell SDK for Android WebView integration

type ScanCallback = (barcode: string, symbology: string) => void;
type StatusCallback = (connected: boolean) => void;

interface HoneywellDataCollection {
  registerBarcodeCallback: (callback: (barcode: string, symbology: string) => void) => void;
  startScanning: () => void;
  stopScanning: () => void;
  isReady: () => boolean;
}

declare global {
  interface Window {
    HoneywellDataCollection?: HoneywellDataCollection;
    onBarcodeScanned?: (barcode: string, symbology: string) => void;
  }
}

class BarcodeScannerService {
  private scanListeners: Set<ScanCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private isConnected: boolean = false;
  private keyboardBuffer: string = '';
  private keyboardTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initializeSDK();
    this.initializeKeyboardWedge();
  }

  // Initialize Honeywell DataCollection SDK
  private initializeSDK(): void {
    // Check if running in Honeywell CT60 WebView with DataCollection SDK
    if (window.HoneywellDataCollection) {
      console.log('Honeywell DataCollection SDK detected');
      
      // Register native callback
      window.HoneywellDataCollection.registerBarcodeCallback((barcode, symbology) => {
        this.handleBarcode(barcode, symbology);
      });
      
      this.isConnected = true;
      this.notifyStatusListeners(true);
    } else {
      // Set up a global callback for SDK to call
      window.onBarcodeScanned = (barcode: string, symbology: string) => {
        this.handleBarcode(barcode, symbology);
      };

      // Poll for SDK availability
      this.pollForSDK();
    }
  }

  // Initialize keyboard wedge mode (fallback for scanners that emulate keyboard)
  private initializeKeyboardWedge(): void {
    document.addEventListener('keydown', (event) => {
      // Most barcode scanners send data quickly followed by Enter
      if (event.key === 'Enter' && this.keyboardBuffer.length > 0) {
        this.handleBarcode(this.keyboardBuffer, 'KEYBOARD_WEDGE');
        this.keyboardBuffer = '';
        event.preventDefault();
        return;
      }

      // Only capture printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        this.keyboardBuffer += event.key;
        
        // Reset buffer after 50ms of no input (scanner input is fast)
        if (this.keyboardTimer) {
          clearTimeout(this.keyboardTimer);
        }
        this.keyboardTimer = setTimeout(() => {
          this.keyboardBuffer = '';
        }, 50);
      }
    });
  }

  // Poll for SDK becoming available (for late-loaded SDK)
  private pollForSDK(): void {
    const checkInterval = setInterval(() => {
      if (window.HoneywellDataCollection?.isReady()) {
        clearInterval(checkInterval);
        window.HoneywellDataCollection.registerBarcodeCallback((barcode, symbology) => {
          this.handleBarcode(barcode, symbology);
        });
        this.isConnected = true;
        this.notifyStatusListeners(true);
        console.log('Honeywell SDK connected');
      }
    }, 1000);

    // Stop polling after 30 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.isConnected) {
        console.log('Honeywell SDK not available - using keyboard wedge mode');
        // Consider keyboard wedge as connected if available
        this.isConnected = true;
        this.notifyStatusListeners(true);
      }
    }, 30000);
  }

  // Handle incoming barcode
  private handleBarcode(barcode: string, symbology: string): void {
    console.log(`Barcode scanned: ${barcode} (${symbology})`);
    this.scanListeners.forEach(callback => {
      try {
        callback(barcode, symbology);
      } catch (error) {
        console.error('Error in scan callback:', error);
      }
    });
  }

  // Subscribe to barcode scans
  onScan(callback: ScanCallback): () => void {
    this.scanListeners.add(callback);
    return () => this.scanListeners.delete(callback);
  }

  // Subscribe to connection status changes
  onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    // Immediately notify current status
    callback(this.isConnected);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatusListeners(connected: boolean): void {
    this.statusListeners.forEach(cb => cb(connected));
  }

  // Trigger a hardware scan (if supported)
  triggerScan(): void {
    if (window.HoneywellDataCollection) {
      window.HoneywellDataCollection.startScanning();
    } else {
      console.log('Manual scan triggered - waiting for keyboard wedge input');
    }
  }

  // Stop scanning
  stopScan(): void {
    if (window.HoneywellDataCollection) {
      window.HoneywellDataCollection.stopScanning();
    }
  }

  // Check if SDK is available
  isSDKAvailable(): boolean {
    return !!window.HoneywellDataCollection;
  }

  // Check connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Simulate a scan (for testing)
  simulateScan(barcode: string): void {
    this.handleBarcode(barcode, 'SIMULATED');
  }
}

export const barcodeScanner = new BarcodeScannerService();
