import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Settings as SettingsType } from '../db/database';
import { useAuth } from '../context/AuthContext';
import { Save, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const settings = useLiveQuery(() => db.settings.toArray(), []);
  const [form, setForm] = useState<SettingsType>({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    defaultCommissionRate: 1,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && settings.length > 0) {
      setForm(settings[0]);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.id) {
      await db.settings.update(form.id, form);
    } else {
      await db.settings.add(form);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">الإعدادات</h1>
        <p className="text-slate-500 text-sm mt-1">إعدادات الشركة والنظام</p>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-700 text-sm font-medium">
          تم حفظ الإعدادات بنجاح
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="font-bold text-slate-800">معلومات الشركة</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم الشركة *</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">العنوان</label>
            <input
              type="text"
              value={form.companyAddress || ''}
              onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">رقم الهاتف</label>
            <input
              type="tel"
              value={form.companyPhone || ''}
              onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">نسبة العمولة الافتراضية (%)</label>
            <input
              type="number"
              step="any"
              value={form.defaultCommissionRate}
              onChange={(e) => setForm({ ...form, defaultCommissionRate: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/20"
        >
          <Save className="w-4 h-4" />
          حفظ الإعدادات
        </button>
      </form>
    </div>
  );
}
