/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Order } from '../types';
import { 
  Cylinder, Play, Pause, Save, CheckCircle, 
  Settings, AlertCircle, Info, Keyboard, Sparkles, Plus, Trash2, Layers
} from 'lucide-react';

export default function ProductionModule() {
  const { orders, products, refreshOrders, user, t, language, inventory, refreshInventory } = useApp();

  const [selectedOrderId, setSelectedOrderId] = useState('');
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  // Operational Fields
  const [produced, setProduced] = useState('');
  const [defective, setDefective] = useState('');
  const [packed, setPacked] = useState('');
  const [equipment, setEquipment] = useState('');
  const [shift, setShift] = useState('');
  const [productionStart, setProductionStart] = useState('');
  const [productionEnd, setProductionEnd] = useState('');
  const [operatorComment, setOperatorComment] = useState('');
  const [usedRawMaterials, setUsedRawMaterials] = useState<{ id: string; name: string; quantity: number; unit: string }[]>([]);
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState('');
  const [rawMaterialQty, setRawMaterialQty] = useState('');

  // UI state
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter orders that are New or InProduction (or Completed but editable by Operator)
  const activeOrders = orders.filter(o => o.status === 'New' || o.status === 'InProduction' || o.status === 'Completed');

  // Load latest inventory on mount
  useEffect(() => {
    refreshInventory();
  }, []);

  // Load selected order operational metrics
  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId);
      if (order) {
        setProduced(order.produced.toString());
        setDefective(order.defective.toString());
        setPacked(order.packed.toString());
        setEquipment(order.equipment || '');
        setShift(order.shift || 'day');
        setUsedRawMaterials(order.usedRawMaterials || []);
        
        // Default start/end dates in GMT+5
        const getGMT5DateString = (d: Date = new Date()) => {
          const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
          const gmt5 = new Date(utc + (3600000 * 5));
          return gmt5.toISOString().slice(0, 16).replace('T', ' ');
        };
        const nowStr = getGMT5DateString();
        setProductionStart(order.productionStart || nowStr);
        setProductionEnd(order.productionEnd || '');
        setOperatorComment(order.operatorComment || '');
      }
    } else {
      setProduced('');
      setDefective('');
      setPacked('');
      setEquipment('');
      setShift('');
      setProductionStart('');
      setProductionEnd('');
      setOperatorComment('');
      setUsedRawMaterials([]);
    }
    setStatusMsg('');
    setErrorMsg('');
  }, [selectedOrderId]);

  const handleSaveMetrics = async (isFinal: boolean) => {
    if (!selectedOrder) return;
    setIsSaving(true);
    setStatusMsg('');
    setErrorMsg('');

    const parsedProduced = parseInt(produced) || 0;
    const parsedDefective = parseInt(defective) || 0;
    const parsedPacked = parseInt(packed) || 0;

    if (parsedPacked > parsedProduced) {
      setErrorMsg(language === 'ru' 
        ? 'Количество упакованного не может превышать количество произведенного!' 
        : 'Qadoqlangan miqdor ishlab chiqarilgan miqdordan ko\'p bo\'lishi mumkin emas!');
      setIsSaving(false);
      return;
    }

    const updates: Partial<Order> = {
      produced: parsedProduced,
      defective: parsedDefective,
      packed: parsedPacked,
      equipment,
      shift,
      productionStart,
      productionEnd: isFinal ? (() => {
        const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
        const gmt5 = new Date(utc + (3600000 * 5));
        return gmt5.toISOString().slice(0, 16).replace('T', ' ');
      })() : productionEnd,
      operatorComment,
      status: isFinal ? 'Completed' : 'InProduction',
      usedRawMaterials
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
        setStatusMsg(t.productionModule.successSave);
        refreshOrders();
        refreshInventory();
        if (isFinal) {
          setSelectedOrderId(''); // reset selection if finished
        }
      } else {
        setErrorMsg(data.message || 'Ошибка обновления данных');
      }
    } catch (e) {
      setErrorMsg('Не удалось сохранить изменения');
    } finally {
      setIsSaving(false);
    }
  };

  const availableRawMaterials = inventory.filter(
    item => item.type === 'raw_material' && item.factory === selectedOrder?.factory
  );

  const handleAddRawMaterial = () => {
    if (!selectedRawMaterialId || !rawMaterialQty) return;
    const item = availableRawMaterials.find(i => i.id === selectedRawMaterialId);
    if (!item) return;

    const parsedQty = parseInt(rawMaterialQty) || 0;
    if (parsedQty <= 0) return;

    // Check if already exists, then add or merge
    setUsedRawMaterials(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + parsedQty } : i);
      } else {
        return [...prev, { id: item.id, name: item.name, quantity: parsedQty, unit: item.unit }];
      }
    });

    // Reset inputs
    setSelectedRawMaterialId('');
    setRawMaterialQty('');
  };

  const handleRemoveRawMaterial = (id: string) => {
    setUsedRawMaterials(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateRawMaterialQty = (id: string, qty: number) => {
    setUsedRawMaterials(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  // Live Pallet Count Calculations
  const unitsPerPallet = selectedOrder?.unitsPerPallet || 360;
  const currentPacked = parseInt(packed) || 0;
  const fullPallets = Math.floor(currentPacked / unitsPerPallet);
  const looseUnits = currentPacked % unitsPerPallet;

  const getProductLabel = () => {
    if (!selectedOrder) return '';
    const prod = products.find(p => p.sku === selectedOrder.productSku);
    return prod ? prod.name : selectedOrder.productSku;
  };

  // Left to produce formula
  const leftToProduce = selectedOrder ? Math.max(0, selectedOrder.quantityOrdered - (parseInt(produced) || 0)) : 0;

  return (
    <div className="space-y-6 font-sans select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">{t.productionModule.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{t.productionModule.subTitle}</p>
        </div>
      </div>

      {/* Select Order drop-down */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
          {t.productionModule.selectOrder}
        </label>
        <select
          value={selectedOrderId}
          onChange={(e) => setSelectedOrderId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-xs font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">-- {language === 'ru' ? 'Выберите заказ' : 'Buyurtmani tanlang'} --</option>
          {activeOrders.map((o) => {
            const prod = products.find(p => p.sku === o.productSku);
            return (
              <option key={o.id} value={o.id}>
                {o.orderNumber} &middot; {prod ? prod.name : o.productSku} [{t.factories[o.factory]} &middot; Заказано: {o.quantityOrdered}]
              </option>
            );
          })}
        </select>
      </div>

      {selectedOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Production Entry Fields */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow space-y-5">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-slate-700/50 pb-3 flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-indigo-400" />
              Параметры выработки &middot; <span className="font-mono text-indigo-400 font-bold">{selectedOrder.orderNumber}</span>
            </h3>

            {statusMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl flex items-center gap-2.5 text-xs">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl flex items-center gap-2.5 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Shift */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.productionModule.shift}
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none"
                >
                  <option value="day">{t.productionModule.shifts.day}</option>
                  <option value="night">{t.productionModule.shifts.night}</option>
                  <option value="third">{t.productionModule.shifts.third}</option>
                </select>
              </div>

              {/* Equipment */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.productionModule.equipment}
                </label>
                <input
                  type="text"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Timings row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.productionModule.timeStart}
                </label>
                <input
                  type="text"
                  value={productionStart}
                  onChange={(e) => setProductionStart(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-slate-300"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.productionModule.timeEnd}
                </label>
                <input
                  type="text"
                  value={productionEnd}
                  onChange={(e) => setProductionEnd(e.target.value)}
                  placeholder="ГГГГ-ММ-ДД ЧЧ:ММ"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-slate-300"
                />
              </div>
            </div>

            {/* NUMERICAL COUNTS (TOUCH-OPTIMIZED BIG FIELDS) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3">
              {/* Qty Produced */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700/40">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black">
                  {t.productionModule.prodQty}
                </label>
                <input
                  type="number"
                  value={produced}
                  onChange={(e) => setProduced(e.target.value)}
                  className="w-full text-center bg-slate-800 border border-slate-700 rounded-xl py-3 text-xl font-mono font-black text-indigo-400 focus:outline-none"
                />
              </div>

              {/* Qty Defective (Scrap) */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700/40">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black text-rose-400">
                  {t.productionModule.defectQty}
                </label>
                <input
                  type="number"
                  value={defective}
                  onChange={(e) => setDefective(e.target.value)}
                  className="w-full text-center bg-slate-800 border border-slate-700 rounded-xl py-3 text-xl font-mono font-black text-rose-400 focus:outline-none"
                />
              </div>

              {/* Qty Packed */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700/40">
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black text-emerald-400">
                  {t.productionModule.packQty}
                </label>
                <input
                  type="number"
                  value={packed}
                  onChange={(e) => setPacked(e.target.value)}
                  className="w-full text-center bg-slate-800 border border-slate-700 rounded-xl py-3 text-xl font-mono font-black text-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Used Raw Materials Section */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  {language === 'ru' ? 'Использованное сырье' : 'Ishlatilgan xom-ashyo'}
                </h4>
              </div>

              {/* Entry Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-[#e2e2e4] p-3.5 rounded-xl border border-slate-300">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-700 uppercase tracking-wider mb-1.5 font-bold">
                    {language === 'ru' ? 'Выберите сырье' : 'Xom-ashyoni tanlang'}
                  </label>
                  <select
                    value={selectedRawMaterialId}
                    onChange={(e) => setSelectedRawMaterialId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="">-- {language === 'ru' ? 'Выберите из списка' : "Ro'yxatdan tanlang"} --</option>
                    {availableRawMaterials
                      .filter(item => !usedRawMaterials.some(used => used.id === item.id))
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({(item.quantity || 0).toLocaleString()} {item.unit} {language === 'ru' ? 'доступно' : 'mavjud'})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-700 uppercase tracking-wider mb-1.5 font-bold">
                      {language === 'ru' ? 'Кол-во' : 'Miqdor'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rawMaterialQty}
                      onChange={(e) => setRawMaterialQty(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRawMaterial}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow self-end"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* List of Used Raw Materials */}
              {usedRawMaterials.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {usedRawMaterials.map((rm) => (
                    <div key={rm.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:border-slate-300 transition-all shadow-sm">
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="text-xs font-bold text-slate-800 block truncate">{rm.name}</span>
                        <span className="text-[10px] text-indigo-600 font-bold font-mono">
                          {language === 'ru' ? 'Складской остаток' : 'Ombor qoldig\'i'}:{' '}
                          {((inventory.find(i => i.id === rm.id)?.quantity || 0)).toLocaleString()} {rm.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white rounded-lg px-2 py-1 border border-slate-200 shadow-sm">
                          <input
                            type="number"
                            min="0"
                            value={rm.quantity}
                            onChange={(e) => handleUpdateRawMaterialQty(rm.id, parseInt(e.target.value) || 0)}
                            className="w-16 text-center bg-transparent border-none text-xs font-mono font-bold text-emerald-700 focus:outline-none p-0"
                          />
                          <span className="text-[10px] text-slate-500 font-bold ml-1">{rm.unit}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRawMaterial(rm.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all active:scale-90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-600 text-center py-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                  {language === 'ru' ? 'Сырье еще не добавлено под этот заказ' : "Ushbu buyurtmaga xom-ashyo hali qo'shilmagan"}
                </p>
              )}
            </div>

            {/* Operator Comments */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                {t.productionModule.operatorComment}
              </label>
              <textarea
                value={operatorComment}
                onChange={(e) => setOperatorComment(e.target.value)}
                placeholder="Запишите причины остановок, замен, заторов упаковщика..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Operator Save Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-700/50">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveMetrics(false)}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 focus:outline-none disabled:opacity-50"
              >
                <Save className="w-4.5 h-4.5 text-slate-400" />
                Сохранить черновик
              </button>
              
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveMetrics(true)}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 focus:outline-none shadow-lg shadow-indigo-600/10 disabled:opacity-50"
              >
                <CheckCircle className="w-4.5 h-4.5 text-indigo-200" />
                Завершить производство
              </button>
            </div>
          </div>

          {/* Quick Stats sidebar & Live Pallet Calculator */}
          <div className="space-y-6">
            {/* Live Pallet Calculator Card */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
              
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-2">
                  <Cylinder className="w-4 h-4 text-indigo-400" />
                  {t.ordersModule.palletDetails}
                </h4>
                
                <div className="text-center py-6 bg-slate-900 rounded-2xl border border-slate-700/30">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">{t.ordersModule.fullPallets}</span>
                  <span className="text-4xl font-black text-white font-mono mt-1 block">{fullPallets}</span>
                  <span className="text-[10px] text-slate-400 mt-2 block font-semibold">
                    {t.ordersModule.looseUnits}: <strong className="font-mono text-indigo-400">{looseUnits} / {unitsPerPallet}</strong>
                  </span>
                </div>

                <div className="space-y-3.5 mt-5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>{t.ordersModule.unitsPerPallet}:</span>
                    <span className="text-white font-mono">{unitsPerPallet} шт</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>Продукт:</span>
                    <span className="text-white font-mono text-right max-w-[150px] truncate">{getProductLabel()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target order guidelines card */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-5 shadow text-xs font-semibold text-slate-300 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Параметры задания
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-700/40 pb-2">
                  <span className="text-slate-500">Завод производства:</span>
                  <span className="text-white font-bold">{t.factories[selectedOrder.factory]}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 pb-2">
                  <span className="text-slate-500">Заказанное кол-во:</span>
                  <span className="text-white font-mono font-black">{selectedOrder.quantityOrdered.toLocaleString()} шт</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 pb-2">
                  <span className="text-rose-400 font-bold">{t.productionModule.leftToProduce}:</span>
                  <span className="text-rose-400 font-mono font-black">{leftToProduce.toLocaleString()} шт</span>
                </div>
                {selectedOrder.comment && (
                  <div className="p-3 bg-slate-900 border border-slate-700/30 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block mb-1">Комментарий менеджера:</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{selectedOrder.comment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Prompt state */
        <div className="bg-slate-800 border border-dashed border-slate-700 rounded-3xl p-16 text-center text-slate-500">
          <Info className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <p className="text-xs font-semibold">Пожалуйста, выберите активный заказ из списка выше для регистрации хода выработки</p>
        </div>
      )}
    </div>
  );
}
