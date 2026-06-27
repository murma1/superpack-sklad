/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Shipment, Order } from '../types';
import { 
  Truck, Plus, Search, Calendar, Clipboard, 
  User as UserIcon, HelpCircle, FileText, CheckCircle2, AlertTriangle, X 
} from 'lucide-react';

export default function ShipmentsModule() {
  const { orders, products, user, t, language, refreshOrders } = useApp();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [recipient, setRecipient] = useState('');
  const [waybillNumber, setWaybillNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch shipment history
  useEffect(() => {
    fetch('/api/shipments')
      .then(res => res.json())
      .then(data => {
        // Sort descending by date
        const sorted = data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setShipments(sorted);
      })
      .catch(err => console.error(err));
  }, [orders]);

  // Orders available for shipping (has packed items > shipped items)
  const shippableOrders = orders.filter(o => o.packed > o.shipped);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !carNumber || !recipient || !waybillNumber || !quantity) {
      setFormError(t.orderForm.validationErr);
      return;
    }

    const selectedOrder = orders.find(o => o.id === orderId);
    if (!selectedOrder) return;

    const parsedQty = parseInt(quantity) || 0;
    const remainingPacked = selectedOrder.packed - selectedOrder.shipped;

    if (parsedQty <= 0) {
      setFormError(language === 'ru' ? 'Количество должно быть больше нуля' : 'Miqdor noldan katta bo\'lishi kerak');
      return;
    }

    if (parsedQty > remainingPacked) {
      setFormError(language === 'ru' 
        ? `Нельзя отгрузить больше, чем упаковано! Доступно: ${remainingPacked} шт.` 
        : `Qadoqlangandan ko'p yuklash mumkin emas! Mavjud: ${remainingPacked} dona.`);
      return;
    }

    const payload = {
      orderId,
      orderNumber: selectedOrder.orderNumber,
      productSku: selectedOrder.productSku,
      date: new Date().toISOString().split('T')[0],
      carNumber,
      recipient,
      waybillNumber,
      quantity: parsedQty,
      comment
    };

    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.name || 'Warehouse Staff',
          shipment: payload
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        setOrderId('');
        setCarNumber('');
        setRecipient('');
        setWaybillNumber('');
        setQuantity('');
        setComment('');
        setFormError('');
        refreshOrders();
      } else {
        setFormError(data.message || 'Ошибка оформления');
      }
    } catch (e) {
      setFormError('Ошибка связи с сервером');
    }
  };

  const filteredShipments = shipments.filter(s => {
    const term = search.toLowerCase();
    const prod = products.find(p => p.sku === s.productSku);
    const prodName = prod ? prod.name.toLowerCase() : '';

    return s.orderNumber.toLowerCase().includes(term) ||
           s.carNumber.toLowerCase().includes(term) ||
           s.recipient.toLowerCase().includes(term) ||
           s.waybillNumber.toLowerCase().includes(term) ||
           prodName.includes(term);
  });

  return (
    <div className="space-y-6 font-sans select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">{t.shipmentsModule.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Контроль логистики, оформление товарно-транспортных накладных (ТТН) и частичные отгрузки</p>
        </div>

        {(user?.role === 'admin' || user?.role === 'warehouse') && (
          <button
            onClick={() => {
              setFormError('');
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-xs font-bold text-white shadow shadow-indigo-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {t.shipmentsModule.btnCreate}
          </button>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Поиск по ТТН, номеру машины, получателю или заказу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* TABLE */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                <th className="py-4 px-5">{t.ordersModule.tblDate}</th>
                <th className="py-4 px-5">{t.ordersModule.tblNum}</th>
                <th className="py-4 px-5">{t.ordersModule.tblProduct}</th>
                <th className="py-4 px-5">{t.shipmentsModule.tblWaybill}</th>
                <th className="py-4 px-5">{t.shipmentsModule.tblCar}</th>
                <th className="py-4 px-5">{t.shipmentsModule.tblRecipient}</th>
                <th className="py-4 px-5 text-right">{t.shipmentsModule.tblQty}</th>
                <th className="py-4 px-5">{t.warehouseModule.rawFormComment}</th>
                <th className="py-4 px-5">{t.shipmentsModule.tblUser}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    Отгрузки не зарегистрированы.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((ship) => {
                  const prod = products.find(p => p.sku === ship.productSku);
                  return (
                    <tr key={ship.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">{ship.date}</td>
                      <td className="py-3.5 px-5 font-mono font-bold text-indigo-400">{ship.orderNumber}</td>
                      <td className="py-3.5 px-5 text-white font-bold">{prod ? prod.name : ship.productSku}</td>
                      <td className="py-3.5 px-5 font-mono text-white">{ship.waybillNumber}</td>
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-200 bg-slate-900/40 border border-slate-700/30 rounded px-2 py-0.5 inline-block my-2">{ship.carNumber}</td>
                      <td className="py-3.5 px-5 text-slate-200 font-bold">{ship.recipient}</td>
                      <td className="py-3.5 px-5 text-right font-mono font-black text-emerald-400">{ship.quantity.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-slate-400 max-w-[150px] truncate" title={ship.comment}>{ship.comment || '-'}</td>
                      <td className="py-3.5 px-5 text-slate-400">{ship.user}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER SHIPMENT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                {t.shipmentsModule.formTitle}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs font-semibold text-slate-300">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="bg-slate-900/60 p-3 border border-slate-700/40 rounded-xl text-[10px] text-amber-400">
                {t.shipmentsModule.partialWarning}
              </div>

              {/* Order Selector */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.shipmentsModule.selectOrder} *
                </label>
                <select
                  required
                  value={orderId}
                  onChange={(e) => {
                    setOrderId(e.target.value);
                    const selected = orders.find(o => o.id === e.target.value);
                    if (selected) {
                      // Prepopulate default qty as remaining packed
                      setQuantity((selected.packed - selected.shipped).toString());
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Выберите заказ для отгрузки --</option>
                  {shippableOrders.map((o) => {
                    const prod = products.find(p => p.sku === o.productSku);
                    const avail = o.packed - o.shipped;
                    return (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} &middot; {prod ? prod.name : o.productSku} [Доступно: {avail} шт]
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.shipmentsModule.recipient} *
                </label>
                <input
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="ООО Самарканд Дистрибьюшн"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Waybill / TTN */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {t.shipmentsModule.waybill} *
                  </label>
                  <input
                    type="text"
                    required
                    value={waybillNumber}
                    onChange={(e) => setWaybillNumber(e.target.value)}
                    placeholder="TTN-2026-009"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Car Number */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {t.shipmentsModule.carNumber} *
                  </label>
                  <input
                    type="text"
                    required
                    value={carNumber}
                    onChange={(e) => setCarNumber(e.target.value)}
                    placeholder="01 A 777 AA"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.shipmentsModule.quantity} *
                </label>
                <input
                  type="number"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="3600"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                  {t.warehouseModule.rawFormComment}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Пломбы на контейнере, ФИО водителя, контакты..."
                  rows={2.5}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Action row */}
              <div className="flex gap-4 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors focus:outline-none"
                >
                  {t.orderForm.btnCancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition-colors focus:outline-none active:scale-95"
                >
                  Оформить отгрузку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
