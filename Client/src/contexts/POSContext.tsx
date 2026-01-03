import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SalesDocument, User, DeviceStatus, Customer } from '@/types/pos';
import { mockDocuments, mockUser, mockCustomers } from '@/data/mockData';

interface POSContextType {
  user: User | null;
  isAuthenticated: boolean;
  documents: SalesDocument[];
  customers: Customer[];
  deviceStatus: DeviceStatus;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addDocument: (doc: SalesDocument) => void;
  updateDocument: (id: string, updates: Partial<SalesDocument>) => void;
  deleteDocument: (id: string) => void;
  getDocument: (id: string) => SalesDocument | undefined;
  setDeviceStatus: (status: Partial<DeviceStatus>) => void;
  triggerScan: () => Promise<string>;
  triggerPrint: (docId: string) => Promise<boolean>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<SalesDocument[]>(mockDocuments);
  const [customers] = useState<Customer[]>(mockCustomers);
  const [deviceStatus, setDeviceStatusState] = useState<DeviceStatus>({
    ct60: 'connected',
    rp4: 'connected'
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication
    await new Promise(resolve => setTimeout(resolve, 800));
    if (email && password) {
      setUser(mockUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const addDocument = (doc: SalesDocument) => {
    setDocuments(prev => [doc, ...prev]);
  };

  const updateDocument = (id: string, updates: Partial<SalesDocument>) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id ? { ...doc, ...updates, updatedAt: new Date() } : doc
      )
    );
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const getDocument = (id: string) => {
    return documents.find(doc => doc.id === id);
  };

  const setDeviceStatus = (status: Partial<DeviceStatus>) => {
    setDeviceStatusState(prev => ({ ...prev, ...status }));
  };

  const triggerScan = async (): Promise<string> => {
    setDeviceStatusState(prev => ({ ...prev, ct60: 'scanning' }));
    await new Promise(resolve => setTimeout(resolve, 1500));
    setDeviceStatusState(prev => ({ ...prev, ct60: 'connected' }));
    // Return mock barcode
    const codes = ['RDG-001', 'RDG-002', 'RDG-003', 'RDG-004', 'RDG-005'];
    return codes[Math.floor(Math.random() * codes.length)];
  };

  const triggerPrint = async (docId: string): Promise<boolean> => {
    const doc = getDocument(docId);
    if (!doc) return false;
    
    setDeviceStatusState(prev => ({ ...prev, rp4: 'printing' }));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setDeviceStatusState(prev => ({ ...prev, rp4: 'connected' }));
    return true;
  };

  return (
    <POSContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        documents,
        customers,
        deviceStatus,
        login,
        logout,
        addDocument,
        updateDocument,
        deleteDocument,
        getDocument,
        setDeviceStatus,
        triggerScan,
        triggerPrint
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
}
