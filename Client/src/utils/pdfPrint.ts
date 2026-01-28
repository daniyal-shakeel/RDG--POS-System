import { SalesDocument } from '@/types/pos';
import { format } from 'date-fns';

/**
 * Generates and opens a PDF of the receipt using browser's print dialog
 */
export function printReceiptAsPDF(document: SalesDocument): void {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD'
    }).format(amount);
  };

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window. Please allow popups.');
    return;
  }

  // Build HTML content
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${document.type.toUpperCase()} - ${document.refNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      color: black;
      background: white;
      padding: 2mm;
      width: 76mm;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 9pt;
      margin: 2px 0;
    }
    .separator {
      border-top: 1px dashed black;
      margin: 8px 0;
    }
    .section {
      margin-bottom: 8px;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .item {
      margin-bottom: 6px;
    }
    .item-title {
      font-weight: bold;
      margin-bottom: 2px;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      padding-left: 8px;
      font-size: 9pt;
    }
    .total {
      font-weight: bold;
      font-size: 11pt;
      margin-top: 4px;
    }
    .signature-box {
      border-top: 1px solid black;
      height: 48px;
      margin: 8px 0;
    }
    .footer {
      text-align: center;
      margin-top: 16px;
    }
    .footer p {
      font-weight: bold;
      margin: 4px 0;
    }
    @media print {
      body {
        width: 76mm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>THE XYZ Company Ltd. LTD.</h1>
    <p>22 Macoya Road West</p>
    <p>Macoya Industrial Estate, Tunapuna</p>
    <p>Trinidad & Tobago</p>
    <p>+1(868)739-5025</p>
    <p>www.royaldatesgalore.com</p>
  </div>

  <div class="separator"></div>

  <div class="section">
    <div class="row">
      <span>${document.type.toUpperCase().replace('_', ' ')}</span>
      <span>${document.refNumber}</span>
    </div>
    <div class="row">
      <span>Date:</span>
      <span>${format(document.date, 'dd/MM/yyyy HH:mm')}</span>
    </div>
    ${document.dueDate ? `
    <div class="row">
      <span>Due:</span>
      <span>${format(document.dueDate, 'dd/MM/yyyy')}</span>
    </div>
    ` : ''}
    <div class="row">
      <span>Sales Rep:</span>
      <span>${document.salesRep}</span>
    </div>
  </div>

  <div class="separator"></div>

  <div class="section">
    <div class="section-title">BILL TO:</div>
    <p>${document.customer.name}</p>
    <p style="font-size: 8pt;">${document.customer.billingAddress}</p>
  </div>

  <div class="separator"></div>

  <div class="section">
    ${document.items.map((item, index) => `
      <div class="item">
        <div class="item-title">${index + 1}. ${item.description}</div>
        <div class="item-details">
          <span>${item.quantity} x ${formatCurrency(item.unitPrice)}</span>
          <span>${formatCurrency(item.amount)}</span>
        </div>
        ${item.discount > 0 ? `<p style="text-align: right; font-size: 8pt;">Disc: -${item.discount}%</p>` : ''}
      </div>
    `).join('')}
  </div>

  <div class="separator"></div>

  <div class="section">
    <div class="row">
      <span>Subtotal:</span>
      <span>${formatCurrency(document.subtotal)}</span>
    </div>
    ${document.discount > 0 ? `
    <div class="row">
      <span>Discount:</span>
      <span>-${formatCurrency(document.discount)}</span>
    </div>
    ` : ''}
    ${document.tax > 0 ? `
    <div class="row">
      <span>Tax (12.5%):</span>
      <span>${formatCurrency(document.tax)}</span>
    </div>
    ` : ''}
    <div class="row total">
      <span>TOTAL:</span>
      <span>${formatCurrency(document.total)}</span>
    </div>
    ${document.deposit > 0 ? `
    <div class="row">
      <span>Deposit:</span>
      <span>-${formatCurrency(document.deposit)}</span>
    </div>
    ` : ''}
    ${document.balanceDue > 0 ? `
    <div class="row total">
      <span>Balance Due:</span>
      <span>${formatCurrency(document.balanceDue)}</span>
    </div>
    ` : ''}
  </div>

  <div class="separator"></div>

  ${document.signature ? `
  <div class="section">
    <p style="text-align: center; font-size: 8pt;">RECEIVED</p>
    <div style="text-align: center; margin: 8px 0;">
      <img src="${document.signature.startsWith('data:') ? document.signature : `data:image/png;base64,${document.signature}`}" alt="Signature" style="max-width: 200px; max-height: 60px; border-bottom: 1px solid black; padding-bottom: 4px;" />
    </div>
    <p style="text-align: center; font-size: 8pt;">Date & Signature</p>
  </div>
  ` : ''}

  ${document.message ? `
  <p style="text-align: center; font-size: 8pt; font-style: italic; margin: 8px 0;">${document.message}</p>
  ` : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="font-size: 8pt;">Printed: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
  </div>
</body>
</html>
  `;

  // Write content to the new window
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close window after printing (optional - user might want to keep it open)
      // printWindow.close();
    }, 250);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (printWindow.document.readyState === 'complete') {
      printWindow.print();
    }
  }, 500);
}
