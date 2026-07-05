import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Currency, CURRENCIES } from '../db/database';
import { useAuth } from '../context/AuthContext';
import { formatDate, isSameDay, isSameMonth, isSameYear, getMonthName } from '../utils/format';
import { printReport, exportToExcel } from '../utils/print';
import { FileText, FileSpreadsheet, Calendar, TrendingUp, Percent, Coins, BarChart3 } from 'lucide-react';

type ReportType = 'daily' | 'monthly' | 'yearly' | 'profit' | 'commissions' | 'currency';

export default function ReportsPage() {
  const { can } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState<Currency>('IQD');

  const inflows = useLiveQuery(() => db.inflows.toArray(), []);
  const outflows = useLiveQuery(() => db.outflows.toArray(), []);

  const refDate = new Date(date);

  const filterFn = (d: string) => {
    if (reportType === 'daily') return isSameDay(d, refDate);
    if (reportType === 'monthly') return isSameMonth(d, new Date(year, month));
    if (reportType === 'yearly') return isSameYear(d, new Date(year, 0));
    return true;
  };

  const filteredInflows = (inflows || []).filter((i) => filterFn(i.date));
  const filteredOutflows = (outflows || []).filter((o) => filterFn(o.date));

  const totalInflow = filteredInflows.reduce((s, i) => s + i.amount, 0);
  const totalOutflow = filteredOutflows.reduce((s, o) => s + o.amount, 0);
  const totalCommission =
    filteredInflows.reduce((s, i) => s + i.commission, 0) +
    filteredOutflows.reduce((s, o) => s + o.commission, 0);
  const profit = totalCommission;

  const reportTypes: { key: ReportType; label: string; icon: typeof FileText; managerOnly?: boolean }[] = [
    { key: 'daily', label: 'تقرير يومي', icon: Calendar },
    { key: 'monthly', label: 'تقرير شهري', icon: Calendar },
    { key: 'yearly', label: 'تقرير سنوي', icon: Calendar },
    { key: 'profit', label: 'تقرير الأرباح', icon: TrendingUp, managerOnly: true },
    { key: 'commissions', label: 'تقرير العمولات', icon: Percent },
    { key: 'currency', label: 'تقرير حركة كل عملة', icon: Coins },
  ];

  const visibleTypes = reportTypes.filter((t) => !t.managerOnly || can('view_profit_reports'));

  const getReportTitle = () => {
    switch (reportType) {
      case 'daily': return `تقرير يومي - ${formatDate(refDate)}`;
      case 'monthly': return `تقرير شهري - ${getMonthName(month)} ${year}`;
      case 'yearly': return `تقرير سنوي - ${year}`;
      case 'profit': return `تقرير الأرباح - ${year}`;
      case 'commissions': return `تقرير العمولات`;
      case 'currency': return `تقرير حركة عملة ${CURRENCIES.find((c) => c.code === currency)?.name}`;
    }
  };

  const getRows = () => {
    if (reportType === 'currency') {
      const currInflows = filteredInflows.filter((i) => i.currency === currency);
      const currOutflows = filteredOutflows.filter((o) => o.currency === currency);
      return [
        ...currInflows.map((i) => [formatDate(i.date), i.operationNumber, 'وارد', i.customerName, i.amount, i.exchangeRate, i.commission]),
        ...currOutflows.map((o) => [formatDate(o.date), o.operationNumber, 'صادر', o.recipientName, o.amount, o.exchangeRate, o.commission]),
      ];
    }
    return [
      ...filteredInflows.map((i) => [formatDate(i.date), i.operationNumber, 'وارد', i.customerName, i.amount, i.currency, i.commission]),
      ...filteredOutflows.map((o) => [formatDate(o.date), o.operationNumber, 'صادر', o.recipientName, o.amount, o.currency, o.commission]),
    ];
  };

  const getHeaders = () => {
    if (reportType === 'currency') return ['التاريخ', 'رقم العملية', 'النوع', 'الاسم', 'المبلغ', 'سعر الصرف', 'العمولة'];
    return ['التاريخ', 'رقم العملية', 'النوع', 'الاسم', 'المبلغ', 'العملة', 'العمولة'];
  };

  const getSummary = () => {
    if (reportType === 'profit') {
      return [
        { label: 'إجمالي الوارد', value: String(totalInflow) },
        { label: 'إجمالي الصادر', value: String(totalOutflow) },
        { label: 'إجمالي العمولات (الأرباح)', value: String(profit) },
      ];
    }
    return [
      { label: 'إجمالي الوارد', value: String(totalInflow) },
      { label: 'إجمالي الصادر', value: String(totalOutflow) },
      { label: 'إجمالي العمولات', value: String(totalCommission) },
    ];
  };

  const handlePrint = async () => {
    await printReport(getReportTitle(), getHeaders(), getRows(), getSummary());
  };

  const handleExportExcel = () => {
    exportToExcel(getReportTitle().replace(/\s+/g, '_'), [{
      name: 'التقرير',
      headers: getHeaders(),
      rows: getRows(),
    }]);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">التقارير</h1>
        <p className="text-slate-500 text-sm mt-1">إنشاء وطباعة التقارير</p>
      </div>

      {/* Report type selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {visibleTypes.map((t) => {
          const Icon = t.icon;
          const active = reportType === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setReportType(t.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium text-center">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-4 items-end">
          {(reportType === 'daily') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {(reportType === 'monthly' || reportType === 'profit') && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الشهر</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>{getMonthName(i)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">السنة</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
          {reportType === 'yearly' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">السنة</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {reportType === 'currency' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {(reportType === 'commissions') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition">
              <FileText className="w-4 h-4" /> طباعة PDF
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl transition">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-slate-500 text-sm mb-1">إجمالي الوارد</p>
          <p className="text-2xl font-bold text-emerald-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalInflow)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-slate-500 text-sm mb-1">إجمالي الصادر</p>
          <p className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalOutflow)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <Percent className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-slate-500 text-sm mb-1">{reportType === 'profit' ? 'الأرباح' : 'العمولات'}</p>
          <p className="text-2xl font-bold text-amber-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalCommission)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{getReportTitle()}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                {getHeaders().map((h, idx) => (
                  <th key={idx} className="px-4 py-3 text-right font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {getRows().map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition">
                  {row.map((cell, cidx) => (
                    <td key={cidx} className="px-4 py-3 text-slate-600">{String(cell)}</td>
                  ))}
                </tr>
              ))}
              {getRows().length === 0 && (
                <tr>
                  <td colSpan={getHeaders().length} className="px-4 py-12 text-center text-slate-400">
                    لا توجد بيانات في هذا التقرير
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
