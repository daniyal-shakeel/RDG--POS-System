


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

  
  private initializeSDK(): void {
    
    if (window.HoneywellDataCollection) {
      console.log('Honeywell DataCollection SDK detected');
      
      
      window.HoneywellDataCollection.registerBarcodeCallback((barcode, symbology) => {
        this.handleBarcode(barcode, symbology);
      });
      
      this.isConnected = true;
      this.notifyStatusListeners(true);
    } else {
      
      window.onBarcodeScanned = (barcode: string, symbology: string) => {
        this.handleBarcode(barcode, symbology);
      };

      
      this.pollForSDK();
    }
  }

  
  private initializeKeyboardWedge(): void {
    document.addEventListener('keydown', (event) => {
      
      if (event.key === 'Enter' && this.keyboardBuffer.length > 0) {
        this.handleBarcode(this.keyboardBuffer, 'KEYBOARD_WEDGE');
        this.keyboardBuffer = '';
        event.preventDefault();
        return;
      }

      
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        this.keyboardBuffer += event.key;
        
        
        if (this.keyboardTimer) {
          clearTimeout(this.keyboardTimer);
        }
        this.keyboardTimer = setTimeout(() => {
          this.keyboardBuffer = '';
        }, 50);
      }
    });
  }

  
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

    
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.isConnected) {
        console.log('Honeywell SDK not available - using keyboard wedge mode');
        
        this.isConnected = true;
        this.notifyStatusListeners(true);
      }
    }, 30000);
  }

  
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

  
  onScan(callback: ScanCallback): () => void {
    this.scanListeners.add(callback);
    return () => this.scanListeners.delete(callback);
  }

  
  onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    
    callback(this.isConnected);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatusListeners(connected: boolean): void {
    this.statusListeners.forEach(cb => cb(connected));
  }

  
  triggerScan(): void {
    if (window.HoneywellDataCollection) {
      window.HoneywellDataCollection.startScanning();
    } else {
      console.log('Manual scan triggered - waiting for keyboard wedge input');
    }
  }

  
  stopScan(): void {
    if (window.HoneywellDataCollection) {
      window.HoneywellDataCollection.stopScanning();
    }
  }

  
  isSDKAvailable(): boolean {
    return !!window.HoneywellDataCollection;
  }

  
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  
  simulateScan(barcode: string): void {
    this.handleBarcode(barcode, 'SIMULATED');
  }
}

export const barcodeScanner = new BarcodeScannerService();
