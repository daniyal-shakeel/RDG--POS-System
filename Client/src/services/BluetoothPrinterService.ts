// Web Bluetooth API Service for Honeywell RP4 Printer
// ESC/POS compatible commands
/// <reference path="../types/web-bluetooth.d.ts" />

interface PrinterDevice {
  device: any;
  server: any;
  characteristic: any;
}

// Honeywell RP4 Bluetooth Service UUIDs (standard SPP over BLE)
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const Commands = {
  INIT: new Uint8Array([ESC, 0x40]), // Initialize printer
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT_ON: new Uint8Array([GS, 0x21, 0x01]),
  DOUBLE_HEIGHT_OFF: new Uint8Array([GS, 0x21, 0x00]),
  DOUBLE_WIDTH_ON: new Uint8Array([GS, 0x21, 0x10]),
  DOUBLE_WIDTH_OFF: new Uint8Array([GS, 0x21, 0x00]),
  UNDERLINE_ON: new Uint8Array([ESC, 0x2D, 0x01]),
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2D, 0x00]),
  CUT_PAPER: new Uint8Array([GS, 0x56, 0x00]),
  FEED_LINE: new Uint8Array([LF]),
  FEED_LINES: (n: number) => new Uint8Array([ESC, 0x64, n]),
};

class BluetoothPrinterService {
  private printer: PrinterDevice | null = null;
  private isConnected: boolean = false;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  // Check if Web Bluetooth is supported
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth;
  }

  // Connect to RP4 printer
  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      console.error('Web Bluetooth API not supported');
      return false;
    }

    try {
      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'RP4' },
          { namePrefix: 'Honeywell' },
          { services: [PRINTER_SERVICE_UUID] }
        ],
        optionalServices: [PRINTER_SERVICE_UUID]
      });

      console.log('Found printer:', device.name);

      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Get printer service
      const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      
      // Get write characteristic
      const characteristic = await service.getCharacteristic(PRINTER_CHAR_UUID);

      this.printer = {
        device,
        server,
        characteristic
      };

      // Set up disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Printer disconnected');
        this.isConnected = false;
        this.notifyListeners(false);
      });

      this.isConnected = true;
      this.notifyListeners(true);
      
      // Initialize printer
      await this.sendCommand(Commands.INIT);
      
      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      this.isConnected = false;
      this.notifyListeners(false);
      return false;
    }
  }

  // Disconnect from printer
  async disconnect(): Promise<void> {
    if (this.printer?.server?.connected) {
      this.printer.server.disconnect();
    }
    this.printer = null;
    this.isConnected = false;
    this.notifyListeners(false);
  }

  // Check connection status
  getConnectionStatus(): boolean {
    return this.isConnected && !!this.printer?.server?.connected;
  }

  // Subscribe to connection changes
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  private notifyListeners(connected: boolean): void {
    this.connectionListeners.forEach(cb => cb(connected));
  }

  // Send raw command to printer
  private async sendCommand(command: Uint8Array): Promise<void> {
    if (!this.printer?.characteristic) {
      throw new Error('Printer not connected');
    }
    await this.printer.characteristic.writeValue(command);
  }

  // Send text to printer
  private async sendText(text: string): Promise<void> {
    const encoder = new TextEncoder();
    await this.sendCommand(encoder.encode(text));
    await this.sendCommand(Commands.FEED_LINE);
  }

  // Print receipt
  async printReceipt(data: ReceiptData): Promise<boolean> {
    if (!this.getConnectionStatus()) {
      console.error('Printer not connected');
      return false;
    }

    try {
      // Initialize
      await this.sendCommand(Commands.INIT);
      
      // Header - Company name
      await this.sendCommand(Commands.ALIGN_CENTER);
      await this.sendCommand(Commands.BOLD_ON);
      await this.sendCommand(Commands.DOUBLE_HEIGHT_ON);
      await this.sendText(data.companyName);
      await this.sendCommand(Commands.DOUBLE_HEIGHT_OFF);
      await this.sendCommand(Commands.BOLD_OFF);
      
      // Company details
      await this.sendText(data.companyAddress);
      await this.sendText(`Tel: ${data.companyPhone}`);
      await this.sendCommand(Commands.FEED_LINE);
      
      // Document type and reference
      await this.sendCommand(Commands.BOLD_ON);
      await this.sendText(data.documentType.toUpperCase());
      await this.sendCommand(Commands.BOLD_OFF);
      await this.sendText(`Ref: ${data.refNumber}`);
      await this.sendText(`Date: ${data.date}`);
      await this.sendCommand(Commands.FEED_LINE);
      
      // Customer info
      await this.sendCommand(Commands.ALIGN_LEFT);
      await this.sendCommand(Commands.BOLD_ON);
      await this.sendText('Bill To:');
      await this.sendCommand(Commands.BOLD_OFF);
      await this.sendText(data.customerName);
      await this.sendCommand(Commands.FEED_LINE);
      
      // Separator
      await this.sendText('--------------------------------');
      
      // Items header
      await this.sendCommand(Commands.BOLD_ON);
      await this.sendText('Item              Qty    Amount');
      await this.sendCommand(Commands.BOLD_OFF);
      await this.sendText('--------------------------------');
      
      // Line items
      for (const item of data.items) {
        const name = item.description.substring(0, 16).padEnd(16);
        const qty = item.quantity.toString().padStart(4);
        const amount = this.formatCurrency(item.amount).padStart(10);
        await this.sendText(`${name}${qty}${amount}`);
      }
      
      // Separator
      await this.sendText('--------------------------------');
      
      // Totals
      await this.sendCommand(Commands.ALIGN_RIGHT);
      await this.sendText(`Subtotal:    ${this.formatCurrency(data.subtotal)}`);
      if (data.discount > 0) {
        await this.sendText(`Discount:   -${this.formatCurrency(data.discount)}`);
      }
      if (data.tax > 0) {
        await this.sendText(`VAT (12.5%): ${this.formatCurrency(data.tax)}`);
      }
      await this.sendCommand(Commands.BOLD_ON);
      await this.sendText(`TOTAL:       ${this.formatCurrency(data.total)}`);
      await this.sendCommand(Commands.BOLD_OFF);
      
      if (data.deposit > 0) {
        await this.sendText(`Deposit:    -${this.formatCurrency(data.deposit)}`);
        await this.sendText(`Balance Due: ${this.formatCurrency(data.balanceDue)}`);
      }
      
      // Footer
      await this.sendCommand(Commands.FEED_LINE);
      await this.sendCommand(Commands.ALIGN_CENTER);
      await this.sendText('Thank you for your business!');
      await this.sendText(`Sales Rep: ${data.salesRep}`);
      
      // Feed and cut
      await this.sendCommand(Commands.FEED_LINES(4));
      await this.sendCommand(Commands.CUT_PAPER);
      
      return true;
    } catch (error) {
      console.error('Print error:', error);
      return false;
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD',
      minimumFractionDigits: 2
    }).format(amount);
  }
}

export interface ReceiptData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  documentType: string;
  refNumber: string;
  date: string;
  customerName: string;
  items: Array<{
    description: string;
    quantity: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  deposit: number;
  balanceDue: number;
  salesRep: string;
}

export const bluetoothPrinter = new BluetoothPrinterService();
