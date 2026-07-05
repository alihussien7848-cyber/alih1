import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, User } from '../db/database';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  can: (permission: string) => boolean;
}

const PERMISSIONS: Record<string, ('manager' | 'employee')[]> = {
  view_dashboard: ['manager', 'employee'],
  add_inflow: ['manager', 'employee'],
  edit_inflow: ['manager', 'employee'],
  delete_inflow: ['manager'],
  add_outflow: ['manager', 'employee'],
  edit_outflow: ['manager', 'employee'],
  delete_outflow: ['manager'],
  view_commissions: ['manager', 'employee'],
  view_customer_statement: ['manager', 'employee'],
  manage_cashbox: ['manager', 'employee'],
  close_cashbox: ['manager'],
  view_reports: ['manager', 'employee'],
  view_profit_reports: ['manager'],
  manage_users: ['manager'],
  view_audit_log: ['manager'],
  backup_restore: ['manager'],
  print: ['manager', 'employee'],
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const userId = parseInt(stored);
      db.users.get(userId).then((u) => {
        if (u && u.active) setUser(u);
        else localStorage.removeItem('currentUser');
      });
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const u = await db.users.where('username').equals(username).first();
    if (u && u.password === password && u.active) {
      setUser(u);
      localStorage.setItem('currentUser', String(u.id));
      await db.auditLogs.add({
        action: 'login',
        entity: 'auth',
        details: `تسجيل دخول: ${u.fullName}`,
        userName: u.fullName,
        userId: u.id!,
        timestamp: new Date().toISOString(),
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    if (user) {
      db.auditLogs.add({
        action: 'logout',
        entity: 'auth',
        details: `تسجيل خروج: ${user.fullName}`,
        userName: user.fullName,
        userId: user.id!,
        timestamp: new Date().toISOString(),
      });
    }
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const can = (permission: string): boolean => {
    if (!user) return false;
    const allowed = PERMISSIONS[permission];
    if (!allowed) return false;
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
