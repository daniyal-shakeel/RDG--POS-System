import { SalesDocument } from '@/types/pos';
import { format } from 'date-fns';

interface ReceiptPrintViewProps {
  document: SalesDocument;
}

export function ReceiptPrintView({ document }: ReceiptPrintViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD'
    }).format(amount);
  };

  return (
    <div className="receipt-print print-only bg-background text-foreground font-mono text-xs">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="font-bold text-sm">THE ROYAL DATES GALORE LTD.</p>
        <p>22 Macoya Road West</p>
        <p>Macoya Industrial Estate, Tunapuna</p>
        <p>Trinidad & Tobago</p>
        <p>+1(868)739-5025</p>
        <p>www.royaldatesgalore.com</p>
      </div>

      <div className="border-t border-dashed border-foreground my-2" />

      {/* Document Info */}
      <div className="mb-2">
        <div className="flex justify-between">
          <span>{document.type.toUpperCase().replace('_', ' ')}</span>
          <span>{document.refNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{format(document.date, 'dd/MM/yyyy HH:mm')}</span>
        </div>
        {document.dueDate && (
          <div className="flex justify-between">
            <span>Due:</span>
            <span>{format(document.dueDate, 'dd/MM/yyyy')}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Sales Rep:</span>
          <span>{document.salesRep}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-foreground my-2" />

      {/* Customer */}
      <div className="mb-2">
        <p className="font-bold">BILL TO:</p>
        <p>{document.customer.name}</p>
        <p className="text-[10px]">{document.customer.billingAddress}</p>
      </div>

      <div className="border-t border-dashed border-foreground my-2" />

      {/* Items */}
      <div className="mb-2">
        {document.items.map((item, index) => (
          <div key={item.id} className="mb-1">
            <p className="font-bold">{index + 1}. {item.description}</p>
            <div className="flex justify-between pl-2">
              <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
              <span>{formatCurrency(item.amount)}</span>
            </div>
            {item.discount > 0 && (
              <p className="text-right text-[10px]">Disc: -{item.discount}%</p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-foreground my-2" />

      {/* Totals */}
      <div className="mb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(document.subtotal)}</span>
        </div>
        {document.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{formatCurrency(document.discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax (12.5%):</span>
          <span>{formatCurrency(document.tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm mt-1">
          <span>TOTAL:</span>
          <span>{formatCurrency(document.total)}</span>
        </div>
        {document.deposit > 0 && (
          <div className="flex justify-between">
            <span>Deposit:</span>
            <span>-{formatCurrency(document.deposit)}</span>
          </div>
        )}
        {document.balanceDue > 0 && (
          <div className="flex justify-between font-bold">
            <span>Balance Due:</span>
            <span>{formatCurrency(document.balanceDue)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-foreground my-2" />

      {/* Signature */}
      {document.signature && (
        <div className="mb-2">
          <p className="text-center text-[10px]">RECEIVED</p>
          <div className="h-12 border-b border-foreground my-1" />
          <p className="text-center text-[10px]">Date & Signature</p>
        </div>
      )}

      {/* Message */}
      {document.message && (
        <p className="text-center text-[10px] italic my-2">{document.message}</p>
      )}

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="font-bold">Thank you for your business!</p>
        <p className="text-[10px] mt-1">
          Printed: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
        </p>
      </div>
    </div>
  );
}
