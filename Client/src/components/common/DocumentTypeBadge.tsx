import { DocumentType } from '@/types/pos';
import { FileText, Receipt, CreditCard, RotateCcw, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentTypeBadgeProps {
  type: DocumentType;
  className?: string;
}

const typeConfig: Record<DocumentType, { label: string; icon: typeof FileText; className: string }> = {
  invoice: { label: 'Invoice', icon: FileText, className: 'bg-info/10 text-info' },
  receipt: { label: 'Receipt', icon: Receipt, className: 'bg-success/10 text-success' },
  credit_note: { label: 'Credit Note', icon: CreditCard, className: 'bg-warning/10 text-warning' },
  refund: { label: 'Refund', icon: RotateCcw, className: 'bg-destructive/10 text-destructive' },
  estimate: { label: 'Estimate', icon: FileCheck, className: 'bg-primary/10 text-primary' }
};

export function DocumentTypeBadge({ type, className }: DocumentTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
      config.className,
      className
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
