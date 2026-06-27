/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Shield, Key, Loader, Layers, User as UserIcon } from 'lucide-react';

export default function LoginScreen() {
  const { login, language, setLanguage, t } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoggingIn(true);
    setError('');
    
    const success = await login(username, password);
    setIsLoggingIn(false);
    if (!success) {
      setError(t.password + ' 123 или имя пользователя не найдено');
    }
  };

  const handleQuickLogin = async (roleUsername: string) => {
    setIsLoggingIn(true);
    setError('');
    const success = await login(roleUsername, '123');
    setIsLoggingIn(false);
    if (!success) {
      setError('Ошибка быстрого входа');
    }
  };

  const presets = [
    { username: 'admin', label: t.roles.admin, desc: 'Полный доступ (Full Access)', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200' },
    { username: 'manager', label: t.roles.manager, desc: 'Создание заказов и отчеты', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200' },
    { username: 'production', label: t.roles.production, desc: 'Линейный ввод выработки', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' },
    { username: 'warehouse', label: t.roles.warehouse, desc: 'Отгрузки и сырьевой склад', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' },
    { username: 'supervisor', label: t.roles.supervisor, desc: 'Дашборды и аналитика', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

      <div className="absolute top-4 right-4 z-10">
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => setLanguage('ru')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              language === 'ru' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            RU
          </button>
          <button
            onClick={() => setLanguage('uz')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              language === 'uz' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            UZ
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Layers className="w-7 h-7" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight uppercase">POMS</span>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-white leading-tight">
          {t.loginTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {t.loginSubtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/60 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                {t.username}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
                  placeholder="admin, manager..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                {t.password}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 h-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-150 active:scale-95 shadow-indigo-600/20"
              >
                {isLoggingIn ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  t.loginBtn
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-slate-800 text-slate-400 font-medium">
                  {t.quickLogin}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {presets.map((preset) => (
                <button
                  key={preset.username}
                  type="button"
                  onClick={() => handleQuickLogin(preset.username)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all duration-150 hover:shadow-md ${preset.color}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white/60">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-none">{preset.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{preset.desc}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-white/80 px-1.5 py-0.5 rounded uppercase font-medium">
                    user: {preset.username}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Production Order Management System. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
