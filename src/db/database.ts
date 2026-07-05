import Dexie, { Table } from 'dexie';

export type Currency = 'IQD' | 'USD' | 'EUR' | 'TRY' | 'SAR' | 'AED';

export const CURRENCIES: { code: Currency; name: string; symbol: string }[] = [
  { code: 'IQD', name: 'دينار عراقي', symbol: 'د.ع' },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  { code: 'EUR', name: 'يورو', symbol: '€' },
  { code: 'TRY', name: 'ليرة تركية', symbol: '₺' },
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ' },
];

export interface User {
  id?: number;
  username: string;
  password: string;
  fullName: string;
  role: 'manager' | 'employee';
  active: boolean;
  createdAt: string;
}

export interface Inflow {
  id?: number;
  operationNumber: string;
  date: string;
  customerName: string;
  phone?: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  commission: number;
  notes?: string;
  createdBy: string;
  createdById: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Outflow {
  id?: number;
  operationNumber: string;
  date: string;
  recipientName: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  commission: number;
  notes?: string;
  createdBy: string;
  createdById: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Cashbox {
  id?: number;
  date: string;
  openingBalance: Record<Currency, number>;
  closingBalance?: Record<Currency, number>;
  closed: boolean;
  closedBy?: string;
  closedAt?: string;
  notes?: string;
}

export interface AuditLog {
  id?: number;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'close_cashbox' | 'backup' | 'restore';
  entity: string;
  entityId?: number;
  details: string;
  userName: string;
  userId: number;
  timestamp: string;
}

export interface Settings {
  id?: number;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  defaultCommissionRate: number;
  logo?: string;
}

export interface DebtOwedToUs {
  id?: number;
  name: string;
  amount: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
  createdById: number;
}

export interface DebtOwedByUs {
  id?: number;
  name: string;
  amount: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
  createdById: number;
}

class ExchangeDB extends Dexie {
  users!: Table<User, number>;
  inflows!: Table<Inflow, number>;
  outflows!: Table<Outflow, number>;
  cashboxes!: Table<Cashbox, number>;
  auditLogs!: Table<AuditLog, number>;
  settings!: Table<Settings, number>;
  debtsOwedToUs!: Table<DebtOwedToUs, number>;
  debtsOwedByUs!: Table<DebtOwedByUs, number>;

  constructor() {
    super('ExchangeAccountingDB');
    this.version(2).stores({
      users: '++id, username, role, active',
      inflows: '++id, operationNumber, date, customerName, currency, createdById, createdAt',
      outflows: '++id, operationNumber, date, recipientName, currency, createdById, createdAt',
      cashboxes: '++id, date, closed',
      auditLogs: '++id, action, entity, userId, timestamp',
      settings: '++id',
      debtsOwedToUs: '++id, name, createdById, createdAt',
      debtsOwedByUs: '++id, name, createdById, createdAt',
    });
  }
}

export const db = new ExchangeDB();

export async function initDatabase() {
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.add({
      username: 'admin',
      password: 'admin123',
      fullName: 'المدير العام',
      role: 'manager',
      active: true,
      createdAt: new Date().toISOString(),
    });
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      companyName: 'شركة الصيرفة',
      defaultCommissionRate: 1,
    });
  }
}

export async function logAction(
  action: AuditLog['action'],
  entity: string,
  details: string,
  userName: string,
  userId: number,
  entityId?: number
) {
  await db.auditLogs.add({
    action,
    entity,
    entityId,
    details,
    userName,
    userId,
    timestamp: new Date().toISOString(),
  });
}

export function generateOperationNumber(prefix: string): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}-${ymd}-${rand}`;
}
