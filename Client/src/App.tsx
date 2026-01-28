import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { POSProvider } from "@/contexts/POSContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import DocumentListPage from "./pages/DocumentListPage";
import DocumentFormPage from "./pages/DocumentFormPage";
import InvoiceEditsPage from "./pages/InvoiceEditsPage";
import ReceiptViewPage from "./pages/ReceiptViewPage";
import CreditNoteViewPage from "./pages/CreditNoteViewPage";
import RefundViewPage from "./pages/RefundViewPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerNewPage from "./pages/CustomerNewPage";
import CustomerViewPage from "./pages/CustomerViewPage";
import InventoryPage from "./pages/InventoryPage";
import ProductNewPage from "./pages/ProductNewPage";
import ProductViewPage from "./pages/ProductViewPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
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
            
            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Invoices */}
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <DocumentListPage type="invoice" title="Invoices" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute>
                  <DocumentFormPage type="invoice" title="Invoice" />
                </ProtectedRoute>
              }
            />
            
            {/* Receipts */}
            <Route
              path="/receipts"
              element={
                <ProtectedRoute>
                  <DocumentListPage type="receipt" title="Receipts" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/receipts/:id"
              element={
                <ProtectedRoute>
                  <DocumentFormPage type="receipt" title="Receipt" />
                </ProtectedRoute>
              }
            />
            
            {/* Credit Notes */}
            <Route
              path="/credit-notes"
              element={
                <ProtectedRoute>
                  <DocumentListPage type="credit_note" title="Credit Notes" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credit-notes/:id"
              element={
                <ProtectedRoute>
                  <DocumentFormPage type="credit_note" title="Credit Note" />
                </ProtectedRoute>
              }
            />
            
            {/* Refunds */}
            <Route
              path="/refunds"
              element={
                <ProtectedRoute>
                  <DocumentListPage type="refund" title="Refunds" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/refunds/:id"
              element={
                <ProtectedRoute>
                  <DocumentFormPage type="refund" title="Refund" />
                </ProtectedRoute>
              }
            />
            
            {/* Estimates */}
            <Route
              path="/estimates"
              element={
                <ProtectedRoute>
                  <DocumentListPage type="estimate" title="Estimates" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estimates/:id"
              element={
                <ProtectedRoute>
                  <DocumentFormPage type="estimate" title="Estimate" />
                </ProtectedRoute>
              }
            />
            
            {/* Customers */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/new"
              element={
                <ProtectedRoute>
                  <CustomerNewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:id/edit"
              element={
                <ProtectedRoute>
                  <CustomerNewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute>
                  <CustomerViewPage />
                </ProtectedRoute>
              }
            />
            
            {/* Inventory */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/new"
              element={
                <ProtectedRoute>
                  <ProductNewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/:id"
              element={
                <ProtectedRoute>
                  <ProductViewPage />
                </ProtectedRoute>
              }
            />
            
            {/* Users */}
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </POSProvider>
  </QueryClientProvider>
);

export default App;
