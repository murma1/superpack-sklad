/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clipboard, HelpCircle } from 'lucide-react';
import { Order } from '../types';

interface CalendarPickerProps {
  dateStart: string;
  dateEnd: string;
  onSelectRange: (start: string, end: string) => void;
  orders: Order[];
  language: 'ru' | 'uz';
}

export default function CalendarPicker({
  dateStart,
  dateEnd,
  onSelectRange,
  orders,
  language
}: CalendarPickerProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(dateStart || today));
  const [hoveredDateStr, setHoveredDateStr] = useState<string | null>(null);
  const [selectedDayOrders, setSelectedDayOrders] = useState<{ date: string; list: Order[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Translations
  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const monthNamesUz = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];
  const monthNames = language === 'ru' ? monthNamesRu : monthNamesUz;

  const weekDaysRu = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weekDaysUz = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  const weekDays = language === 'ru' ? weekDaysRu : weekDaysUz;

  // Calendar math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1...
  // Adjust first day index so Monday is 0
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatDateString = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const handleDateClick = (dateStr: string) => {
    if (!dateStart || (dateStart && dateEnd)) {
      // First click: reset and set start date
      onSelectRange(dateStr, '');
    } else {
      // Second click: set end date if it's after start date, otherwise swap
      const start = new Date(dateStart);
      const clicked = new Date(dateStr);
      if (clicked >= start) {
        onSelectRange(dateStart, dateStr);
      } else {
        onSelectRange(dateStr, dateStart);
      }
    }

    // Display orders scheduled for this day
    const dayOrders = orders.filter(o => o.date === dateStr);
    if (dayOrders.length > 0) {
      setSelectedDayOrders({ date: dateStr, list: dayOrders });
    } else {
      setSelectedDayOrders(null);
    }
  };

  const isSelected = (dateStr: string) => {
    return dateStr === dateStart || dateStr === dateEnd;
  };

  const isInRange = (dateStr: string) => {
    if (!dateStart || !dateEnd) return false;
    const current = new Date(dateStr);
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    return current > start && current < end;
  };

  const isHoveredInRange = (dateStr: string) => {
    if (!dateStart || dateEnd || !hoveredDateStr) return false;
    const current = new Date(dateStr);
    const start = new Date(dateStart);
    const hovered = new Date(hoveredDateStr);
    if (hovered < start) return false;
    return current > start && current <= hovered;
  };

  // Generate calendar days
  const days = [];
  // Padding from previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = adjustedFirstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: formatDateString(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, prevMonthDays - i)
    });
  }

  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      dateStr: formatDateString(year, month, i)
    });
  }

  // Padding for next month to complete the grid (usually 42 cells)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      dateStr: formatDateString(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, i)
    });
  }

  // Check orders for a specific date
  const getOrdersForDate = (dateStr: string) => {
    return orders.filter(o => o.date === dateStr);
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 sm:p-5 shadow-xl select-none text-xs text-slate-300 font-semibold max-w-sm w-full">
      {/* Month Year Selector */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          {monthNames[month]} {year}
        </h4>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors focus:outline-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors focus:outline-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday columns */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-500 mb-2">
        {weekDays.map((d, idx) => (
          <div key={idx} className="text-[10px] uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((cell, idx) => {
          const cellOrders = getOrdersForDate(cell.dateStr);
          const hasOrders = cellOrders.length > 0;
          const selected = isSelected(cell.dateStr);
          const range = isInRange(cell.dateStr);
          const hoverRange = isHoveredInRange(cell.dateStr);
          
          let btnClass = 'text-slate-400 hover:text-white hover:bg-slate-800/80';
          if (cell.isCurrentMonth) {
            btnClass = 'text-slate-200 hover:bg-slate-800';
          }
          if (selected) {
            btnClass = 'bg-indigo-600 text-white font-bold rounded-lg shadow-md shadow-indigo-600/20';
          } else if (range) {
            btnClass = 'bg-indigo-600/20 text-indigo-300 rounded-lg';
          } else if (hoverRange) {
            btnClass = 'bg-indigo-600/10 text-indigo-400 rounded-lg';
          }

          const isToday = cell.dateStr === today.toISOString().split('T')[0];

          return (
            <div
              key={idx}
              className="relative group py-1"
              onMouseEnter={() => setHoveredDateStr(cell.dateStr)}
              onMouseLeave={() => setHoveredDateStr(null)}
            >
              <button
                type="button"
                onClick={() => handleDateClick(cell.dateStr)}
                className={`w-full aspect-square flex flex-col items-center justify-center relative text-xs font-semibold rounded-lg transition-all focus:outline-none ${btnClass} ${
                  isToday && !selected ? 'border border-indigo-500/50' : ''
                }`}
              >
                <span>{cell.day}</span>
                
                {/* Visual Order Dots */}
                {hasOrders && (
                  <div className="absolute bottom-1 flex gap-0.5 justify-center items-center">
                    {cellOrders.slice(0, 3).map((ord, oIdx) => (
                      <span
                        key={ord.id || oIdx}
                        className={`w-1 h-1 rounded-full ${
                          ord.factory === 'Keles' ? 'bg-indigo-400' : 'bg-emerald-400'
                        }`}
                        title={`${ord.orderNumber}: ${ord.productSku}`}
                      />
                    ))}
                    {cellOrders.length > 3 && (
                      <span className="w-0.5 h-0.5 bg-slate-300 rounded-full" />
                    )}
                  </div>
                )}
              </button>

              {/* Tooltip for Orders on Day Hover */}
              {hasOrders && hoveredDateStr === cell.dateStr && (
                <div className="absolute z-30 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-slate-950/95 border border-slate-700/80 text-white text-[10px] rounded-lg p-2.5 shadow-xl font-medium leading-normal animate-fade-in pointer-events-none">
                  <span className="font-bold text-slate-400 block border-b border-slate-800 pb-1 mb-1.5">
                    {language === 'ru' ? 'Заявки на день:' : 'Kunlik buyurtmalar:'}
                  </span>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {cellOrders.map(ord => (
                      <div key={ord.id} className="flex justify-between items-center gap-1 font-mono">
                        <span className="text-indigo-400 font-bold truncate max-w-[85px]">{ord.orderNumber}</span>
                        <span className="text-slate-500 text-[9px]">{ord.quantityOrdered.toLocaleString()} шт</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Helper Legend */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 font-bold">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>{language === 'ru' ? 'Завод Келес' : 'Keles zavodi'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{language === 'ru' ? 'Завод Юнусобод' : 'Yunusobod'}</span>
        </div>
      </div>

      {/* Display Clicked Day Schedule Details */}
      {selectedDayOrders && (
        <div className="mt-4 p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2 animate-fade-in text-[11px]">
          <div className="flex items-center gap-1.5 text-indigo-400 font-black uppercase tracking-wider text-[10px]">
            <Clipboard className="w-3.5 h-3.5" />
            <span>Планы на {selectedDayOrders.date}:</span>
          </div>
          <div className="space-y-2 divide-y divide-slate-800/50">
            {selectedDayOrders.list.map((ord, idx) => (
              <div key={ord.id} className={`pt-2 ${idx === 0 ? 'pt-0' : ''}`}>
                <div className="flex justify-between font-mono font-bold">
                  <span className="text-white">{ord.orderNumber}</span>
                  <span className="text-indigo-400">{ord.quantityOrdered.toLocaleString()} шт</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium text-[10px] mt-0.5">
                  <span>Завод: {language === 'ru' ? ord.factory === 'Keles' ? 'Келес' : 'Юнусобод' : ord.factory}</span>
                  <span>Статус: {ord.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
