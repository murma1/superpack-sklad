/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from './AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { 
  ClipboardList, Settings, CheckCircle2, Factory, Truck, 
  Flame, TrendingUp, AlertTriangle, Layers
} from 'lucide-react';

export default function Dashboard() {
  const { orders, t, language } = useApp();

  // --- Metrics Calculations ---
  const totalOrdersCount = orders.length;
  const inProductionOrders = orders.filter(o => o.status === 'InProduction');
  const inProductionCount = inProductionOrders.length;
  const completedCount = orders.filter(o => o.status === 'Completed' || o.status === 'Shipped' || o.status === 'Closed').length;
  
  const totalProducedCount = orders.reduce((sum, o) => sum + o.produced, 0);
  const totalShippedCount = orders.reduce((sum, o) => sum + o.shipped, 0);

  // Today's Date String in GMT+5
  const todayStr = (() => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const gmt5 = new Date(utc + (3600000 * 5));
    return gmt5.toISOString().split('T')[0];
  })();
  
  const producedToday = orders.reduce((sum, o) => {
    // Check if start/end date matches today or if order completed today (approximate with start date)
    if (o.productionStart && o.productionStart.startsWith(todayStr)) {
      return sum + o.produced;
    }
    return sum;
  }, 0);

  const shippedToday = orders.reduce((sum, o) => {
    // If we have shipments, count them. Or count partial shipments from ship log that matches today
    return sum; // We will populate below from shipment history or use partials
  }, 0);

  // Overdue calculation: orders that are New or InProduction and are created > 3 days ago
  const overdueOrders = orders.filter(o => {
    if (o.status !== 'New' && o.status !== 'InProduction') return false;
    const createdDate = new Date(o.createdAt.split(' ')[0]);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 3; // consider overdue if more than 3 days
  });
  const overdueCount = overdueOrders.length;

  // --- Chart 1: Production and Shipments timelines by day ---
  // We'll aggregate from orders history or create data points from real orders
  const dailyDataMap: { [date: string]: { date: string, prod: number, ship: number } } = {};
  
  orders.forEach(o => {
    // Assign production dates
    const pDate = o.productionStart ? o.productionStart.split(' ')[0] : o.date;
    if (!dailyDataMap[pDate]) {
      dailyDataMap[pDate] = { date: pDate, prod: 0, ship: 0 };
    }
    dailyDataMap[pDate].prod += o.produced;
    dailyDataMap[pDate].ship += o.shipped;
  });

  const timelineData = Object.values(dailyDataMap)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7); // take last 7 days

  // --- Chart 2: Factory comparison (Keles vs Yunusobod) ---
  const kelesProd = orders.filter(o => o.factory === 'Keles').reduce((sum, o) => sum + o.produced, 0);
  const yunusProd = orders.filter(o => o.factory === 'Yunusobod').reduce((sum, o) => sum + o.produced, 0);

  const factoryData = [
    { name: language === 'ru' ? 'Келес' : 'Keles', value: kelesProd },
    { name: language === 'ru' ? 'Юнусобод' : 'Yunusobod', value: yunusProd }
  ];

  // --- Chart 3: Top 5 products ---
  const productMap: { [sku: string]: { name: string, qty: number } } = {};
  orders.forEach(o => {
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
  orders.forEach(o => {
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

  return (
    <div className="space-y-6 font-sans select-none">
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
          <div className="w-11 h-11 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-indigo-400">
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
          <div className="w-11 h-11 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-amber-400">
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
          <div className="w-11 h-11 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-emerald-400">
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
          <div className="w-11 h-11 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-sky-400">
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
          <div className="w-11 h-11 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-teal-400">
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
          <div className="w-11 h-11 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-indigo-400">
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
          <div className="w-11 h-11 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-teal-400">
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
          <div className={`w-11 h-11 rounded-xl bg-slate-900/60 border flex items-center justify-center ${overdueCount > 0 ? 'border-rose-500/30 text-rose-400' : 'border-slate-700 text-slate-400'}`}>
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
              <LineChart data={timelineData}>
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
