/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { 
  ClipboardList, Settings, CheckCircle2, Factory, Truck, 
  Flame, TrendingUp, AlertTriangle, Layers, Calendar, Filter, Check
} from 'lucide-react';

export default function Dashboard() {
  const { orders, t, language } = useApp();
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // --- Date Range Filter Setup ---
  const todayStr = (() => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const gmt5 = new Date(utc + (3600000 * 5));
    return gmt5.toISOString().split('T')[0];
  })();

  const [inputStartDate, setInputStartDate] = useState<string>('');
  const [inputEndDate, setInputEndDate] = useState<string>('');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('all');

  const filterLabels = {
    ru: {
      filterTitle: 'Фильтр по периоду',
      all: 'Все время',
      today: 'Сегодня',
      last7: '7 дней',
      last30: '30 дней',
      thisMonth: 'Этот месяц',
      from: 'С',
      to: 'По',
      apply: 'Применить',
    },
    uz: {
      filterTitle: 'Davr bo\'yicha saralash',
      all: 'Barchasi',
      today: 'Bugun',
      last7: '7 kun',
      last30: '30 kun',
      thisMonth: 'Ushbu oy',
      from: 'Dan',
      to: 'Gacha',
      apply: 'Qo\'llash',
    }
  }[language];

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const gmt5 = new Date(utc + (3600000 * 5));
    const today = gmt5.toISOString().split('T')[0];

    let start = '';
    let end = '';

    if (preset === 'all') {
      start = '';
      end = '';
    } else if (preset === 'today') {
      start = today;
      end = today;
    } else if (preset === '7days') {
      const past = new Date(utc + (3600000 * 5) - (7 * 24 * 60 * 60 * 1000));
      start = past.toISOString().split('T')[0];
      end = today;
    } else if (preset === '30days') {
      const past = new Date(utc + (3600000 * 5) - (30 * 24 * 60 * 60 * 1000));
      start = past.toISOString().split('T')[0];
      end = today;
    } else if (preset === 'month') {
      const startOfMonth = today.substring(0, 8) + '01';
      start = startOfMonth;
      end = today;
    }

    setInputStartDate(start);
    setInputEndDate(end);
    setAppliedStartDate(start);
    setAppliedEndDate(end);
  };

  const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
    setActivePreset('custom');
    if (type === 'start') {
      setInputStartDate(val);
    } else {
      setInputEndDate(val);
    }
  };

  const handleApplyFilter = () => {
    setAppliedStartDate(inputStartDate);
    setAppliedEndDate(inputEndDate);
  };

  // --- Filtered Orders ---
  const filteredOrders = orders.filter(o => {
    if (appliedStartDate && o.date < appliedStartDate) return false;
    if (appliedEndDate && o.date > appliedEndDate) return false;
    return true;
  });

  // --- Metrics Calculations ---
  const totalOrdersCount = filteredOrders.length;
  const inProductionOrders = filteredOrders.filter(o => o.status === 'InProduction');
  const inProductionCount = inProductionOrders.length;
  const completedCount = filteredOrders.filter(o => o.status === 'Completed' || o.status === 'Shipped' || o.status === 'Closed').length;
  
  const totalProducedCount = filteredOrders.reduce((sum, o) => sum + o.produced, 0);
  const totalShippedCount = filteredOrders.reduce((sum, o) => sum + o.shipped, 0);
  
  const producedToday = filteredOrders.reduce((sum, o) => {
    // Check if start/end date matches today or if order completed today (approximate with start date)
    if (o.productionStart && o.productionStart.startsWith(todayStr)) {
      return sum + o.produced;
    }
    return sum;
  }, 0);

  const shippedToday = filteredOrders.reduce((sum, o) => {
    return sum; // We will populate below from shipment history or use partials
  }, 0);

  // Overdue calculation: orders that are New or InProduction and are created > 3 days ago
  const overdueOrders = filteredOrders.filter(o => {
    if (o.status !== 'New' && o.status !== 'InProduction') return false;
    const createdDate = new Date(o.createdAt.split(' ')[0]);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 3; // consider overdue if more than 3 days
  });
  const overdueCount = overdueOrders.length;

  // --- Chart 1: Production and Shipments timelines by day ---
  const dailyDataMap: { [date: string]: { date: string, prod: number, ship: number } } = {};
  
  filteredOrders.forEach(o => {
    const pDate = o.productionStart ? o.productionStart.split(' ')[0] : o.date;
    if (!dailyDataMap[pDate]) {
      dailyDataMap[pDate] = { date: pDate, prod: 0, ship: 0 };
    }
    dailyDataMap[pDate].prod += o.produced;
    dailyDataMap[pDate].ship += o.shipped;
  });

  const timelineData = Object.values(dailyDataMap)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Only slice last 7 if no custom filter range is active
  const displayTimelineData = (appliedStartDate || appliedEndDate) ? timelineData : timelineData.slice(-7);

  // --- Chart 2: Factory comparison (Keles vs Yunusobod) ---
  const kelesProd = filteredOrders.filter(o => o.factory === 'Keles').reduce((sum, o) => sum + o.produced, 0);
  const yunusProd = filteredOrders.filter(o => o.factory === 'Yunusobod').reduce((sum, o) => sum + o.produced, 0);

  const factoryData = [
    { name: language === 'ru' ? 'Келес' : 'Keles', value: kelesProd },
    { name: language === 'ru' ? 'Юнусобод' : 'Yunusobod', value: yunusProd }
  ];

  // --- Chart 3: Top 5 products ---
  const productMap: { [sku: string]: { name: string, qty: number } } = {};
  filteredOrders.forEach(o => {
    if (!productMap[o.productSku]) {
      productMap[o.productSku] = { name: o.productSku, qty: 0 };
    }
    productMap[o.productSku].qty += o.produced;
  });

  const topProductsData = Object.values(productMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map(p => ({
      name: p.name.replace('PRD-', ''), // shorten name
      value: p.qty
    }));

  // --- Chart 4: Equipment performance ---
  const equipMap: { [eq: string]: { name: string, prod: number, defects: number } } = {};
  filteredOrders.forEach(o => {
    if (o.equipment) {
      if (!equipMap[o.equipment]) {
        equipMap[o.equipment] = { name: o.equipment, prod: 0, defects: 0 };
      }
      equipMap[o.equipment].prod += o.produced;
      equipMap[o.equipment].defects += o.defective;
    }
  });

  const equipmentData = Object.values(equipMap);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  const headerLabels = {
    ru: {
      title: 'Аналитика и статистика',
      subtitle: 'Общие показатели производительности заводов',
      filterBtn: 'Период',
    },
    uz: {
      title: 'Tahlil va statistika',
      subtitle: 'Zavodlarning umumiy ish ko\'rsatkichlari',
      filterBtn: 'Davr',
    }
  }[language];

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Dashboard Header with Compact Filter Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {headerLabels.title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {headerLabels.subtitle}
          </p>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
              appliedStartDate || appliedEndDate
                ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/25'
                : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>{headerLabels.filterBtn}</span>
            <span className="h-4 w-px bg-slate-700/60 mx-1"></span>
            <span className="text-[10px] bg-slate-900/60 px-2 py-0.5 rounded-md font-extrabold text-slate-300">
              {appliedStartDate || appliedEndDate 
                ? (activePreset === 'custom' 
                    ? `${appliedStartDate || '...'} — ${appliedEndDate || '...'}`
                    : filterLabels[activePreset as keyof typeof filterLabels] || activePreset)
                : filterLabels.all
              }
            </span>
          </button>

          {showFilterDropdown && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setShowFilterDropdown(false)} 
              />
              
              {/* Dropdown Card */}
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700/80 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">{filterLabels.filterTitle}</h4>
                  
                  {/* Quick presets */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'all', label: filterLabels.all },
                      { id: 'today', label: filterLabels.today },
                      { id: '7days', label: filterLabels.last7 },
                      { id: '30days', label: filterLabels.last30 },
                      { id: 'month', label: filterLabels.thisMonth }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          applyPreset(p.id);
                          if (p.id !== 'custom') {
                            setShowFilterDropdown(false);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer ${
                          activePreset === p.id 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom fields */}
                  <div className="border-t border-slate-700/40 pt-3 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      {language === 'ru' ? 'Свой диапазон' : 'O\'z davri'}
                    </span>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-bold shrink-0 w-6">{filterLabels.from}:</span>
                        <input
                          type="date"
                          value={inputStartDate}
                          onChange={(e) => handleCustomDateChange('start', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-bold shrink-0 w-6">{filterLabels.to}:</span>
                        <input
                          type="date"
                          value={inputEndDate}
                          onChange={(e) => handleCustomDateChange('end', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          handleApplyFilter();
                          setShowFilterDropdown(false);
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          (inputStartDate !== appliedStartDate || inputEndDate !== appliedEndDate)
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                        disabled={inputStartDate === appliedStartDate && inputEndDate === appliedEndDate}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {filterLabels.apply}
                      </button>
                      {(appliedStartDate || appliedEndDate || inputStartDate || inputEndDate) && (
                        <button
                          onClick={() => {
                            applyPreset('all');
                            setShowFilterDropdown(false);
                          }}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {language === 'ru' ? 'Сбросить' : 'Tozalash'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Orders */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">
              {t.dbCards.totalOrders}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white mt-1 block leading-none">
              {totalOrdersCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#dcdef0] border border-slate-300 flex items-center justify-center text-indigo-700">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        {/* In Production */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">
              {t.dbCards.inProduction}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white mt-1 block leading-none">
              {inProductionCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#dcdef0] border border-slate-300 flex items-center justify-center text-amber-700">
            <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
        </div>

        {/* Completed */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">
              {t.dbCards.completed}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white mt-1 block leading-none">
              {completedCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#dcdef0] border border-slate-300 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Production Volume */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">
              {t.dbCards.totalProduction}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white mt-1 block leading-none truncate max-w-[150px]" title={totalProducedCount.toLocaleString()}>
              {totalProducedCount.toLocaleString()}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#dcdef0] border border-slate-300 flex items-center justify-center text-sky-700">
            <Factory className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Shipped */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">
              {t.dbCards.totalShipments}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white mt-1 block leading-none truncate max-w-[150px]" title={totalShippedCount.toLocaleString()}>
              {totalShippedCount.toLocaleString()}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#dcdef0] border border-slate-300 flex items-center justify-center text-teal-700">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Prod Today */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">
              {t.dbCards.prodToday}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white mt-1 block leading-none">
              {producedToday.toLocaleString()}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#dcdef0] border border-slate-300 flex items-center justify-center text-indigo-700">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Ship Today */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">
              {t.dbCards.shipToday}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white mt-1 block leading-none">
              {shippedToday.toLocaleString()}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#dcdef0] border border-slate-300 flex items-center justify-center text-teal-700">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">
              {t.dbCards.overdueOrders}
            </span>
            <span className={`text-2xl sm:text-3xl font-black mt-1 block leading-none ${overdueCount > 0 ? 'text-rose-400' : 'text-white'}`}>
              {overdueCount}
            </span>
          </div>
          <div className={`w-11 h-11 rounded-xl bg-[#dcdef0] border flex items-center justify-center ${overdueCount > 0 ? 'border-rose-500/30 text-rose-700' : 'border-slate-300 text-slate-700'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            {t.dbCharts.prodTimeline}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="prod" name={language === 'ru' ? 'Выработка' : 'Ishlab chiqarildi'} stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="ship" name={language === 'ru' ? 'Отгружено' : 'Jo\'natildi'} stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Factory comparison (Bar Chart) */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2">
            <Factory className="w-4 h-4 text-emerald-400" />
            {t.dbCharts.factoryEfficiency}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="value" name={t.dbCharts.quantity} fill="#10b981" radius={[10, 10, 0, 0]}>
                  {factoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Performance */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2">
            <Settings className="w-4 h-4 text-sky-400 animate-spin-slow" />
            {t.dbCharts.equipPerformance}
          </h3>
          <div className="h-72">
            {equipmentData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-medium">
                Нет производственных данных для оборудования
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equipmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => v.substring(0, 15)} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="prod" name={language === 'ru' ? 'Произведено (шт)' : 'Ishlab chiqarildi'} fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="defects" name={t.dbCharts.defects} fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            {t.dbCharts.topProducts}
          </h3>
          <div className="h-72 flex items-center justify-center">
            {topProductsData.length === 0 ? (
              <div className="text-slate-500 text-xs font-medium">Нет зафиксированных продуктов</div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 h-full min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topProductsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {topProductsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Labels legend */}
                <div className="w-full md:w-48 flex flex-col gap-2 shrink-0">
                  {topProductsData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs font-semibold">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <div className="text-slate-300 flex-1 truncate">{item.name}</div>
                      <div className="text-white font-mono">{item.value.toLocaleString()} шт</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
