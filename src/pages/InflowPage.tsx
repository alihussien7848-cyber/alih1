import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Inflow, Currency, CURRENCIES, generateOperationNumber, logAction } from '../db/database';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, isSameDay } from '../utils/format';
import { printReceipt } from '../utils/print';
import { Plus, Search, Printer, Trash2, Edit3, X, ArrowDownCircle } from 'lucide-react';

export default function InflowPage() {
  const { user, can } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Inflow | null>(null);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const inflows = useLiveQuery(() => db.inflows.toArray(), []);

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    amount: '',
    currency: 'IQD' as Currency,
    exchangeRate: '1',
    commission: '',
    notes: '',
  });

  const filtered = (inflows || [])
    .filter((i) => {
      const matchSearch =
        !search ||
        i.customerName.includes(search) ||
        i.operationNumber.includes(search) ||
        (i.phone || '').includes(search);
      const matchDate = !filterDate || isSameDay(i.date, new Date(filterDate));
      return matchSearch && matchDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openAdd = () => {
    setEditing(null);
    setForm({
      customerName: '', phone: '', amount: '', currency: 'IQD',
      exchangeRate: '1', commission: '', notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (record: Inflow) => {
    setEditing(record);
    setForm({
      customerName: record.customerName,
      phone: record.phone || '',
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
      operationNumber: editing?.operationNumber || generateOperationNumber('IN'),
      date: new Date().toISOString(),
      customerName: form.customerName,
      phone: form.phone || undefined,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      exchangeRate: parseFloat(form.exchangeRate) || 1,
      commission: parseFloat(form.commission) || 0,
      notes: form.notes || undefined,
      createdBy: user.fullName,
      createdById: user.id!,
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Inflow;

    if (editing) {
      await db.inflows.update(editing.id!, data);
      await logAction('update', 'inflow', `تعديل عملية وارد: ${data.operationNumber}`, user.fullName, user.id!, editing.id);
    } else {
      const id = await db.inflows.add(data as Inflow);
      await logAction('create', 'inflow', `إضافة عملية وارد: ${data.operationNumber}`, user.fullName, user.id!, id);
    }

    setShowForm(false);
  };

  const handleDelete = async (record: Inflow) => {
    if (!user || !can('delete_inflow')) return;
    if (!confirm(`هل أنت متأكد من حذف العملية ${record.operationNumber}؟`)) return;
    await db.inflows.delete(record.id!);
    await logAction('delete', 'inflow', `حذف عملية وارد: ${record.operationNumber}`, user.fullName, user.id!, record.id);
  };

  const handlePrint = async (record: Inflow) => {
    await printReceipt('inflow', record);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الوارد</h1>
          <p className="text-slate-500 text-sm mt-1">إدارة عمليات القبض الواردة</p>
        </div>
        {can('add_inflow') && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            إضافة عملية واردة
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، رقم العملية، الهاتف..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-medium">رقم العملية</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">الزبون</th>
                <th className="px-4 py-3 text-right font-medium">الهاتف</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium">العملة</th>
                <th className="px-4 py-3 text-right font-medium">سعر الصرف</th>
                <th className="px-4 py-3 text-right font-medium">العمولة</th>
                <th className="px-4 py-3 text-right font-medium">المستخدم</th>
                <th className="px-4 py-3 text-center font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3 font-medium text-slate-800">{i.operationNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(i.date)}</td>
                  <td className="px-4 py-3 text-slate-800">{i.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{i.phone || '-'}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{formatNumber(i.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{i.currency}</td>
                  <td className="px-4 py-3 text-slate-600">{i.exchangeRate}</td>
                  <td className="px-4 py-3 text-amber-600">{formatNumber(i.commission)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{i.createdBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handlePrint(i)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="طباعة"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {can('edit_inflow') && (
                        <button
                          onClick={() => openEdit(i)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {can('delete_inflow') && (
                        <button
                          onClick={() => handleDelete(i)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <ArrowDownCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    لا توجد عمليات واردة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? 'تعديل عملية واردة' : 'إضافة عملية واردة'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم الزبون *</label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">العملة *</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">العمولة</label>
                  <input
                    type="number"
                    step="any"
                    value={form.commission}
                    onChange={(e) => setForm({ ...form, commission: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium py-3 rounded-xl transition"
                >
                  {editing ? 'حفظ التعديلات' : 'إضافة العملية'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
                >
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

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}
