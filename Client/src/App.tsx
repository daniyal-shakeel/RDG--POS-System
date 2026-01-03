import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { POSProvider } from "@/contexts/POSContext";

// Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import DocumentListPage from "./pages/DocumentListPage";
import DocumentFormPage from "./pages/DocumentFormPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerNewPage from "./pages/CustomerNewPage";
import CustomerViewPage from "./pages/CustomerViewPage";
import InventoryPage from "./pages/InventoryPage";
import ProductNewPage from "./pages/ProductNewPage";
import ProductViewPage from "./pages/ProductViewPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <POSProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Dashboard />} />
            
            {/* Invoices */}
            <Route path="/invoices" element={<DocumentListPage type="invoice" title="Invoices" />} />
            <Route path="/invoices/:id" element={<DocumentFormPage type="invoice" title="Invoice" />} />
            
            {/* Receipts */}
            <Route path="/receipts" element={<DocumentListPage type="receipt" title="Receipts" />} />
            <Route path="/receipts/:id" element={<DocumentFormPage type="receipt" title="Receipt" />} />
            
            {/* Credit Notes */}
            <Route path="/credit-notes" element={<DocumentListPage type="credit_note" title="Credit Notes" />} />
            <Route path="/credit-notes/:id" element={<DocumentFormPage type="credit_note" title="Credit Note" />} />
            
            {/* Refunds */}
            <Route path="/refunds" element={<DocumentListPage type="refund" title="Refunds" />} />
            <Route path="/refunds/:id" element={<DocumentFormPage type="refund" title="Refund" />} />
            
            {/* Estimates */}
            <Route path="/estimates" element={<DocumentListPage type="estimate" title="Estimates" />} />
            <Route path="/estimates/:id" element={<DocumentFormPage type="estimate" title="Estimate" />} />
            
            {/* Customers */}
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/new" element={<CustomerNewPage />} />
            <Route path="/customers/:id" element={<CustomerViewPage />} />
            
            {/* Inventory */}
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/new" element={<ProductNewPage />} />
            <Route path="/inventory/:id" element={<ProductViewPage />} />
            
            <Route path="/settings" element={<SettingsPage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </POSProvider>
  </QueryClientProvider>
);

export default App;
