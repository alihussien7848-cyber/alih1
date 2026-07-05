import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { formatDateTime } from '../utils/format';
import { printCustomerStatement, exportToExcel } from '../utils/print';
import { Search, FileText, FileSpreadsheet, User } from 'lucide-react';

export default function CustomerStatementPage() {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const inflows = useLiveQuery(() => db.inflows.toArray(), []);
  const outflows = useLiveQuery(() => db.outflows.toArray(), []);

  // Get unique customer names
  const allCustomers = useMemo(() => {
    const names = new Set<string>();
    (inflows || []).forEach((i) => names.add(i.customerName));
    (outflows || []).forEach((o) => names.add(o.recipientName));
    return Array.from(names).sort();
  }, [inflows, outflows]);

  const filteredCustomers = allCustomers.filter((c) =>
    !search || c.includes(search)
  );

  // Filter by customer
  const customerInflows = (inflows || []).filter((i) => i.customerName === selectedCustomer);
  const customerOutflows = (outflows || []).filter((o) => o.recipientName === selectedCustomer);

  // Separate by currency
  const iqdInflows = customerInflows.filter((i) => i.currency === 'IQD');
  const iqdOutflows = customerOutflows.filter((o) => o.currency === 'IQD');
  const usdInflows = customerInflows.filter((i) => i.currency === 'USD');
  const usdOutflows = customerOutflows.filter((o) => o.currency === 'USD');

  // IQD totals
  const iqdTotalInflow = iqdInflows.reduce((s, i) => s + i.amount, 0);
  const iqdTotalOutflow = iqdOutflows.reduce((s, o) => s + o.amount, 0);
  const iqdTotalCommission = iqdInflows.reduce((s, i) => s + i.commission, 0) + iqdOutflows.reduce((s, o) => s + o.commission, 0);
  const iqdBalance = iqdTotalInflow - iqdTotalOutflow;

  // USD totals
  const usdTotalInflow = usdInflows.reduce((s, i) => s + i.amount, 0);
  const usdTotalOutflow = usdOutflows.reduce((s, o) => s + o.amount, 0);
  const usdTotalCommission = usdInflows.reduce((s, i) => s + i.commission, 0) + usdOutflows.reduce((s, o) => s + o.commission, 0);
  const usdBalance = usdTotalInflow - usdTotalOutflow;

  // IQD records
  const iqdRecords = [
    ...iqdInflows.map((i) => ({
      date: i.date, operationNumber: i.operationNumber, type: 'وارد',
      amount: i.amount, currency: i.currency, commission: i.commission, notes: i.notes,
    })),
    ...iqdOutflows.map((o) => ({
      date: o.date, operationNumber: o.operationNumber, type: 'صادر',
      amount: o.amount, currency: o.currency, commission: o.commission, notes: o.notes,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // USD records
  const usdRecords = [
    ...usdInflows.map((i) => ({
      date: i.date, operationNumber: i.operationNumber, type: 'وارد',
      amount: i.amount, currency: i.currency, commission: i.commission, notes: i.notes,
    })),
    ...usdOutflows.map((o) => ({
      date: o.date, operationNumber: o.operationNumber, type: 'صادر',
      amount: o.amount, currency: o.currency, commission: o.commission, notes: o.notes,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handlePrint = async () => {
    if (!selectedCustomer) return;
    await printCustomerStatement(selectedCustomer, customerInflows, customerOutflows, iqdBalance, 'IQD');
  };

  const handleExportExcel = () => {
    if (!selectedCustomer) return;
    exportToExcel(`كشف_حساب_${selectedCustomer}`, [{
      name: 'دينار عراقي',
      headers: ['التاريخ', 'رقم العملية', 'النوع', 'المبلغ', 'العملة', 'العمولة', 'ملاحظات'],
      rows: iqdRecords.map((r) => [
        formatDateTime(r.date), r.operationNumber, r.type,
        r.amount, r.currency, r.commission, r.notes || '',
      ]),
    }, {
      name: 'دولار أمريكي',
      headers: ['التاريخ', 'رقم العملية', 'النوع', 'المبلغ', 'العملة', 'العمولة', 'ملاحظات'],
      rows: usdRecords.map((r) => [
        formatDateTime(r.date), r.operationNumber, r.type,
        r.amount, r.currency, r.commission, r.notes || '',
      ]),
    }]);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">كشف حساب الزبون</h1>
        <p className="text-slate-500 text-sm mt-1">عرض جميع عمليات الزبون ورصده</p>
      </div>

      {/* Customer selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">اختيار الزبون</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن زبون..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {search && (
            <div className="mt-2 max-h-40 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200">
              {filteredCustomers.map((c) => (
                <button
                  key={c}
                  onClick={() => { setSelectedCustomer(c); setSearch(''); }}
                  className="w-full text-right px-4 py-2 hover:bg-blue-50 text-sm text-slate-700 transition"
                >
                  {c}
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">لا توجد نتائج</p>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedCustomer ? (
        <>
          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition">
              <FileText className="w-4 h-4" /> طباعة PDF
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl transition">
              <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
            </button>
          </div>

          {/* Customer Name Header */}
          <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white p-6 rounded-2xl">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8" />
              <div>
                <p className="text-blue-100 text-sm">كشف حساب</p>
                <h2 className="text-2xl font-bold">{selectedCustomer}</h2>
              </div>
            </div>
          </div>

          {/* IQD Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-emerald-600 text-white p-3">
              <h3 className="font-bold text-lg">دينار عراقي (IQD)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                    <th className="px-4 py-3 text-right font-medium">رقم العملية</th>
                    <th className="px-4 py-3 text-right font-medium">النوع</th>
                    <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                    <th className="px-4 py-3 text-right font-medium">العمولة</th>
                    <th className="px-4 py-3 text-right font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {iqdRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(r.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.operationNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${r.type === 'وارد' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(r.amount)}</td>
                      <td className="px-4 py-3 text-amber-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(r.commission)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.notes || '-'}</td>
                    </tr>
                  ))}
                  {iqdRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        لا توجد عمليات بالدينار
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-medium">
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="px-4 py-2 text-slate-700">إجمالي الوارد</td>
                    <td className="px-4 py-2 text-emerald-600 font-bold">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(iqdTotalInflow)}</td>
                    <td colSpan={2} className="px-4 py-2"></td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-slate-700">إجمالي الصادر</td>
                    <td className="px-4 py-2 text-red-600 font-bold">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(iqdTotalOutflow)}</td>
                    <td colSpan={2} className="px-4 py-2"></td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-slate-700">العمولات</td>
                    <td className="px-4 py-2 text-amber-600 font-bold">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(iqdTotalCommission)}</td>
                    <td colSpan={2} className="px-4 py-2"></td>
                  </tr>
                  <tr className="bg-emerald-600 text-white">
                    <td colSpan={3} className="px-4 py-3 font-bold">الرصيد النهائي</td>
                    <td className="px-4 py-3 text-lg font-bold">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(iqdBalance)}</td>
                    <td colSpan={2} className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* USD Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-blue-600 text-white p-3">
              <h3 className="font-bold text-lg">دولار أمريكي (USD)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                    <th className="px-4 py-3 text-right font-medium">رقم العملية</th>
                    <th className="px-4 py-3 text-right font-medium">النوع</th>
                    <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                    <th className="px-4 py-3 text-right font-medium">العمولة</th>
                    <th className="px-4 py-3 text-right font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usdRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(r.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.operationNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${r.type === 'وارد' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(r.amount)}</td>
                      <td className="px-4 py-3 text-amber-600">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(r.commission)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.notes || '-'}</td>
                    </tr>
                  ))}
                  {usdRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        لا توجد عملات بالدولار
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-medium">
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="px-4 py-2 text-slate-700">إجمالي الوارد</td>
                    <td className="px-4 py-2 text-emerald-600 font-bold">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(usdTotalInflow)}</td>
                    <td colSpan={2} className="px-4 py-2"></td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-slate-700">إجمالي الصادر</td>
                    <td className="px-4 py-2 text-red-600 font-bold">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(usdTotalOutflow)}</td>
                    <td colSpan={2} className="px-4 py-2"></td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-slate-700">العمولات</td>
                    <td className="px-4 py-2 text-amber-600 font-bold">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(usdTotalCommission)}</td>
                    <td colSpan={2} className="px-4 py-2"></td>
                  </tr>
                  <tr className="bg-blue-600 text-white">
                    <td colSpan={3} className="px-4 py-3 font-bold">الرصيد النهائي</td>
                    <td className="px-4 py-3 text-lg font-bold">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(usdBalance)}</td>
                    <td colSpan={2} className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">ابحث واختر زبوناً لعرض كشف حسابه</p>
        </div>
      )}
    </div>
  );
}
