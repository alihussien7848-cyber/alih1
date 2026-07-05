import { useLiveQuery } from 'dexie-react-hooks';
import { db, CURRENCIES } from '../db/database';
import { isSameDay, formatCurrency, formatNumber } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, Percent, Coins,
  ArrowDownCircle, ArrowUpCircle, Calendar,
} from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const inflows = useLiveQuery(() => db.inflows.toArray(), []);
  const outflows = useLiveQuery(() => db.outflows.toArray(), []);
  const cashboxes = useLiveQuery(() => db.cashboxes.toArray(), []);

  const today = new Date();

  const todayInflows = (inflows || []).filter((i) => isSameDay(i.date, today));
  const todayOutflows = (outflows || []).filter((o) => isSameDay(o.date, today));

  // Cash balance per currency
  const balances: Record<string, number> = {};
  CURRENCIES.forEach((c) => (balances[c.code] = 0));

  (inflows || []).forEach((i) => {
    balances[i.currency] = (balances[i.currency] || 0) + i.amount;
  });
  (outflows || []).forEach((o) => {
    balances[o.currency] = (balances[o.currency] || 0) - o.amount;
  });

  // Add opening balances from cashboxes
  (cashboxes || []).forEach((cb) => {
    if (cb.openingBalance) {
      Object.entries(cb.openingBalance).forEach(([curr, val]) => {
        balances[curr] = (balances[curr] || 0) + val;
      });
    }
  });

  // Today totals
  const todayInflowTotal = todayInflows.reduce((s, i) => s + i.amount, 0);
  const todayOutflowTotal = todayOutflows.reduce((s, o) => s + o.amount, 0);
  const todayCommissionTotal =
    todayInflows.reduce((s, i) => s + i.commission, 0) +
    todayOutflows.reduce((s, o) => s + o.commission, 0);

  // Cashbox remaining (all currencies combined in IQD equivalent using exchange rate)
  const cashboxRemaining = Object.entries(balances).reduce((s, [, v]) => s + v, 0);

  // Chart data: last 7 days
  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    return d;
  });

  const chartData = last7Days.map((d) => {
    const dayInflows = (inflows || []).filter((i) => isSameDay(i.date, d));
    const dayOutflows = (outflows || []).filter((o) => isSameDay(o.date, d));
    return {
      name: d.toLocaleDateString('ar-IQ', { weekday: 'short' }),
      date: d.toLocaleDateString('ar-IQ', { day: '2-digit', month: '2-digit' }),
      وارد: dayInflows.reduce((s, i) => s + i.amount, 0),
      صادر: dayOutflows.reduce((s, o) => s + o.amount, 0),
      عمولات:
        dayInflows.reduce((s, i) => s + i.commission, 0) +
        dayOutflows.reduce((s, o) => s + o.commission, 0),
    };
  });

  // Pie data: inflow by currency
  const pieData = CURRENCIES.map((c) => ({
    name: c.name,
    value: (inflows || [])
      .filter((i) => i.currency === c.code)
      .reduce((s, i) => s + i.amount, 0),
  })).filter((d) => d.value > 0);

  const stats = [
    {
      label: 'إجمالي الوارد اليوم',
      value: formatNumber(todayInflowTotal),
      icon: TrendingUp,
      color: 'from-emerald-500 to-green-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      label: 'إجمالي الصادر اليوم',
      value: formatNumber(todayOutflowTotal),
      icon: TrendingDown,
      color: 'from-red-500 to-rose-600',
      bg: 'bg-red-50',
      text: 'text-red-600',
    },
    {
      label: 'إجمالي العمولات اليوم',
      value: formatNumber(todayCommissionTotal),
      icon: Percent,
      color: 'from-amber-500 to-orange-600',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
    {
      label: 'المتبقي في الصندوق',
      value: formatNumber(cashboxRemaining),
      icon: Wallet,
      color: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الصفحة الرئيسية</h1>
          <p className="text-slate-500 text-sm mt-1">
            {today.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.text}`} />
                </div>
              </div>
              <p className="text-slate-500 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Cash balance per currency */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">الرصيد النقدي لكل عملة</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CURRENCIES.map((c) => (
            <div
              key={c.code}
              className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 text-center border border-slate-200"
            >
              <p className="text-xs text-slate-500 mb-1">{c.name}</p>
              <p className="text-lg font-bold text-slate-800">
                {formatNumber(balances[c.code] || 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">{c.symbol}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800">الحركة اليومية (آخر 7 أيام)</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
              />
              <Legend />
              <Bar dataKey="وارد" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="صادر" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Bar dataKey="عمولات" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800">توزيع الوارد حسب العملة</h2>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
              لا توجد بيانات
            </div>
          )}
        </div>
      </div>

      {/* Recent operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800">أحدث العمليات الواردة</h2>
          </div>
          <div className="space-y-2">
            {todayInflows.slice(0, 5).map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{i.customerName}</p>
                  <p className="text-xs text-slate-500">{i.operationNumber}</p>
                </div>
                <p className="font-bold text-emerald-600">{formatCurrency(i.amount, i.currency)}</p>
              </div>
            ))}
            {todayInflows.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">لا توجد عمليات واردة اليوم</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-slate-800">أحدث العمليات الصادرة</h2>
          </div>
          <div className="space-y-2">
            {todayOutflows.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{o.recipientName}</p>
                  <p className="text-xs text-slate-500">{o.operationNumber}</p>
                </div>
                <p className="font-bold text-red-600">{formatCurrency(o.amount, o.currency)}</p>
              </div>
            ))}
            {todayOutflows.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">لا توجد عمليات صادرة اليوم</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
