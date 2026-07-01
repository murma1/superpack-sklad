/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { 
  Box, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Cylinder, 
  Layers, 
  Activity, 
  FileText, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Check, 
  AlertCircle,
  Archive,
  ArrowRight
} from 'lucide-react';
import { Order } from '../types';

export default function PackagingModule() {
  const { 
    orders, 
    products, 
    user, 
    language, 
    refreshOrders, 
    refreshInventory 
  } = useApp();

  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [packQty, setPackQty] = useState<string>('');
  const [defectQty, setDefectQty] = useState<string>('0');
  const [operatorComment, setOperatorComment] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Load latest inventory on mount
  useEffect(() => {
    refreshInventory();
  }, []);

  // Pre-populate/reset fields when an order is selected
  useEffect(() => {
    if (selectedOrder) {
      setPackQty('');
      setDefectQty('0');
      setOperatorComment('');
    }
    setStatusMsg('');
    setErrorMsg('');
  }, [selectedOrderId]);

  // Filter and Search the orders in packaging tab
  const packagingOrders = orders.filter(o => {
    // Only orders currently in 'Packaging' status
    const matchesStatus = o.status === 'Packaging';
    if (!matchesStatus) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const prod = products.find(p => p.sku === o.productSku);
      const prodName = prod ? prod.name.toLowerCase() : '';
      return o.orderNumber.toLowerCase().includes(q) || prodName.includes(q) || o.productSku.toLowerCase().includes(q);
    }
    return true;
  });

  const getProductLabel = (sku: string) => {
    const prod = products.find(p => p.sku === sku);
    return prod ? prod.name : sku;
  };

  // Live Pallet Calculation for the Selected Order
  const unitsPerPallet = selectedOrder?.unitsPerPallet || 360;
  const currentPacked = selectedOrder?.packed || 0;
  const fullPallets = Math.floor(currentPacked / unitsPerPallet);
  const looseUnits = currentPacked % unitsPerPallet;

  // Save packaging entry
  const handleSavePackaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setStatusMsg('');
    setErrorMsg('');

    const parsedPack = parseInt(packQty, 10);
    const parsedDefect = parseInt(defectQty, 10) || 0;

    if (isNaN(parsedPack) || parsedPack < 0) {
      setErrorMsg(language === 'ru' 
        ? 'Укажите корректное количество упакованной продукции' 
        : 'Qadoqlangan mahsulot miqdorini to\'g\'ri kiriting');
      return;
    }

    if (parsedDefect < 0) {
      setErrorMsg(language === 'ru' 
        ? 'Количество брака не может быть отрицательным' 
        : 'Brak mahsulot miqdori manfiy bo\'lishi mumkin emas');
      return;
    }

    if (parsedPack === 0 && parsedDefect === 0) {
      setErrorMsg(language === 'ru' 
        ? 'Укажите хотя бы одно значение больше нуля (упаковано или брак)' 
        : 'Kamida bitta noldan katta qiymat kiriting (qadoqlangan yoki brak)');
      return;
    }

    // Remaining unpacked to process
    const remainingToProcess = selectedOrder.produced - selectedOrder.packed;
    if (parsedPack + parsedDefect > remainingToProcess) {
      setErrorMsg(language === 'ru'
        ? `Сумма упакованного и брака (${parsedPack + parsedDefect}) превышает остаток не упакованной продукции (${remainingToProcess} шт)`
        : `Qadoqlangan va yaroqsiz miqdor yig'indisi (${parsedPack + parsedDefect}) qadoqlanmagan qoldiqdan (${remainingToProcess} dona) oshib ketdi`);
      return;
    }

    setIsSaving(true);

    const newPacked = selectedOrder.packed + parsedPack;
    const newDefective = selectedOrder.defective + parsedDefect;

    // Automatically transition to Completed if everything is fully packed
    // Wait, let's also allow them to manually complete, or automatically transition if packed + defects match produced.
    // Let's do automatic transition to Completed if everything is packed.
    const isFullyPacked = (newPacked + newDefective) >= selectedOrder.produced;

    const updates: Partial<Order> = {
      packed: newPacked,
      defective: newDefective,
      status: isFullyPacked ? 'Completed' : 'Packaging',
      comment: operatorComment 
        ? `${selectedOrder.comment || ''}\n[Упаковка]: ${operatorComment}`.trim()
        : selectedOrder.comment
    };

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.name || 'Packaging Operator',
          updates
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg(language === 'ru' 
          ? `Данные успешно сохранены! Упаковано +${parsedPack} шт., Брак +${parsedDefect} шт.`
          : `Ma'lumotlar muvaffaqiyatli saqlandi! Qadoqlandi +${parsedPack} dona, Brak +${parsedDefect} dona.`);
        
        setPackQty('');
        setDefectQty('0');
        setOperatorComment('');
        
        await refreshOrders();
        await refreshInventory();

        // If it was fully packed and became completed, reset selection so it leaves screen smoothly
        if (isFullyPacked) {
          setSelectedOrderId('');
          setStatusMsg(language === 'ru'
            ? 'Заявка полностью упакована и переведена в статус "Завершена"!'
            : 'Buyurtma to\'liq qadoqlandi va "Yakunlangan" statusiga o\'tkazildi!');
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

  // Force close/complete packaging manually
  const handleForceCompletePackaging = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    setStatusMsg('');
    setErrorMsg('');

    const remainingToProcess = selectedOrder.produced - selectedOrder.packed;
    
    // Any remaining items that weren't packed or marked as defect will be treated as packed to complete the order cleanly,
    // or we just transition status to Completed with current packed count.
    // Let's keep current packed count but change status to 'Completed'.
    const updates: Partial<Order> = {
      status: 'Completed',
    };

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.name || 'Packaging Operator',
          updates
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg(language === 'ru' 
          ? 'Упаковка завершена! Заявка переведена в архив готовой продукции.' 
          : 'Qadoqlash yakunlandi! Buyurtma tayyor mahsulotlar arxiviga o\'tkazildi.');
        setSelectedOrderId('');
        await refreshOrders();
        await refreshInventory();
      } else {
        setErrorMsg(data.message || 'Ошибка завершения упаковки');
      }
    } catch (e) {
      setErrorMsg('Не удалось завершить упаковку');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Module Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800/80 shadow-md">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-400" />
            {language === 'ru' ? 'Отделение Упаковки продукции' : 'Mahsulotlarni qadoqlash bo\'limi'}
          </h1>
          <p className="text-xs text-slate-400 font-bold leading-relaxed mt-1">
            {language === 'ru' 
              ? 'Упаковка произведенной продукции, фиксация брака и автоматическое зачисление на склад готовой продукции.' 
              : 'Ishlab chiqarilgan mahsulotlarni qadoqlash, brakni qayd etish va TM omboriga qabul qilish.'}
          </p>
        </div>
      </div>

      {/* Grid Layout: Left Order List, Right Form Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LIST OF ORDERS AWAITING PACKAGING */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              {language === 'ru' ? 'Заявки на упаковке' : 'Qadoqlashdagi buyurtmalar'}
              <span className="ml-auto bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full text-[10px] font-black">
                {packagingOrders.length}
              </span>
            </h3>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ru' ? 'Поиск заказа...' : 'Buyurtmani qidirish...'}
                className="w-full bg-slate-800 border border-slate-700/60 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* List Box */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {packagingOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <Package className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                <p className="text-xs font-bold">
                  {language === 'ru' ? 'Нет заявок на упаковку' : 'Qadoqlash uchun buyurtmalar yo\'q'}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  {language === 'ru' 
                    ? 'Заявки поступают сюда автоматически после завершения производства.' 
                    : 'Ishlab chiqarish yakunlangandan so\'ng buyurtmalar bu yerga keladi.'}
                </p>
              </div>
            ) : (
              packagingOrders.map(o => {
                const isSelected = o.id === selectedOrderId;
                const remaining = o.produced - o.packed;
                
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.99] flex flex-col gap-2 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-md' 
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black text-white font-mono">
                        № {o.orderNumber}
                      </span>
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full">
                        {language === 'ru' ? 'Осталось: ' : 'Qoldi: '} {remaining.toLocaleString()} шт
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">
                        {getProductLabel(o.productSku)}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>{language === 'ru' ? 'Завод: ' : 'Zavod: '} {language === 'ru' ? (o.factory === 'Keles' ? 'Келес' : 'Юнусобод') : o.factory}</span>
                        <span>{language === 'ru' ? 'Произведено: ' : 'Ishlab chiqarildi: '} {o.produced.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Simple progress bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                      <div 
                        className="bg-indigo-500 h-1.5 transition-all duration-300"
                        style={{ width: `${Math.min(100, (o.packed / o.produced) * 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED PACKAGING FORM */}
        <div className="lg:col-span-8 space-y-6">
          {selectedOrder ? (
            <div className="space-y-6">
              
              {/* Info Header Banner */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">
                      {language === 'ru' ? 'Текущая заявка на упаковке' : 'Qadoqlashdagi faol buyurtma'}
                    </span>
                    <h2 className="text-lg font-black text-white tracking-tight mt-0.5">
                      {language === 'ru' ? 'Заказ' : 'Buyurtma'} № {selectedOrder.orderNumber}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl">
                      {language === 'ru' ? 'Завод: ' : 'Zavod: '} <strong>{language === 'ru' ? (selectedOrder.factory === 'Keles' ? 'Келес' : 'Юнусобод') : selectedOrder.factory}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">{language === 'ru' ? 'Заказано' : 'Buyurtma berildi'}</span>
                    <span className="text-lg font-black text-white font-mono block mt-1">{selectedOrder.quantityOrdered.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase block tracking-wider">{language === 'ru' ? 'Произведено' : 'Ishlab chiqarildi'}</span>
                    <span className="text-lg font-black text-indigo-400 font-mono block mt-1">{selectedOrder.produced.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase block tracking-wider">{language === 'ru' ? 'Упаковано' : 'Qadoqlandi'}</span>
                    <span className="text-lg font-black text-emerald-400 font-mono block mt-1">{selectedOrder.packed.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[10px] text-rose-400 font-bold uppercase block tracking-wider">{language === 'ru' ? 'Общий Брак' : 'Jami brak'}</span>
                    <span className="text-lg font-black text-rose-400 font-mono block mt-1">{selectedOrder.defective.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{language === 'ru' ? 'Продукт в заказе' : 'Buyurtmadagi mahsulot'}</span>
                    <span className="text-sm font-black text-white mt-0.5 block">{getProductLabel(selectedOrder.productSku)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">{language === 'ru' ? 'Осталось упаковать' : 'Qadoqlanishi kerak'}</span>
                    <span className="text-md font-black text-amber-400 font-mono mt-0.5 block">
                      {(selectedOrder.produced - selectedOrder.packed).toLocaleString()} шт
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Input for Operator */}
              <form onSubmit={handleSavePackaging} className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {language === 'ru' ? 'Ввод упаковочных показателей' : 'Qadoqlash ko\'rsatkichlarini kiritish'}
                  </h3>
                </div>

                {/* Grid of Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Packed Quantity */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wide block">
                      {language === 'ru' ? 'Упаковано фактически (шт)' : 'Haqiqatda qadoqlandi (dona)'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={packQty}
                        onChange={(e) => setPackQty(e.target.value)}
                        placeholder="Например: 5000"
                        className="w-full bg-slate-800 border border-slate-700/60 rounded-xl py-3 px-4 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        required
                      />
                      <span className="absolute right-4 top-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">PCS</span>
                    </div>
                  </div>

                  {/* Defect Quantity */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-rose-400 uppercase tracking-wide block">
                      {language === 'ru' ? 'Выявлен брак при упаковке (шт)' : 'Qadoqlashda aniqlangan brak (dona)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={defectQty}
                        onChange={(e) => setDefectQty(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700/60 rounded-xl py-3 px-4 text-xs font-bold text-rose-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                      <span className="absolute right-4 top-3 text-[10px] font-black text-rose-500 uppercase tracking-widest">BRAK</span>
                    </div>
                  </div>

                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wide block">
                    {language === 'ru' ? 'Комментарий к упаковке' : 'Qadoqlash bo\'yicha izoh'}
                  </label>
                  <textarea
                    rows={2}
                    value={operatorComment}
                    onChange={(e) => setOperatorComment(e.target.value)}
                    placeholder={language === 'ru' ? 'Например: выявлен брак коробов, заменена лента...' : 'Masalan: qutilar yorilganligi aniqlandi...'}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-xl p-3 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Pallet label dynamic live view inside packaging form */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/20 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-black">
                      <Archive className="w-4 h-4" />
                      {language === 'ru' ? 'Предварительный расчет паллет' : 'Palletlarni oldindan hisoblash'}
                    </span>
                    <span className="font-mono text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                      {unitsPerPallet} {language === 'ru' ? 'шт/палет' : 'dona/pallet'}
                    </span>
                  </div>
                  
                  {/* Calculation cards */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 font-semibold block uppercase">{language === 'ru' ? 'Всего штук' : 'Jami dona'}</span>
                      <strong className="text-xs text-white font-mono block mt-0.5">{(currentPacked + (parseInt(packQty, 10) || 0)).toLocaleString()}</strong>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 font-semibold block uppercase">{language === 'ru' ? 'Целых паллет' : 'Butun pallet'}</span>
                      <strong className="text-xs text-emerald-400 font-mono block mt-0.5">
                        {Math.floor((currentPacked + (parseInt(packQty, 10) || 0)) / unitsPerPallet)}
                      </strong>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 font-semibold block uppercase">{language === 'ru' ? 'В остатке (короб)' : 'Qoldiq dona'}</span>
                      <strong className="text-xs text-amber-400 font-mono block mt-0.5">
                        {(currentPacked + (parseInt(packQty, 10) || 0)) % unitsPerPallet}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Toasts / State messages */}
                {statusMsg && (
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{statusMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-center gap-2 text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Save button */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {language === 'ru' ? 'Зафиксировать упаковку' : 'Qadoqlashni saqlash'}
                </button>
              </form>

              {/* Force Complete packaging panel */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider">
                  <Check className="w-4 h-4 text-emerald-400" />
                  {language === 'ru' ? 'Завершение упаковки заказа' : 'Buyurtmani qadoqlashni yakunlash'}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                  {language === 'ru' 
                    ? 'Если вы закончили упаковку по данному заказу (даже если фактическое количество отличается от планового), вы можете вручную перевести его в статус "Завершена", чтобы освободить линию.' 
                    : 'Agar ushbu buyurtma bo\'yicha qadoqlash jarayoni tugagan bo\'lsa, liniyani bo\'shatish uchun uni qo\'lda "Yakunlangan" statusiga o\'tkazishingiz mumkin.'}
                </p>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleForceCompletePackaging}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle className="w-4.5 h-4.5" />
                  {language === 'ru' ? 'Завершить упаковку по заказу' : 'Qadoqlashni yakunlash'}
                </button>
              </div>

            </div>
          ) : (
            /* Empty State Prompt */
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-20 text-center text-slate-500 shadow-inner flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-850">
                <Package className="w-8 h-8 text-indigo-500" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                  {language === 'ru' ? 'РАБОЧЕЕ МЕСТО УПАКОВЩИКА' : 'QADOQLOVCHI ISH JOYI'}
                </h3>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                  {language === 'ru' 
                    ? 'Пожалуйста, выберите нужную заявку из списка слева, чтобы начать упаковку продукции и зафиксировать показатели.' 
                    : 'Qadoqlashni boshlash va ko\'rsatkichlarni kiritish uchun chap tomondagi ro\'yxatdan tegishli buyurtmani tanlang.'}
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
