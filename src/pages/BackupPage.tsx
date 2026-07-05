import { useState, useRef } from 'react';
import { db, logAction } from '../db/database';
import { useAuth } from '../context/AuthContext';
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

export default function BackupPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = {
        users: await db.users.toArray(),
        inflows: await db.inflows.toArray(),
        outflows: await db.outflows.toArray(),
        cashboxes: await db.cashboxes.toArray(),
        auditLogs: await db.auditLogs.toArray(),
        settings: await db.settings.toArray(),
        exportDate: new Date().toISOString(),
        version: 1,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await logAction('backup', 'database', `نسخ احتياطي للقاعدة`, user.fullName, user.id!);
      setMessage({ type: 'success', text: 'تم إنشاء النسخة الاحتياطية بنجاح' });
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء النسخ الاحتياطي' });
    }
    setLoading(false);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (!confirm('تحذير: سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await db.transaction('rw', [db.users, db.inflows, db.outflows, db.cashboxes, db.auditLogs, db.settings], async () => {
        await db.users.clear();
        await db.inflows.clear();
        await db.outflows.clear();
        await db.cashboxes.clear();
        await db.auditLogs.clear();
        await db.settings.clear();

        if (data.users) await db.users.bulkAdd(data.users);
        if (data.inflows) await db.inflows.bulkAdd(data.inflows);
        if (data.outflows) await db.outflows.bulkAdd(data.outflows);
        if (data.cashboxes) await db.cashboxes.bulkAdd(data.cashboxes);
        if (data.settings) await db.settings.bulkAdd(data.settings);
        if (data.auditLogs) await db.auditLogs.bulkAdd(data.auditLogs);
      }).catch(() => {});

      await logAction('restore', 'database', `استعادة قاعدة البيانات من نسخة احتياطية`, user.fullName, user.id!);
      setMessage({ type: 'success', text: 'تم استعادة البيانات بنجاح. يرجى إعادة تسجيل الدخول.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الاستعادة. تأكد من صحة الملف' });
    }
    setLoading(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">النسخ الاحتياطي</h1>
        <p className="text-slate-500 text-sm mt-1">حفظ واستعادة قاعدة البيانات</p>
      </div>

      {message && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Download className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">حفظ نسخة احتياطية</h2>
          <p className="text-slate-500 text-sm mb-6">
            قم بتنزيل نسخة احتياطية كاملة من قاعدة البيانات إلى جهازك
          </p>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? 'جاري المعالجة...' : 'حفظ النسخة الاحتياطية'}
          </button>
        </div>

        {/* Restore */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">استعادة نسخة احتياطية</h2>
          <p className="text-slate-500 text-sm mb-6">
            استعادة البيانات من ملف نسخة احتياطية سابق
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleRestore}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? 'جاري المعالجة...' : 'اختيار ملف للاستعادة'}
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800 mb-1">تنبيه هام</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>- الاستبدال سيحذف جميع البيانات الحالية ويستبدلها بالبيانات من الملف</li>
              <li>- احفظ نسخة احتياطية بشكل دوري لتجنب فقدان البيانات</li>
              <li>- بعد الاستعادة قد تحتاج لإعادة تسجيل الدخول</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
