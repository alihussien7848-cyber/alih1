import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Outflow, Currency, CURRENCIES, generateOperationNumber, logAction } from '../db/database';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, isSameDay } from '../utils/format';
import { printReceipt } from '../utils/print';
import { Plus, Search, Printer, Trash2, Edit3, X, ArrowUpCircle } from 'lucide-react';

export default function OutflowPage() {
  const { user, can } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Outflow | null>(null);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const outflows = useLiveQuery(() => db.outflows.toArray(), []);

  const [form, setForm] = useState({
    recipientName: '',
    amount: '',
    currency: 'IQD' as Currency,
    exchangeRate: '1',
    commission: '',
    notes: '',
  });

  const filtered = (outflows || [])
    .filter((o) => {
      const matchSearch =
        !search ||
        o.recipientName.includes(search) ||
        o.operationNumber.includes(search);
      const matchDate = !filterDate || isSameDay(o.date, new Date(filterDate));
      return matchSearch && matchDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openAdd = () => {
    setEditing(null);
    setForm({ recipientName: '', amount: '', currency: 'IQD', exchangeRate: '1', commission: '', notes: '' });
    setShowForm(true);
  };

  const openEdit = (record: Outflow) => {
    setEditing(record);
    setForm({
      recipientName: record.recipientName,
      amount: String(record.amount),
      currency: record.currency,
      exchangeRate: String(record.exchangeRate),
      commission: String(record.commission),
      notes: record.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const data = {
      operationNumber: editing?.operationNumber || generateOperationNumber('OUT'),
      date: new Date().toISOString(),
      recipientName: form.recipientName,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      exchangeRate: parseFloat(form.exchangeRate) || 1,
      commission: parseFloat(form.commission) || 0,
      notes: form.notes || undefined,
      createdBy: user.fullName,
      createdById: user.id!,
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Outflow;

    if (editing) {
      await db.outflows.update(editing.id!, data);
      await logAction('update', 'outflow', `تعديل عملية صادرة: ${data.operationNumber}`, user.fullName, user.id!, editing.id);
    } else {
      const id = await db.outflows.add(data as Outflow);
      await logAction('create', 'outflow', `إضافة عملية صادرة: ${data.operationNumber}`, user.fullName, user.id!, id);
    }

    setShowForm(false);
  };

  const handleDelete = async (record: Outflow) => {
    if (!user || !can('delete_outflow')) return;
    if (!confirm(`هل أنت متأكد من حذف العملية ${record.operationNumber}؟`)) return;
    await db.outflows.delete(record.id!);
    await logAction('delete', 'outflow', `حذف عملية صادرة: ${record.operationNumber}`, user.fullName, user.id!, record.id);
  };

  const handlePrint = async (record: Outflow) => {
    await printReceipt('outflow', record);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الصادر</h1>
          <p className="text-slate-500 text-sm mt-1">إدارة عمليات الصرف</p>
        </div>
        {can('add_outflow') && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium px-5 py-2.5 rounded-xl transition shadow-lg shadow-red-500/20"
          >
            <Plus className="w-5 h-5" />
            إضافة عملية صادرة
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم العملية..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-medium">رقم العملية</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">المستلم</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium">العملة</th>
                <th className="px-4 py-3 text-right font-medium">سعر الصرف</th>
                <th className="px-4 py-3 text-right font-medium">العمولة</th>
                <th className="px-4 py-3 text-right font-medium">المستخدم</th>
                <th className="px-4 py-3 text-center font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3 font-medium text-slate-800">{o.operationNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(o.date)}</td>
                  <td className="px-4 py-3 text-slate-800">{o.recipientName}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(o.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{o.currency}</td>
                  <td className="px-4 py-3 text-slate-600">{o.exchangeRate}</td>
                  <td className="px-4 py-3 text-amber-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(o.commission)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{o.createdBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handlePrint(o)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="طباعة">
                        <Printer className="w-4 h-4" />
                      </button>
                      {can('edit_outflow') && (
                        <button onClick={() => openEdit(o)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="تعديل">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {can('delete_outflow') && (
                        <button onClick={() => handleDelete(o)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <ArrowUpCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    لا توجد عمليات صادرة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? 'تعديل عملية صادرة' : 'إضافة عملية صادرة'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم المستلم *</label>
                  <input
                    type="text"
                    value={form.recipientName}
                    onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">المبلغ *</label>
                  <input
                    type="number"
                    step="any"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">العملة *</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">سعر الصرف *</label>
                  <input
                    type="number"
                    step="any"
                    value={form.exchangeRate}
                    onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">العمولة</label>
                  <input
                    type="number"
                    step="any"
                    value={form.commission}
                    onChange={(e) => setForm({ ...form, commission: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium py-3 rounded-xl transition">
                  {editing ? 'حفظ التعديلات' : 'إضافة العملية'}
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
