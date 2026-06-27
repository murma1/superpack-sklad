/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './components/AppContext';
import LoginScreen from './components/LoginScreen';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import OrdersModule from './components/OrdersModule';
import ProductionModule from './components/ProductionModule';
import WarehouseModule from './components/WarehouseModule';
import ShipmentsModule from './components/ShipmentsModule';
import ReportsModule from './components/ReportsModule';
import EmployeesModule from './components/EmployeesModule';

import { 
  Layers, LayoutDashboard, ClipboardList, Settings, 
  Warehouse, Truck, BarChart3, Users, Menu, X, ShieldAlert 
} from 'lucide-react';

function AppContent() {
  const { user, t, isLoading } = useApp();
  const [activeTab, setActiveTab] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Define allowed tabs per role
  const getAllowedTabs = (role: string) => {
    switch (role) {
      case 'admin':
        return ['dashboard', 'orders', 'production', 'warehouse', 'shipments', 'reports', 'employees'];
      case 'manager':
        return ['dashboard', 'orders', 'reports'];
      case 'production':
        return ['production'];
      case 'warehouse':
        return ['warehouse', 'shipments'];
      case 'supervisor':
        return ['dashboard', 'reports'];
      default:
        return [];
    }
  };

  const allowedTabs = user ? getAllowedTabs(user.role) : [];

  // Initialize active tab based on allowed tabs
  useEffect(() => {
    if (allowedTabs.length > 0 && (!activeTab || !allowedTabs.includes(activeTab))) {
      setActiveTab(allowedTabs[0]);
    }
  }, [user, allowedTabs]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Navigation Links definition
  const navItems = [
    { id: 'dashboard', label: t.tabs.dashboard, icon: LayoutDashboard },
    { id: 'orders', label: t.tabs.orders, icon: ClipboardList },
    { id: 'production', label: t.tabs.production, icon: Settings },
    { id: 'warehouse', label: t.tabs.warehouse, icon: Warehouse },
    { id: 'shipments', label: t.tabs.shipments, icon: Truck },
    { id: 'reports', label: t.tabs.reports, icon: BarChart3 },
    { id: 'employees', label: t.tabs.employees || 'Сотрудники', icon: Users },
  ].filter(item => allowedTabs.includes(item.id));

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <OrdersModule />;
      case 'production':
        return <ProductionModule />;
      case 'warehouse':
        return <WarehouseModule />;
      case 'shipments':
        return <ShipmentsModule />;
      case 'reports':
        return <ReportsModule />;
      case 'employees':
        return <EmployeesModule />;
      default:
        return (
          <div className="p-8 text-center bg-slate-800 border border-slate-700 rounded-2xl">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <p className="text-white text-sm font-bold">Доступ ограничен или раздел не найден</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white print:bg-white print:text-black">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 flex relative print:block">
        
        {/* Mobile Sidebar Hamburger Toggle */}
        <div className="lg:hidden absolute top-4 left-4 z-35 print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <aside 
          className={`bg-slate-900/40 border-r border-slate-900 w-64 p-5 flex flex-col gap-6 fixed inset-y-0 left-0 z-40 transform lg:transform-none lg:static transition-transform duration-200 ease-in-out print:hidden ${
            sidebarOpen ? 'translate-x-0 bg-slate-900' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Mobile Sidebar Close Button */}
          <div className="flex justify-between items-center lg:hidden">
            <span className="font-bold text-xs uppercase text-slate-400">Навигация</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Desktop Main Frame Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-hidden print:p-0">
          <div className="lg:hidden h-14 print:hidden"></div> {/* Spacer for mobile hamburger top */}
          {renderActiveModule()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
