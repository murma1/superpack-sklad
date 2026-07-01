/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Order, Product, InventoryItem, Notification, RawMaterialCatalogItem } from '../types';
import { translations } from '../translations';

interface AppContextType {
  language: 'ru' | 'uz';
  setLanguage: (lang: 'ru' | 'uz') => void;
  user: User | null;
  login: (username: string, password: '123') => Promise<boolean>;
  logout: () => void;
  t: typeof translations['ru'];
  orders: Order[];
  refreshOrders: () => Promise<void>;
  products: Product[];
  refreshProducts: () => Promise<void>;
  inventory: InventoryItem[];
  refreshInventory: () => Promise<void>;
  rawMaterialsCatalog: RawMaterialCatalogItem[];
  refreshRawMaterialsCatalog: () => Promise<void>;
  notifications: Notification[];
  refreshNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  updateUserLanguageAPI: (lang: 'ru' | 'uz') => Promise<void>;
  isLoading: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  employees: User[];
  refreshEmployees: () => Promise<void>;
  clearAllData: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<'ru' | 'uz'>('ru');
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [rawMaterialsCatalog, setRawMaterialsCatalog] = useState<RawMaterialCatalogItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setThemeState] = useState<'dark' | 'light'>('light');
  const [employees, setEmployees] = useState<User[]>([]);

  // Load user from localstorage on mount and enforce light theme
  useEffect(() => {
    // Enforce light theme
    setThemeState('light');
    document.documentElement.classList.add('light');
    localStorage.setItem('poms_theme', 'light');

    const savedUser = localStorage.getItem('poms_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setLangState(parsed.language || 'ru');
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Sync data whenever user logs in or components trigger refresh
  useEffect(() => {
    if (user) {
      refreshAll();
      // Set language to user's preference
      setLangState(user.language || 'ru');
      
      // Auto-poll notifications and data every 10 seconds for real-time emulation
      const interval = setInterval(() => {
        refreshAll();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const refreshAll = async () => {
    await Promise.all([
      refreshOrders(),
      refreshProducts(),
      refreshInventory(),
      refreshRawMaterialsCatalog(),
      refreshNotifications(),
      refreshEmployees()
    ]);
  };

  const refreshEmployees = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error('Error fetching employees:', e);
    }
  };

  const refreshOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    }
  };

  const refreshProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  const refreshInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (e) {
      console.error('Error fetching inventory:', e);
    }
  };

  const refreshRawMaterialsCatalog = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      if (res.ok) {
        const data = await res.json();
        setRawMaterialsCatalog(data);
      }
    } catch (e) {
      console.error('Error fetching raw materials catalog:', e);
    }
  };

  const refreshNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const login = async (username: string, password: '123'): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('poms_user', JSON.stringify(data.user));
          setLangState(data.user.language || 'ru');
          return true;
        }
      }
    } catch (e) {
      console.error('Login error:', e);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('poms_user');
    setOrders([]);
    setInventory([]);
    setNotifications([]);
  };

  const setLanguage = (lang: 'ru' | 'uz') => {
    setLangState(lang);
    if (user) {
      updateUserLanguageAPI(lang);
    }
  };

  const updateUserLanguageAPI = async (lang: 'ru' | 'uz') => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, language: lang })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const updated = { ...user, language: lang };
          setUser(updated);
          localStorage.setItem('poms_user', JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.error('Error updating user language:', e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        await refreshNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearNotifications = async () => {
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTheme = () => {
    setThemeState('light');
    localStorage.setItem('poms_theme', 'light');
    document.documentElement.classList.add('light');
  };

  const clearAllData = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/clear-all', { method: 'POST' });
      if (res.ok) {
        await refreshOrders();
        await refreshProducts();
        await refreshInventory();
        await refreshRawMaterialsCatalog();
        await refreshNotifications();
        return true;
      }
    } catch (e) {
      console.error('Error clearing data:', e);
    }
    return false;
  };

  const t = translations[language];

  return (
    <AppContext.Provider value={{
      language,
      setLanguage,
      user,
      login,
      logout,
      t,
      orders,
      refreshOrders,
      products,
      refreshProducts,
      inventory,
      refreshInventory,
      rawMaterialsCatalog,
      refreshRawMaterialsCatalog,
      notifications,
      refreshNotifications,
      markAllNotificationsRead,
      clearNotifications,
      updateUserLanguageAPI,
      isLoading,
      theme,
      toggleTheme,
      employees,
      refreshEmployees,
      clearAllData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
