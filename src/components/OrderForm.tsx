/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Order, Product } from '../types';
import { X, Calendar, Clipboard, HelpCircle, AlertTriangle } from 'lucide-react';

interface OrderFormProps {
  order: Order | null; // if editing, otherwise creating
  onClose: () => void;
}

export default function OrderForm({ order, onClose }: OrderFormProps) {
  const { products, user, t, language } = useApp();

  const [isAutoNum, setIsAutoNum] = useState(true);
  const [orderNum, setOrderNum] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const gmt5 = new Date(utc + (3600000 * 5));
    return gmt5.toISOString().split('T')[0];
  });
  const [productSku, setProductSku] = useState('');
  const [quantity, setQuantity] = useState('');
  const [factory, setFactory] = useState<'Keles'>('Keles');
  const [unitsPerPallet, setUnitsPerPallet] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auto generate order number on load if creating
  useEffect(() => {
    if (order) {
      setIsAutoNum(false);
      setOrderNum(order.orderNumber);
      setDate(order.date);
      setProductSku(order.productSku);
      setQuantity(order.quantityOrdered.toString());
      setFactory(order.factory);
      setUnitsPerPallet(order.unitsPerPallet.toString());
      setComment(order.comment || '');
    } else {
      // Create random order number
      const num = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      setOrderNum(num);
    }
  }, [order]);

  // Sync unitsPerPallet when productSku changes (if creating or not specified)
  useEffect(() => {
    if (!order && productSku) {
      const selectedProd = products.find(p => p.sku === productSku);
      if (selectedProd && selectedProd.unitsPerPallet > 0) {
        setUnitsPerPallet(selectedProd.unitsPerPallet.toString());
      } else {
        setUnitsPerPallet('360');
      }
    } else if (!order && !productSku) {
      setUnitsPerPallet('360');
    }
  }, [productSku, products, order]);

  // Handle auto order code change
  const handleAutoNumToggle = (val: boolean) => {
    setIsAutoNum(val);
    if (val) {
      const num = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      setOrderNum(num);
    } else {
      setOrderNum('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productSku || !quantity || !unitsPerPallet) {
      setError(t.orderForm.validationErr);
      return;
    }

    const payload = {
      orderNumber: orderNum,
      date,
      productSku,
      quantityOrdered: parseInt(quantity),
      factory,
      unitsPerPallet: parseInt(unitsPerPallet),
      comment,
      status: order ? order.status : 'New',
    };

    try {
      const url = order ? `/api/orders/${order.id}` : '/api/orders';
      const method = order ? 'PUT' : 'POST';
      const body = order 
        ? JSON.stringify({ user: user?.name || 'Manager', updates: payload })
        : JSON.stringify({ user: user?.name || 'Manager', order: payload });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });

      const data = await res.json();
      if (data.success) {
        onClose();
      } else {
        setError(data.message || 'Ошибка сохранения');
      }
    } catch (e) {
      setError('Не удалось подключиться к серверу');
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || 'Ошибка при удалении заказа');
      }
    } catch (e) {
      setError('Не удалось подключиться к serveru при удалении');
    }
  };

  // Only active products can be ordered
  const activeProducts = products.filter(p => !p.isArchived);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700/60 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Clipboard className="w-4.5 h-4.5 text-indigo-400" />
            {order ? t.orderForm.editTitle : t.orderForm.createTitle}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-semibold text-slate-300">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Automatic vs Manual Order Number Sequence */}
          {!order && (
            <div className="bg-slate-900 p-2 rounded-xl flex gap-1 border border-slate-700/30">
              <button
                type="button"
                onClick={() => handleAutoNumToggle(true)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${isAutoNum ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {t.orderForm.autoNumber}
              </button>
              <button
                type="button"
                onClick={() => handleAutoNumToggle(false)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${!isAutoNum ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {t.orderForm.manualNumber}
              </button>
            </div>
          )}

          {/* Order Number Field */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              {t.orderForm.orderNumberLabel} *
            </label>
            <input
              type="text"
              required
              disabled={isAutoNum || !!order}
              value={orderNum}
              onChange={(e) => setOrderNum(e.target.value)}
              placeholder="PO-2026-0001"
              className="w-full bg-slate-900 border border-slate-700 disabled:opacity-55 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Creation Date */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                {t.orderForm.dateLabel} *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Factory Assignment */}
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                {t.orderForm.factoryLabel} *
              </label>
              <select
                value={factory}
                onChange={(e: any) => setFactory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Keles">Келес (Keles)</option>
              </select>
            </div>
          </div>

          {/* Product Selector */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              {t.orderForm.productLabel} *
            </label>
            <select
              required
              disabled={!!order}
              value={productSku}
              onChange={(e) => setProductSku(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Выберите продукт --</option>
              {activeProducts.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Ordered */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              {t.orderForm.quantityLabel} *
            </label>
            <input
              type="number"
              required
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="3600"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Units Per Pallet */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              {t.orderForm.unitsPerPalletLabel} *
            </label>
            <input
              type="number"
              required
              min={1}
              value={unitsPerPallet}
              onChange={(e) => setUnitsPerPallet(e.target.value)}
              placeholder="360"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Comments / Details */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              {t.orderForm.commentLabel}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Введите комментарий или пожелания по упаковке..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-700/50">
            {order && showDeleteConfirm && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 flex flex-col gap-2 items-center text-center">
                <p className="text-[11px] text-rose-300 font-bold">
                  {language === 'ru' 
                    ? `Вы действительно хотите навсегда удалить этот заказ (${order.orderNumber})?` 
                    : `Haqiqatan ham ushbu buyurtmani (${order.orderNumber}) butunlay o'chirib tashlamoqchimisiz?`}
                </p>
                <div className="flex gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={handleDeleteOrder}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors text-xs active:scale-95 cursor-pointer"
                  >
                    {language === 'ru' ? 'Да, удалить' : 'Ha, o\'chirish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    {language === 'ru' ? 'Отмена' : 'Bekor qilish'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {order && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-3.5 px-4 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-bold rounded-xl border border-rose-500/20 hover:border-rose-500 transition-colors focus:outline-none active:scale-95 cursor-pointer"
                >
                  {language === 'ru' ? 'Удалить' : 'O\'chirish'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors focus:outline-none cursor-pointer"
              >
                {t.orderForm.btnCancel}
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow shadow-indigo-600/10 transition-colors focus:outline-none active:scale-95 cursor-pointer"
              >
                {order ? t.orderForm.btnSave : t.orderForm.btnSubmit}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
