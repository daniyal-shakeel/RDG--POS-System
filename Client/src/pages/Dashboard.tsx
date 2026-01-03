import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DocumentTypeBadge } from '@/components/common/DocumentTypeBadge';
import { usePOS } from '@/contexts/POSContext';
import { mockStats } from '@/data/mockData';
import { 
  DollarSign, 
  FileText, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { documents, triggerPrint, deviceStatus } = usePOS();
  const navigate = useNavigate();

  const recentDocuments = documents.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: 'TTD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <MainLayout>
      <div className="space-y-4 xl:space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl xl:text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-xs xl:text-sm">
              Welcome back! Here's your sales overview.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs xl:text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-base xl:text-lg font-mono font-semibold text-primary">
              {format(new Date(), 'HH:mm:ss')}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4 stagger-children">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(mockStats.todaySales)}
            icon={<DollarSign className="h-4 w-4 xl:h-5 xl:w-5" />}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="This Month"
            value={formatCurrency(mockStats.monthSales)}
            icon={<TrendingUp className="h-4 w-4 xl:h-5 xl:w-5" />}
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatCard
            title="Pending"
            value={mockStats.pendingInvoices}
            icon={<Clock className="h-4 w-4 xl:h-5 xl:w-5" />}
          />
          <StatCard
            title="Overdue"
            value={formatCurrency(mockStats.overdueAmount)}
            icon={<AlertTriangle className="h-4 w-4 xl:h-5 xl:w-5" />}
            trend={{ value: 3.1, isPositive: false }}
          />
        </div>

        {/* Recent Documents & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
          {/* Recent Documents */}
          <div className="lg:col-span-2 glass-card rounded-xl p-4 xl:p-6">
            <div className="flex items-center justify-between mb-3 xl:mb-5">
              <h2 className="font-display text-base xl:text-lg font-semibold">Recent Documents</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')} className="text-xs xl:text-sm">
                View All
                <ArrowUpRight className="h-3 w-3 xl:h-4 xl:w-4 ml-1" />
              </Button>
            </div>

            <div className="space-y-2 xl:space-y-3">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 xl:gap-4 p-2 xl:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate(`/invoices/${doc.id}`)}
                >
                  <DocumentTypeBadge type={doc.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs xl:text-sm font-medium">{doc.refNumber}</span>
                      <StatusBadge status={doc.status} />
                    </div>
                    <p className="text-xs xl:text-sm text-muted-foreground truncate">
                      {doc.customer.name}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="font-semibold text-sm xl:text-base">{formatCurrency(doc.total)}</p>
                    <p className="text-[10px] xl:text-xs text-muted-foreground">
                      {format(doc.date, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerPrint(doc.id);
                    }}
                    disabled={deviceStatus.rp4 !== 'connected'}
                  >
                    <Printer className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-xl p-4 xl:p-6">
            <h2 className="font-display text-base xl:text-lg font-semibold mb-3 xl:mb-5">Quick Actions</h2>
            <div className="space-y-2 xl:space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 xl:gap-3 h-10 xl:h-12 text-xs xl:text-sm"
                onClick={() => navigate('/invoices/new')}
              >
                <FileText className="h-4 w-4 xl:h-5 xl:w-5 text-info" />
                New Invoice
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 xl:gap-3 h-10 xl:h-12 text-xs xl:text-sm"
                onClick={() => navigate('/receipts/new')}
              >
                <FileText className="h-4 w-4 xl:h-5 xl:w-5 text-success" />
                New Receipt
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 xl:gap-3 h-10 xl:h-12 text-xs xl:text-sm"
                onClick={() => navigate('/estimates/new')}
              >
                <FileText className="h-4 w-4 xl:h-5 xl:w-5 text-primary" />
                New Estimate
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 xl:gap-3 h-10 xl:h-12 text-xs xl:text-sm"
                onClick={() => navigate('/credit-notes/new')}
              >
                <FileText className="h-4 w-4 xl:h-5 xl:w-5 text-warning" />
                Credit Note
              </Button>
            </div>

            {/* Sync Status */}
            <div className="mt-4 xl:mt-6 pt-4 xl:pt-6 border-t border-border">
              <h3 className="text-xs xl:text-sm font-medium mb-2 xl:mb-3">Integration Status</h3>
              <div className="space-y-1.5 xl:space-y-2 text-xs xl:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">QuickBooks</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Synced
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">MRPEasy</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Synced
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
