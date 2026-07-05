import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { formatDateTime } from '../utils/format';
import { ClipboardList, Plus, Edit3, Trash2, LogIn, LogOut, Database, Lock, Search } from 'lucide-react';
import { useState } from 'react';

const ACTION_LABELS: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: 'إضافة', icon: Plus, color: 'text-emerald-600 bg-emerald-50' },
  update: { label: 'تعديل', icon: Edit3, color: 'text-blue-600 bg-blue-50' },
  delete: { label: 'حذف', icon: Trash2, color: 'text-red-600 bg-red-50' },
  login: { label: 'تسجيل دخول', icon: LogIn, color: 'text-slate-600 bg-slate-100' },
  logout: { label: 'تسجيل خروج', icon: LogOut, color: 'text-slate-600 bg-slate-100' },
  close_cashbox: { label: 'إغلاق صندوق', icon: Lock, color: 'text-amber-600 bg-amber-50' },
  backup: { label: 'نسخ احتياطي', icon: Database, color: 'text-indigo-600 bg-indigo-50' },
  restore: { label: 'استعادة', icon: Database, color: 'text-purple-600 bg-purple-50' },
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const logs = useLiveQuery(() => db.auditLogs.toArray(), []);

  const filtered = (logs || [])
    .filter((l) => {
      const matchSearch = !search || l.details.includes(search) || l.userName.includes(search);
      const matchAction = !actionFilter || l.action === actionFilter;
      return matchSearch && matchAction;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">سجل العمليات</h1>
        <p className="text-slate-500 text-sm mt-1">سجل يوضح من أضاف أو عدّل أي عملية</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في السجل..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">جميع الإجراءات</option>
          {Object.entries(ACTION_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-medium">التاريخ والوقت</th>
                <th className="px-4 py-3 text-right font-medium">الإجراء</th>
                <th className="px-4 py-3 text-right font-medium">التفاصيل</th>
                <th className="px-4 py-3 text-right font-medium">المستخدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((l) => {
                const actionInfo = ACTION_LABELS[l.action] || { label: l.action, icon: ClipboardList, color: 'text-slate-600 bg-slate-100' };
                const Icon = actionInfo.icon;
                return (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${actionInfo.color}`}>
                        <Icon className="w-3 h-3" />
                        {actionInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{l.details}</td>
                    <td className="px-4 py-3 text-slate-600">{l.userName}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    لا يوجد سجل عمليات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
