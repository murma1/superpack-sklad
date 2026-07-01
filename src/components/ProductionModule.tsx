/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Order, ProductionCheckpoint } from '../types';
import { 
  Cylinder, Play, Save, CheckCircle, 
  Settings, AlertCircle, Info, Sparkles, Plus, Trash2, Layers,
  Calendar, Search, Clock, User, ArrowRight, Check, Activity
} from 'lucide-react';

export default function ProductionModule() {
  const { orders, products, refreshOrders, user, t, language, inventory, refreshInventory } = useApp();

  const [selectedOrderId, setSelectedOrderId] = useState('');
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'New' | 'InProduction' | 'Completed'>('All');

  // Checkpoint Form Fields
  const [cpProduced, setCpProduced] = useState('');
  const [cpDefective, setCpDefective] = useState('0');
  const [cpShift, setCpShift] = useState('day');
  const [cpEquipment, setCpEquipment] = useState('');
  const [cpComment, setCpComment] = useState('');
  const [cpDate, setCpDate] = useState(''); // YYYY-MM-DD HH:MM
  
  // Custom Raw Materials consumed specifically in this checkpoint
  const [cpRawMaterials, setCpRawMaterials] = useState<{ id: string; name: string; quantity: number; unit: string }[]>([]);
  const [selectedCpRawId, setSelectedCpRawId] = useState('');
  const [cpRawQty, setCpRawQty] = useState('');

  // UI state
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Helper: current date and time in GMT+5
  const getGMT5DateString = (d: Date = new Date()) => {
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const gmt5 = new Date(utc + (3600000 * 5));
    return gmt5.toISOString().slice(0, 16).replace('T', ' ');
  };

  // Load latest inventory on mount
  useEffect(() => {
    refreshInventory();
  }, []);

  // Pre-populate fields when an order is selected
  useEffect(() => {
    if (selectedOrder) {
      setCpEquipment(selectedOrder.equipment || '');
      setCpShift(selectedOrder.shift || 'day');
      setCpDate(getGMT5DateString());
      
      // Reset form entries
      setCpProduced('');
      setCpDefective('0');
      setCpComment('');
      setCpRawMaterials([]);
      setSelectedCpRawId('');
      setCpRawQty('');
    } else {
      setCpEquipment('');
      setCpShift('day');
      setCpDate('');
    }
    setStatusMsg('');
    setErrorMsg('');
  }, [selectedOrderId]);

  // Handle launching the order into production
  const handleLaunchProduction = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    setStatusMsg('');
    setErrorMsg('');

    const nowStr = getGMT5DateString();
    const updates: Partial<Order> = {
      status: 'InProduction',
      productionStart: nowStr,
      equipment: cpEquipment || 'Линия 1',
      shift: cpShift || 'day'
    };

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.name || 'Production Operator',
          updates
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg(language === 'ru' ? 'Заказ успешно запущен в производство!' : 'Buyurtma ishlab chiqarishga muvaffaqiyatli tushirildi!');
        refreshOrders();
        refreshInventory();
      } else {
        setErrorMsg(data.message || 'Ошибка запуска производства');
      }
    } catch (e) {
      setErrorMsg('Не удалось запустить производство');
    } finally {
      setIsSaving(false);
    }
  };

  // Save checkpoint and update accumulated statistics
  const handleSaveCheckpoint = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    setStatusMsg('');
    setErrorMsg('');

    const parsedProduced = parseInt(cpProduced) || 0;
    const parsedDefective = parseInt(cpDefective) || 0;
    const parsedPacked = 0; // Packaging is handled in the Packaging tab now

    if (parsedProduced <= 0) {
      setErrorMsg(language === 'ru' ? 'Введите корректное количество произведенной продукции!' : 'Ishlab chiqarilgan miqdorni to\'g\'ri kiriting!');
      setIsSaving(false);
      return;
    }

    // Build the checkpoint object
    const newCheckpoint: ProductionCheckpoint = {
      id: 'cp-' + Math.random().toString(36).substring(2, 9),
      date: cpDate || getGMT5DateString(),
      produced: parsedProduced,
      defective: parsedDefective,
      packed: parsedPacked,
      equipment: cpEquipment,
      shift: cpShift,
      comment: cpComment,
      usedRawMaterials: cpRawMaterials,
      user: user?.name || 'Production Operator'
    };

    // Calculate cumulative values
    const updatedCheckpoints = [...(selectedOrder.checkpoints || []), newCheckpoint];
    const newProduced = (selectedOrder.produced || 0) + parsedProduced;
    const newDefective = (selectedOrder.defective || 0) + parsedDefective;
    const newPacked = (selectedOrder.packed || 0) + parsedPacked;

    // Merge checkpoint raw material usages into order total
    const mergedRawMaterials = [...(selectedOrder.usedRawMaterials || [])];
    cpRawMaterials.forEach(rm => {
      const existing = mergedRawMaterials.find(x => x.id === rm.id);
      if (existing) {
        existing.quantity += rm.quantity;
      } else {
        mergedRawMaterials.push({ ...rm });
      }
    });

    const updates: Partial<Order> = {
      produced: newProduced,
      defective: newDefective,
      packed: newPacked,
      checkpoints: updatedCheckpoints,
      usedRawMaterials: mergedRawMaterials,
      equipment: cpEquipment || selectedOrder.equipment,
      shift: cpShift || selectedOrder.shift,
      status: 'InProduction'
    };

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.name || 'Production Operator',
          updates
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg(language === 'ru' ? 'Чекпоинт успешно добавлен!' : 'Chekpoint muvaffaqiyatli qo\'shildi!');
        refreshOrders();
        refreshInventory();
        
        // Reset checkpoint form fields
        setCpProduced('');
        setCpDefective('0');
        setCpComment('');
        setCpRawMaterials([]);
        setSelectedCpRawId('');
        setCpRawQty('');
        setCpDate(getGMT5DateString());
      } else {
        setErrorMsg(data.message || 'Ошибка обновления данных');
      }
    } catch (e) {
      setErrorMsg('Не удалось сохранить изменения');
    } finally {
      setIsSaving(false);
    }
  };

  // Complete production for this order
  const handleCompleteProduction = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    setStatusMsg('');
    setErrorMsg('');

    const nowStr = getGMT5DateString();
    const updates: Partial<Order> = {
      status: 'Packaging',
      productionEnd: nowStr
    };

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.name || 'Production Operator',
          updates
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg(language === 'ru' ? 'Производство по заказу успешно завершено! Заявка отправлена на упаковку.' : 'Buyurtma bo\'yicha ishlab chiqarish muvaffaqiyatli yakunlandi! Buyurtma qadoqlashga yuborildi.');
        refreshOrders();
        refreshInventory();
      } else {
        setErrorMsg(data.message || 'Ошибка при завершении производства');
      }
    } catch (e) {
      setErrorMsg('Не удалось завершить производство');
    } finally {
      setIsSaving(false);
    }
  };

  // Raw Material selectors for checkpoint
  const availableRawMaterials = inventory.filter(
    item => item.type === 'raw_material' && item.factory === selectedOrder?.factory
  );

  const handleAddCpRawMaterial = () => {
    if (!selectedCpRawId || !cpRawQty) return;
    const item = availableRawMaterials.find(i => i.id === selectedCpRawId);
    if (!item) return;

    const parsedQty = parseInt(cpRawQty) || 0;
    if (parsedQty <= 0) return;

    setCpRawMaterials(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + parsedQty } : i);
      } else {
        return [...prev, { id: item.id, name: item.name, quantity: parsedQty, unit: item.unit }];
      }
    });

    setSelectedCpRawId('');
    setCpRawQty('');
  };

  const handleRemoveCpRawMaterial = (id: string) => {
    setCpRawMaterials(prev => prev.filter(i => i.id !== id));
  };

  // Filter and Search the orders in production tab
  const filteredProductionOrders = orders.filter(o => {
    // Show only New, InProduction and Completed orders
    const matchesStatus = o.status === 'New' || o.status === 'InProduction' || o.status === 'Completed';
    if (!matchesStatus) return false;

    if (statusFilter !== 'All' && o.status !== statusFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const prod = products.find(p => p.sku === o.productSku);
      const prodName = prod ? prod.name.toLowerCase() : '';
      return o.orderNumber.toLowerCase().includes(q) || prodName.includes(q) || o.productSku.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    return b.createdAt.localeCompare(a.createdAt);
  });

  const getProductLabel = (sku: string) => {
    const prod = products.find(p => p.sku === sku);
    return prod ? prod.name : sku;
  };

  // Live Pallet Calculation
  const unitsPerPallet = selectedOrder?.unitsPerPallet || 360;
  const currentPacked = selectedOrder?.packed || 0;
  const fullPallets = Math.floor(currentPacked / unitsPerPallet);
  const looseUnits = currentPacked % unitsPerPallet;

  // Left to produce
  const leftToProduce = selectedOrder ? Math.max(0, selectedOrder.quantityOrdered - (selectedOrder.produced || 0)) : 0;
  const progressPercent = selectedOrder ? Math.min(100, Math.round(((selectedOrder.produced || 0) / selectedOrder.quantityOrdered) * 100)) : 0;

  return (
    <div className="space-y-6 font-sans select-none text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {language === 'ru' ? 'Управление производством' : 'Ishlab chiqarishni boshqarish'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ru' 
              ? 'Запуск заявок в производство и фиксация промежуточных чекпоинтов выработки' 
              : 'Buyurtmalarni ishlab chiqarishga tushirish va oraliq natijalarni (chekpointlarni) yozish'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Search & Production Orders List */}
        <div className="lg:col-span-4 bg-slate-800 border border-slate-700/60 rounded-3xl p-4.5 space-y-4 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              {language === 'ru' ? 'Заявки на производство' : 'Ishlab chiqarish buyurtmalari'}
            </h3>
            <span className="bg-slate-900/80 text-[10px] font-bold text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-700">
              {filteredProductionOrders.length}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ru' ? 'Поиск заказа или товара...' : 'Buyurtma yoki mahsulot qidirish...'}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status filters */}
          <div className="flex gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700/50">
            {[
              { id: 'All', ru: 'Все', uz: 'Barchasi' },
              { id: 'New', ru: 'Новые', uz: 'Yangilar' },
              { id: 'InProduction', ru: 'В работе', uz: 'Jarayonda' },
              { id: 'Completed', ru: 'Готовые', uz: 'Tayyorlar' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ru' ? tab.ru : tab.uz}
              </button>
            ))}
          </div>

          {/* Orders list container */}
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filteredProductionOrders.length > 0 ? (
              filteredProductionOrders.map(o => {
                const isSelected = o.id === selectedOrderId;
                const prodProgress = Math.min(100, Math.round((o.produced / o.quantityOrdered) * 100));
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-md shadow-indigo-600/5'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-indigo-400">
                        {o.orderNumber}
                      </span>
                      {o.status === 'New' && (
                        <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                          {language === 'ru' ? 'НОВАЯ' : 'YANGI'}
                        </span>
                      )}
                      {o.status === 'InProduction' && (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase animate-pulse">
                          {language === 'ru' ? 'В РАБОТЕ' : 'JARAYONDA'}
                        </span>
                      )}
                      {o.status === 'Completed' && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                          {language === 'ru' ? 'ЗАВЕРШЕНА' : 'YAKUNLANDI'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-slate-100 block truncate">
                        {getProductLabel(o.productSku)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                        {language === 'ru' ? 'Завод' : 'Zavod'}: {t.factories[o.factory]} &middot; SKU: {o.productSku}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-700/30">
                      <span>{language === 'ru' ? 'Заказ' : 'Buyurtma'}: {o.quantityOrdered.toLocaleString()} шт</span>
                      <span className="text-slate-200">{o.produced.toLocaleString()} шт ({prodProgress}%)</span>
                    </div>

                    {o.status !== 'New' && (
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${o.status === 'Completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${prodProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-700 border-dashed text-slate-500">
                <Info className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-[11px] font-bold">
                  {language === 'ru' ? 'Активные заявки не найдены' : 'Faol buyurtmalar topilmadi'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Production Operations Workspace */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedOrder ? (
            <div className="space-y-6">
              
              {/* Order Brief Header */}
              <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{selectedOrder.orderNumber}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                      <span className="text-xs font-bold text-slate-300">{t.factories[selectedOrder.factory]}</span>
                    </div>
                    <h3 className="text-lg font-black text-white mt-1 leading-snug">
                      {getProductLabel(selectedOrder.productSku)}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {selectedOrder.status === 'New' && (
                      <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 px-3.5 py-1 rounded-xl text-[10px] font-black uppercase">
                        {language === 'ru' ? 'Статус: НОВАЯ' : 'Status: YANGI'}
                      </span>
                    )}
                    {selectedOrder.status === 'InProduction' && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-1 rounded-xl text-[10px] font-black uppercase animate-pulse">
                        {language === 'ru' ? 'Статус: В ПРОИЗВОДСТВЕ' : 'Status: JARAYONDA'}
                      </span>
                    )}
                    {selectedOrder.status === 'Completed' && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 rounded-xl text-[10px] font-black uppercase">
                        {language === 'ru' ? 'Статус: ЗАВЕРШЕНА' : 'Status: YAKUNLANDI'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{language === 'ru' ? 'Заказано продукции' : 'Buyurtma miqdori'}</span>
                    <span className="text-lg font-black font-mono text-white mt-0.5 block">{selectedOrder.quantityOrdered.toLocaleString()} шт</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{language === 'ru' ? 'Выработка всего' : 'Jami ishlab chiqarildi'}</span>
                    <span className="text-lg font-black font-mono text-indigo-400 mt-0.5 block">{selectedOrder.produced.toLocaleString()} шт</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{language === 'ru' ? 'Общий брак (Скрап)' : 'Jami yaroqsiz (brak)'}</span>
                    <span className="text-lg font-black font-mono text-rose-400 mt-0.5 block">{selectedOrder.defective.toLocaleString()} шт</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{language === 'ru' ? 'Упаковано всего' : 'Jami qadoqlandi'}</span>
                    <span className="text-lg font-black font-mono text-emerald-400 mt-0.5 block">{selectedOrder.packed.toLocaleString()} шт</span>
                  </div>
                </div>

                {selectedOrder.comment && (
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 text-xs">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block mb-1">
                      {language === 'ru' ? 'Комментарий менеджера к заказу:' : 'Buyurtmaga menejer izohi:'}
                    </span>
                    <p className="text-slate-300 font-medium leading-relaxed">{selectedOrder.comment}</p>
                  </div>
                )}
              </div>

              {/* Status and Error Alerts */}
              {statusMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* VIEW CASE 1: ORDER IS NEW (NOT LAUNCHED YET) */}
              {selectedOrder.status === 'New' && (
                <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-6 shadow flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                    <Play className="w-8 h-8 fill-indigo-400" />
                  </div>
                  
                  <div className="max-w-md space-y-2">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      {language === 'ru' ? 'Заявка ожидает запуска' : 'Buyurtma kutilmoqda'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      {language === 'ru' 
                        ? 'Для того чтобы начать регистрировать чекпоинты выработки по этому заказу, вам необходимо запустить его в производство.' 
                        : 'Ushbu buyurtma bo\'yicha ishlab chiqarish oraliq natijalarini kiritish uchun avval uni ishlab chiqarishga tushiring.'}
                    </p>
                  </div>

                  {/* Initial Settings Form */}
                  <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50 text-left">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black">
                        {t.productionModule.shift}
                      </label>
                      <select
                        value={cpShift}
                        onChange={(e) => setCpShift(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="day">{t.productionModule.shifts.day}</option>
                        <option value="night">{t.productionModule.shifts.night}</option>
                        <option value="third">{t.productionModule.shifts.third}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black">
                        {t.productionModule.equipment}
                      </label>
                      <input
                        type="text"
                        value={cpEquipment}
                        onChange={(e) => setCpEquipment(e.target.value)}
                        placeholder="Линия 1 / Термопластавтомат"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleLaunchProduction}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl flex items-center gap-3 transition-all active:scale-95 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    {language === 'ru' ? 'Запустить в производство' : 'Ishlab chiqarishga tushirish'}
                  </button>
                </div>
              )}

              {/* VIEW CASE 2: ORDER IS IN PRODUCTION OR COMPLETED */}
              {(selectedOrder.status === 'InProduction' || selectedOrder.status === 'Completed') && (
                <div className="space-y-6">
                  
                  {/* Progress Meter with Pallet Detail */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Progress Bar Widget */}
                    <div className="md:col-span-7 bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                          {language === 'ru' ? 'Выполнение заказа' : 'Buyurtma bajarilishi'}
                        </span>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-3xl font-black text-white font-mono">{progressPercent}%</span>
                          <span className="text-xs text-slate-400 font-semibold">
                            ({selectedOrder.produced.toLocaleString()} / {selectedOrder.quantityOrdered.toLocaleString()} шт)
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${selectedOrder.status === 'Completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-rose-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {language === 'ru' ? 'Осталось произвести:' : 'Ishlab chiqarish kerak:'}
                        </span>
                        <span className="text-rose-400 font-mono text-xs">{leftToProduce.toLocaleString()} шт</span>
                      </div>
                    </div>

                    {/* Live Pallet Calculator */}
                    <div className="md:col-span-5 bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
                      <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                        {t.ordersModule.palletDetails}
                      </span>
                      <div className="text-center py-2.5 bg-slate-900 rounded-2xl border border-slate-700/30 mt-2">
                        <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">{t.ordersModule.fullPallets}</span>
                        <span className="text-2xl font-black text-white font-mono mt-0.5 block">{fullPallets}</span>
                        <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
                          {t.ordersModule.looseUnits}: <strong className="font-mono text-indigo-400">{looseUnits} / {unitsPerPallet}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Main Interaction: Direct Production Update Panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left/Main Column: Output Data Input */}
                    <div className="lg:col-span-7 bg-slate-800 border border-slate-700/60 rounded-3xl p-6 shadow space-y-5">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-700/50 pb-3 flex items-center gap-2">
                        <Activity className="w-4.5 h-4.5 text-indigo-400" />
                        {language === 'ru' ? 'Регистрация выработки' : 'Ishlab chiqarishni yozish'}
                      </h3>

                      {selectedOrder.status === 'InProduction' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Shift */}
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-black">
                                {t.productionModule.shift}
                              </label>
                              <select
                                value={cpShift}
                                onChange={(e) => setCpShift(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-2.5 text-xs font-bold text-white focus:outline-none"
                              >
                                <option value="day">{t.productionModule.shifts.day}</option>
                                <option value="night">{t.productionModule.shifts.night}</option>
                                <option value="third">{t.productionModule.shifts.third}</option>
                              </select>
                            </div>

                            {/* Equipment */}
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-black">
                                {t.productionModule.equipment}
                              </label>
                              <input
                                type="text"
                                value={cpEquipment}
                                onChange={(e) => setCpEquipment(e.target.value)}
                                placeholder="Линия/Машина"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* COUNTS FIELDS */}
                          <div className="space-y-3 pt-1">
                            {/* Produced */}
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50" style={{ backgroundColor: '#ffffff' }}>
                              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-black">
                                {language === 'ru' ? 'Произведено всего (шт)' : 'Jami ishlab chiqarildi (dona)'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={cpProduced}
                                onChange={(e) => setCpProduced(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-sm font-mono font-black text-indigo-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>

                            {/* Defective */}
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50" style={{ backgroundColor: '#ffffff' }}>
                              <label className="block text-[10px] text-rose-400 uppercase tracking-wider mb-1 font-black">
                                {language === 'ru' ? 'Брак всего (шт)' : 'Yaroqsiz (brak) (dona)'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={cpDefective}
                                onChange={(e) => setCpDefective(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-sm font-mono font-black text-rose-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          {/* Operator Comment */}
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black">
                              {t.productionModule.operatorComment}
                            </label>
                            <textarea
                              value={cpComment}
                              onChange={(e) => setCpComment(e.target.value)}
                              placeholder={language === 'ru' ? 'Запишите детали смены, остановок...' : 'Smena tafsilotlarini yozing...'}
                              rows={3}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSaveCheckpoint}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow cursor-pointer"
                          >
                            <Save className="w-4 h-4" />
                            {language === 'ru' ? 'Зафиксировать прогресс' : 'Chekpointni saqlash'}
                          </button>
                        </div>
                      ) : (
                        /* Readonly indicators when completed */
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                              <span className="text-[9px] text-slate-500 block uppercase font-bold">{language === 'ru' ? 'Произведено всего' : 'Ishlab chiqarildi'}</span>
                              <span className="text-sm font-black font-mono text-indigo-400 block mt-1">{selectedOrder.produced.toLocaleString()} шт</span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                              <span className="text-[9px] text-slate-500 block uppercase font-bold">{language === 'ru' ? 'Брак всего' : 'Yaroqsiz (brak)'}</span>
                              <span className="text-sm font-black font-mono text-rose-400 block mt-1">{selectedOrder.defective.toLocaleString()} шт</span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                              <span className="text-[9px] text-slate-500 block uppercase font-bold">{language === 'ru' ? 'Упаковано всего' : 'Qadoqlangan'}</span>
                              <span className="text-sm font-black font-mono text-emerald-400 block mt-1">{selectedOrder.packed.toLocaleString()} шт</span>
                            </div>
                          </div>
                          {selectedOrder.operatorComment && (
                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                              <span className="text-[9px] text-slate-500 block uppercase font-bold">{language === 'ru' ? 'Комментарий оператора' : 'Operator izohi'}</span>
                              <p className="text-xs text-slate-300 mt-1 italic">"{selectedOrder.operatorComment}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right/Secondary Column: Raw Material additions & Final actions */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {selectedOrder.status === 'InProduction' ? (
                        <>
                          {/* RAW MATERIAL CONSUMPTION */}
                          <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow space-y-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-700/50 pb-3 flex items-center gap-2">
                              <Layers className="w-4.5 h-4.5 text-indigo-400" />
                              {language === 'ru' ? 'Списание сырья за смену' : 'Xom-ashyoni hisobdan chiqarish'}
                            </h3>

                            <div className="bg-slate-900/60 border border-slate-700/50 p-3 rounded-2xl space-y-3.5" style={{ backgroundColor: '#ffffff' }}>
                              {/* Dropdowns */}
                              <div className="grid grid-cols-1 gap-2.5">
                                <div>
                                  <select
                                    value={selectedCpRawId}
                                    onChange={(e) => setSelectedCpRawId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-2.5 text-xs text-white focus:outline-none cursor-pointer"
                                  >
                                    <option value="">-- {language === 'ru' ? 'Выберите сырье' : 'Xom-ashyoni tanlang'} --</option>
                                    {availableRawMaterials
                                      .filter(item => !cpRawMaterials.some(used => used.id === item.id))
                                      .map(item => (
                                        <option key={item.id} value={item.id}>
                                          {item.name} ({item.quantity.toLocaleString()} {item.unit})
                                        </option>
                                      ))
                                    }
                                  </select>
                                </div>

                                <div className="flex gap-1.5">
                                  <input
                                    type="number"
                                    value={cpRawQty}
                                    onChange={(e) => setCpRawQty(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-2 text-xs font-mono font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddCpRawMaterial}
                                    className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center justify-center transition-all active:scale-95"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* List of checkpoint selected materials */}
                              {cpRawMaterials.length > 0 && (
                                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                  {cpRawMaterials.map(rm => (
                                    <div key={rm.id} className="flex items-center justify-between bg-slate-800 p-2 rounded-xl border border-slate-700">
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[11px] font-bold text-slate-300 block truncate">{rm.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold font-mono text-indigo-400">{rm.quantity.toLocaleString()} {rm.unit}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCpRawMaterial(rm.id)}
                                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Final Action / Complete Production */}
                          <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider">
                              <Sparkles className="w-4 h-4 text-indigo-400" />
                              {language === 'ru' ? 'Финальное действие' : 'Yakunlovchi amal'}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                              {language === 'ru' 
                                ? 'Если плановое количество по заявке полностью произведено, вы можете завершить производство и отправить товар на склад.' 
                                : 'Agar buyurtma to\'liq ishlab chiqarilgan bo\'lsa, jarayonni yakunlab mahsulotlarni omborga topshirishingiz mumkin.'}
                            </p>

                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={handleCompleteProduction}
                              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow cursor-pointer"
                            >
                              <CheckCircle className="w-4.5 h-4.5" />
                              {language === 'ru' ? 'Завершить производство' : 'Ishlab chiqarishni yakunlash'}
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Completed Order banner */
                        <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow text-center space-y-3.5">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                            <Check className="w-6 h-6 stroke-[3]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">
                              {language === 'ru' ? 'Производство завершено' : 'Ishlab chiqarish yakunlandi'}
                            </h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold mt-1">
                              {language === 'ru' 
                                ? 'Данная заявка успешно закрыта со статусом "Завершена". Редактирование заблокировано.' 
                                : 'Ushbu buyurtma muvaffaqiyatli yakunlangan. Tahrirlash yopiq.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Cumulative Materials Spent so far */}
                      {selectedOrder.usedRawMaterials && selectedOrder.usedRawMaterials.length > 0 && (
                        <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow space-y-3">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-700/50 pb-2.5">
                            {language === 'ru' ? 'Итого списано сырья по заказу' : 'Buyurtma bo\'yicha jami xom-ashyo'}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.usedRawMaterials.map(rm => (
                              <span key={rm.id} className="bg-slate-900 text-[11px] text-slate-300 font-bold px-3 py-1 rounded-xl border border-slate-700/60">
                                {rm.name}: <strong className="font-mono text-indigo-400 font-black">{rm.quantity.toLocaleString()} {rm.unit}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>

                </div>
              )}

            </div>
          ) : (
            /* Empty Prompt State */
            <div className="bg-slate-800 border border-dashed border-slate-700 rounded-3xl p-20 text-center text-slate-500 shadow-inner flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700">
                <Cylinder className="w-8 h-8 text-slate-600" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                  {language === 'ru' ? 'РАБОЧЕЕ МЕСТО ОПЕРАТОРА' : 'OPERATOR ISH JOYI'}
                </h3>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                  {language === 'ru' 
                    ? 'Пожалуйста, выберите нужную заявку из списка слева, чтобы запустить ее в производство или зафиксировать новый чекпоинт выработки.' 
                    : 'Ishlab chiqarishga tushirish yoki yangi chekpoint kiritish uchun chap tomondagi ro\'yxatdan tegishli buyurtmani tanlang.'}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-500 animate-bounce mt-4 hidden lg:block" />
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
