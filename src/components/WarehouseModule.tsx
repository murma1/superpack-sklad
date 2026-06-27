/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { InventoryItem, InventoryTransaction } from '../types';
import { 
  Plus, Search, Filter, Layers, Clipboard, AlertTriangle, 
  CheckCircle, RefreshCw, Calendar, FileText, ArrowUpDown, Trash2, BookOpen, Edit
} from 'lucide-react';

export default function WarehouseModule() {
  const { 
    inventory, 
    user, 
    t, 
    language, 
    refreshInventory, 
    rawMaterialsCatalog, 
    refreshRawMaterialsCatalog 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'raw' | 'finished' | 'catalog' | 'transactions'>('raw');
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [filterFactory, setFilterFactory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Replenishment (Приход) form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rawName, setRawName] = useState('');
  const [rawQty, setRawQty] = useState('');
  const [rawUnit, setRawUnit] = useState('pcs');
  const [rawFactory, setRawFactory] = useState<'Keles' | 'Yunusobod'>('Keles');
  const [rawComment, setRawComment] = useState('');
  const [formError, setFormError] = useState('');

  // Catalog form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatUnit, setNewCatUnit] = useState('pcs');
  const [newCatMinThreshold, setNewCatMinThreshold] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [catalogDeleteConfirmId, setCatalogDeleteConfirmId] = useState<string | null>(null);

  // Edit stock modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editMinThreshold, setEditMinThreshold] = useState('');
  const [editError, setEditError] = useState('');

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditQty(item.quantity.toString());
    setEditMinThreshold(item.minThreshold !== undefined ? item.minThreshold.toString() : '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveStockEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.name || 'Warehouse Staff',
          updates: {
            quantity: parseInt(editQty) || 0,
            minThreshold: editMinThreshold ? parseInt(editMinThreshold) : undefined
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        setEditingItem(null);
        refreshInventory();
      } else {
        setEditError(data.message || 'Ошибка сохранения');
      }
    } catch (err) {
      setEditError('Не удалось обновить остатки');
    }
  };

  const handleAddCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatUnit) {
      setCatalogError(language === 'ru' ? 'Заполните обязательные поля' : 'Majburiy maydonlarni to\'ldiring');
      return;
    }
    try {
      const res = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          unit: newCatUnit,
          minThreshold: newCatMinThreshold ? parseInt(newCatMinThreshold) : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewCatName('');
        setNewCatUnit('pcs');
        setNewCatMinThreshold('');
        setCatalogError('');
        refreshRawMaterialsCatalog();
      } else {
        setCatalogError(data.message || 'Ошибка');
      }
    } catch (err) {
      setCatalogError('Ошибка отправки данных');
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    try {
      const res = await fetch(`/api/raw-materials/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setCatalogDeleteConfirmId(null);
        refreshRawMaterialsCatalog();
      } else {
        setCatalogError(data.message || 'Ошибка удаления');
      }
    } catch (err) {
      setCatalogError('Ошибка удаления элемента');
    }
  };

  // Fetch transactions log on load
  useEffect(() => {
    fetch('/api/inventory/transactions')
      .then(res => res.json())
      .then(data => {
        // Sort transactions desc by date
        const sorted = data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sorted);
      })
      .catch(err => console.error(err));
  }, [inventory]);

  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawName || !rawQty) {
      setFormError(t.orderForm.validationErr);
      return;
    }

    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.name || 'Warehouse Staff',
          itemName: rawName,
          type: 'raw_material',
          qtyChange: parseInt(rawQty),
          factory: rawFactory,
          comment: rawComment || 'Складской приход',
          sku: undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        setRawName('');
        setRawQty('');
        setRawComment('');
        setFormError('');
        refreshInventory();
      } else {
        setFormError(data.message || 'Ошибка');
      }
    } catch (err) {
      setFormError('Ошибка отправки данных');
    }
  };

  const getStatusBadge = (item: InventoryItem) => {
    if (item.minThreshold !== undefined && item.quantity < item.minThreshold) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1 w-max text-[10px] font-black uppercase">
          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
          {t.warehouseModule.statusLow}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
        {t.warehouseModule.statusOk}
      </span>
    );
  };

  const getTransactionLabel = (type: string) => {
    const labels = t.warehouseModule.operations;
    switch (type) {
      case 'received_raw':
        return <span className="text-emerald-400 font-bold">{labels.received_raw}</span>;
      case 'issued_to_production':
        return <span className="text-amber-400 font-bold">{labels.issued_to_production}</span>;
      case 'production_inflow':
        return <span className="text-indigo-400 font-bold">{labels.production_inflow}</span>;
      case 'shipment_outflow':
        return <span className="text-teal-400 font-bold">{labels.shipment_outflow}</span>;
      default:
        return <span className="text-slate-400 font-bold">{labels.manual_adjustment}</span>;
    }
  };

  // Raw list with filters
  const rawMaterials = inventory.filter(i => {
    if (i.type !== 'raw_material') return false;
    if (!i.name.toLowerCase().includes(search.toLowerCase())) return false;
    
    // Factory filter
    if (filterFactory !== 'all' && i.factory !== filterFactory) return false;
    
    // Status/State filter
    if (filterStatus !== 'all') {
      const isLow = i.minThreshold !== undefined && i.quantity < i.minThreshold;
      if (filterStatus === 'low' && !isLow) return false;
      if (filterStatus === 'ok' && isLow) return false;
    }
    
    return true;
  });

  // Finished goods list with filters
  const finishedGoods = inventory.filter(i => {
    if (i.type !== 'finished_good') return false;
    if (!i.name.toLowerCase().includes(search.toLowerCase())) return false;
    
    // Factory filter
    if (filterFactory !== 'all' && i.factory !== filterFactory) return false;
    
    // Status/State filter (finished goods do not have minThreshold, so they are always "ok")
    if (filterStatus !== 'all') {
      if (filterStatus === 'low') return false; // none of finished goods are low status since no minThreshold is set
    }
    
    return true;
  });

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Upper Module header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">{t.warehouseModule.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Управление остатками сырья, упаковки и готовой продукции на складах</p>
        </div>

        {activeSubTab === 'raw' && (user?.role === 'admin' || user?.role === 'warehouse') && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-xs font-bold text-white shadow shadow-indigo-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {t.warehouseModule.addRawBtn}
          </button>
        )}
      </div>

      {/* Navigation SubTabs */}
      <div className="bg-slate-800 p-1 rounded-xl border border-slate-700/60 flex max-w-xl">
        <button
          onClick={() => setActiveSubTab('raw')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'raw' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          {t.warehouseModule.rawStock}
        </button>
        <button
          onClick={() => setActiveSubTab('finished')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'finished' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          {t.warehouseModule.finishedStock}
        </button>
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'catalog' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          {language === 'ru' ? 'Справочник сырья' : "Xom-ashyo ro'yxati"}
        </button>
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'transactions' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          {t.warehouseModule.historyTab}
        </button>
      </div>

      {/* SEARCH BAR & FILTERS (For stocks list) */}
      {activeSubTab !== 'transactions' && activeSubTab !== 'catalog' && (
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={language === 'ru' ? "Поиск по наименованию сырья или продукции..." : "Xom-ashyo yoki mahsulot nomi bo'yicha qidirish..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            {/* Factory Filter */}
            <div className="flex-1 md:w-44">
              <select
                value={filterFactory}
                onChange={(e) => setFilterFactory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">
                  {language === 'ru' ? 'Все заводы' : 'Barcha zavodlar'}
                </option>
                <option value="Keles">Keles ({language === 'ru' ? 'Келес' : 'Keles'})</option>
                <option value="Yunusobod">Yunusobod ({language === 'ru' ? 'Юнусобод' : 'Yunusobod'})</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 md:w-44">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">
                  {language === 'ru' ? 'Все состояния' : 'Barcha holatlar'}
                </option>
                <option value="low">
                  {language === 'ru' ? 'Низкий остаток' : "Qoldiq kam"}
                </option>
                <option value="ok">
                  {language === 'ru' ? 'В норме' : "Me'yorda"}
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENTS: RAW MATERIAL STOCKS */}
      {activeSubTab === 'raw' && (
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  <th className="py-4 px-5">{t.warehouseModule.name}</th>
                  <th className="py-4 px-5">{t.warehouseModule.factory}</th>
                  <th className="py-4 px-5 text-right">{t.warehouseModule.quantity}</th>
                  <th className="py-4 px-5 text-center">{t.warehouseModule.unit}</th>
                  <th className="py-4 px-5 text-right">{t.warehouseModule.minLimit}</th>
                  <th className="py-4 px-5 text-center">{t.warehouseModule.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300">
                {rawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                      Нет зарегистрированного сырья на складах.
                    </td>
                  </tr>
                ) : (
                  rawMaterials.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-4 px-5 text-white font-bold">{item.name}</td>
                      <td className="py-4 px-5">{t.factories[item.factory]}</td>
                      <td className={`py-4 px-5 text-right font-mono font-black text-sm ${item.minThreshold && item.quantity < item.minThreshold ? 'text-rose-400' : 'text-white'}`}>
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="py-4 px-5 text-center text-slate-400 font-bold">{item.unit}</td>
                      <td className="py-4 px-5 text-right font-mono text-slate-400">
                        {item.minThreshold ? item.minThreshold.toLocaleString() : '-'}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 flex justify-center">
                            {getStatusBadge(item)}
                          </div>
                          {(user?.role === 'admin' || user?.role === 'warehouse') && (
                            <button
                              id={`edit-stock-btn-${item.id}`}
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 hover:bg-slate-700/60 rounded-lg text-slate-400 hover:text-indigo-400 transition-all active:scale-90 flex items-center justify-center"
                              title={language === 'ru' ? 'Редактировать остаток' : 'Qoldiqni tahrirlash'}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENTS: FINISHED GOODS STOCKS */}
      {activeSubTab === 'finished' && (
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  <th className="py-4 px-5">{t.warehouseModule.tblSku}</th>
                  <th className="py-4 px-5">{t.warehouseModule.tblProduct}</th>
                  <th className="py-4 px-5">{t.warehouseModule.factory}</th>
                  <th className="py-4 px-5 text-right">{t.warehouseModule.tblInStock}</th>
                  <th className="py-4 px-5 text-center">{t.warehouseModule.unit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300">
                {finishedGoods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                      На складах нет готовой продукции. Поступление происходит автоматически при завершении производства.
                    </td>
                  </tr>
                ) : (
                  finishedGoods.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-indigo-400">{item.sku || 'N/A'}</td>
                      <td className="py-4 px-5 text-white font-bold">{item.name}</td>
                      <td className="py-4 px-5">{t.factories[item.factory]}</td>
                      <td className="py-4 px-5 text-right font-mono font-black text-sm text-emerald-400">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="py-4 px-5 text-center text-slate-400 font-bold">{item.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENTS: RAW MATERIAL CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          {/* Add Item to Catalog Form (Only for warehouse or admin) */}
          {(user?.role === 'admin' || user?.role === 'warehouse') && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                {language === 'ru' ? 'Добавить новое сырье в справочник' : 'Yangi xom-ashyo qo\'shish'}
              </h3>
              
              <form onSubmit={handleAddCatalogItem} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs font-semibold text-slate-300">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {language === 'ru' ? 'Наименование сырья' : 'Xom-ashyo nomi'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={language === 'ru' ? 'Например: Пленка ПВД 50мкм' : 'Masalan: PVX plyonka'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {t.warehouseModule.unit} *
                  </label>
                  <select
                    value={newCatUnit}
                    onChange={(e) => setNewCatUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pcs">pcs ({language === 'ru' ? 'шт' : 'dona'})</option>
                    <option value="kg">kg ({language === 'ru' ? 'кг' : 'kg'})</option>
                    <option value="rolls">rolls ({language === 'ru' ? 'рулоны' : 'o\'ram'})</option>
                    <option value="liters">liters ({language === 'ru' ? 'литры' : 'litr'})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {t.warehouseModule.minLimit} ({language === 'ru' ? 'необязательно' : 'ixtiyoriy'})
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min={0}
                      value={newCatMinThreshold}
                      onChange={(e) => setNewCatMinThreshold(e.target.value)}
                      placeholder="1000"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-bold flex items-center justify-center gap-1.5 focus:outline-none active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      {language === 'ru' ? 'Добавить' : 'Qo\'shish'}
                    </button>
                  </div>
                </div>
              </form>
              
              {catalogError && (
                <p className="text-xs text-rose-400 mt-3 font-semibold">{catalogError}</p>
              )}
            </div>
          )}

          {/* Catalog items table */}
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                    <th className="py-4 px-5 w-24">ID</th>
                    <th className="py-4 px-5">{t.warehouseModule.name}</th>
                    <th className="py-4 px-5 text-center">{t.warehouseModule.unit}</th>
                    <th className="py-4 px-5 text-right">{t.warehouseModule.minLimit}</th>
                    {(user?.role === 'admin' || user?.role === 'warehouse') && (
                      <th className="py-4 px-5 text-right w-20">{language === 'ru' ? 'Действие' : 'Amal'}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300">
                  {rawMaterialsCatalog.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                        {language === 'ru' ? 'В справочнике нет подходящего сырья.' : 'Ro\'yxatda mos xom-ashyo topilmadi.'}
                      </td>
                    </tr>
                  ) : (
                    rawMaterialsCatalog
                      .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="py-4 px-5 font-mono text-slate-500">{item.id}</td>
                          <td className="py-4 px-5 text-white font-bold">{item.name}</td>
                          <td className="py-4 px-5 text-center text-slate-400 font-bold">{item.unit}</td>
                          <td className="py-4 px-5 text-right font-mono text-slate-400">
                            {item.minThreshold ? item.minThreshold.toLocaleString() : '-'}
                          </td>
                          {(user?.role === 'admin' || user?.role === 'warehouse') && (
                            <td className="py-4 px-5 text-right">
                              {catalogDeleteConfirmId === item.id ? (
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => handleDeleteCatalogItem(item.id)}
                                    className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors focus:outline-none cursor-pointer"
                                    title={language === 'ru' ? 'Подтвердить удаление' : 'Tasdiqlash'}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setCatalogDeleteConfirmId(null)}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors focus:outline-none cursor-pointer"
                                    title={language === 'ru' ? 'Отмена' : 'Bekor qilish'}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCatalogDeleteConfirmId(item.id)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors focus:outline-none cursor-pointer"
                                  title={language === 'ru' ? 'Удалить из справочника' : 'Ro\'yxatdan o\'chirish'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENTS: WAREHOUSE TRANSACTION HISTORY LOG */}
      {activeSubTab === 'transactions' && (
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  <th className="py-4 px-5">{t.warehouseModule.historyDate}</th>
                  <th className="py-4 px-5">{t.warehouseModule.historyOp}</th>
                  <th className="py-4 px-5">{t.warehouseModule.historyItem}</th>
                  <th className="py-4 px-5">{t.warehouseModule.factory}</th>
                  <th className="py-4 px-5 text-right">{t.warehouseModule.historyQty}</th>
                  <th className="py-4 px-5">{t.warehouseModule.rawFormComment}</th>
                  <th className="py-4 px-5">{t.warehouseModule.historyUser}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      Движений по складам пока не производилось.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">
                        {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-5">
                        {getTransactionLabel(tx.type)}
                      </td>
                      <td className="py-3.5 px-5 text-white font-bold">
                        <div>
                          <span>{tx.itemName}</span>
                          {tx.sku && <span className="text-[10px] text-indigo-400 block font-mono font-bold mt-0.5">{tx.sku}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {t.factories[tx.factory]}
                      </td>
                      <td className={`py-3.5 px-5 text-right font-mono font-black text-sm ${tx.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.quantity > 0 ? `+${tx.quantity.toLocaleString()}` : tx.quantity.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 max-w-[200px] truncate" title={tx.comment}>
                        {tx.comment || '-'}
                      </td>
                      <td className="py-3.5 px-5 text-slate-400">
                        {tx.user}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPLENISHMENT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-indigo-400" />
                {t.warehouseModule.rawFormTitle}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAdjustInventory} className="p-5 space-y-4 text-xs font-semibold text-slate-300">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.warehouseModule.name} *
                </label>
                <select
                  required
                  value={rawName}
                  onChange={(e) => setRawName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Выберите сырье --</option>
                  {rawMaterialsCatalog.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {t.warehouseModule.rawFormQty} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={rawQty}
                    onChange={(e) => setRawQty(e.target.value)}
                    placeholder="10000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>

                {/* Factory / Warehouse Location */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {t.warehouseModule.factory} *
                  </label>
                  <select
                    value={rawFactory}
                    onChange={(e: any) => setRawFactory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none"
                  >
                    <option value="Keles">Келес (Keles)</option>
                    <option value="Yunusobod">Юнусобод (Yunusobod)</option>
                  </select>
                </div>
              </div>

              {/* Waybill / Supplier Comment */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.warehouseModule.rawFormComment}
                </label>
                <textarea
                  value={rawComment}
                  onChange={(e) => setRawComment(e.target.value)}
                  placeholder="Накладная 공급, Название поставщика, Пломбы..."
                  rows={2.5}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Action row */}
              <div className="flex gap-4 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors"
                >
                  {t.orderForm.btnCancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition-colors active:scale-95"
                >
                  Оформить приход
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STOCK FORM MODAL */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Edit className="w-4.5 h-4.5 text-indigo-400" />
                {language === 'ru' ? 'Редактирование остатка сырья' : "Xom-ashyo qoldig'ini tahrirlash"}
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveStockEdit} className="p-5 space-y-4 text-xs font-semibold text-slate-300">
              {editError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'ru' ? 'Наименование сырья' : 'Xom-ashyo nomi'}
                </label>
                <input
                  type="text"
                  disabled
                  value={editingItem.name}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-400 font-bold focus:outline-none cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Factory */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                    {t.warehouseModule.factory}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={t.factories[editingItem.factory]}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-400 font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'ru' ? 'Единица измерения' : "O'lchov birligi"}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingItem.unit}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-400 font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'ru' ? 'Текущий остаток' : 'Joriy qoldiq'} *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Min threshold */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'ru' ? 'Минимальный порог' : 'Minimal chegara'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editMinThreshold}
                    onChange={(e) => setEditMinThreshold(e.target.value)}
                    placeholder="-"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Action row */}
              <div className="flex gap-4 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors"
                >
                  {t.orderForm.btnCancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition-colors active:scale-95"
                >
                  {language === 'ru' ? 'Сохранить изменения' : "O'zgarishlarni saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
