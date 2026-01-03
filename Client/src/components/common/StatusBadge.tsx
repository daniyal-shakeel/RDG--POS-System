import { DocumentStatus } from '@/types/pos';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending', className: 'bg-warning/20 text-warning border border-warning/30' },
  approved: { label: 'Approved', className: 'bg-info/20 text-info border border-info/30' },
  paid: { label: 'Paid', className: 'bg-success/20 text-success border border-success/30' },
  partial: { label: 'Partial', className: 'bg-accent/20 text-accent border border-accent/30' },
  overdue: { label: 'Overdue', className: 'bg-destructive/20 text-destructive border border-destructive/30' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground line-through' },
  converted: { label: 'Converted', className: 'bg-primary/20 text-primary border border-primary/30' }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
