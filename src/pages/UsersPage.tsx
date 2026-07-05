import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User, logAction } from '../db/database';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/format';
import { Plus, Edit3, Trash2, X, Shield, User as UserIcon } from 'lucide-react';

export default function UsersPage() {
  const { user, can } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'employee' as 'manager' | 'employee',
    active: true,
  });

  const users = useLiveQuery(() => db.users.toArray(), []);

  const openAdd = () => {
    setEditing(null);
    setForm({ username: '', password: '', fullName: '', role: 'employee', active: true });
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, password: u.password, fullName: u.fullName, role: u.role, active: u.active });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editing) {
      await db.users.update(editing.id!, {
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        active: form.active,
      });
      await logAction('update', 'user', `تعديل مستخدم: ${form.fullName}`, user.fullName, user.id!, editing.id);
    } else {
      const id = await db.users.add({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        active: form.active,
        createdAt: new Date().toISOString(),
      });
      await logAction('create', 'user', `إضافة مستخدم: ${form.fullName}`, user.fullName, user.id!, id);
    }
    setShowForm(false);
  };

  const handleDelete = async (u: User) => {
    if (!user || u.id === user.id) return;
    if (!confirm(`هل أنت متأكد من حذف المستخدم ${u.fullName}؟`)) return;
    await db.users.delete(u.id!);
    await logAction('delete', 'user', `حذف مستخدم: ${u.fullName}`, user.fullName, user.id!, u.id);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">المستخدمون</h1>
          <p className="text-slate-500 text-sm mt-1">إدارة المستخدمين والصلاحيات</p>
        </div>
        {can('manage_users') && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            إضافة مستخدم
          </button>
        )}
      </div>

      {/* Permissions info */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-blue-800">الصلاحيات</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium text-slate-800">المدير</span>
            </div>
            <p className="text-xs text-slate-500">صلاحيات كاملة: إضافة، تعديل، حذف، إغلاق الصندوق، إدارة المستخدمين، النسخ الاحتياطي، التقارير</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-slate-600" />
              </div>
              <span className="font-medium text-slate-800">الموظف</span>
            </div>
            <p className="text-xs text-slate-500">إضافة وتعديل العمليات، عرض التقارير والعمولات، كشف الحساب، الطباعة</p>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-medium">الاسم</th>
                <th className="px-4 py-3 text-right font-medium">اسم المستخدم</th>
                <th className="px-4 py-3 text-right font-medium">الدور</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-center font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(users || []).map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-sm text-slate-600">
                        {u.fullName.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${u.role === 'manager' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role === 'manager' ? 'مدير' : 'موظف'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${u.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {u.active ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {can('manage_users') && (
                        <>
                          <button onClick={() => openEdit(u)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="تعديل">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {u.id !== user?.id && (
                            <button onClick={() => handleDelete(u)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الاسم الكامل *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم المستخدم *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">كلمة المرور *</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الدور *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'manager' | 'employee' })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="employee">موظف</option>
                  <option value="manager">مدير</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <label htmlFor="active" className="text-sm text-slate-700">الحساب نشط</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition">
                  {editing ? 'حفظ' : 'إضافة'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
