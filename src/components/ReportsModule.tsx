/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { 
  FileSpreadsheet, FileText, Calendar, Filter, BarChart, 
  Settings, TrendingUp, AlertTriangle, Layers, Award, Printer, Download 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import CalendarPicker from './CalendarPicker';

export default function ReportsModule() {
  const { orders, products, inventory, t, language } = useApp();

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [reportType, setReportType] = useState<'production' | 'defects' | 'factories' | 'products' | 'warehouse' | 'shipments' | 'equipment'>('production');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  // Filtering function by period
  const filterByPeriod = (dateStr: string) => {
    const recordDate = new Date(dateStr);
    const today = new Date();
    
    if (period === 'today') {
      return recordDate.toDateString() === today.toDateString();
    }
    
    if (period === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      return recordDate >= startOfWeek;
    }
    
    if (period === 'month') {
      return recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear();
    }
    
    if (period === 'custom') {
      let match = true;
      if (dateStart) match = match && recordDate >= new Date(dateStart);
      if (dateEnd) match = match && recordDate <= new Date(dateEnd);
      return match;
    }
    return true;
  };

  // 1. Production report data
  const productionReport = orders.filter(o => filterByPeriod(o.date));

  // 2. Defect report data
  const defectReport = orders.filter(o => filterByPeriod(o.date) && o.defective > 0);

  // 3. Factory report data
  const factoriesList = ['Keles', 'Yunusobod'];
  const factoryReport = factoriesList.map(f => {
    const factoryOrders = orders.filter(o => o.factory === f && filterByPeriod(o.date));
    const totalOrdered = factoryOrders.reduce((sum, o) => sum + o.quantityOrdered, 0);
    const totalProduced = factoryOrders.reduce((sum, o) => sum + o.produced, 0);
    const totalDefects = factoryOrders.reduce((sum, o) => sum + o.defective, 0);
    const totalPacked = factoryOrders.reduce((sum, o) => sum + o.packed, 0);
    const totalShipped = factoryOrders.reduce((sum, o) => sum + o.shipped, 0);
    const defectRate = totalProduced > 0 ? ((totalDefects / totalProduced) * 100).toFixed(2) : '0';

    return {
      factory: f,
      totalOrders: factoryOrders.length,
      totalOrdered,
      totalProduced,
      totalDefects,
      defectRate,
      totalPacked,
      totalShipped,
    };
  });

  // 4. Product report data
  const productReport = products.map(p => {
    const productOrders = orders.filter(o => o.productSku === p.sku && filterByPeriod(o.date));
    const totalOrdered = productOrders.reduce((sum, o) => sum + o.quantityOrdered, 0);
    const totalProduced = productOrders.reduce((sum, o) => sum + o.produced, 0);
    const totalDefects = productOrders.reduce((sum, o) => sum + o.defective, 0);
    const totalPacked = productOrders.reduce((sum, o) => sum + o.packed, 0);
    const totalShipped = productOrders.reduce((sum, o) => sum + o.shipped, 0);
    
    return {
      sku: p.sku,
      name: p.name,
      totalOrdered,
      totalProduced,
      totalDefects,
      totalPacked,
      totalShipped
    };
  }).filter(p => p.totalOrdered > 0 || p.totalProduced > 0);

  // 5. Warehouse report data
  const warehouseReport = inventory;

  // 6. Shipments report data: aggregate from backend deliveries
  const [shipmentsLog, setShipmentsLog] = useState<any[]>([]);
  React.useEffect(() => {
    fetch('/api/shipments')
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter((s: any) => filterByPeriod(s.date));
        setShipmentsLog(filtered);
      })
      .catch(err => console.error(err));
  }, [period, dateStart, dateEnd, orders]);

  // 7. Equipment performance data
  const equipMap: { [eq: string]: { name: string, totalProduced: number, totalDefects: number, ordersCount: number } } = {};
  orders.forEach(o => {
    if (o.equipment && filterByPeriod(o.date)) {
      if (!equipMap[o.equipment]) {
        equipMap[o.equipment] = { name: o.equipment, totalProduced: 0, totalDefects: 0, ordersCount: 0 };
      }
      equipMap[o.equipment].totalProduced += o.produced;
      equipMap[o.equipment].totalDefects += o.defective;
      equipMap[o.equipment].ordersCount += 1;
    }
  });
  const equipmentReport = Object.values(equipMap);

  // --- EXCEL EXPORTER (Using the real xlsx library) ---
  const handleExportToExcel = () => {
    // 1. Create workbook
    const wb = XLSX.utils.book_new();

    // 2. Statistics Sheet
    const statsData = [
      ['POMS - Production Order Management System (POMS)'],
      [`Период отчета (Period): ${period.toUpperCase()}`],
      [`Дата выгрузки (Export Date): ${new Date().toLocaleDateString()}`],
      [],
      ['ПОКАЗАТЕЛЬ (Metric)', 'ЗНАЧЕНИЕ (Value)'],
      ['Всего заказов (Total Orders)', orders.length],
      ['В производстве (In Production)', orders.filter(o => o.status === 'InProduction').length],
      ['Завершено (Completed)', orders.filter(o => o.status === 'Completed').length],
      ['Всего выработки (Total Production Qty)', orders.reduce((s, o) => s + o.produced, 0)],
      ['Всего брака (Total Defects Qty)', orders.reduce((s, o) => s + o.defective, 0)],
      ['Всего отгружено (Total Shipped Qty)', orders.reduce((s, o) => s + o.shipped, 0)],
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, 'Статистика (Stats)');

    // 3. Orders Sheet
    const ordersHeaders = ['Номер заказа', 'Дата', 'SKU Продукта', 'Завод', 'Заказано, шт', 'Произведено, шт', 'Брак, шт', 'Упаковано, шт', 'Отгружено, шт', 'Статус', 'Выполнение %'];
    const ordersRows = orders.map(o => {
      const percent = o.quantityOrdered > 0 ? Math.round((o.shipped / o.quantityOrdered) * 100) : 0;
      return [
        o.orderNumber,
        o.date,
        o.productSku,
        o.factory === 'Keles' ? 'Келес' : 'Юнусобод',
        o.quantityOrdered,
        o.produced,
        o.defective,
        o.packed,
        o.shipped,
        t.statuses[o.status] || o.status,
        `${percent}%`
      ];
    });
    const wsOrders = XLSX.utils.aoa_to_sheet([ordersHeaders, ...ordersRows]);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Заказы (Orders)');

    // 4. Warehouse Sheet
    const invHeaders = ['Наименование', 'Тип', 'Завод', 'Остаток', 'Ед. изм.'];
    const invRows = inventory.map(i => [
      i.name,
      i.type === 'raw_material' ? 'Сырье (Raw)' : 'Готовая продукция (FG)',
      i.factory === 'Keles' ? 'Келес' : 'Юнусобод',
      i.quantity,
      i.unit
    ]);
    const wsInv = XLSX.utils.aoa_to_sheet([invHeaders, ...invRows]);
    XLSX.utils.book_append_sheet(wb, wsInv, 'Склад (Warehouse)');

    // 5. Shipments Sheet
    const shipHeaders = ['Дата', 'ТТН Заказа', 'Продукт SKU', 'Накладная №', 'Машина', 'Получатель', 'Кол-во шт'];
    const shipRows = shipmentsLog.map(s => [
      s.date,
      s.orderNumber,
      s.productSku,
      s.waybillNumber,
      s.carNumber,
      s.recipient,
      s.quantity
    ]);
    const wsShip = XLSX.utils.aoa_to_sheet([shipHeaders, ...shipRows]);
    XLSX.utils.book_append_sheet(wb, wsShip, 'Отгрузки (Shipments)');

    // 6. Write and save
    XLSX.writeFile(wb, `POMS_Report_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans select-none print:bg-white print:text-black">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">{t.reportsModule.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Формирование управленческих и производственных отчетов, экспорт данных в красивый Excel-файл</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-colors text-xs font-bold text-white shadow shadow-emerald-600/10 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t.reportsModule.exportBtnExcel}
          </button>
          
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-xs font-bold text-white shadow active:scale-95"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            {t.reportsModule.exportBtnPdf}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Period filter selection */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black">{t.reportsModule.period}</label>
            <select
              value={period}
              onChange={(e: any) => setPeriod(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-white focus:outline-none"
            >
              <option value="today">{t.reportsModule.periods.today}</option>
              <option value="week">{t.reportsModule.periods.week}</option>
              <option value="month">{t.reportsModule.periods.month}</option>
              <option value="custom">{t.reportsModule.periods.custom}</option>
            </select>
          </div>

          {/* Report Type Selection */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black">Шаблон отчета (Report Template)</label>
            <select
              value={reportType}
              onChange={(e: any) => setReportType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-white focus:outline-none"
            >
              <option value="production">{t.reportsModule.types.production}</option>
              <option value="defects">{t.reportsModule.types.defects}</option>
              <option value="factories">{t.reportsModule.types.factories}</option>
              <option value="products">{t.reportsModule.types.products}</option>
              <option value="warehouse">{t.reportsModule.types.warehouse}</option>
              <option value="shipments">{t.reportsModule.types.shipments}</option>
              <option value="equipment">{t.reportsModule.types.equipment}</option>
            </select>
          </div>

          {/* Custom period inputs */}
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:col-span-1">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black">Дата начала</label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-black">Дата окончания</label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Interactive Calendar Toggle & Container */}
        {period === 'custom' && (
          <div className="border-t border-slate-700/50 pt-4 flex flex-col items-start gap-3">
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-indigo-400 hover:text-white hover:bg-slate-800 transition-all select-none focus:outline-none cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              {showCalendar 
                ? (language === 'ru' ? 'Скрыть интерактивный календарь' : 'Interaktiv kalendarni yashirish')
                : (language === 'ru' ? 'Открыть интерактивный календарь' : 'Interaktiv kalendarni ochish')
              }
            </button>

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
        )}
      </div>

      {/* PRINT BANNER LOGO */}
      <div className="hidden print:flex items-center justify-between border-b-4 border-slate-900 pb-5 mb-8 text-slate-900">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">POMS REPORT</h1>
          <p className="text-xs font-semibold text-slate-600 mt-1">Production Order Management System</p>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">EXPORT DATE: {new Date().toLocaleString()}</span>
        </div>
        <div className="text-right text-xs font-bold">
          <div>Период: {period.toUpperCase()}</div>
          <div>Отчет: {t.reportsModule.types[reportType].toUpperCase()}</div>
        </div>
      </div>

      {/* RENDERED TABULAR REPORT PREVIEW CONTAINER */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow overflow-hidden print:bg-white print:border-none print:shadow-none">
        {/* Report title on preview */}
        <div className="px-5 py-4 border-b border-slate-700 bg-slate-900 flex items-center justify-between print:bg-white print:border-slate-900 print:text-slate-950">
          <h3 className="text-xs font-black text-white uppercase tracking-wider print:text-slate-950">
            {t.reportsModule.types[reportType]} ({period.toUpperCase()})
          </h3>
          <span className="text-[10px] font-mono font-black uppercase bg-indigo-950/40 text-indigo-400 px-2.5 py-1 rounded-lg print:hidden">
            HTML Preview
          </span>
        </div>

        {/* --- 1. Production report preview --- */}
        {reportType === 'production' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] print:text-black">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase print:bg-slate-100 print:text-slate-900">
                  <th className="py-4 px-5">{t.ordersModule.tblNum}</th>
                  <th className="py-4 px-5">{t.ordersModule.tblDate}</th>
                  <th className="py-4 px-5">{t.ordersModule.tblProduct}</th>
                  <th className="py-4 px-5">{t.ordersModule.tblFactory}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblOrdered}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblProduced}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblPacked}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblShipped}</th>
                  <th className="py-4 px-5">{t.ordersModule.tblStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300 print:divide-slate-300 print:text-slate-900">
                {productionReport.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-slate-500">Записей по выработке за указанный период нет.</td></tr>
                ) : (
                  productionReport.map(o => (
                    <tr key={o.id} className="hover:bg-slate-700/10">
                      <td className="py-3.5 px-5 font-mono text-white font-bold print:text-black">{o.orderNumber}</td>
                      <td className="py-3.5 px-5">{o.date}</td>
                      <td className="py-3.5 px-5 font-bold">{products.find(p => p.sku === o.productSku)?.name || o.productSku}</td>
                      <td className="py-3.5 px-5">{t.factories[o.factory]}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-white font-black print:text-black">{o.quantityOrdered.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-indigo-300 print:text-black">{o.produced.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-emerald-400 print:text-black">{o.packed.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-teal-400 print:text-black">{o.shipped.toLocaleString()}</td>
                      <td className="py-3.5 px-5 font-bold">{t.statuses[o.status] || o.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- 2. Defects report preview --- */}
        {reportType === 'defects' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] print:text-black">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase print:bg-slate-100 print:text-slate-900">
                  <th className="py-4 px-5">{t.ordersModule.tblNum}</th>
                  <th className="py-4 px-5">{t.ordersModule.tblProduct}</th>
                  <th className="py-4 px-5">{t.ordersModule.tblFactory}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblProduced}</th>
                  <th className="py-4 px-5 text-right text-rose-400 print:text-rose-600">{t.ordersModule.tblDefective}</th>
                  <th className="py-4 px-5 text-right">% брака</th>
                  <th className="py-4 px-5">{t.productionModule.operatorComment}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300 print:divide-slate-300 print:text-slate-900">
                {defectReport.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500">Брак не зафиксирован в этом периоде.</td></tr>
                ) : (
                  defectReport.map(o => {
                    const rate = o.produced > 0 ? ((o.defective / o.produced) * 100).toFixed(2) : '0';
                    return (
                      <tr key={o.id} className="hover:bg-slate-700/10">
                        <td className="py-3.5 px-5 font-mono text-white font-bold print:text-black">{o.orderNumber}</td>
                        <td className="py-3.5 px-5 font-bold">{products.find(p => p.sku === o.productSku)?.name || o.productSku}</td>
                        <td className="py-3.5 px-5">{t.factories[o.factory]}</td>
                        <td className="py-3.5 px-5 text-right font-mono">{o.produced.toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right font-mono text-rose-400 font-black print:text-rose-600">{o.defective.toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-rose-400 print:text-rose-600">{rate}%</td>
                        <td className="py-3.5 px-5 text-slate-400 text-xs italic">{o.operatorComment || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- 3. Factory report preview --- */}
        {reportType === 'factories' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] print:text-black">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase print:bg-slate-100 print:text-slate-900">
                  <th className="py-4 px-5">{t.ordersModule.tblFactory}</th>
                  <th className="py-4 px-5 text-right">Заказов в работе</th>
                  <th className="py-4 px-5 text-right">Кол-во заказано (шт)</th>
                  <th className="py-4 px-5 text-right">Кол-во выработано (шт)</th>
                  <th className="py-4 px-5 text-right">Кол-во брака (шт)</th>
                  <th className="py-4 px-5 text-right">Коэффициент брака (%)</th>
                  <th className="py-4 px-5 text-right">Кол-во отгружено (шт)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300 print:divide-slate-300 print:text-slate-900">
                {factoryReport.map(r => (
                  <tr key={r.factory} className="hover:bg-slate-700/10">
                    <td className="py-4 px-5 text-white font-bold text-sm print:text-black">{t.factories[r.factory as keyof typeof t.factories]}</td>
                    <td className="py-4 px-5 text-right font-mono">{r.totalOrders}</td>
                    <td className="py-4 px-5 text-right font-mono font-black text-slate-200 print:text-black">{r.totalOrdered.toLocaleString()}</td>
                    <td className="py-4 px-5 text-right font-mono text-indigo-400 font-black print:text-black">{r.totalProduced.toLocaleString()}</td>
                    <td className="py-4 px-5 text-right font-mono text-rose-400">{r.totalDefects.toLocaleString()}</td>
                    <td className="py-4 px-5 text-right font-mono text-rose-400 font-bold">{r.defectRate}%</td>
                    <td className="py-4 px-5 text-right font-mono text-emerald-400 font-bold">{r.totalShipped.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- 4. Product report preview --- */}
        {reportType === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] print:text-black">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase print:bg-slate-100 print:text-slate-900">
                  <th className="py-4 px-5">{t.ordersModule.tblProduct}</th>
                  <th className="py-4 px-5">{t.productsModule.sku}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblOrdered}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblProduced}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblDefective}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblPacked}</th>
                  <th className="py-4 px-5 text-right">{t.ordersModule.tblShipped}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300 print:divide-slate-300 print:text-slate-900">
                {productReport.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500">Нет выработки по продуктам за указанный период.</td></tr>
                ) : (
                  productReport.map(r => (
                    <tr key={r.sku} className="hover:bg-slate-700/10">
                      <td className="py-3.5 px-5 text-white font-bold print:text-black">{r.name}</td>
                      <td className="py-3.5 px-5 font-mono text-indigo-400 font-bold">{r.sku}</td>
                      <td className="py-3.5 px-5 text-right font-mono">{r.totalOrdered.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right font-mono font-black text-indigo-300 print:text-black">{r.totalProduced.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-rose-400">{r.totalDefects.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-emerald-400">{r.totalPacked.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-teal-400 font-bold">{r.totalShipped.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- 5. Warehouse report preview --- */}
        {reportType === 'warehouse' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] print:text-black">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase print:bg-slate-100 print:text-slate-900">
                  <th className="py-4 px-5">{t.warehouseModule.name}</th>
                  <th className="py-4 px-5">Тип складских остатков</th>
                  <th className="py-4 px-5">{t.warehouseModule.factory}</th>
                  <th className="py-4 px-5 text-right">{t.warehouseModule.quantity}</th>
                  <th className="py-4 px-5 text-center">{t.warehouseModule.unit}</th>
                  <th className="py-4 px-5 text-right">{t.warehouseModule.minLimit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300 print:divide-slate-300 print:text-slate-900">
                {warehouseReport.map(item => (
                  <tr key={item.id} className="hover:bg-slate-700/10">
                    <td className="py-3.5 px-5 text-white font-bold print:text-black">{item.name}</td>
                    <td className="py-3.5 px-5 text-xs text-slate-400">
                      {item.type === 'raw_material' ? 'Сырьевой материал (Raw)' : 'Склад готовой продукции (FG)'}
                    </td>
                    <td className="py-3.5 px-5">{t.factories[item.factory]}</td>
                    <td className={`py-3.5 px-5 text-right font-mono font-black text-sm ${item.minThreshold && item.quantity < item.minThreshold ? 'text-rose-400 font-bold' : 'text-slate-200 print:text-black'}`}>
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-center text-slate-400 font-bold">{item.unit}</td>
                    <td className="py-3.5 px-5 text-right font-mono text-slate-500">{item.minThreshold ? item.minThreshold.toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- 6. Shipments report preview --- */}
        {reportType === 'shipments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] print:text-black">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase print:bg-slate-100 print:text-slate-900">
                  <th className="py-4 px-5">{t.ordersModule.tblDate}</th>
                  <th className="py-4 px-5">{t.ordersModule.tblNum}</th>
                  <th className="py-4 px-5">{t.shipmentsModule.tblWaybill}</th>
                  <th className="py-4 px-5">{t.shipmentsModule.tblCar}</th>
                  <th className="py-4 px-5">{t.shipmentsModule.tblRecipient}</th>
                  <th className="py-4 px-5 text-right">{t.shipmentsModule.tblQty}</th>
                  <th className="py-4 px-5">{t.shipmentsModule.tblUser}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300 print:divide-slate-300 print:text-slate-900">
                {shipmentsLog.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500">Отгрузки за данный период отсутствуют.</td></tr>
                ) : (
                  shipmentsLog.map(ship => (
                    <tr key={ship.id} className="hover:bg-slate-700/10">
                      <td className="py-3.5 px-5 font-mono">{ship.date}</td>
                      <td className="py-3.5 px-5 font-mono font-bold text-indigo-400 print:text-black">{ship.orderNumber}</td>
                      <td className="py-3.5 px-5 font-mono">{ship.waybillNumber}</td>
                      <td className="py-3.5 px-5 font-mono font-bold">{ship.carNumber}</td>
                      <td className="py-3.5 px-5 text-white font-bold print:text-black">{ship.recipient}</td>
                      <td className="py-3.5 px-5 text-right font-mono font-black text-emerald-400 print:text-black">{ship.quantity.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-slate-400">{ship.user}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- 7. Equipment efficiency preview --- */}
        {reportType === 'equipment' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] print:text-black">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-black tracking-wider text-slate-400 uppercase print:bg-slate-100 print:text-slate-900">
                  <th className="py-4 px-5">{t.productionModule.equipment}</th>
                  <th className="py-4 px-5 text-right">Заказов выполнено</th>
                  <th className="py-4 px-5 text-right">Всего выработано (шт)</th>
                  <th className="py-4 px-5 text-right text-rose-400 print:text-rose-600">Всего брака (шт)</th>
                  <th className="py-4 px-5 text-right">Коэффициент брака линии (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-semibold text-slate-300 print:divide-slate-300 print:text-slate-900">
                {equipmentReport.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500">Нет выработки оборудования в данном периоде.</td></tr>
                ) : (
                  equipmentReport.map(r => {
                    const rate = r.totalProduced > 0 ? ((r.totalDefects / r.totalProduced) * 100).toFixed(2) : '0';
                    return (
                      <tr key={r.name} className="hover:bg-slate-700/10">
                        <td className="py-4 px-5 text-white font-bold print:text-black">{r.name}</td>
                        <td className="py-4 px-5 text-right font-mono">{r.ordersCount}</td>
                        <td className="py-4 px-5 text-right font-mono font-black text-indigo-400 print:text-black">{r.totalProduced.toLocaleString()}</td>
                        <td className="py-4 px-5 text-right font-mono text-rose-400 font-semibold print:text-rose-600">{r.totalDefects.toLocaleString()}</td>
                        <td className="py-4 px-5 text-right font-mono text-rose-400 font-bold print:text-rose-600">{rate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
