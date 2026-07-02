/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from './AppContext';
import { 
  Bell, LogOut, Globe, User as UserIcon, Check, 
  Trash2, AlertTriangle, CheckCircle, Info, Flame
} from 'lucide-react';

export default function Navbar() {
  const { 
    user, logout, language, setLanguage, t, 
    notifications, markAllNotificationsRead, clearNotifications,
    clearAllData
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'alert':
        return <Flame className="w-5 h-5 text-rose-500 shrink-0 animate-bounce" />;
      default:
        return <Info className="w-5 h-5 text-sky-500 shrink-0" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return t.roles.admin;
      case 'manager': return t.roles.manager;
      case 'production': return t.roles.production;
      case 'warehouse': return t.roles.warehouse;
      case 'supervisor': return t.roles.supervisor;
      default: return role;
    }
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center select-none shrink-0 bg-white rounded-xl shadow shadow-indigo-500/10">
              <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Globe Continents (Green) */}
                <path d="M18 42 C12 45, 14 55, 20 62 C26 70, 32 68, 35 60 C38 52, 30 45, 25 45 C20 45, 20 40, 22 35 C24 30, 32 32, 35 28 C38 24, 30 18, 25 22 C20 26, 24 38, 18 42 Z" fill="#10B981" />
                <path d="M50 18 C55 15, 62 14, 68 18 C74 22, 70 28, 75 32 C80 36, 85 32, 88 38 C91 44, 82 52, 80 58 C78 64, 82 72, 76 76 C70 80, 64 74, 58 78 C52 82, 48 76, 52 70 C56 64, 62 66, 60 58 C58 50, 48 52, 46 44 C44 36, 45 21, 50 18 Z" fill="#10B981" />
                <path d="M35 70 C30 72, 28 78, 32 82 C36 86, 42 84, 40 76 C38 68, 38 68, 35 70 Z" fill="#10B981" />

                {/* Tree Trunk, Roots and Branches (Dark Navy) */}
                {/* Roots */}
                <path d="M50 82 L50 96 M50 90 C45 92, 40 94, 35 97 M50 90 C55 92, 60 94, 65 97 M48 85 C42 88, 38 92, 32 94 M52 85 C58 88, 62 92, 68 94" stroke="#002060" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Trunk */}
                <path d="M50 62 L50 82" stroke="#002060" strokeWidth="6" strokeLinecap="round" />
                
                {/* Main Branches */}
                <path d="M50 62 C45 55, 38 52, 32 48" stroke="#002060" strokeWidth="4" strokeLinecap="round" />
                <path d="M50 62 C55 55, 62 52, 68 48" stroke="#002060" strokeWidth="4" strokeLinecap="round" />
                <path d="M50 54 C50 45, 48 38, 44 32" stroke="#002060" strokeWidth="3" strokeLinecap="round" />
                <path d="M50 54 C50 45, 52 38, 56 32" stroke="#002060" strokeWidth="3" strokeLinecap="round" />

                {/* Sub branches and finer details */}
                <path d="M38 51 C34 46, 28 44, 22 42" stroke="#002060" strokeWidth="2" strokeLinecap="round" />
                <path d="M62 51 C66 46, 72 44, 78 42" stroke="#002060" strokeWidth="2" strokeLinecap="round" />
                <path d="M47 40 C44 35, 42 30, 38 28" stroke="#002060" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M53 40 C56 35, 58 30, 62 28" stroke="#002060" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M32 48 C28 48, 24 50, 20 52" stroke="#002060" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M68 48 C72 48, 76 50, 80 52" stroke="#002060" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="font-black text-base tracking-wider leading-none">Super Pack</div>
              <div className="text-[9px] font-medium text-indigo-400 leading-none mt-0.5 tracking-wider uppercase hidden sm:block">
                {t.appFullName}
              </div>
            </div>
          </div>

          {/* Right menu options */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 focus:outline-none"
              >
                <Globe className="w-5 h-5" />
                <span className="text-xs font-bold uppercase hidden md:inline">
                  {language}
                </span>
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-slate-800 border border-slate-700 shadow-xl py-1 z-50">
                  <button
                    onClick={() => {
                      setLanguage('ru');
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between hover:bg-slate-700/60 transition-colors ${language === 'ru' ? 'text-indigo-400 bg-slate-700/30' : 'text-slate-300'}`}
                  >
                    <span>{t.langRu}</span>
                    {language === 'ru' && <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setLanguage('uz');
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between hover:bg-slate-700/60 transition-colors ${language === 'uz' ? 'text-indigo-400 bg-slate-700/30' : 'text-slate-300'}`}
                  >
                    <span>{t.langUz}</span>
                    {language === 'uz' && <Check className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            {/* Notifications Panel */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-black flex items-center justify-center text-white ring-2 ring-slate-900 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-850 border border-slate-700/80 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px]">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                      {t.notifications} ({notifications.length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          markAllNotificationsRead();
                        }}
                        title={t.markAllRead}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          clearNotifications();
                        }}
                        title={t.clearAll}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body List */}
                  <div className="overflow-y-auto divide-y divide-slate-800/60 bg-slate-900 max-h-80">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        {t.noNotifications}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-3.5 flex gap-3 transition-colors ${!n.read ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'hover:bg-slate-800/40'}`}
                        >
                          {getNotifIcon(n.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-300 leading-snug">
                              {language === 'ru' ? n.messageRu : n.messageUz}
                            </p>
                            <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &middot; {new Date(n.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 self-center shrink-0"></span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info & Logout */}
            {user && (
              <div className="flex items-center gap-3 border-l border-slate-800 pl-3 sm:pl-4">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-white max-w-[150px] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mt-0.5">
                    {getRoleLabel(user.role)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 lg:shadow-inner shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors focus:outline-none shrink-0"
                  title={t.logout}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
