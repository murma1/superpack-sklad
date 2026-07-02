/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { User, UserRole } from '../types';
import { 
  Users, UserPlus, Edit2, Trash2, Shield, Languages, 
  Check, X, AlertCircle, RefreshCw, Key
} from 'lucide-react';

export default function EmployeesModule() {
  const { employees, refreshEmployees, t, language, user: currentUser } = useApp();
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'production' as UserRole,
    language: 'ru' as 'ru' | 'uz',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-line delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    refreshEmployees();
  }, []);

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      username: '',
      name: '',
      role: 'production',
      language: 'ru',
      password: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: User) => {
    setEditingEmployee(emp);
    setFormData({
      username: emp.username,
      name: emp.name,
      role: emp.role,
      language: emp.language || 'ru',
      password: emp.password || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username.trim() || !formData.name.trim()) {
      setFormError(t.employeesModule.errorFill);
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingEmployee ? `/api/users/${editingEmployee.id}` : '/api/users';
      const method = editingEmployee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        await refreshEmployees();
        setIsModalOpen(false);
      } else {
        setFormError(result.message || 'Ошибка сохранения данных / Xatolik yuz berdi');
      }
    } catch (err) {
      setFormError('Ошибка подключения к серверу / Server ulanish xatosi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setDeleteConfirmId(null);
        await refreshEmployees();
      } else {
        alert(result.message || 'Ошибка удаления');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to translate roles nicely
  const getRoleLabel = (role: UserRole) => {
    return t.roles[role] || role;
  };

  // Helper to get role badge style
  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'manager':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'production':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'warehouse':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'supervisor':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto" id="employees-module-root">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6" id="employees-header-section">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-500" />
            {t.employeesModule.title}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {language === 'ru' 
              ? 'Управление учетными записями персонала завода, распределение ролей и языков' 
              : 'Zavod xodimlarining hisoblarini boshqarish, rollar va tillarni taqsimlash'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow shadow-indigo-600/10 flex items-center gap-2 transition-all active:scale-95 cursor-pointer focus:outline-none"
          id="btn-add-employee"
        >
          <UserPlus className="w-4 h-4" />
          {t.employeesModule.btnCreate}
        </button>
      </div>

      {/* Main List Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg" id="employees-list-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-4 px-5">{t.employeesModule.name}</th>
                <th className="py-4 px-5">{t.employeesModule.username}</th>
                <th className="py-4 px-5">{t.employeesModule.role}</th>
                <th className="py-4 px-5">{t.employeesModule.language}</th>
                <th className="py-4 px-5 text-right">{t.employeesModule.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                    {language === 'ru' ? 'Список сотрудников пуст' : 'Xodimlar ro\'yxati bo\'sh'}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr 
                    key={emp.id} 
                    className="hover:bg-slate-800/30 transition-colors text-sm"
                  >
                    {/* FIO / Name */}
                    <td className="py-4 px-5 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div>{emp.name}</div>
                          {currentUser?.id === emp.id && (
                            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold ml-1">
                              {language === 'ru' ? 'Это вы' : 'Siz'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="py-4 px-5 font-mono text-xs text-slate-300">
                      <div>@{emp.username}</div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                        <Key className="w-3 h-3 text-slate-600" />
                        <span>{language === 'ru' ? 'Пароль' : 'Parol'}: {emp.password || '123'}</span>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeStyle(emp.role)}`}>
                        <Shield className="w-3 h-3" />
                        {getRoleLabel(emp.role)}
                      </span>
                    </td>

                    {/* Language */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Languages className="w-3.5 h-3.5 text-slate-500" />
                        {emp.language === 'uz' ? 'O\'zbekcha' : 'Русский'}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-4 px-5 text-right">
                      {deleteConfirmId === emp.id ? (
                        <div className="flex gap-1.5 justify-end items-center">
                          <span className="text-[11px] text-rose-400 font-bold hidden md:inline mr-1">
                            {t.employeesModule.deleteConfirm}
                          </span>
                          <button
                            disabled={isDeleting}
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                            title={language === 'ru' ? 'Да, удалить' : 'Ha, o\'chirish'}
                          >
                            ✓
                          </button>
                          <button
                            disabled={isDeleting}
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
                            title={language === 'ru' ? 'Отмена' : 'Bekor qilish'}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                            title={t.employeesModule.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {currentUser?.id !== emp.id && (
                            <button
                              onClick={() => setDeleteConfirmId(emp.id)}
                              className="p-1.5 rounded-lg bg-slate-950/40 hover:bg-rose-950/55 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/30 transition-colors cursor-pointer"
                              title={t.employeesModule.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                {editingEmployee ? t.employeesModule.formTitleEdit : t.employeesModule.formTitleCreate}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-4">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              {/* FIO / Full name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400">
                  {t.employeesModule.name} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder={t.employeesModule.namePlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400">
                  {t.employeesModule.username} *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  placeholder={t.employeesModule.usernamePlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5" id="employee-password-field-container">
                <label className="text-xs font-bold text-slate-400">
                  {language === 'ru' ? 'Пароль (опционально)' : 'Parol (ixtiyoriy)'}
                </label>
                <input
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  placeholder={language === 'ru' ? 'Введите пароль (по умолчанию 123)' : 'Parolni kiriting (standart 123)'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Role Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400">
                  {t.employeesModule.role} *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="admin">{t.roles.admin}</option>
                  <option value="manager">{t.roles.manager}</option>
                  <option value="production">{t.roles.production}</option>
                  <option value="warehouse">{t.roles.warehouse}</option>
                  <option value="supervisor">{t.roles.supervisor}</option>
                </select>
              </div>

              {/* Language Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400">
                  {t.employeesModule.language} *
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="ru">Русский</option>
                  <option value="uz">O'zbekcha</option>
                </select>
              </div>

              {/* Password notice box */}
              <div className="bg-slate-950 border border-slate-800/60 rounded-xl p-3 flex gap-2.5 items-start mt-1">
                <Key className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  {t.employeesModule.passwordHelp}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800/80 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-300 font-bold rounded-xl transition-all cursor-pointer focus:outline-none"
                >
                  {t.employeesModule.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow shadow-indigo-600/10 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer focus:outline-none disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t.employeesModule.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
