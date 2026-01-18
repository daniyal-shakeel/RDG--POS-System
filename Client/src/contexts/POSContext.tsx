import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SalesDocument, User, DeviceStatus, Customer, UserRole } from '@/types/pos';
import { mockDocuments, mockUser, mockCustomers } from '@/data/mockData';
import { api } from '@/services/api';

interface POSContextType {
  user: User | null;
  isAuthenticated: boolean;
  documents: SalesDocument[];
  customers: Customer[];
  deviceStatus: DeviceStatus;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addDocument: (doc: SalesDocument) => void;
  updateDocument: (id: string, updates: Partial<SalesDocument>) => void;
  deleteDocument: (id: string) => void;
  getDocument: (id: string) => SalesDocument | undefined;
  setDeviceStatus: (status: Partial<DeviceStatus>) => void;
  triggerScan: () => Promise<string>;
  triggerPrint: (docId: string) => Promise<boolean>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

// Constants for localStorage keys
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Helper function to map backend role to frontend UserRole
const mapRoleToUserRole = (role: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    'Super Admin': 'admin',
    'Admin': 'admin',
    'Manager': 'manager',
    'Sales Rep': 'sales_rep',
    'Sales Representative': 'sales_rep',
    'Warehouse': 'warehouse',
  };
  
  // Normalize role name (remove underscores, handle variations)
  const normalizedRole = role.replace(/_/g, ' ');
  return roleMap[normalizedRole] || roleMap[role] || 'sales_rep';
};

export function POSProvider({ children }: { children: ReactNode }) {
  // Initialize user from localStorage
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  
  const [documents, setDocuments] = useState<SalesDocument[]>(mockDocuments);
  const [customers] = useState<Customer[]>(mockCustomers);
  const [deviceStatus, setDeviceStatusState] = useState<DeviceStatus>({
    ct60: 'connected',
    rp4: 'connected'
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post('/api/v1/auth/login', {
        email: email.trim(),
        password,
      });

      const { token, user: userData } = response.data;

      if (!token) {
        throw new Error('No token received from server');
      }

      // Store token
      localStorage.setItem(TOKEN_KEY, token);

      // Map backend user data to frontend User type
      const mappedUser: User = {
        id: userData.id || userData._id || '',
        name: userData.fullName || userData.name || userData.email || '',
        email: userData.email || '',
        role: mapRoleToUserRole(userData.role || 'sales_rep'),
        avatar: userData.avatar,
      };

      // Store user data
      localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
      setUser(mappedUser);

      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide more informative error message for network errors
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        error.message = 'Cannot connect to server. Please make sure the backend server is running.';
      }
      
      // Clear any partial data
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout API endpoint (token will be added automatically via interceptor)
      // Even if API call fails, we still want to clear local state
      try {
        await api.post('/api/v1/auth/logout');
      } catch (error: any) {
        // Log error but don't throw - we still want to clear local state
        // This handles cases where token is already invalid or expired
        console.warn('Logout API call failed:', error.response?.data?.message || error.message);
      }
    } catch (error: any) {
      // Handle unexpected errors
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and user state
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
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
