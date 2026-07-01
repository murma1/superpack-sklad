/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Order, Product, OrderStatus } from '../types';
import { 
  Plus, Search, Filter, Printer, HelpCircle, 
  RotateCcw, History, ArrowUpDown, ChevronDown, Check, 
  Layers, ChevronRight, Edit3, Archive, Package, X, Calendar,
  Paperclip, Image, FileText, Download, ChevronLeft, Trash2
} from 'lucide-react';
import OrderForm from './OrderForm';
import CalendarPicker from './CalendarPicker';

export default function OrdersModule() {
  const { 
    orders, products, refreshOrders, refreshProducts, user, t, language 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'products'>('orders');
  const [search, setSearch] = useState('');
  const [factoryFilter, setFactoryFilter] = useState<'all' | 'Keles' | 'Yunusobod'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof Order>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modal Controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewHistoryOrder, setViewHistoryOrder] = useState<Order | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [printLabelOrder, setPrintLabelOrder] = useState<Order | null>(null);

  // SKU Management
  const [isSkuFormOpen, setIsSkuFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<Product | null>(null);
  const [skuCode, setSkuCode] = useState('');
  const [skuName, setSkuName] = useState('');
  const [skuDesc, setSkuDesc] = useState('');
  const [skuWeight, setSkuWeight] = useState('');
  const [skuPallet, setSkuPallet] = useState('');
  const [skuError, setSkuError] = useState('');
  const [skuDeleteConfirmId, setSkuDeleteConfirmId] = useState<string | null>(null);

  // Spec & Photos State
  const [specFile, setSpecFile] = useState<{ name: string; size: number; base64: string; uploadedAt: string } | null>(null);
  const [productPhotos, setProductPhotos] = useState<string[]>([]);
  const [activeLightboxPhotos, setActiveLightboxPhotos] = useState<string[] | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number>(0);

  useEffect(() => {
    if (viewHistoryOrder) {
      fetch(`/api/history/${viewHistoryOrder.id}`)
        .then(res => res.json())
        .then(data => setHistoryLogs(data))
        .catch(err => console.error(err));
    }
  }, [viewHistoryOrder]);

  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      if (field === 'date' || field === 'createdAt' || field === 'orderNumber') {
        setSortDir('desc');
      } else {
        setSortDir('asc');
      }
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const labels = t.statuses;
    switch (status) {
      case 'New':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">{labels.New}</span>;
      case 'InProduction':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">{labels.InProduction}</span>;
      case 'Completed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">{labels.Completed}</span>;
      case 'Shipped':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400">{labels.Shipped}</span>;
      case 'Closed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400">{labels.Closed}</span>;
      default:
        return null;
    }
  };

  // Filter & Sort Logic
  const filteredOrders = orders.filter(o => {
    const prod = products.find(p => p.sku === o.productSku);
    const prodName = prod ? prod.name.toLowerCase() : '';
    
    // Quick search by order ID, number, SKU, comments or product name
    const term = search.toLowerCase();
    const matchSearch = o.orderNumber.toLowerCase().includes(term) ||
                        o.productSku.toLowerCase().includes(term) ||
                        prodName.includes(term) ||
                        o.comment.toLowerCase().includes(term);

    const matchFactory = factoryFilter === 'all' || o.factory === factoryFilter;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    
    let matchDate = true;
    if (dateStart) {
      matchDate = matchDate && new Date(o.date) >= new Date(dateStart);
    }
    if (dateEnd) {
      matchDate = matchDate && new Date(o.date) <= new Date(dateEnd);
    }

    return matchSearch && matchFactory && matchStatus && matchDate;
  }).sort((a, b) => {
    let fieldA = a[sortField];
    let fieldB = b[sortField];

    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      return sortDir === 'asc' ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
    }
    if (typeof fieldA === 'number' && typeof fieldB === 'number') {
      return sortDir === 'asc' ? fieldA - fieldB : fieldB - fieldA;
    }
    return 0;
  });

  // Spec & Photo Upload Handlers
  const handleSpecUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSpecFile({
        name: file.name,
        size: file.size,
        base64: reader.result as string,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // We will read all of them sequentially and add them to the productPhotos state, up to a maximum of 3
    const filesArray = Array.from(files) as File[];
    let countLoaded = 0;
    const newPhotos = [...productPhotos];

    filesArray.forEach(file => {
      if (newPhotos.length >= 3) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (newPhotos.length < 3) {
          newPhotos.push(reader.result as string);
          setProductPhotos([...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // SKU CRUD submit
  const handleSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuCode || !skuName) {
      setSkuError(t.orderForm.validationErr);
      return;
    }

    const payload = {
      sku: skuCode,
      name: skuName,
      description: skuDesc,
      weight: parseFloat(skuWeight || '0'),
      unitsPerPallet: parseInt(skuPallet || '0'),
      specification: specFile,
      photos: productPhotos,
    };

    try {
      let res;
      if (editingSku) {
        res = await fetch(`/api/products/${editingSku.sku}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        setIsSkuFormOpen(false);
        setEditingSku(null);
        setSkuCode('');
        setSkuName('');
        setSkuDesc('');
        setSkuWeight('');
        setSkuPallet('');
        setSpecFile(null);
        setProductPhotos([]);
        setSkuError('');
        refreshProducts();
      } else {
        setSkuError(data.message || 'Ошибка');
      }
    } catch (e) {
      setSkuError('Ошибка отправки данных');
    }
  };

  const startEditSku = (prod: Product) => {
    setEditingSku(prod);
    setSkuCode(prod.sku);
    setSkuName(prod.name);
    setSkuDesc(prod.description);
    setSkuWeight(prod.weight.toString());
    setSkuPallet(prod.unitsPerPallet.toString());
    setSpecFile(prod.specification || null);
    setProductPhotos(prod.photos || []);
    setSkuError('');
    setIsSkuFormOpen(true);
  };

  const toggleArchiveSku = async (prod: Product) => {
    try {
      const res = await fetch(`/api/products/${prod.sku}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !prod.isArchived })
      });
      if (res.ok) {
        refreshProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSku = async (sku: string) => {
    try {
      const res = await fetch(`/api/products/${sku}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSkuDeleteConfirmId(null);
        refreshProducts();
      } else {
        const data = await res.json();
        setSkuError(data.message || 'Error deleting product');
      }
    } catch (e) {
      setSkuError('Failed to connect to server');
    }
  };

  // Helper calculation for pallet labels
  const getOrderPalletCount = (order: Order) => {
    if (!order.unitsPerPallet) return 0;
    return Math.ceil(order.packed / order.unitsPerPallet);
  };

  // Printable layout window trigger
  const handlePrintLabels = () => {
    window.print();
  };

  const getOrderCompletionPercent = (order: Order) => {
    if (order.quantityOrdered === 0) return 0;
    const p = (order.shipped / order.quantityOrdered) * 100;
    return Math.min(100, Math.round(p));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Sub Tabs */}
      <div className="bg-slate-800 p-1.5 rounded-xl border border-slate-700/60 flex max-w-sm">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'orders' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          {t.tabs.orders}
        </button>
        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'products' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          {t.productsModule.title}
        </button>
      </div>

      {activeSubTab === 'orders' ? (
        <>
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{t.ordersModule.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Всего найдено: {filteredOrders.length} заявок</p>
            </div>
            
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setIsCreateOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-xs font-bold text-white shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                {t.ordersModule.btnCreate}
              </button>
            )}
          </div>

          {/* Filtering Rail */}
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative col-span-1 lg:col-span-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder={t.ordersModule.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 transition-all"
                />
              </div>

              {/* Factory Filter */}
              <div>
                <select
                  value={factoryFilter}
                  onChange={(e: any) => setFactoryFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="all">{t.ordersModule.filterFactory}</option>
                  <option value="Keles">Келес (Keles)</option>
                  <option value="Yunusobod">Юнусобод (Yunusobod)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="all">{t.ordersModule.filterStatus}</option>
                  {Object.keys(t.statuses).map((statusKey) => (
                    <option key={statusKey} value={statusKey}>
                      {t.statuses[statusKey as keyof typeof t.statuses]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              <div className="flex">
                <button
                  onClick={() => {
                    setSearch('');
                    setFactoryFilter('all');
                    setStatusFilter('all');
                    setDateStart('');
                    setDateEnd('');
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-xl py-2.5 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Сбросить фильтры
                </button>
              </div>
            </div>

            {/* Advanced Dates Filter Drawer */}
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-700/40">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Период:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:outline-none"
                  />
                  <span className="text-slate-500 text-xs">-</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-bold text-indigo-400 hover:text-white hover:bg-slate-700 transition-all select-none cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {showCalendar 
                    ? (language === 'ru' ? 'Скрыть интерактивный календарь' : 'Interaktiv kalendarni yashirish')
                    : (language === 'ru' ? 'Показать интерактивный календарь' : 'Interaktiv kalendarni ko\'rsatish')
                  }
                </button>
              </div>

              {showCalendar && (
                <div className="w-full flex justify-start mt-1">
                  <CalendarPicker
                    dateStart={dateStart}
                    dateEnd={dateEnd}
                    onSelectRange={(start, end) => {
                      setDateStart(start);
                      setDateEnd(end);
                    }}
                    orders={orders}
                    language={language}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Orders Table Panel */}
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                    <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('orderNumber')}>
                      <div className="flex items-center gap-1.5">
                        {t.ordersModule.tblNum} <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1.5">
                        {t.ordersModule.tblDate} <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">{t.ordersModule.tblProduct}</th>
                    <th className="py-2.5 px-3">{t.ordersModule.tblFactory}</th>
                    <th className="py-2.5 px-3 text-right">{t.ordersModule.tblOrdered}</th>
                    <th className="py-2.5 px-3 text-right">{t.ordersModule.tblProduced}</th>
                    <th className="py-2.5 px-3 text-right">{t.ordersModule.tblDefective}</th>
                    <th className="py-2.5 px-3 text-right">{t.ordersModule.tblPacked}</th>
                    <th className="py-2.5 px-3 text-right">{t.ordersModule.tblShipped}</th>
                    <th className="py-2.5 px-3">{t.ordersModule.tblStatus}</th>
                    <th className="py-2.5 px-3 text-center">{t.ordersModule.tblProgress}</th>
                    <th className="py-2.5 px-3 text-right">{t.ordersModule.tblActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500 text-xs">
                        Заявки, соответствующие критериям поиска, не найдены.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, index) => {
                      const prod = products.find(p => p.sku === order.productSku);
                      const percent = getOrderCompletionPercent(order);
                      return (
                        <tr key={order.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-white">
                            {order.orderNumber}
                          </td>
                          <td className="py-2 px-3">
                            {order.date}
                          </td>
                          <td className="py-2 px-3">
                            <div>
                              <div className="text-white font-bold">{prod ? prod.name : order.productSku}</div>
                              <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{order.productSku}</div>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {t.factories[order.factory]}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-white font-black">
                            {order.quantityOrdered.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-indigo-300">
                            {order.produced.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-400">
                            {order.defective > 0 ? order.defective.toLocaleString() : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-400">
                            {order.packed.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-teal-400">
                            {order.shipped.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col items-center gap-1 min-w-[80px]">
                              <span className="font-mono text-[10px] font-black text-slate-400 leading-none">{percent}%</span>
                              <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-teal-500 to-emerald-400 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Audit logs */}
                              <button
                                onClick={() => setViewHistoryOrder(order)}
                                title={t.ordersModule.historyTitle}
                                className="p-1 rounded-lg bg-slate-900/60 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all focus:outline-none"
                                style={index === 0 ? { backgroundColor: '#d9d2ff' } : undefined}
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Edit details (Admins/Managers) */}
                              {(user?.role === 'admin' || user?.role === 'manager') && (
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setIsCreateOpen(true);
                                  }}
                                  className="p-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-400 hover:text-white transition-all focus:outline-none"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* SKU Directory (Справочник SKU) */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{t.productsModule.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Внутренний реестр сырья, полуфабрикатов и готовой продукции</p>
            </div>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => {
                  setEditingSku(null);
                  setSkuCode('');
                  setSkuName('');
                  setSkuDesc('');
                  setSkuWeight('');
                  setSkuPallet('');
                  setSkuError('');
                  setIsSkuFormOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-xs font-bold text-white shadow shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                {t.productsModule.btnCreate}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod) => (
              <div 
                key={prod.sku} 
                className={`bg-slate-800 border rounded-2xl p-5 shadow flex flex-col justify-between ${prod.isArchived ? 'border-slate-700/40 opacity-55' : 'border-slate-700/60'}`}
              >
                <div>
                  {/* Photo cover display */}
                  {prod.photos && prod.photos.length > 0 && (
                    <div 
                      onClick={() => {
                        setActiveLightboxPhotos(prod.photos || null);
                        setActiveLightboxIndex(0);
                      }}
                      className="relative h-44 w-full mb-4 rounded-xl overflow-hidden group cursor-zoom-in bg-slate-900 border border-slate-700/30"
                    >
                      <img 
                        src={prod.photos[0]} 
                        alt={prod.name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition-colors" />
                      {prod.photos.length > 1 && (
                        <div className="absolute bottom-2.5 right-2.5 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[9px] font-black text-indigo-400 border border-slate-700/50">
                          +{prod.photos.length - 1} {language === 'ru' ? 'фото' : 'rasm'}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono font-black uppercase bg-indigo-950/40 px-2.5 py-1 rounded-lg text-indigo-400 tracking-wider">
                      {prod.sku}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prod.isArchived ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {prod.isArchived ? t.productsModule.archived : t.productsModule.active}
                    </span>
                  </div>
                  
                  <h4 className="text-white font-extrabold text-base mt-3 leading-snug">{prod.name}</h4>
                  <p className="text-slate-400 text-xs font-semibold mt-1.5 leading-relaxed min-h-[36px]">{prod.description}</p>
                  
                  {/* Specification attached file */}
                  {prod.specification && (
                    <div className="mt-3.5 p-3 rounded-xl bg-slate-900/40 border border-slate-700/50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[11px] text-white font-bold block truncate" title={prod.specification.name}>
                            {prod.specification.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {(prod.specification.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = prod.specification!.base64;
                          link.download = prod.specification!.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        title={language === 'ru' ? 'Скачать спецификацию' : 'Spetsifikatsiyani yuklab olish'}
                        className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white transition-all cursor-pointer focus:outline-none"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  
                </div>

                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <div className="flex gap-2.5 mt-5 pt-3 border-t border-slate-700/30">
                    <button
                      onClick={() => startEditSku(prod)}
                      className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-xs font-bold text-indigo-400 border border-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95 focus:outline-none cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Текст
                    </button>
                    <button
                      onClick={() => toggleArchiveSku(prod)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all active:scale-95 focus:outline-none cursor-pointer ${prod.isArchived ? 'bg-emerald-500/10 hover:bg-emerald-500 border-emerald-500/20 text-emerald-400 hover:text-white' : 'bg-rose-500/10 hover:bg-rose-500 border-rose-500/20 text-rose-400 hover:text-white'}`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      {prod.isArchived ? t.productsModule.btnRestore : t.productsModule.btnArchive}
                    </button>
                    {skuDeleteConfirmId === prod.sku ? (
                      <div className="flex gap-1.5 justify-end items-center">
                        <button
                          onClick={() => handleDeleteSku(prod.sku)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer focus:outline-none"
                          title={language === 'ru' ? 'Да, удалить' : 'Ha, o\'chirish'}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setSkuDeleteConfirmId(null)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-all cursor-pointer focus:outline-none"
                          title={language === 'ru' ? 'Отмена' : 'Bekor qilish'}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSkuDeleteConfirmId(prod.sku)}
                        title={language === 'ru' ? 'Удалить навсегда' : 'Butunlay o\'chirish'}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white flex items-center justify-center transition-all active:scale-95 focus:outline-none cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {activeLightboxPhotos && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center z-[100] p-4">
          <button
            onClick={() => setActiveLightboxPhotos(null)}
            className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all z-[110] cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-4xl w-full h-[65vh] flex items-center justify-center">
            {activeLightboxPhotos.length > 1 && (
              <button
                onClick={() => setActiveLightboxIndex((activeLightboxIndex - 1 + activeLightboxPhotos.length) % activeLightboxPhotos.length)}
                className="absolute left-2 sm:-left-16 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer select-none z-50"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={activeLightboxPhotos[activeLightboxIndex]}
              alt="Fullscreen product view"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />

            {activeLightboxPhotos.length > 1 && (
              <button
                onClick={() => setActiveLightboxIndex((activeLightboxIndex + 1) % activeLightboxPhotos.length)}
                className="absolute right-2 sm:-right-16 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer select-none z-50"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Thumbnails indicator at the bottom */}
          {activeLightboxPhotos.length > 1 && (
            <div className="flex gap-2.5 mt-6 max-w-full overflow-x-auto p-1 z-50">
              {activeLightboxPhotos.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveLightboxIndex(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${activeLightboxIndex === i ? 'border-indigo-500 scale-105 shadow-lg' : 'border-slate-800 opacity-50 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT ORDER MODAL */}
      {isCreateOpen && (
        <OrderForm 
          order={selectedOrder} 
          onClose={() => {
            setIsCreateOpen(false);
            refreshOrders();
          }} 
        />
      )}

      {/* CHANGE HISTORY MODAL */}
      {viewHistoryOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-indigo-400" />
                {t.ordersModule.historyTitle}
              </h3>
              <button 
                onClick={() => setViewHistoryOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="text-xs font-bold text-indigo-400 bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20">
                Заявка № <span className="font-mono text-white">{viewHistoryOrder.orderNumber}</span> &middot; {products.find(p => p.sku === viewHistoryOrder.productSku)?.name || viewHistoryOrder.productSku}
              </div>

              {/* Used Raw Materials (Consolidated) */}
              {viewHistoryOrder.usedRawMaterials && viewHistoryOrder.usedRawMaterials.length > 0 && (
                <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/50 space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    {language === 'ru' ? 'Использованное сырье под заказ' : 'Buyurtma uchun ishlatilgan xom-ashyo'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-semibold text-slate-300">
                    {viewHistoryOrder.usedRawMaterials.map((rm) => (
                      <div key={rm.id} className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/30">
                        <span className="truncate pr-2 font-bold text-slate-200">{rm.name}</span>
                        <span className="font-mono font-black text-emerald-400 shrink-0">{rm.quantity.toLocaleString()} {rm.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {historyLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  {t.ordersModule.historyNoData}
                </div>
              ) : (
                <div className="relative border-l-2 border-indigo-600/30 ml-2.5 pl-5 space-y-5">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Circle icon marker */}
                      <span className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-slate-800"></span>
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 leading-none">
                          <span className="font-bold text-indigo-400">{log.user}</span>
                          <span>&middot;</span>
                          <span>{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 mt-1.5 leading-relaxed bg-slate-900/40 p-2.5 border border-slate-700/40 rounded-xl">
                          {log.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SKU FORM MODAL */}
      {isSkuFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {editingSku ? t.productsModule.formTitleEdit : t.productsModule.formTitleCreate}
              </h3>
              <button 
                onClick={() => setIsSkuFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSkuSubmit} className="p-5 space-y-4 text-xs font-semibold">
              {skuError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl">
                  {skuError}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.productsModule.sku} *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingSku}
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder="PRD-COL-15"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.productsModule.name} *
                </label>
                <input
                  type="text"
                  required
                  value={skuName}
                  onChange={(e) => setSkuName(e.target.value)}
                  placeholder="Coca-Cola 1.5L"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.productsModule.desc}
                </label>
                <textarea
                  value={skuDesc}
                  onChange={(e) => setSkuDesc(e.target.value)}
                  placeholder="Описание товара"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>



              {/* Specification Upload */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {language === 'ru' ? 'Спецификация (Документ)' : 'Spetsifikatsiya (Hujjat)'}
                </label>
                {specFile ? (
                  <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-xs text-white font-bold truncate max-w-[200px]" title={specFile.name}>
                        {specFile.name}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        ({(specFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSpecFile(null)}
                      className="p-1 hover:bg-slate-800 rounded text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-900/30 transition-all">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleSpecUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Paperclip className="w-5 h-5 text-slate-500 mx-auto mb-1.5" />
                    <span className="text-[11px] text-slate-400 block font-medium">
                      {language === 'ru' ? 'Выберите файл спецификации (.pdf, .doc, .xlsx)' : 'Spetsifikatsiya faylini tanlang (.pdf, .doc, .xlsx)'}
                    </span>
                  </div>
                )}
              </div>

              {/* Photos Upload (max 3) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider">
                    {language === 'ru' ? 'Фотографии продукции (до 3 шт.)' : 'Mahsulot rasmlari (maks. 3 dona)'}
                  </label>
                  <span className="text-[10px] text-slate-500 font-bold font-mono">
                    {productPhotos.length} / 3
                  </span>
                </div>
                
                {productPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {productPhotos.map((photo, i) => (
                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 group bg-slate-900">
                        <img src={photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setProductPhotos(productPhotos.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-0.5 bg-slate-950/80 hover:bg-rose-600 rounded-md text-white transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {productPhotos.length < 3 && (
                  <div className="relative border border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-900/30 transition-all">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotosUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Image className="w-5 h-5 text-slate-500 mx-auto mb-1.5" />
                    <span className="text-[11px] text-slate-400 block font-medium">
                      {language === 'ru' ? 'Загрузить изображения продукции' : 'Mahsulot rasmlarini yuklash'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsSkuFormOpen(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors"
                >
                  {t.orderForm.btnCancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition-colors"
                >
                  {editingSku ? t.orderForm.btnSave : t.productsModule.btnCreate}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
