import { useState, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Percent,
  FileText, Users, Database, Wallet, LogOut, Menu, BookOpen,
  ClipboardList, Settings as SettingsIcon, CreditCard, HandCoins,
} from 'lucide-react';

export type PageKey =
  | 'dashboard' | 'inflow' | 'outflow' | 'commissions'
  | 'customer' | 'debtsOwedToUs' | 'debtsOwedByUs' | 'reports' | 'users' | 'audit'
  | 'backup' | 'settings';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
  permission: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'الصفحة الرئيسية', icon: LayoutDashboard, permission: 'view_dashboard' },
  { key: 'inflow', label: 'الوارد', icon: ArrowDownCircle, permission: 'add_inflow' },
  { key: 'outflow', label: 'الصادر', icon: ArrowUpCircle, permission: 'add_outflow' },
  { key: 'commissions', label: 'العمولات', icon: Percent, permission: 'view_commissions' },
  { key: 'customer', label: 'كشف حساب الزبون', icon: BookOpen, permission: 'view_customer_statement' },
  { key: 'debtsOwedToUs', label: 'حسابات في ذمتهم', icon: CreditCard, permission: 'view_reports' },
  { key: 'debtsOwedByUs', label: 'حسابات في ذمتي', icon: HandCoins, permission: 'view_reports' },
  { key: 'reports', label: 'التقارير', icon: FileText, permission: 'view_reports' },
  { key: 'users', label: 'المستخدمون', icon: Users, permission: 'manage_users' },
  { key: 'audit', label: 'سجل العمليات', icon: ClipboardList, permission: 'view_audit_log' },
  { key: 'backup', label: 'النسخ الاحتياطي', icon: Database, permission: 'backup_restore' },
  { key: 'settings', label: 'الإعدادات', icon: SettingsIcon, permission: 'manage_users' },
];

interface LayoutProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
}

export default function Layout({ currentPage, onPageChange, children }: LayoutProps) {
  const { user, logout, can } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => can(item.permission));

  const roleLabel = user?.role === 'manager' ? 'مدير' : 'موظف';

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 w-72 bg-slate-900 text-white z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">شركة الصيرفة</h1>
              <p className="text-xs text-slate-400">نظام المحاسبة</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onPageChange(item.key);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold text-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="font-bold text-slate-800">
            {visibleItems.find((i) => i.key === currentPage)?.label || ''}
          </h1>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
