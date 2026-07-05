import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { db, Inflow, Outflow, Settings, Currency, CURRENCIES } from '../db/database';
import { formatCurrency, formatDateTime, formatDate } from './format';

let arabicFontLoaded = false;

// Minimal embedded font for Arabic numbers and basic characters
// Using base64-encoded subset of a standard font
const AMIRI_FONT_URL = 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf';

async function loadArabicFont(doc: jsPDF): Promise<boolean> {
  if (arabicFontLoaded) return true;

  try {
    // Try to load Amiri font from Google Fonts
    const response = await fetch(AMIRI_FONT_URL);
    if (!response.ok) throw new Error('Font fetch failed');

    const fontBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(fontBuffer);

    // Convert to base64
    let base64 = '';
    for (let i = 0; i < uint8Array.length; i++) {
      base64 += String.fromCharCode(uint8Array[i]);
    }
    const fontBase64 = btoa(base64);

    doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 'normal');
    arabicFontLoaded = true;
    return true;
  } catch (e) {
    console.warn('Could not load Arabic font, using fallback:', e);
    // Fallback: just mark as loaded but without proper Arabic support
    arabicFontLoaded = false;
    return false;
  }
}

async function getSettings(): Promise<Settings> {
  const s = await db.settings.toArray();
  return s[0] || { companyName: 'شركة الصيرفة', defaultCommissionRate: 1 };
}

function getCurrencyName(code: Currency): string {
  return CURRENCIES.find((c) => c.code === code)?.name || code;
}

function getCurrencyNameEn(code: Currency): string {
  const names: Record<Currency, string> = {
    'IQD': 'Iraqi Dinar',
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'TRY': 'Turkish Lira',
    'SAR': 'Saudi Riyal',
    'AED': 'UAE Dirham',
  };
  return names[code] || code;
}

// Reverse Arabic text for RTL display in PDF
function reverseArabicText(text: string): string {
  return text.split('').reverse().join('');
}

// Bilingual labels
const labels = {
  receipt: { ar: 'إيصال استلام', en: 'Receipt' },
  paymentVoucher: { ar: 'سند صرف', en: 'Payment Voucher' },
  operationNo: { ar: 'رقم العملية', en: 'Operation No' },
  date: { ar: 'التاريخ', en: 'Date' },
  customer: { ar: 'الزبون', en: 'Customer' },
  recipient: { ar: 'المستلم', en: 'Recipient' },
  phone: { ar: 'الهاتف', en: 'Phone' },
  amount: { ar: 'المبلغ', en: 'Amount' },
  exchangeRate: { ar: 'سعر التحويل', en: 'Exchange Rate' },
  commission: { ar: 'العمولة', en: 'Commission' },
  notes: { ar: 'ملاحظات', en: 'Notes' },
  field: { ar: 'الحقل', en: 'Field' },
  value: { ar: 'القيمة', en: 'Value' },
  signature: { ar: 'التوقيع', en: 'Signature' },
  receiver: { ar: 'المستقبل', en: 'Receiver' },
  customerStatement: { ar: 'كشف حساب الزبون', en: 'Customer Statement' },
  type: { ar: 'النوع', en: 'Type' },
  inflow: { ar: 'وارد', en: 'Inflow' },
  outflow: { ar: 'صادر', en: 'Outflow' },
  balance: { ar: 'الرصيد', en: 'Balance' },
  total: { ar: 'الإجمالي', en: 'Total' },
};

function bilingual(ar: string, en: string): string {
  return `${reverseArabicText(ar)} / ${en}`;
}

function arabicText(text: string): string {
  return reverseArabicText(text);
}

export async function printReceipt(
  type: 'inflow' | 'outflow',
  record: Inflow | Outflow,
  settings?: Settings
) {
  const s = settings || (await getSettings());
  const doc = new jsPDF();
  const hasArabicFont = await loadArabicFont(doc);

  // Use Amiri font for Arabic, fallback to helvetica
  if (hasArabicFont) {
    doc.setFont('Amiri');
  }

  doc.setFontSize(20);
  doc.text(arabicText(s.companyName), 105, 20, { align: 'center' });
  doc.setFontSize(10);
  if (s.companyAddress) doc.text(arabicText(s.companyAddress), 105, 28, { align: 'center' });
  if (s.companyPhone) {
    doc.setFont('helvetica');
    doc.text(`Tel: ${s.companyPhone}`, 105, 34, { align: 'center' });
  }

  doc.setLineWidth(0.5);
  doc.line(20, 38, 190, 38);

  if (hasArabicFont) {
    doc.setFont('Amiri');
  }
  doc.setFontSize(16);
  const titleAr = type === 'inflow' ? labels.receipt.ar : labels.paymentVoucher.ar;
  const titleEn = type === 'inflow' ? labels.receipt.en : labels.paymentVoucher.en;
  doc.text(bilingual(titleAr, titleEn), 105, 48, { align: 'center' });

  doc.setFontSize(11);
  const name = type === 'inflow'
    ? (record as Inflow).customerName
    : (record as Outflow).recipientName;

  const rows: string[][] = [
    [bilingual(labels.operationNo.ar, labels.operationNo.en), record.operationNumber],
    [bilingual(labels.date.ar, labels.date.en), formatDateTime(record.date)],
    [bilingual(type === 'inflow' ? labels.customer.ar : labels.recipient.ar, type === 'inflow' ? labels.customer.en : labels.recipient.en), arabicText(name)],
    [bilingual(labels.phone.ar, labels.phone.en), (record as Inflow).phone || '-'],
    [bilingual(labels.amount.ar, labels.amount.en), `${record.amount} ${getCurrencyName(record.currency)}`],
    [bilingual(labels.exchangeRate.ar, labels.exchangeRate.en), String(record.exchangeRate)],
    [bilingual(labels.commission.ar, labels.commission.en), `${record.commission} ${getCurrencyName(record.currency)}`],
    [bilingual(labels.notes.ar, labels.notes.en), record.notes ? arabicText(record.notes) : '-'],
  ];

  autoTable(doc, {
    startY: 55,
    head: [[bilingual(labels.field.ar, labels.field.en), bilingual(labels.value.ar, labels.value.en)]],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], halign: 'center' },
    styles: { fontSize: 10, cellPadding: 3, font: hasArabicFont ? 'Amiri' : 'helvetica' },
    columnStyles: {
      0: { halign: 'right' },
      1: { halign: 'left' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;
  doc.setFontSize(10);
  if (hasArabicFont) {
    doc.setFont('Amiri');
  }
  doc.text(`${bilingual(labels.signature.ar, labels.signature.en)}: _______________`, 150, finalY + 20);
  doc.text(`${bilingual(labels.receiver.ar, labels.receiver.en)}: _______________`, 20, finalY + 20);

  doc.save(`${type}_receipt_${record.operationNumber}.pdf`);
}

export async function printCustomerStatement(
  customerName: string,
  inflows: Inflow[],
  outflows: Outflow[],
  balance: number,
  currency: Currency
) {
  const s = await getSettings();
  const doc = new jsPDF();
  const hasArabicFont = await loadArabicFont(doc);

  if (hasArabicFont) {
    doc.setFont('Amiri');
  }

  doc.setFontSize(18);
  doc.text(arabicText(s.companyName), 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text(bilingual(labels.customerStatement.ar, labels.customerStatement.en), 105, 32, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${bilingual(labels.customer.ar, labels.customer.en)}: ${arabicText(customerName)}`, 105, 42, { align: 'center' });

  const body: string[][] = [];
  [...inflows.map((i) => ({
    date: i.date, type: 'inflow', num: i.operationNumber,
    amount: i.amount, commission: i.commission, currency: i.currency,
  })),
  ...outflows.map((o) => ({
    date: o.date, type: 'outflow', num: o.operationNumber,
    amount: o.amount, commission: o.commission, currency: o.currency,
  }))]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((r) => {
      body.push([
        formatDate(r.date),
        bilingual(r.type === 'inflow' ? labels.inflow.ar : labels.outflow.ar, r.type === 'inflow' ? labels.inflow.en : labels.outflow.en),
        r.num,
        `${r.amount} ${getCurrencyName(r.currency)}`,
        `${r.commission} ${getCurrencyName(r.currency)}`,
      ]);
    });

  autoTable(doc, {
    startY: 48,
    head: [[
      bilingual(labels.date.ar, labels.date.en),
      bilingual(labels.type.ar, labels.type.en),
      bilingual(labels.operationNo.ar, labels.operationNo.en),
      bilingual(labels.amount.ar, labels.amount.en),
      bilingual(labels.commission.ar, labels.commission.en),
    ]],
    body,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], halign: 'center' },
    styles: { fontSize: 9, cellPadding: 2, font: hasArabicFont ? 'Amiri' : 'helvetica' },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 60;
  doc.setFontSize(12);
  doc.text(`${bilingual(labels.balance.ar, labels.balance.en)}: ${formatCurrency(balance, currency)}`, 105, finalY + 15, { align: 'center' });

  doc.save(`statement_${customerName}.pdf`);
}

export async function printReport(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  summary?: { label: string; value: string }[]
) {
  const s = await getSettings();
  const doc = new jsPDF();
  const hasArabicFont = await loadArabicFont(doc);

  if (hasArabicFont) {
    doc.setFont('Amiri');
  }

  doc.setFontSize(18);
  doc.text(arabicText(s.companyName), 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text(arabicText(title), 105, 32, { align: 'center' });
  doc.setFontSize(10);
  doc.text(bilingual(labels.date.ar, labels.date.en) + `: ${formatDate(new Date())}`, 105, 40, { align: 'center' });

  autoTable(doc, {
    startY: 46,
    head: [headers.map(h => arabicText(h))],
    body: rows.map((r) => r.map((c) => String(c))),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], halign: 'center' },
    styles: { fontSize: 9, cellPadding: 2, font: hasArabicFont ? 'Amiri' : 'helvetica' },
  });

  if (summary && summary.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(11);
    let y = finalY + 10;
    summary.forEach((item) => {
      doc.text(`${arabicText(item.label)}: ${item.value}`, 20, y);
      y += 7;
    });
  }

  doc.save(`report_${title.replace(/\s+/g, '_')}.pdf`);
}

export async function printDebtsReport(
  titleAr: string,
  titleEn: string,
  headers: string[],
  rows: (string | number)[][],
  totalAmount: number
) {
  const s = await getSettings();
  const doc = new jsPDF();
  const hasArabicFont = await loadArabicFont(doc);

  if (hasArabicFont) {
    doc.setFont('Amiri');
  }

  doc.setFontSize(18);
  doc.text(arabicText(s.companyName), 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text(bilingual(titleAr, titleEn), 105, 32, { align: 'center' });
  doc.setFontSize(10);
  doc.text(bilingual(labels.date.ar, labels.date.en) + `: ${formatDate(new Date())}`, 105, 40, { align: 'center' });

  autoTable(doc, {
    startY: 46,
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c))),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], halign: 'center' },
    styles: { fontSize: 9, cellPadding: 2, font: hasArabicFont ? 'Amiri' : 'helvetica' },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 60;
  doc.setFontSize(11);
  if (hasArabicFont) {
    doc.setFont('Amiri');
  }
  doc.text(bilingual(labels.total.ar, labels.total.en) + `: ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalAmount)} IQD`, 105, finalY + 15, { align: 'center' });

  doc.save(`report_${titleEn.replace(/\s+/g, '_')}.pdf`);
}

export function exportToExcel(
  filename: string,
  sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]
) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
