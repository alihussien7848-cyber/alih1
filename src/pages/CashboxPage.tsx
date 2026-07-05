import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Cashbox, Currency, CURRENCIES, logAction } from '../db/database';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, isSameDay } from '../utils/format';
import { Wallet, Lock, Unlock, Plus, Calendar } from 'lucide-react';

export default function CashboxPage() {
  const { user, can } = useAuth();
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [openingBalances, setOpeningBalances] = useState<Record<Currency, number>>(
    {} as Record<Currency, number>
  );

  const cashboxes = useLiveQuery(() => db.cashboxes.toArray(), []);
  const inflows = useLiveQuery(() => db.inflows.toArray(), []);
  const outflows = useLiveQuery(() => db.outflows.toArray(), []);

  const today = new Date();
  const todayCashbox = (cashboxes || []).find((c) => isSameDay(c.date, today));
  const openCashboxes = (cashboxes || []).filter((c) => !c.closed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const currentCashbox = todayCashbox || openCashboxes[0];

  // Calculate current balances per currency
  const currentBalances: Record<string, number> = {};
  CURRENCIES.forEach((c) => (currentBalances[c.code] = 0));

  if (currentCashbox?.openingBalance) {
    Object.entries(currentCashbox.openingBalance).forEach(([curr, val]) => {
      currentBalances[curr] = (currentBalances[curr] || 0) + val;
    });
  }

  (inflows || []).forEach((i) => {
    currentBalances[i.currency] = (currentBalances[i.currency] || 0) + i.amount;
  });
  (outflows || []).forEach((o) => {
    currentBalances[o.currency] = (currentBalances[o.currency] || 0) - o.amount;
  });

  // Today movements
  const todayInflows = (inflows || []).filter((i) => isSameDay(i.date, today));
  const todayOutflows = (outflows || []).filter((o) => isSameDay(o.date, today));

  const handleOpenCashbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const balances: Record<Currency, number> = {} as Record<Currency, number>;
    CURRENCIES.forEach((c) => {
      balances[c.code] = openingBalances[c.code] || 0;
    });

    const cashbox: Omit<Cashbox, 'id'> = {
      date: new Date().toISOString(),
      openingBalance: balances,
      closed: false,
    };

    const id = await db.cashboxes.add(cashbox as Cashbox);
    await logAction('create', 'cashbox', `فتح صندوق جديد`, user.fullName, user.id!, id);
    setShowOpenForm(false);
    setOpeningBalances({} as Record<Currency, number>);
  };

  const handleCloseCashbox = async () => {
    if (!user || !can('close_cashbox') || !currentCashbox) return;
    if (!confirm('هل أنت متأكد من إغلاق الصندوق؟')) return;

    const closingBalance: Record<Currency, number> = {} as Record<Currency, number>;
    CURRENCIES.forEach((c) => {
      closingBalance[c.code] = currentBalances[c.code] || 0;
    });

    await db.cashboxes.update(currentCashbox.id!, {
      closingBalance,
      closed: true,
      closedBy: user.fullName,
      closedAt: new Date().toISOString(),
    });
    await logAction('close_cashbox', 'cashbox', `إغلاق صندوق اليوم`, user.fullName, user.id!, currentCashbox.id);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الصندوق</h1>
          <p className="text-slate-500 text-sm mt-1">إدارة الصندوق وأرصدته</p>
        </div>
        {!currentCashbox && can('manage_cashbox') && (
          <button
            onClick={() => setShowOpenForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            فتح صندوق جديد
          </button>
        )}
        {currentCashbox && !currentCashbox.closed && can('close_cashbox') && (
          <button
            onClick={handleCloseCashbox}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium px-5 py-2.5 rounded-xl transition shadow-lg shadow-red-500/20"
          >
            <Lock className="w-5 h-5" />
            إغلاق الصندوق
          </button>
        )}
      </div>

      {/* Current cashbox status */}
      {currentCashbox ? (
        <>
          <div className={`rounded-2xl p-5 shadow-sm border ${currentCashbox.closed ? 'bg-slate-100 border-slate-200' : 'bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentCashbox.closed ? 'bg-slate-300' : 'bg-blue-500'}`}>
                {currentCashbox.closed ? <Lock className="w-6 h-6 text-white" /> : <Unlock className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h2 className="font-bold text-slate-800">
                  {currentCashbox.closed ? 'الصندوق مغلق' : 'الصندوق مفتوح'}
                </h2>
                <p className="text-sm text-slate-500">
                  تاريخ الفتح: {formatDateTime(currentCashbox.date)}
                  {currentCashbox.closedBy && ` | أغلق بواسطة: ${currentCashbox.closedBy} في ${formatDateTime(currentCashbox.closedAt!)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Opening balance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">الرصيد الافتتاحي</h3>
              <div className="space-y-2">
                {CURRENCIES.map((c) => (
                  <div key={c.code} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">{c.name}</span>
                    <span className="font-bold text-slate-800">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(currentCashbox.openingBalance?.[c.code] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today movements */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">حركة اليوم</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                  <span className="text-sm text-emerald-700">الوارد</span>
                  <span className="font-bold text-emerald-600">{todayInflows.length} عملية</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                  <span className="text-sm text-red-700">الصادر</span>
                  <span className="font-bold text-red-600">{todayOutflows.length} عملية</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
                  <span className="text-sm text-amber-700">العمولات</span>
                  <span className="font-bold text-amber-600">
                    {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
                      todayInflows.reduce((s, i) => s + i.commission, 0) +
                      todayOutflows.reduce((s, o) => s + o.commission, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Current balance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">الرصيد الحالي</h3>
              <div className="space-y-2">
                {CURRENCIES.map((c) => (
                  <div key={c.code} className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-700">{c.name}</span>
                    <span className="font-bold text-blue-800">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(currentBalances[c.code] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 mb-2">لا يوجد صندوق مفتوح</p>
          <p className="text-slate-400 text-sm">افتح صندوقاً جديداً لبدء التسجيل</p>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">سجل الصناديق</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">أغلق بواسطة</th>
                <th className="px-4 py-3 text-right font-medium">تاريخ الإغلاق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(cashboxes || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(c.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${c.closed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {c.closed ? 'مغلق' : 'مفتوح'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.closedBy || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.closedAt ? formatDateTime(c.closedAt) : '-'}</td>
                </tr>
              ))}
              {(!cashboxes || cashboxes.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    لا يوجد سجل صناديق
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open cashbox form */}
      {showOpenForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">فتح صندوق جديد</h2>
              <p className="text-sm text-slate-500 mt-1">أدخل الأرصدة الافتتاحية لكل عملة</p>
            </div>
            <form onSubmit={handleOpenCashbox} className="p-6 space-y-4">
              {CURRENCIES.map((c) => (
                <div key={c.code}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{c.name}</label>
                  <input
                    type="number"
                    step="any"
                    value={openingBalances[c.code] || ''}
                    onChange={(e) => setOpeningBalances({ ...openingBalances, [c.code]: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition">
                  فتح الصندوق
                </button>
                <button type="button" onClick={() => setShowOpenForm(false)} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition">
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
