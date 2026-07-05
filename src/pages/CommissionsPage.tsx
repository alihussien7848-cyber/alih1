import { useLiveQuery } from 'dexie-react-hooks';
import { db, CURRENCIES } from '../db/database';
import { formatDateTime, isSameDay, isSameMonth, getMonthName } from '../utils/format';
import { exportToExcel, printReport } from '../utils/print';
import { Percent, FileSpreadsheet, FileText, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function CommissionsPage() {
  const [period, setPeriod] = useState<'today' | 'month' | 'all'>('month');

  const inflows = useLiveQuery(() => db.inflows.toArray(), []);
  const outflows = useLiveQuery(() => db.outflows.toArray(), []);

  const now = new Date();

  const filterFn = (date: string) => {
    if (period === 'today') return isSameDay(date, now);
    if (period === 'month') return isSameMonth(date, now);
    return true;
  };

  const inflowCommissions = (inflows || []).filter((i) => filterFn(i.date));
  const outflowCommissions = (outflows || []).filter((o) => filterFn(o.date));

  const totalInflowCommission = inflowCommissions.reduce((s, i) => s + i.commission, 0);
  const totalOutflowCommission = outflowCommissions.reduce((s, o) => s + o.commission, 0);
  const totalCommission = totalInflowCommission + totalOutflowCommission;

  // By currency
  const byCurrency: Record<string, number> = {};
  CURRENCIES.forEach((c) => (byCurrency[c.code] = 0));
  [...inflowCommissions, ...outflowCommissions].forEach((r) => {
    byCurrency[r.currency] = (byCurrency[r.currency] || 0) + r.commission;
  });

  const allRecords = [
    ...inflowCommissions.map((i) => ({
      date: i.date, operationNumber: i.operationNumber, name: i.customerName,
      type: 'وارد', amount: i.amount, currency: i.currency, commission: i.commission,
    })),
    ...outflowCommissions.map((o) => ({
      date: o.date, operationNumber: o.operationNumber, name: o.recipientName,
      type: 'صادر', amount: o.amount, currency: o.currency, commission: o.commission,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExportExcel = () => {
    exportToExcel('تقرير_العمولات', [{
      name: 'العمولات',
      headers: ['التاريخ', 'رقم العملية', 'الاسم', 'النوع', 'المبلغ', 'العملة', 'العمولة'],
      rows: allRecords.map((r) => [
        formatDateTime(r.date), r.operationNumber, r.name, r.type,
        r.amount, r.currency, r.commission,
      ]),
    }]);
  };

  const handlePrintPDF = async () => {
    await printReport(
      `تقرير العمولات - ${period === 'today' ? 'اليوم' : period === 'month' ? getMonthName(now.getMonth()) : 'الكل'}`,
      ['التاريخ', 'رقم العملية', 'الاسم', 'النوع', 'المبلغ', 'العملة', 'العمولة'],
      allRecords.map((r) => [formatDateTime(r.date), r.operationNumber, r.name, r.type, r.amount, r.currency, r.commission]),
      [
        { label: 'إجمالي عمولات الوارد', value: String(totalInflowCommission) },
        { label: 'إجمالي عمولات الصادر', value: String(totalOutflowCommission) },
        { label: 'الإجمالي الكلي', value: String(totalCommission) },
      ]
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">العمولات</h1>
          <p className="text-slate-500 text-sm mt-1">تقرير العمولات المحصلة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl transition">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={handlePrintPDF} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {[
          { key: 'today' as const, label: 'اليوم' },
          { key: 'month' as const, label: 'هذا الشهر' },
          { key: 'all' as const, label: 'الكل' },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition ${
              period === p.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-slate-500 text-sm mb-1">عمولات الوارد</p>
          <p className="text-2xl font-bold text-emerald-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalInflowCommission)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <Percent className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-slate-500 text-sm mb-1">عمولات الصادر</p>
          <p className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalOutflowCommission)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <Percent className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-slate-500 text-sm mb-1">الإجمالي</p>
          <p className="text-2xl font-bold text-amber-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalCommission)}</p>
        </div>
      </div>

      {/* By currency */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-bold text-slate-800 mb-4">العمولات حسب العملة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CURRENCIES.map((c) => (
            <div key={c.code} className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">{c.name}</p>
              <p className="text-lg font-bold text-slate-800">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(byCurrency[c.code] || 0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">رقم العملية</th>
                <th className="px-4 py-3 text-right font-medium">الاسم</th>
                <th className="px-4 py-3 text-right font-medium">النوع</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium">العملة</th>
                <th className="px-4 py-3 text-right font-medium">العمولة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allRecords.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(r.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.operationNumber}</td>
                  <td className="px-4 py-3 text-slate-800">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${r.type === 'وارد' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(r.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.currency}</td>
                  <td className="px-4 py-3 font-bold text-amber-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(r.commission)}</td>
                </tr>
              ))}
              {allRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Percent className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    لا توجد عمولات في هذه الفترة
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
