import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useAuth } from '../context/AuthContext';
import { printDebtsReport } from '../utils/print';
import { CreditCard, Plus, Trash2, User, FileText } from 'lucide-react';

export default function DebtsOwedToUsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const debts = useLiveQuery(() => db.debtsOwedToUs.toArray(), []);

  const totalDebts = (debts || []).reduce((sum, d) => sum + d.amount, 0);

  const handleAdd = async () => {
    if (!name.trim() || !amount) return;

    await db.debtsOwedToUs.add({
      name: name.trim(),
      amount: parseFloat(amount),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdBy: user?.fullName || '',
      createdById: user?.id || 0,
    });

    setName('');
    setAmount('');
    setNotes('');
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
      await db.debtsOwedToUs.delete(id);
    }
  };

  const handlePrint = async () => {
    const headers = ['الاسم / Name', 'المبلغ / Amount', 'ملاحظات / Notes'];
    const rows = (debts || []).map((d) => [
      d.name,
      new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(d.amount),
      d.notes || '-',
    ]);

    await printDebtsReport(
      'حسابات في ذمتهم',
      'Accounts Receivable',
      headers,
      rows,
      totalDebts
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">حسابات في ذمتهم</h1>
          <p className="text-slate-500 text-sm mt-1">إدارة الديون المستحقة للشركة</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={(debts || []).length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-xl transition"
          >
            <FileText className="w-4 h-4" />
            طباعة
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            إضافة حساب
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <p className="text-blue-100 text-sm">إجمالي المبالغ في ذمتهم</p>
            <p className="text-3xl font-bold mt-1">
              {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalDebts)}
              <span className="text-lg mr-2">د.ع</span>
            </p>
          </div>
        </div>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">إضافة حساب جديد</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الاسم</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم الشخص أو الجهة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">المبلغ</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ملاحظات (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition"
              >
                إضافة
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setName('');
                  setAmount('');
                  setNotes('');
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2.5 rounded-xl transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {(debts || []).length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">لا توجد حسابات مسجلة</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(debts || []).map((debt) => (
              <div key={debt.id} className="p-4 hover:bg-slate-50/50 transition flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{debt.name}</p>
                    {debt.notes && <p className="text-sm text-slate-500 mt-0.5">{debt.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-bold text-slate-800">
                    {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(debt.amount)}
                    <span className="text-sm text-slate-500 mr-1">د.ع</span>
                  </p>
                  <button
                    onClick={() => debt.id && handleDelete(debt.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
