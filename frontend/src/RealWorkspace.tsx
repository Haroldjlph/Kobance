import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  LogOut,
  MoreHorizontal,
  Package,
  HelpCircle,
  Settings,
  MessageCircle,
  ReceiptText,
  Scale,
  ShoppingCart,
  Users
} from "lucide-react";
import { supabase } from "./supabase";

type Page = "dashboard" | "company" | "articles" | "clients" | "suppliers" | "quotes" | "invoices" | "sales" | "purchases" | "bank" | "vat" | "monthly";
type Status = "PAID" | "UNPAID";
type DiscountType = "NONE" | "PERCENT" | "AMOUNT";
type DocumentStatus = "DRAFT" | "ISSUED" | "PAID" | "CANCELED";
type BankTransactionType = "INCOME" | "EXPENSE";

type Profile = {
  user_id: string;
  company_name: string;
  siret: string;
  vat_number: string | null;
  address: string | null;
  phone: string | null;
  logo_data_url: string | null;
};

type CompanyMember = {
  id: string;
  owner_user_id: string;
  member_email: string;
  member_user_id: string | null;
  role: string;
};

type Party = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  siret: string | null;
  vat_number: string | null;
};

type Article = {
  id: string;
  user_id: string;
  reference: string | null;
  name: string;
  description: string | null;
  unit_price_ht: number;
  vat_rate: number;
};

type Invoice = {
  id: string;
  user_id: string;
  party_id: string;
  article_id?: string | null;
  invoice_date: string;
  description: string;
  amount_ht: number;
  vat_rate: number;
  vat_amount: number;
  amount_ttc: number;
  discount_type?: DiscountType;
  discount_value?: number;
  status: Status;
};

type Sale = Invoice & { client?: Party };
type Purchase = Invoice & { supplier?: Party };

type BankTransaction = {
  id: string;
  user_id: string;
  transaction_date: string;
  label: string;
  transaction_type: BankTransactionType;
  amount: number;
  reference: string | null;
  notes: string | null;
  linked_invoice_id: string | null;
  linked_purchase_id: string | null;
  reconciled: boolean;
};

type InvoiceDocument = {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: DocumentStatus;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  notes: string | null;
  client?: Party;
  invoice_lines?: InvoiceLine[];
};

type InvoiceLine = {
  id: string;
  invoice_id: string;
  user_id: string;
  article_id: string | null;
  description: string;
  quantity: number;
  unit_price_ht: number;
  discount_type: DiscountType;
  discount_value: number;
  vat_rate: number;
  line_ht: number;
  line_vat: number;
  line_ttc: number;
};

type CreditNote = {
  id: string;
  user_id: string;
  invoice_id: string;
  client_id: string;
  credit_note_number: string;
  credit_note_date: string;
  reason: string;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  client?: Party;
  invoice?: InvoiceDocument;
  credit_note_lines?: CreditNoteLine[];
};

type CreditNoteLine = {
  id: string;
  credit_note_id: string;
  user_id: string;
  invoice_line_id: string | null;
  description: string;
  vat_rate: number;
  line_ht: number;
  line_vat: number;
  line_ttc: number;
};

type QuoteDocument = {
  id: string;
  user_id: string;
  client_id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string | null;
  status: DocumentStatus;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  notes: string | null;
  client?: Party;
  quote_lines?: QuoteLine[];
};

type QuoteLine = {
  id: string;
  quote_id: string;
  user_id: string;
  article_id: string | null;
  description: string;
  quantity: number;
  unit_price_ht: number;
  discount_type: DiscountType;
  discount_value: number;
  vat_rate: number;
  line_ht: number;
  line_vat: number;
  line_ttc: number;
};

const emptyParty = {
  name: "",
  email: "",
  phone: "",
  address: "",
  siret: "",
  vat_number: ""
};

const emptyProfile = {
  company_name: "",
  siret: "",
  vat_number: "",
  address: "",
  phone: "",
  logo_data_url: ""
};

const emptyArticle = {
  reference: "",
  name: "",
  description: "",
  unit_price_ht: "",
  vat_rate: "20"
};

const emptyInvoice = {
  partyId: "",
  articleId: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  amountHt: "",
  vatRate: "20",
  discountType: "NONE" as DiscountType,
  discountValue: "",
  status: "UNPAID" as Status
};

const emptyBankTransaction = {
  transactionDate: new Date().toISOString().slice(0, 10),
  label: "",
  transactionType: "EXPENSE" as BankTransactionType,
  amount: "",
  reference: "",
  notes: "",
  reconciliationType: "NONE" as "NONE" | "INVOICE" | "PURCHASE",
  linkedInvoiceId: "",
  linkedPurchaseId: "",
  reconciled: false
};

const emptyInvoiceDocument = {
  clientId: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  notes: ""
};

const emptyQuoteDocument = {
  clientId: "",
  quoteDate: new Date().toISOString().slice(0, 10),
  validUntil: "",
  notes: ""
};

const emptyInvoiceLine = {
  articleId: "",
  description: "",
  quantity: "1",
  unitPriceHt: "",
  discountType: "NONE" as DiscountType,
  discountValue: "",
  vatRate: "20"
};

const supportWhatsappNumber = (import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const supportWhatsappMessage = import.meta.env.VITE_SUPPORT_WHATSAPP_MESSAGE ?? "Bonjour, j'ai besoin d'aide sur Kobance.";

const formatEuro = (value: number | string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(value));

const monthOptions = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Fevrier" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Aout" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Decembre" }
];

function calculateAmounts(amountHt: string, vatRate: string) {
  const ht = Number(amountHt);
  const rate = Number(vatRate);
  const vatAmount = Math.round(ht * rate) / 100;

  return {
    amount_ht: ht,
    vat_rate: rate,
    vat_amount: vatAmount,
    amount_ttc: ht + vatAmount
  };
}

function calculateSaleAmounts(amountHt: string, vatRate: string, discountType: DiscountType, discountValue: string) {
  const rawHt = Number(amountHt);
  const discount = Number(discountValue || 0);
  const discountAmount =
    discountType === "PERCENT"
      ? rawHt * Math.min(Math.max(discount, 0), 100) / 100
      : discountType === "AMOUNT"
        ? Math.min(Math.max(discount, 0), rawHt)
        : 0;

  return calculateAmounts(String(Math.max(rawHt - discountAmount, 0)), vatRate);
}

function calculateLineAmounts(quantity: string, unitPriceHt: string, vatRate: string, discountType: DiscountType, discountValue: string) {
  const baseHt = Number(quantity || 0) * Number(unitPriceHt || 0);

  return calculateSaleAmounts(String(baseHt), vatRate, discountType, discountValue);
}

const namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
const siretPattern = /^\d{14}$/;
const frenchVatPattern = /^FR[A-Z0-9]{2}\d{9}$/;
const positiveIntegerPattern = /^[1-9]\d*$/;

function normalizeSiret(value: string) {
  return value.replace(/\s/g, "");
}

function normalizeFrenchVat(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

function isValidName(value: string) {
  return namePattern.test(value.trim());
}

function isValidSiret(value: string) {
  return siretPattern.test(normalizeSiret(value));
}

function isValidFrenchVat(value: string) {
  const normalized = normalizeFrenchVat(value);
  return normalized === "" || frenchVatPattern.test(normalized);
}

function isPositiveInteger(value: string) {
  return positiveIntegerPattern.test(value);
}

function isValidEmail(value: string) {
  return value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function supportWhatsappUrl() {
  if (!supportWhatsappNumber) {
    return "";
  }

  return `https://wa.me/${supportWhatsappNumber}?text=${encodeURIComponent(supportWhatsappMessage)}`;
}

function isBankTransactionReconciled(row: BankTransaction) {
  return row.reconciled || Boolean(row.linked_invoice_id) || Boolean(row.linked_purchase_id);
}

function describeBankReconciliation(row: BankTransaction, invoices: InvoiceDocument[], purchases: Purchase[]) {
  if (row.linked_invoice_id) {
    const invoice = invoices.find((item) => item.id === row.linked_invoice_id);
    return invoice ? `Facture ${invoice.invoice_number}` : "Facture liee";
  }

  if (row.linked_purchase_id) {
    const purchase = purchases.find((item) => item.id === row.linked_purchase_id);
    return purchase ? `Achat ${new Date(purchase.invoice_date).toLocaleDateString("fr-FR")} - ${purchase.supplier?.name ?? "Fournisseur"}` : "Achat lie";
  }

  return row.reconciled ? "Pointe manuel" : "-";
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");

  if (/[",\n\r;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function openPrintableHtml(html: string) {
  const win = window.open("", "_blank");

  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    return;
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.location.assign(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function displaySupabaseError(message: string) {
  if (message.toLowerCase().includes("row-level security")) {
    return `Acces refuse par Supabase RLS. Verifiez que le SQL a ete rejoue et que vous etes reconnecte. Detail : ${message}`;
  }

  return message;
}

function invoiceNumber(row: Sale) {
  const year = new Date(row.invoice_date).getFullYear();
  return `FAC-${year}-${row.id.slice(0, 8).toUpperCase()}`;
}

async function nextDocumentNumber(prefix: "FAC" | "DEV" | "AV", companyUserId: string) {
  const { data, error } = await supabase.rpc("next_document_number", {
    company_user_id: companyUserId,
    document_prefix: prefix
  });

  if (error) {
    throw new Error(displaySupabaseError(`Numerotation indisponible. Rejouez le SQL Supabase puis reessayez. Detail : ${error.message}`));
  }

  return String(data);
}

function summarizeCreditNote(creditNote: CreditNote) {
  const lines = creditNote.credit_note_lines ?? [];

  if (lines.length === 0) {
    return {
      total_ht: Number(creditNote.total_ht),
      total_vat: Number(creditNote.total_vat),
      total_ttc: Number(creditNote.total_ttc)
    };
  }

  return lines.reduce(
    (acc, line) => ({
      total_ht: acc.total_ht + Number(line.line_ht),
      total_vat: acc.total_vat + Number(line.line_vat),
      total_ttc: acc.total_ttc + Number(line.line_ttc)
    }),
    { total_ht: 0, total_vat: 0, total_ttc: 0 }
  );
}

function generateInvoiceDocument(row: Sale, client: Party | undefined, profile: Profile | null) {
  const discount =
    row.discount_type === "PERCENT"
      ? `${row.discount_value ?? 0} %`
      : row.discount_type === "AMOUNT"
        ? formatEuro(row.discount_value ?? 0)
        : "-";
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${invoiceNumber(row)}</title>
  <style>
    body { color: #18202f; font-family: Arial, sans-serif; margin: 40px; }
    .top { align-items: flex-start; display: flex; justify-content: space-between; gap: 32px; }
    .logo { max-height: 90px; max-width: 220px; object-fit: contain; }
    h1 { font-size: 34px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 0 0 8px; }
    p { line-height: 1.5; margin: 0; }
    .muted { color: #667085; }
    .box { border: 1px solid #dfe7e2; border-radius: 8px; margin-top: 28px; padding: 18px; }
    table { border-collapse: collapse; margin-top: 28px; width: 100%; }
    th, td { border-bottom: 1px solid #edf1ef; padding: 12px; text-align: left; }
    th { background: #f8faf9; color: #475467; font-size: 12px; text-transform: uppercase; }
    .totals { margin-left: auto; margin-top: 24px; width: 320px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .grand { border-top: 2px solid #18202f; font-size: 18px; font-weight: 700; }
    .document-actions { display: flex; gap: 10px; margin-bottom: 28px; }
    .document-actions button { background: #21725e; border: 0; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 700; padding: 12px 16px; }
    .document-actions .secondary { background: #eef4ff; color: #1849a9; }
    @media print { body { margin: 24px; } .document-actions { display: none; } }
  </style>
</head>
<body>
  <div class="document-actions">
    <button onclick="window.print()">Imprimer / Enregistrer en PDF</button>
    <button class="secondary" onclick="if (window.opener) { window.close(); } else { history.back(); }">Retour a Kobance</button>
  </div>
  <div class="top">
    <div>
      ${profile?.logo_data_url ? `<img class="logo" src="${profile.logo_data_url}" alt="Logo" />` : ""}
      <h2>${profile?.company_name ?? "Entreprise"}</h2>
      <p>${profile?.address ?? ""}</p>
      <p>SIRET : ${profile?.siret ?? ""}</p>
      <p>${profile?.vat_number ? `TVA : ${profile.vat_number}` : ""}</p>
    </div>
    <div>
      <h1>Facture</h1>
      <p><strong>${invoiceNumber(row)}</strong></p>
      <p class="muted">Date : ${new Date(row.invoice_date).toLocaleDateString("fr-FR")}</p>
      <p class="muted">Statut : ${row.status === "PAID" ? "Payee" : "Non payee"}</p>
    </div>
  </div>
  <div class="box">
    <h2>Client</h2>
    <p><strong>${client?.name ?? ""}</strong></p>
    <p>${client?.address ?? ""}</p>
    <p>${client?.email ?? ""}</p>
    <p>${client?.siret ? `SIRET : ${client.siret}` : ""}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>HT</th>
        <th>Remise</th>
        <th>TVA</th>
        <th>TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${row.description}</td>
        <td>${formatEuro(row.amount_ht)}</td>
        <td>${discount}</td>
        <td>${formatEuro(row.vat_amount)} (${Number(row.vat_rate).toLocaleString("fr-FR")} %)</td>
        <td>${formatEuro(row.amount_ttc)}</td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Total HT</span><strong>${formatEuro(row.amount_ht)}</strong></div>
    <div class="total-row"><span>TVA</span><strong>${formatEuro(row.vat_amount)}</strong></div>
    <div class="total-row grand"><span>Total TTC</span><strong>${formatEuro(row.amount_ttc)}</strong></div>
  </div>
</body>
</html>`;
  openPrintableHtml(html);
}

function generateInvoiceDocumentFromLines(invoice: InvoiceDocument, profile: Profile | null) {
  const lines = invoice.invoice_lines ?? [];
  const rows = lines.map((line) => {
    const discount =
      line.discount_type === "PERCENT"
        ? `${line.discount_value} %`
        : line.discount_type === "AMOUNT"
          ? formatEuro(line.discount_value)
          : "-";

    return `<tr>
      <td>${line.description}</td>
      <td>${Number(line.quantity).toLocaleString("fr-FR")}</td>
      <td>${formatEuro(line.unit_price_ht)}</td>
      <td>${discount}</td>
      <td>${formatEuro(line.line_ht)}</td>
      <td>${formatEuro(line.line_vat)} (${Number(line.vat_rate).toLocaleString("fr-FR")} %)</td>
      <td>${formatEuro(line.line_ttc)}</td>
    </tr>`;
  }).join("");
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${invoice.invoice_number}</title>
  <style>
    body { color: #18202f; font-family: Arial, sans-serif; margin: 40px; }
    .top { align-items: flex-start; display: flex; justify-content: space-between; gap: 32px; }
    .logo { max-height: 90px; max-width: 220px; object-fit: contain; }
    h1 { font-size: 34px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 0 0 8px; }
    p { line-height: 1.5; margin: 0; }
    .muted { color: #667085; }
    .box { border: 1px solid #dfe7e2; border-radius: 8px; margin-top: 28px; padding: 18px; }
    table { border-collapse: collapse; margin-top: 28px; width: 100%; }
    th, td { border-bottom: 1px solid #edf1ef; padding: 12px; text-align: left; }
    th { background: #f8faf9; color: #475467; font-size: 12px; text-transform: uppercase; }
    .totals { margin-left: auto; margin-top: 24px; width: 320px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .grand { border-top: 2px solid #18202f; font-size: 18px; font-weight: 700; }
    .document-actions { display: flex; gap: 10px; margin-bottom: 28px; }
    .document-actions button { background: #21725e; border: 0; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 700; padding: 12px 16px; }
    .document-actions .secondary { background: #eef4ff; color: #1849a9; }
    @media print { body { margin: 24px; } .document-actions { display: none; } }
  </style>
</head>
<body>
  <div class="document-actions">
    <button onclick="window.print()">Imprimer / Enregistrer en PDF</button>
    <button class="secondary" onclick="if (window.opener) { window.close(); } else { history.back(); }">Retour a Kobance</button>
  </div>
  <div class="top">
    <div>
      ${profile?.logo_data_url ? `<img class="logo" src="${profile.logo_data_url}" alt="Logo" />` : ""}
      <h2>${profile?.company_name ?? "Entreprise"}</h2>
      <p>${profile?.address ?? ""}</p>
      <p>SIRET : ${profile?.siret ?? ""}</p>
      <p>${profile?.vat_number ? `TVA : ${profile.vat_number}` : ""}</p>
    </div>
    <div>
      <h1>Facture</h1>
      <p><strong>${invoice.invoice_number}</strong></p>
      <p class="muted">Date : ${new Date(invoice.invoice_date).toLocaleDateString("fr-FR")}</p>
      <p class="muted">Echeance : ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("fr-FR") : "-"}</p>
    </div>
  </div>
  <div class="box">
    <h2>Client</h2>
    <p><strong>${invoice.client?.name ?? ""}</strong></p>
    <p>${invoice.client?.address ?? ""}</p>
    <p>${invoice.client?.email ?? ""}</p>
    <p>${invoice.client?.siret ? `SIRET : ${invoice.client.siret}` : ""}</p>
  </div>
  <table>
    <thead>
      <tr><th>Description</th><th>Qte</th><th>PU HT</th><th>Remise</th><th>HT</th><th>TVA</th><th>TTC</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Total HT</span><strong>${formatEuro(invoice.total_ht)}</strong></div>
    <div class="total-row"><span>TVA</span><strong>${formatEuro(invoice.total_vat)}</strong></div>
    <div class="total-row grand"><span>Total TTC</span><strong>${formatEuro(invoice.total_ttc)}</strong></div>
  </div>
  ${invoice.notes ? `<div class="box"><h2>Notes</h2><p>${invoice.notes}</p></div>` : ""}
</body>
</html>`;
  openPrintableHtml(html);
}

function generateQuoteDocumentFromLines(quote: QuoteDocument, profile: Profile | null) {
  const invoiceLike: InvoiceDocument = {
    id: quote.id,
    user_id: quote.user_id,
    client_id: quote.client_id,
    invoice_number: quote.quote_number,
    invoice_date: quote.quote_date,
    due_date: quote.valid_until,
    status: quote.status,
    total_ht: quote.total_ht,
    total_vat: quote.total_vat,
    total_ttc: quote.total_ttc,
    notes: quote.notes,
    client: quote.client,
    invoice_lines: quote.quote_lines?.map((line) => ({
      id: line.id,
      invoice_id: line.quote_id,
      user_id: line.user_id,
      article_id: line.article_id,
      description: line.description,
      quantity: line.quantity,
      unit_price_ht: line.unit_price_ht,
      discount_type: line.discount_type,
      discount_value: line.discount_value,
      vat_rate: line.vat_rate,
      line_ht: line.line_ht,
      line_vat: line.line_vat,
      line_ttc: line.line_ttc
    }))
  };

  generateInvoiceDocumentFromLines(invoiceLike, profile);
}

function generateCreditNoteDocument(creditNote: CreditNote, profile: Profile | null) {
  const lines = creditNote.credit_note_lines ?? [];
  const rows = lines.map((line) => `<tr>
      <td>${line.description}</td>
      <td>-${formatEuro(line.line_ht)}</td>
      <td>-${formatEuro(line.line_vat)} (${Number(line.vat_rate).toLocaleString("fr-FR")} %)</td>
      <td>-${formatEuro(line.line_ttc)}</td>
    </tr>`).join("");
  const summary = summarizeCreditNote(creditNote);
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${creditNote.credit_note_number}</title>
  <style>
    body { color: #18202f; font-family: Arial, sans-serif; margin: 40px; }
    .top { align-items: flex-start; display: flex; justify-content: space-between; gap: 32px; }
    .logo { max-height: 90px; max-width: 220px; object-fit: contain; }
    h1 { font-size: 34px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 0 0 8px; }
    p { line-height: 1.5; margin: 0; }
    .muted { color: #667085; }
    .box { border: 1px solid #dfe7e2; border-radius: 8px; margin-top: 28px; padding: 18px; }
    table { border-collapse: collapse; margin-top: 28px; width: 100%; }
    th, td { border-bottom: 1px solid #edf1ef; padding: 12px; text-align: left; }
    th { background: #f8faf9; color: #475467; font-size: 12px; text-transform: uppercase; }
    .totals { margin-left: auto; margin-top: 24px; width: 320px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .grand { border-top: 2px solid #18202f; font-size: 18px; font-weight: 700; }
    .document-actions { display: flex; gap: 10px; margin-bottom: 28px; }
    .document-actions button { background: #21725e; border: 0; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 700; padding: 12px 16px; }
    .document-actions .secondary { background: #eef4ff; color: #1849a9; }
    @media print { body { margin: 24px; } .document-actions { display: none; } }
  </style>
</head>
<body>
  <div class="document-actions">
    <button onclick="window.print()">Imprimer / Enregistrer en PDF</button>
    <button class="secondary" onclick="if (window.opener) { window.close(); } else { history.back(); }">Retour a Kobance</button>
  </div>
  <div class="top">
    <div>
      ${profile?.logo_data_url ? `<img class="logo" src="${profile.logo_data_url}" alt="Logo" />` : ""}
      <h2>${profile?.company_name ?? "Entreprise"}</h2>
      <p>${profile?.address ?? ""}</p>
      <p>SIRET : ${profile?.siret ?? ""}</p>
      <p>${profile?.vat_number ? `TVA : ${profile.vat_number}` : ""}</p>
    </div>
    <div>
      <h1>Avoir</h1>
      <p><strong>${creditNote.credit_note_number}</strong></p>
      <p class="muted">Date : ${new Date(creditNote.credit_note_date).toLocaleDateString("fr-FR")}</p>
      <p class="muted">Facture : ${creditNote.invoice?.invoice_number ?? "-"}</p>
    </div>
  </div>
  <div class="box">
    <h2>Client</h2>
    <p><strong>${creditNote.client?.name ?? ""}</strong></p>
    <p>${creditNote.client?.address ?? ""}</p>
    <p>${creditNote.client?.email ?? ""}</p>
  </div>
  <div class="box">
    <h2>Motif</h2>
    <p>${creditNote.reason}</p>
  </div>
  ${lines.length > 0 ? `<table>
    <thead>
      <tr><th>Description</th><th>HT</th><th>TVA</th><th>TTC</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>` : ""}
  <div class="totals">
    <div class="total-row"><span>Total HT</span><strong>-${formatEuro(summary.total_ht)}</strong></div>
    <div class="total-row"><span>TVA</span><strong>-${formatEuro(summary.total_vat)}</strong></div>
    <div class="total-row grand"><span>Total TTC</span><strong>-${formatEuro(summary.total_ttc)}</strong></div>
  </div>
</body>
</html>`;
  openPrintableHtml(html);
}

export function RealWorkspace({
  onLogout,
  userEmail,
  userId,
  userName
}: {
  onLogout: () => void;
  userEmail: string;
  userId: string;
  userName: string;
}) {
  const whatsappUrl = supportWhatsappUrl();
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [activeCompanyUserId, setActiveCompanyUserId] = useState(userId);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [teamMembers, setTeamMembers] = useState<CompanyMember[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [clients, setClients] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [quoteDocuments, setQuoteDocuments] = useState<QuoteDocument[]>([]);
  const [invoiceDocuments, setInvoiceDocuments] = useState<InvoiceDocument[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [clientForm, setClientForm] = useState(emptyParty);
  const [supplierForm, setSupplierForm] = useState(emptyParty);
  const [articleForm, setArticleForm] = useState(emptyArticle);
  const [quoteDocumentForm, setQuoteDocumentForm] = useState(emptyQuoteDocument);
  const [quoteLineForm, setQuoteLineForm] = useState(emptyInvoiceLine);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [invoiceDocumentForm, setInvoiceDocumentForm] = useState(emptyInvoiceDocument);
  const [invoiceLineForm, setInvoiceLineForm] = useState(emptyInvoiceLine);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState(emptyInvoice);
  const [purchaseForm, setPurchaseForm] = useState(emptyInvoice);
  const [bankTransactionForm, setBankTransactionForm] = useState(emptyBankTransaction);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editingBankTransactionId, setEditingBankTransactionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const period = useMemo(() => {
    const start = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(selectedYear, selectedMonth, 1)).toISOString().slice(0, 10);

    return { start, end };
  }, [selectedMonth, selectedYear]);

  const isCompanyOwner = activeCompanyUserId === userId;
  const currentCompanyUserId = activeCompanyUserId;

  async function loadData() {
    setError("");
    const membershipsRes = await supabase
      .from("company_members")
      .select("*")
      .order("created_at", { ascending: true });

    if (membershipsRes.error) {
      setError(displaySupabaseError(membershipsRes.error.message));
      return;
    }

    const memberships = (membershipsRes.data ?? []) as CompanyMember[];
    const invitedCompany = memberships.find((member) => member.owner_user_id !== userId);
    const companyUserId = activeCompanyUserId === userId && invitedCompany ? invitedCompany.owner_user_id : activeCompanyUserId;

    if (companyUserId !== activeCompanyUserId) {
      setActiveCompanyUserId(companyUserId);
    }

    const [profileRes, articlesRes, clientsRes, suppliersRes, quotesRes, invoicesRes, creditNotesRes, salesRes, purchasesRes, bankTransactionsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", companyUserId).maybeSingle(),
      supabase.from("articles").select("*").eq("user_id", companyUserId).order("name"),
      supabase.from("clients").select("*").eq("user_id", companyUserId).order("name"),
      supabase.from("suppliers").select("*").eq("user_id", companyUserId).order("name"),
      supabase
        .from("quotes")
        .select("*, client:clients(*), quote_lines(*)")
        .eq("user_id", companyUserId)
        .gte("quote_date", period.start)
        .lt("quote_date", period.end)
        .order("quote_date", { ascending: false }),
      supabase
        .from("invoices")
        .select("*, client:clients(*), invoice_lines(*)")
        .eq("user_id", companyUserId)
        .gte("invoice_date", period.start)
        .lt("invoice_date", period.end)
        .order("invoice_date", { ascending: false }),
      supabase
        .from("credit_notes")
        .select("*, client:clients(*), invoice:invoices(*), credit_note_lines(*)")
        .eq("user_id", companyUserId)
        .gte("credit_note_date", period.start)
        .lt("credit_note_date", period.end)
        .order("credit_note_date", { ascending: false }),
      supabase
        .from("sales")
        .select("*, client:clients(*)")
        .eq("user_id", companyUserId)
        .gte("invoice_date", period.start)
        .lt("invoice_date", period.end)
        .order("invoice_date", { ascending: false }),
      supabase
        .from("purchases")
        .select("*, supplier:suppliers(*)")
        .eq("user_id", companyUserId)
        .gte("invoice_date", period.start)
        .lt("invoice_date", period.end)
        .order("invoice_date", { ascending: false }),
      supabase
        .from("bank_transactions")
        .select("*")
        .eq("user_id", companyUserId)
        .gte("transaction_date", period.start)
        .lt("transaction_date", period.end)
        .order("transaction_date", { ascending: false })
    ]);

    const firstError = profileRes.error ?? articlesRes.error ?? clientsRes.error ?? suppliersRes.error ?? quotesRes.error ?? invoicesRes.error ?? creditNotesRes.error ?? salesRes.error ?? purchasesRes.error ?? bankTransactionsRes.error;

    if (firstError) {
      setError(firstError.message);
      return;
    }

    setProfile(profileRes.data);
    setTeamMembers(memberships.filter((member) => member.owner_user_id === companyUserId));
    setProfileForm({
      company_name: profileRes.data?.company_name ?? "",
      siret: profileRes.data?.siret ?? "",
      vat_number: profileRes.data?.vat_number ?? "",
      address: profileRes.data?.address ?? "",
      phone: profileRes.data?.phone ?? "",
      logo_data_url: profileRes.data?.logo_data_url ?? ""
    });
    setArticles((articlesRes.data ?? []) as Article[]);
    setClients(clientsRes.data ?? []);
    setSuppliers(suppliersRes.data ?? []);
    setQuoteDocuments((quotesRes.data ?? []) as QuoteDocument[]);
    setInvoiceDocuments((invoicesRes.data ?? []) as InvoiceDocument[]);
    setCreditNotes((creditNotesRes.data ?? []) as CreditNote[]);
    setSales((salesRes.data ?? []) as Sale[]);
    setPurchases((purchasesRes.data ?? []) as Purchase[]);
    setBankTransactions((bankTransactionsRes.data ?? []) as BankTransaction[]);
  }

  useEffect(() => {
    void loadData();
  }, [activeCompanyUserId, period.start, period.end]);

  const totals = useMemo(() => {
    const accountingInvoices = invoiceDocuments.filter((invoice) => invoice.status === "ISSUED" || invoice.status === "PAID");
    const creditSummary = creditNotes.reduce(
      (acc, item) => {
        const summary = summarizeCreditNote(item);

        return {
          total_ht: acc.total_ht + summary.total_ht,
          total_vat: acc.total_vat + summary.total_vat,
          total_ttc: acc.total_ttc + summary.total_ttc
        };
      },
      { total_ht: 0, total_vat: 0, total_ttc: 0 }
    );
    const salesHt = accountingInvoices.reduce((sum, item) => sum + Number(item.total_ht), 0) - creditSummary.total_ht;
    const salesTtc = accountingInvoices.reduce((sum, item) => sum + Number(item.total_ttc), 0) - creditSummary.total_ttc;
    const purchasesHt = purchases.reduce((sum, item) => sum + Number(item.amount_ht), 0);
    const purchasesTtc = purchases.reduce((sum, item) => sum + Number(item.amount_ttc), 0);
    const collectedVat = accountingInvoices.reduce((sum, item) => sum + Number(item.total_vat), 0) - creditSummary.total_vat;
    const deductibleVat = purchases.reduce((sum, item) => sum + Number(item.vat_amount), 0);
    const bankIncome = bankTransactions
      .filter((transaction) => transaction.transaction_type === "INCOME")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const bankExpenses = bankTransactions
      .filter((transaction) => transaction.transaction_type === "EXPENSE")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const bankUnreconciled = bankTransactions
      .filter((transaction) => !isBankTransactionReconciled(transaction))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const bankReconciledCount = bankTransactions.filter(isBankTransactionReconciled).length;

    return {
      salesHt,
      salesTtc,
      purchasesHt,
      purchasesTtc,
      collectedVat,
      deductibleVat,
      vatDue: collectedVat - deductibleVat,
      profit: salesHt - purchasesHt,
      bankIncome,
      bankExpenses,
      bankBalance: bankIncome - bankExpenses,
      bankUnreconciled,
      bankReconciledCount
    };
  }, [bankTransactions, creditNotes, invoiceDocuments, purchases]);

  async function createParty(table: "clients" | "suppliers", form: typeof emptyParty) {
    if (!isValidName(form.name)) {
      setError("Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("L'email doit respecter le format exemple@mail.com.");
      return;
    }

    if (form.siret && !isValidSiret(form.siret)) {
      setError("Le SIRET doit contenir exactement 14 chiffres.");
      return;
    }

    if (!isValidFrenchVat(form.vat_number)) {
      setError("Le numero de TVA doit respecter le format francais, par exemple FR12345678901.");
      return;
    }

    const { error: insertError } = await supabase.from(table).insert({
      ...form,
      siret: form.siret ? normalizeSiret(form.siret) : "",
      vat_number: form.vat_number ? normalizeFrenchVat(form.vat_number) : "",
      user_id: currentCompanyUserId
    });

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    await loadData();
  }

  async function updateParty(table: "clients" | "suppliers", id: string, form: typeof emptyParty) {
    if (!isValidName(form.name)) {
      setError("Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("L'email doit respecter le format exemple@mail.com.");
      return;
    }

    if (form.siret && !isValidSiret(form.siret)) {
      setError("Le SIRET doit contenir exactement 14 chiffres.");
      return;
    }

    if (!isValidFrenchVat(form.vat_number)) {
      setError("Le numero de TVA doit respecter le format francais, par exemple FR12345678901.");
      return;
    }

    const { error: updateError } = await supabase.from(table).update({
      ...form,
      siret: form.siret ? normalizeSiret(form.siret) : "",
      vat_number: form.vat_number ? normalizeFrenchVat(form.vat_number) : ""
    }).eq("id", id);

    if (updateError) {
      setError(displaySupabaseError(updateError.message));
      return;
    }

    await loadData();
  }

  async function createArticle(form: typeof emptyArticle) {
    if (!isValidName(form.name)) {
      setError("Le nom de l'article ne doit contenir que des lettres, espaces, tirets ou apostrophes.");
      return;
    }

    const { error: insertError } = await supabase.from("articles").insert({
      user_id: currentCompanyUserId,
      reference: form.reference || null,
      name: form.name,
      description: form.description || null,
      unit_price_ht: Number(form.unit_price_ht),
      vat_rate: Number(form.vat_rate)
    });

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    await loadData();
  }

  async function updateArticle(id: string, form: typeof emptyArticle) {
    if (!isValidName(form.name)) {
      setError("Le nom de l'article ne doit contenir que des lettres, espaces, tirets ou apostrophes.");
      return;
    }

    const { error: updateError } = await supabase.from("articles").update({
      reference: form.reference || null,
      name: form.name,
      description: form.description || null,
      unit_price_ht: Number(form.unit_price_ht),
      vat_rate: Number(form.vat_rate)
    }).eq("id", id);

    if (updateError) {
      setError(displaySupabaseError(updateError.message));
      return;
    }

    await loadData();
  }

  async function createInvoice(table: "sales" | "purchases", form: typeof emptyInvoice) {
    const amounts = table === "sales"
      ? calculateSaleAmounts(form.amountHt, form.vatRate, form.discountType, form.discountValue)
      : calculateAmounts(form.amountHt, form.vatRate);

    const { error: insertError } = await supabase.from(table).insert({
      user_id: currentCompanyUserId,
      party_id: form.partyId,
      ...(table === "sales" ? {
        article_id: form.articleId || null,
        discount_type: form.discountType,
        discount_value: Number(form.discountValue || 0)
      } : {}),
      invoice_date: form.date,
      description: form.description,
      status: form.status,
      ...amounts
    });

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    await loadData();
  }

  async function updateInvoice(table: "sales" | "purchases", id: string, form: typeof emptyInvoice) {
    const amounts = table === "sales"
      ? calculateSaleAmounts(form.amountHt, form.vatRate, form.discountType, form.discountValue)
      : calculateAmounts(form.amountHt, form.vatRate);

    const { error: updateError } = await supabase.from(table).update({
      party_id: form.partyId,
      ...(table === "sales" ? {
        article_id: form.articleId || null,
        discount_type: form.discountType,
        discount_value: Number(form.discountValue || 0)
      } : {}),
      invoice_date: form.date,
      description: form.description,
      status: form.status,
      ...amounts
    }).eq("id", id);

    if (updateError) {
      setError(displaySupabaseError(updateError.message));
      return;
    }

    await loadData();
  }

  async function createBankTransaction(form: typeof emptyBankTransaction) {
    const linkedInvoiceId = form.reconciliationType === "INVOICE" ? form.linkedInvoiceId || null : null;
    const linkedPurchaseId = form.reconciliationType === "PURCHASE" ? form.linkedPurchaseId || null : null;

    const { error: insertError } = await supabase.from("bank_transactions").insert({
      user_id: currentCompanyUserId,
      transaction_date: form.transactionDate,
      label: form.label,
      transaction_type: form.transactionType,
      amount: Number(form.amount),
      reference: form.reference || null,
      notes: form.notes || null,
      linked_invoice_id: linkedInvoiceId,
      linked_purchase_id: linkedPurchaseId,
      reconciled: form.reconciled || Boolean(linkedInvoiceId) || Boolean(linkedPurchaseId)
    });

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    await loadData();
  }

  async function updateBankTransaction(id: string, form: typeof emptyBankTransaction) {
    const linkedInvoiceId = form.reconciliationType === "INVOICE" ? form.linkedInvoiceId || null : null;
    const linkedPurchaseId = form.reconciliationType === "PURCHASE" ? form.linkedPurchaseId || null : null;

    const { error: updateError } = await supabase.from("bank_transactions").update({
      transaction_date: form.transactionDate,
      label: form.label,
      transaction_type: form.transactionType,
      amount: Number(form.amount),
      reference: form.reference || null,
      notes: form.notes || null,
      linked_invoice_id: linkedInvoiceId,
      linked_purchase_id: linkedPurchaseId,
      reconciled: form.reconciled || Boolean(linkedInvoiceId) || Boolean(linkedPurchaseId)
    }).eq("id", id);

    if (updateError) {
      setError(displaySupabaseError(updateError.message));
      return;
    }

    await loadData();
  }

  async function toggleBankTransactionReconciled(row: BankTransaction) {
    const nextReconciled = !isBankTransactionReconciled(row);
    const { error: updateError } = await supabase
      .from("bank_transactions")
      .update({
        reconciled: nextReconciled,
        linked_invoice_id: nextReconciled ? row.linked_invoice_id : null,
        linked_purchase_id: nextReconciled ? row.linked_purchase_id : null
      })
      .eq("id", row.id);

    if (updateError) {
      setError(displaySupabaseError(updateError.message));
      return;
    }

    await loadData();
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidName(profileForm.company_name)) {
      setError("Le nom de l'entreprise ne doit contenir que des lettres, espaces, tirets ou apostrophes.");
      return;
    }

    if (!isValidSiret(profileForm.siret)) {
      setError("Le SIRET doit contenir exactement 14 chiffres.");
      return;
    }

    if (!isValidFrenchVat(profileForm.vat_number)) {
      setError("Le numero de TVA doit respecter le format francais, par exemple FR12345678901.");
      return;
    }

    const { error: upsertError } = await supabase.from("profiles").upsert({
      user_id: currentCompanyUserId,
      company_name: profileForm.company_name,
      siret: normalizeSiret(profileForm.siret),
      vat_number: profileForm.vat_number ? normalizeFrenchVat(profileForm.vat_number) : null,
      address: profileForm.address || null,
      phone: profileForm.phone || null,
      logo_data_url: profileForm.logo_data_url || null
    });

    if (upsertError) {
      setError(displaySupabaseError(upsertError.message));
      return;
    }

    await loadData();
  }

  async function inviteCompanyMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isCompanyOwner) {
      setError("Seul le proprietaire de l'entreprise peut inviter un utilisateur.");
      return;
    }

    const email = memberEmail.trim().toLowerCase();

    if (!email) {
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("L'email doit respecter le format exemple@mail.com.");
      return;
    }

    const { error: inviteError } = await supabase.from("company_members").upsert({
      owner_user_id: currentCompanyUserId,
      member_email: email,
      role: "ACCOUNTING"
    });

    if (inviteError) {
      setError(displaySupabaseError(inviteError.message));
      return;
    }

    setMemberEmail("");
    await loadData();
  }

  async function removeCompanyMember(id: string) {
    if (!isCompanyOwner) {
      setError("Seul le proprietaire de l'entreprise peut retirer un utilisateur.");
      return;
    }

    await remove("company_members", id);
  }

  async function recalculateInvoiceTotals(invoiceId: string) {
    const { data, error: linesError } = await supabase
      .from("invoice_lines")
      .select("line_ht,line_vat,line_ttc")
      .eq("invoice_id", invoiceId);

    if (linesError) {
      setError(displaySupabaseError(linesError.message));
      return;
    }

    const totals = (data ?? []).reduce(
      (acc, line) => ({
        total_ht: acc.total_ht + Number(line.line_ht),
        total_vat: acc.total_vat + Number(line.line_vat),
        total_ttc: acc.total_ttc + Number(line.line_ttc)
      }),
      { total_ht: 0, total_vat: 0, total_ttc: 0 }
    );

    const { error: updateError } = await supabase.from("invoices").update(totals).eq("id", invoiceId);

    if (updateError) {
      setError(displaySupabaseError(updateError.message));
    }
  }

  async function recalculateQuoteTotals(quoteId: string) {
    const { data, error: linesError } = await supabase
      .from("quote_lines")
      .select("line_ht,line_vat,line_ttc")
      .eq("quote_id", quoteId);

    if (linesError) {
      setError(displaySupabaseError(linesError.message));
      return;
    }

    const totals = (data ?? []).reduce(
      (acc, line) => ({
        total_ht: acc.total_ht + Number(line.line_ht),
        total_vat: acc.total_vat + Number(line.line_vat),
        total_ttc: acc.total_ttc + Number(line.line_ttc)
      }),
      { total_ht: 0, total_vat: 0, total_ttc: 0 }
    );

    const { error: updateError } = await supabase.from("quotes").update(totals).eq("id", quoteId);

    if (updateError) {
      setError(displaySupabaseError(updateError.message));
    }
  }

  async function createQuoteDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let quoteNumber = "";

    try {
      quoteNumber = await nextDocumentNumber("DEV", currentCompanyUserId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible de generer le numero de devis.");
      return;
    }

    const { data, error: insertError } = await supabase.from("quotes").insert({
      user_id: currentCompanyUserId,
      client_id: quoteDocumentForm.clientId,
      quote_number: quoteNumber,
      quote_date: quoteDocumentForm.quoteDate,
      valid_until: quoteDocumentForm.validUntil || null,
      notes: quoteDocumentForm.notes || null
    }).select("id").single();

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    setSelectedQuoteId(data.id);
    setQuoteDocumentForm(emptyQuoteDocument);
    await loadData();
  }

  async function addQuoteLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedQuoteId) {
      setError("Selectionnez un devis avant d'ajouter une ligne.");
      return;
    }

    if (!isPositiveInteger(quoteLineForm.quantity)) {
      setError("La quantite doit etre un nombre entier positif, par exemple 1 ou 2. Les valeurs comme 0.5 ne sont pas acceptees.");
      return;
    }

    const amounts = calculateLineAmounts(
      quoteLineForm.quantity,
      quoteLineForm.unitPriceHt,
      quoteLineForm.vatRate,
      quoteLineForm.discountType,
      quoteLineForm.discountValue
    );
    const { error: insertError } = await supabase.from("quote_lines").insert({
      quote_id: selectedQuoteId,
      user_id: currentCompanyUserId,
      article_id: quoteLineForm.articleId || null,
      description: quoteLineForm.description,
      quantity: Number(quoteLineForm.quantity),
      unit_price_ht: Number(quoteLineForm.unitPriceHt),
      discount_type: quoteLineForm.discountType,
      discount_value: Number(quoteLineForm.discountValue || 0),
      vat_rate: Number(quoteLineForm.vatRate),
      line_ht: amounts.amount_ht,
      line_vat: amounts.vat_amount,
      line_ttc: amounts.amount_ttc
    });

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    await recalculateQuoteTotals(selectedQuoteId);
    setQuoteLineForm(emptyInvoiceLine);
    await loadData();
  }

  async function deleteQuoteDocument(id: string) {
    await remove("quotes", id);
    if (selectedQuoteId === id) {
      setSelectedQuoteId(null);
    }
  }

  async function deleteQuoteLine(line: QuoteLine) {
    await remove("quote_lines", line.id);
    await recalculateQuoteTotals(line.quote_id);
    await loadData();
  }

  async function convertQuoteToInvoice(quote: QuoteDocument) {
    let invoiceNumber = "";

    try {
      invoiceNumber = await nextDocumentNumber("FAC", currentCompanyUserId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible de generer le numero de facture.");
      return;
    }

    const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert({
      user_id: currentCompanyUserId,
      client_id: quote.client_id,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      notes: quote.notes,
      total_ht: quote.total_ht,
      total_vat: quote.total_vat,
      total_ttc: quote.total_ttc
    }).select("id").single();

    if (invoiceError) {
      setError(displaySupabaseError(invoiceError.message));
      return;
    }

    const lines = (quote.quote_lines ?? []).map((line) => ({
      invoice_id: invoice.id,
      user_id: currentCompanyUserId,
      article_id: line.article_id,
      description: line.description,
      quantity: line.quantity,
      unit_price_ht: line.unit_price_ht,
      discount_type: line.discount_type,
      discount_value: line.discount_value,
      vat_rate: line.vat_rate,
      line_ht: line.line_ht,
      line_vat: line.line_vat,
      line_ttc: line.line_ttc
    }));

    if (lines.length > 0) {
      const { error: linesError } = await supabase.from("invoice_lines").insert(lines);

      if (linesError) {
        setError(displaySupabaseError(linesError.message));
        return;
      }
    }

    await supabase.from("quotes").update({ status: "ISSUED" }).eq("id", quote.id);
    setSelectedInvoiceId(invoice.id);
    goToPage("invoices");
    await loadData();
  }

  async function createInvoiceDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let invoiceNumber = "";

    try {
      invoiceNumber = await nextDocumentNumber("FAC", currentCompanyUserId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible de generer le numero de facture.");
      return;
    }

    const { data, error: insertError } = await supabase.from("invoices").insert({
      user_id: currentCompanyUserId,
      client_id: invoiceDocumentForm.clientId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDocumentForm.invoiceDate,
      due_date: invoiceDocumentForm.dueDate || null,
      notes: invoiceDocumentForm.notes || null
    }).select("id").single();

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    setSelectedInvoiceId(data.id);
    setInvoiceDocumentForm(emptyInvoiceDocument);
    await loadData();
  }

  async function addInvoiceLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedInvoiceId) {
      setError("Selectionnez une facture avant d'ajouter une ligne.");
      return;
    }

    if (!isPositiveInteger(invoiceLineForm.quantity)) {
      setError("La quantite doit etre un nombre entier positif, par exemple 1 ou 2. Les valeurs comme 0.5 ne sont pas acceptees.");
      return;
    }

    const amounts = calculateLineAmounts(
      invoiceLineForm.quantity,
      invoiceLineForm.unitPriceHt,
      invoiceLineForm.vatRate,
      invoiceLineForm.discountType,
      invoiceLineForm.discountValue
    );
    const { error: insertError } = await supabase.from("invoice_lines").insert({
      invoice_id: selectedInvoiceId,
      user_id: currentCompanyUserId,
      article_id: invoiceLineForm.articleId || null,
      description: invoiceLineForm.description,
      quantity: Number(invoiceLineForm.quantity),
      unit_price_ht: Number(invoiceLineForm.unitPriceHt),
      discount_type: invoiceLineForm.discountType,
      discount_value: Number(invoiceLineForm.discountValue || 0),
      vat_rate: Number(invoiceLineForm.vatRate),
      line_ht: amounts.amount_ht,
      line_vat: amounts.vat_amount,
      line_ttc: amounts.amount_ttc
    });

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    await recalculateInvoiceTotals(selectedInvoiceId);
    setInvoiceLineForm(emptyInvoiceLine);
    await loadData();
  }

  async function deleteInvoiceDocument(id: string) {
    const invoice = invoiceDocuments.find((item) => item.id === id);

    if (invoice && invoice.status !== "DRAFT") {
      setError("Seules les factures en brouillon peuvent etre supprimees.");
      return;
    }

    await remove("invoices", id);
    if (selectedInvoiceId === id) {
      setSelectedInvoiceId(null);
    }
  }

  async function deleteInvoiceLine(line: InvoiceLine) {
    const invoice = invoiceDocuments.find((item) => item.id === line.invoice_id);

    if (invoice && invoice.status !== "DRAFT") {
      setError("Seules les factures en brouillon peuvent etre modifiees.");
      return;
    }

    await remove("invoice_lines", line.id);
    await recalculateInvoiceTotals(line.invoice_id);
    await loadData();
  }

  async function updateInvoiceStatus(invoice: InvoiceDocument, status: DocumentStatus) {
    if (status === "ISSUED" && (invoice.invoice_lines?.length ?? 0) === 0) {
      setError("Impossible de valider une facture sans ligne.");
      return;
    }

    const { error: updateError } = await supabase.from("invoices").update({ status }).eq("id", invoice.id);

    if (updateError) {
      setError(displaySupabaseError(updateError.message));
      return;
    }

    await loadData();
  }

  async function createCreditNote(invoice: InvoiceDocument) {
    const reason = window.prompt("Motif de l'avoir", "Ajustement de facture");

    if (!reason) {
      return;
    }

    const amountInput = window.prompt(
      "Montant TTC de l'avoir",
      String(Number(invoice.total_ttc).toFixed(2))
    );

    if (!amountInput) {
      return;
    }

    const creditTtc = Number(amountInput.replace(",", "."));

    if (!Number.isFinite(creditTtc) || creditTtc <= 0 || creditTtc > Number(invoice.total_ttc)) {
      setError("Montant d'avoir invalide. Il doit etre superieur a 0 et inferieur ou egal au TTC de la facture.");
      return;
    }

    const invoiceLines = invoice.invoice_lines ?? [];
    const ratio = Number(invoice.total_ttc) > 0 ? creditTtc / Number(invoice.total_ttc) : 0;
    const creditHt = Math.round(Number(invoice.total_ht) * ratio * 100) / 100;
    const creditVat = Math.round((creditTtc - creditHt) * 100) / 100;
    let creditNoteNumber = "";

    try {
      creditNoteNumber = await nextDocumentNumber("AV", currentCompanyUserId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible de generer le numero d'avoir.");
      return;
    }

    const { data: creditNote, error: insertError } = await supabase.from("credit_notes").insert({
      user_id: currentCompanyUserId,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      credit_note_number: creditNoteNumber,
      credit_note_date: new Date().toISOString().slice(0, 10),
      reason,
      total_ht: creditHt,
      total_vat: creditVat,
      total_ttc: creditTtc
    }).select("id").single();

    if (insertError) {
      setError(displaySupabaseError(insertError.message));
      return;
    }

    if (invoiceLines.length > 0 && creditNote?.id) {
      let usedHt = 0;
      let usedVat = 0;
      let usedTtc = 0;
      const creditLines = invoiceLines.map((line, index) => {
        const isLast = index === invoiceLines.length - 1;
        const lineHt = isLast ? Math.round((creditHt - usedHt) * 100) / 100 : Math.round(Number(line.line_ht) * ratio * 100) / 100;
        const lineVat = isLast ? Math.round((creditVat - usedVat) * 100) / 100 : Math.round(Number(line.line_vat) * ratio * 100) / 100;
        const lineTtc = isLast ? Math.round((creditTtc - usedTtc) * 100) / 100 : Math.round(Number(line.line_ttc) * ratio * 100) / 100;

        usedHt += lineHt;
        usedVat += lineVat;
        usedTtc += lineTtc;

        return {
          credit_note_id: creditNote.id,
          user_id: currentCompanyUserId,
          invoice_line_id: line.id,
          description: line.description,
          vat_rate: Number(line.vat_rate),
          line_ht: lineHt,
          line_vat: lineVat,
          line_ttc: lineTtc
        };
      }).filter((line) => line.line_ttc > 0);

      if (creditLines.length > 0) {
        const { error: linesError } = await supabase.from("credit_note_lines").insert(creditLines);

        if (linesError) {
          setError(displaySupabaseError(linesError.message));
          return;
        }
      }
    }

    await loadData();
  }

  async function remove(table: "articles" | "clients" | "suppliers" | "company_members" | "quotes" | "quote_lines" | "invoices" | "invoice_lines" | "sales" | "purchases" | "bank_transactions", id: string) {
    if (!window.confirm("Confirmer la suppression ?")) {
      return;
    }

    const { error: deleteError } = await supabase.from(table).delete().eq("id", id);

    if (deleteError) {
      setError(displaySupabaseError(deleteError.message));
      return;
    }

    await loadData();
  }

  function validatePartyForm(form: typeof emptyParty) {
    if (!isValidName(form.name)) {
      setError("Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes.");
      return false;
    }

    if (!isValidEmail(form.email)) {
      setError("L'email doit respecter le format exemple@mail.com.");
      return false;
    }

    if (form.siret && !isValidSiret(form.siret)) {
      setError("Le SIRET doit contenir exactement 14 chiffres.");
      return false;
    }

    if (!isValidFrenchVat(form.vat_number)) {
      setError("Le numero de TVA doit respecter le format francais, par exemple FR12345678901.");
      return false;
    }

    return true;
  }

  function validateArticleForm(form: typeof emptyArticle) {
    if (!isValidName(form.name)) {
      setError("Le nom de l'article ne doit contenir que des lettres, espaces, tirets ou apostrophes.");
      return false;
    }

    return true;
  }

  function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validatePartyForm(clientForm)) {
      return;
    }

    const action = editingClientId
      ? updateParty("clients", editingClientId, clientForm)
      : createParty("clients", clientForm);

    void action.then(() => {
      setClientForm(emptyParty);
      setEditingClientId(null);
    });
  }

  function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validatePartyForm(supplierForm)) {
      return;
    }

    const action = editingSupplierId
      ? updateParty("suppliers", editingSupplierId, supplierForm)
      : createParty("suppliers", supplierForm);

    void action.then(() => {
      setSupplierForm(emptyParty);
      setEditingSupplierId(null);
    });
  }

  function submitArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateArticleForm(articleForm)) {
      return;
    }

    const action = editingArticleId
      ? updateArticle(editingArticleId, articleForm)
      : createArticle(articleForm);

    void action.then(() => {
      setArticleForm(emptyArticle);
      setEditingArticleId(null);
    });
  }

  function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editingSaleId
      ? updateInvoice("sales", editingSaleId, saleForm)
      : createInvoice("sales", saleForm);

    void action.then(() => {
      setSaleForm(emptyInvoice);
      setEditingSaleId(null);
    });
  }

  function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editingPurchaseId
      ? updateInvoice("purchases", editingPurchaseId, purchaseForm)
      : createInvoice("purchases", purchaseForm);

    void action.then(() => {
      setPurchaseForm(emptyInvoice);
      setEditingPurchaseId(null);
    });
  }

  function submitBankTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editingBankTransactionId
      ? updateBankTransaction(editingBankTransactionId, bankTransactionForm)
      : createBankTransaction(bankTransactionForm);

    void action.then(() => {
      setBankTransactionForm(emptyBankTransaction);
      setEditingBankTransactionId(null);
    });
  }

  function editParty(row: Party, type: "client" | "supplier") {
    const form = {
      name: row.name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
      siret: row.siret ?? "",
      vat_number: row.vat_number ?? ""
    };

    if (type === "client") {
      setClientForm(form);
      setEditingClientId(row.id);
      return;
    }

    setSupplierForm(form);
    setEditingSupplierId(row.id);
  }

  function editInvoice(row: Sale | Purchase, type: "sale" | "purchase") {
    const form = {
      partyId: row.party_id,
      articleId: row.article_id ?? "",
      date: row.invoice_date,
      description: row.description,
      amountHt: String(row.amount_ht),
      vatRate: String(row.vat_rate),
      discountType: row.discount_type ?? "NONE",
      discountValue: String(row.discount_value ?? ""),
      status: row.status
    };

    if (type === "sale") {
      setSaleForm(form);
      setEditingSaleId(row.id);
      return;
    }

    setPurchaseForm(form);
    setEditingPurchaseId(row.id);
  }

  function editBankTransaction(row: BankTransaction) {
    const reconciliationType = row.linked_invoice_id ? "INVOICE" : row.linked_purchase_id ? "PURCHASE" : "NONE";

    setBankTransactionForm({
      transactionDate: row.transaction_date,
      label: row.label,
      transactionType: row.transaction_type,
      amount: String(row.amount),
      reference: row.reference ?? "",
      notes: row.notes ?? "",
      reconciliationType,
      linkedInvoiceId: row.linked_invoice_id ?? "",
      linkedPurchaseId: row.linked_purchase_id ?? "",
      reconciled: row.reconciled
    });
    setEditingBankTransactionId(row.id);
  }

  function editArticle(row: Article) {
    setArticleForm({
      reference: row.reference ?? "",
      name: row.name,
      description: row.description ?? "",
      unit_price_ht: String(row.unit_price_ht),
      vat_rate: String(row.vat_rate)
    });
    setEditingArticleId(row.id);
  }

  async function importArticles(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const rows = lines.slice(1).map((line) => {
      const [reference, name, description, unitPriceHt, vatRate] = line.split(";").map((value) => value?.trim() ?? "");

      return {
        user_id: currentCompanyUserId,
        reference: reference || null,
        name,
        description: description || null,
        unit_price_ht: Number(unitPriceHt.replace(",", ".")),
        vat_rate: Number((vatRate || "20").replace(",", "."))
      };
    }).filter((row) => row.name && Number.isFinite(row.unit_price_ht));

    if (rows.length === 0) {
      setError("Import impossible : aucun article valide trouve.");
      return;
    }

    const { error: importError } = await supabase.from("articles").insert(rows);

    if (importError) {
      setError(displaySupabaseError(importError.message));
      return;
    }

    await loadData();
  }

  async function importParties(table: "clients" | "suppliers", file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const rows = lines.slice(1).map((line) => {
      const [name, email, phone, address, siret, vatNumber] = line.split(";").map((value) => value?.trim() ?? "");

      return {
        user_id: currentCompanyUserId,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        siret: siret || null,
        vat_number: vatNumber || null
      };
    }).filter((row) => row.name);

    if (rows.length === 0) {
      setError("Import impossible : aucune ligne valide trouvee.");
      return;
    }

    const { error: importError } = await supabase.from(table).insert(rows);

    if (importError) {
      setError(displaySupabaseError(importError.message));
      return;
    }

    await loadData();
  }

  function periodFilename(prefix: string) {
    return `${prefix}-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
  }

  function goToPage(nextPage: Page) {
    setPage(nextPage);
    setMobileMoreOpen(false);
  }

  const primaryMobilePages: Array<{ page: Page; icon: React.ReactNode; label: string }> = [
    { page: "dashboard", icon: <BarChart3 size={20} />, label: "Accueil" },
    { page: "invoices", icon: <ReceiptText size={20} />, label: "Factures" },
    { page: "purchases", icon: <ShoppingCart size={20} />, label: "Achats" },
    { page: "bank", icon: <CreditCard size={20} />, label: "Banque" }
  ];

  const secondaryMobilePages: Array<{ page: Page; icon: React.ReactNode; label: string }> = [
    { page: "company", icon: <Settings size={20} />, label: "Entreprise" },
    { page: "articles", icon: <Package size={20} />, label: "Articles" },
    { page: "clients", icon: <Users size={20} />, label: "Clients" },
    { page: "suppliers", icon: <Building2 size={20} />, label: "Fournisseurs" },
    { page: "quotes", icon: <FileText size={20} />, label: "Devis" },
    { page: "vat", icon: <Scale size={20} />, label: "TVA" },
    { page: "monthly", icon: <CalendarDays size={20} />, label: "Recap" }
  ];

  const currentPageLabel =
    primaryMobilePages.find((item) => item.page === page)?.label ??
    secondaryMobilePages.find((item) => item.page === page)?.label ??
    "Kobance";

  return (
    <main className="app-shell dashboard-shell">
      <header className="mobile-app-header">
        <div className="mobile-brand">
          <img alt="" src="/icon-192.png" />
          <div>
            <strong>Kobance</strong>
            <span>{currentPageLabel}</span>
          </div>
        </div>
        <button className="mobile-header-button" onClick={() => setMobileMoreOpen(true)} type="button">
          <MoreHorizontal size={22} />
          Plus
        </button>
      </header>
      <aside className="sidebar">
        <div>
          <p className="brand">Kobance</p>
          <p className="muted">Votre compta, sans prise de tete.</p>
          <p className="muted">{userName}</p>
          <nav className="nav-list">
            <Nav active={page === "dashboard"} icon={<BarChart3 size={18} />} label="Dashboard" onClick={() => goToPage("dashboard")} />
            <Nav active={page === "company"} icon={<Settings size={18} />} label="Entreprise" onClick={() => goToPage("company")} />
            <Nav active={page === "articles"} icon={<Package size={18} />} label="Articles" onClick={() => goToPage("articles")} />
            <Nav active={page === "clients"} icon={<Users size={18} />} label="Clients" onClick={() => goToPage("clients")} />
            <Nav active={page === "suppliers"} icon={<Building2 size={18} />} label="Fournisseurs" onClick={() => goToPage("suppliers")} />
            <Nav active={page === "quotes"} icon={<FileText size={18} />} label="Devis" onClick={() => goToPage("quotes")} />
            <Nav active={page === "invoices"} icon={<ReceiptText size={18} />} label="Factures" onClick={() => goToPage("invoices")} />
            <Nav active={page === "purchases"} icon={<ShoppingCart size={18} />} label="Achats" onClick={() => goToPage("purchases")} />
            <Nav active={page === "bank"} icon={<CreditCard size={18} />} label="Banque" onClick={() => goToPage("bank")} />
            <Nav active={page === "vat"} icon={<Scale size={18} />} label="TVA" onClick={() => goToPage("vat")} />
            <Nav active={page === "monthly"} icon={<CalendarDays size={18} />} label="Recap mensuel" onClick={() => goToPage("monthly")} />
          </nav>
        </div>
        <button className="ghost-button" onClick={onLogout} type="button">
          <LogOut size={18} />
          Deconnexion
        </button>
      </aside>

      <section className="dashboard-content">
        {error ? <p className="error-message">{error}</p> : null}
        <PeriodControls
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          year={selectedYear}
        />
        {page === "dashboard" ? <Dashboard month={selectedMonth} totals={totals} year={selectedYear} /> : null}
        {page === "company" ? <CompanyPage form={profileForm} isOwner={isCompanyOwner} memberEmail={memberEmail} members={teamMembers} onChange={setProfileForm} onInvite={inviteCompanyMember} onMemberEmailChange={setMemberEmail} onRemoveMember={removeCompanyMember} onSubmit={saveProfile} profile={profile} userEmail={userEmail} /> : null}
        {page === "articles" ? <ArticlesPage editingId={editingArticleId} form={articleForm} onCancel={() => { setArticleForm(emptyArticle); setEditingArticleId(null); }} onChange={setArticleForm} onDelete={(id) => remove("articles", id)} onEdit={editArticle} onImport={importArticles} onSubmit={submitArticle} rows={articles} /> : null}
        {page === "clients" ? <PartyPage editingId={editingClientId} form={clientForm} onCancel={() => { setClientForm(emptyParty); setEditingClientId(null); }} onChange={setClientForm} onEdit={(row) => editParty(row, "client")} onImport={(file) => importParties("clients", file)} onSubmit={submitClient} rows={clients} title="Clients" onDelete={(id) => remove("clients", id)} /> : null}
        {page === "suppliers" ? <PartyPage editingId={editingSupplierId} form={supplierForm} onCancel={() => { setSupplierForm(emptyParty); setEditingSupplierId(null); }} onChange={setSupplierForm} onEdit={(row) => editParty(row, "supplier")} onImport={(file) => importParties("suppliers", file)} onSubmit={submitSupplier} rows={suppliers} title="Fournisseurs" onDelete={(id) => remove("suppliers", id)} /> : null}
        {page === "quotes" ? <QuotesPage articles={articles} clients={clients} form={quoteDocumentForm} lineForm={quoteLineForm} onChange={setQuoteDocumentForm} onConvert={convertQuoteToInvoice} onDelete={deleteQuoteDocument} onDeleteLine={deleteQuoteLine} onLineChange={setQuoteLineForm} onLineSubmit={addQuoteLine} onPrint={(quote) => generateQuoteDocumentFromLines(quote, profile)} onSelect={setSelectedQuoteId} onSubmit={createQuoteDocument} selectedQuoteId={selectedQuoteId} rows={quoteDocuments} /> : null}
        {page === "invoices" ? <InvoicesPage articles={articles} clients={clients} creditNotes={creditNotes} form={invoiceDocumentForm} lineForm={invoiceLineForm} onChange={setInvoiceDocumentForm} onCreditNote={createCreditNote} onDelete={deleteInvoiceDocument} onDeleteLine={deleteInvoiceLine} onLineChange={setInvoiceLineForm} onLineSubmit={addInvoiceLine} onPrint={(invoice) => generateInvoiceDocumentFromLines(invoice, profile)} onPrintCreditNote={(creditNote) => generateCreditNoteDocument(creditNote, profile)} onSelect={setSelectedInvoiceId} onStatusChange={updateInvoiceStatus} onSubmit={createInvoiceDocument} selectedInvoiceId={selectedInvoiceId} rows={invoiceDocuments} /> : null}
        {page === "purchases" ? <InvoicePage editingId={editingPurchaseId} filename={periodFilename("achats")} onCancel={() => { setPurchaseForm(emptyInvoice); setEditingPurchaseId(null); }} onDelete={(id) => remove("purchases", id)} onEdit={(row) => editInvoice(row, "purchase")} form={purchaseForm} onChange={setPurchaseForm} onSubmit={submitPurchase} parties={suppliers} partyLabel="Fournisseur" rows={purchases} title="Achats" /> : null}
        {page === "bank" ? <BankPage editingId={editingBankTransactionId} filename={periodFilename("banque")} form={bankTransactionForm} invoices={invoiceDocuments} onCancel={() => { setBankTransactionForm(emptyBankTransaction); setEditingBankTransactionId(null); }} onChange={setBankTransactionForm} onDelete={(id) => remove("bank_transactions", id)} onEdit={editBankTransaction} onSubmit={submitBankTransaction} onToggleReconciled={toggleBankTransactionReconciled} purchases={purchases} rows={bankTransactions} totals={totals} /> : null}
        {page === "vat" ? <VatPage creditNotes={creditNotes} filename={periodFilename("tva")} invoices={invoiceDocuments} purchases={purchases} totals={totals} /> : null}
        {page === "monthly" ? <Monthly filename={periodFilename("recap-mensuel")} totals={totals} invoices={invoiceDocuments} purchases={purchases} /> : null}
      </section>
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        {primaryMobilePages.map((item) => (
          <button className={page === item.page ? "active" : ""} key={item.page} onClick={() => goToPage(item.page)} type="button">
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <button className={mobileMoreOpen || secondaryMobilePages.some((item) => item.page === page) ? "active" : ""} onClick={() => setMobileMoreOpen(true)} type="button">
          <MoreHorizontal size={20} />
          <span>Plus</span>
        </button>
      </nav>
      {mobileMoreOpen ? (
        <div className="mobile-more-backdrop" onClick={() => setMobileMoreOpen(false)} role="presentation">
          <section className="mobile-more-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-more-header">
              <div className="mobile-brand">
                <img alt="" src="/icon-192.png" />
                <div>
                  <strong>Kobance</strong>
                  <span>Modules</span>
                </div>
              </div>
              <button className="mobile-header-button" onClick={() => setMobileMoreOpen(false)} type="button">
                Fermer
              </button>
            </div>
            <div className="mobile-more-grid">
              {secondaryMobilePages.map((item) => (
                <button className={page === item.page ? "active" : ""} key={item.page} onClick={() => goToPage(item.page)} type="button">
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
              <button className="logout-mobile-button" onClick={onLogout} type="button">
                <LogOut size={20} />
                <span>Deconnexion</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {whatsappUrl ? <WhatsappSupportButton url={whatsappUrl} /> : null}
    </main>
  );
}

function WhatsappSupportButton({ url }: { url: string }) {
  return (
    <a
      aria-label="Contacter le support WhatsApp"
      className="whatsapp-support"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      <MessageCircle size={22} />
      Support
    </a>
  );
}

function Nav(props: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={props.active ? "nav-item active" : "nav-item"} onClick={props.onClick} type="button">
      {props.icon}
      {props.label}
    </button>
  );
}

function Header({ icon, subtitle, title }: { icon?: React.ReactNode; subtitle: string; title: string }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">Supabase</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {icon}
    </div>
  );
}

function PeriodControls(props: {
  month: number;
  onMonthChange: (value: number) => void;
  onYearChange: (value: number) => void;
  year: number;
}) {
  return (
    <div className="toolbar">
      <select value={props.month} onChange={(event) => props.onMonthChange(Number(event.target.value))}>
        {monthOptions.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
      <input
        aria-label="Annee"
        min="2000"
        max="2100"
        type="number"
        value={props.year}
        onChange={(event) => props.onYearChange(Number(event.target.value))}
      />
    </div>
  );
}

function Dashboard({ month, totals, year }: { month: number; totals: Record<string, number>; year: number }) {
  return (
    <>
      <Header title="Dashboard" subtitle={`Chiffres calcules depuis Supabase pour ${monthOptions[month - 1].label} ${year}.`} />
      <div className="metrics-grid">
        <Metric label="CA HT" value={formatEuro(totals.salesHt)} />
        <Metric label="Achats HT" value={formatEuro(totals.purchasesHt)} />
        <Metric label="TVA a declarer" value={formatEuro(totals.vatDue)} />
        <Metric label="Benefice estime" value={formatEuro(totals.profit)} />
      </div>
    </>
  );
}

function CompanyPage(props: {
  form: typeof emptyProfile;
  isOwner: boolean;
  memberEmail: string;
  members: CompanyMember[];
  onChange: (value: typeof emptyProfile) => void;
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onMemberEmailChange: (value: string) => void;
  onRemoveMember: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  profile: Profile | null;
  userEmail: string;
}) {
  function loadLogo(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      props.onChange({ ...props.form, logo_data_url: String(reader.result ?? "") });
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <Header
        title="Entreprise"
        subtitle={props.profile ? "Informations utilisees pour vos suivis comptables." : "Completez la fiche de votre entreprise."}
      />
      <form className="form-grid" onSubmit={props.onSubmit}>
        <input
          pattern="[A-Za-zÀ-ÖØ-öø-ÿ' -]+"
          placeholder="Raison sociale"
          required
          title="Lettres, espaces, tirets et apostrophes uniquement."
          value={props.form.company_name}
          onChange={(event) => props.onChange({ ...props.form, company_name: event.target.value })}
        />
        <input
          inputMode="numeric"
          maxLength={17}
          minLength={14}
          pattern="[0-9 ]{14,17}"
          placeholder="SIRET"
          required
          title="SIRET attendu : 14 chiffres, espaces autorises."
          value={props.form.siret}
          onChange={(event) => props.onChange({ ...props.form, siret: event.target.value })}
        />
        <input
          pattern="[Ff][Rr][A-Za-z0-9]{2}[0-9]{9}"
          placeholder="Numero TVA"
          title="Numero TVA francais attendu : FR + 2 caracteres + 9 chiffres, exemple FR12345678901."
          value={props.form.vat_number}
          onChange={(event) => props.onChange({ ...props.form, vat_number: event.target.value })}
        />
        <input
          placeholder="Adresse"
          value={props.form.address}
          onChange={(event) => props.onChange({ ...props.form, address: event.target.value })}
        />
        <input
          placeholder="Telephone"
          type="tel"
          value={props.form.phone}
          onChange={(event) => props.onChange({ ...props.form, phone: event.target.value })}
        />
        <label className="file-button compact-file-button">
          <Download size={18} />
          Logo
          <input accept="image/png,image/jpeg,image/webp" type="file" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              loadLogo(file);
              event.target.value = "";
            }
          }} />
        </label>
        <button className="primary-button" type="submit">Enregistrer</button>
      </form>
      {props.form.logo_data_url ? (
        <div className="logo-preview">
          <img alt="Logo entreprise" src={props.form.logo_data_url} />
          <button className="link-button" onClick={() => props.onChange({ ...props.form, logo_data_url: "" })} type="button">
            Retirer le logo
          </button>
        </div>
      ) : null}
      <div className="import-panel">
        <div>
          <p className="eyebrow">Utilisateurs</p>
          <h2>Acces a l'entreprise</h2>
          <p>
            {props.isOwner
              ? "Invitez la personne qui integre les factures ou celle qui gere la compta."
              : `Vous travaillez sur cette entreprise avec le compte ${props.userEmail}.`}
          </p>
        </div>
        {props.isOwner ? (
          <form className="team-invite" onSubmit={props.onInvite}>
            <input
              placeholder="email@exemple.fr"
              required
              type="email"
              value={props.memberEmail}
              onChange={(event) => props.onMemberEmailChange(event.target.value)}
            />
            <button className="primary-button" type="submit">Inviter</button>
          </form>
        ) : null}
      </div>
      {props.members.length > 0 ? (
        <div className="table-card">
          <table>
            <thead><tr><th>Email</th><th>Role</th><th>Statut</th><th>Action</th></tr></thead>
            <tbody>
              {props.members.map((member) => (
                <tr key={member.id}>
                  <td>{member.member_email}</td>
                  <td>{member.role === "ACCOUNTING" ? "Comptabilite" : member.role}</td>
                  <td>{member.member_user_id ? "Compte lie" : "En attente de connexion"}</td>
                  <td>
                    {props.isOwner ? (
                      <button className="danger-button" onClick={() => props.onRemoveMember(member.id)} type="button">
                        Retirer
                      </button>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

function ArticlesPage(props: {
  editingId: string | null;
  form: typeof emptyArticle;
  onCancel: () => void;
  onChange: (value: typeof emptyArticle) => void;
  onDelete: (id: string) => void;
  onEdit: (row: Article) => void;
  onImport: (file: File) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  rows: Article[];
}) {
  const [showImportHelp, setShowImportHelp] = useState(false);

  function exportRows() {
    downloadCsv(
      "articles-kobance.csv",
      ["reference", "nom", "description", "prix_ht", "taux_tva"],
      props.rows.map((row) => [row.reference, row.name, row.description, row.unit_price_ht, row.vat_rate])
    );
  }

  return (
    <>
      <Header
        title="Articles"
        subtitle="Base articles utilisee pour calculer les ventes."
        icon={
          <button className="export-button" onClick={exportRows} type="button">
            <Download size={18} />
            Export CSV
          </button>
        }
      />
      <form className="form-grid" onSubmit={props.onSubmit}>
        <input placeholder="Reference" value={props.form.reference} onChange={(event) => props.onChange({ ...props.form, reference: event.target.value })} />
        <input pattern="[A-Za-zÀ-ÖØ-öø-ÿ' -]+" placeholder="Nom article" required title="Lettres, espaces, tirets et apostrophes uniquement." value={props.form.name} onChange={(event) => props.onChange({ ...props.form, name: event.target.value })} />
        <input placeholder="Description" value={props.form.description} onChange={(event) => props.onChange({ ...props.form, description: event.target.value })} />
        <input min="0" placeholder="Prix HT" required step="0.01" type="number" value={props.form.unit_price_ht} onChange={(event) => props.onChange({ ...props.form, unit_price_ht: event.target.value })} />
        <select value={props.form.vat_rate} onChange={(event) => props.onChange({ ...props.form, vat_rate: event.target.value })}>
          <option value="0">TVA 0 %</option>
          <option value="5.5">TVA 5,5 %</option>
          <option value="10">TVA 10 %</option>
          <option value="20">TVA 20 %</option>
        </select>
        <button className="primary-button" type="submit">{props.editingId ? "Enregistrer" : "Ajouter"}</button>
        {props.editingId ? <button className="link-button" onClick={props.onCancel} type="button">Annuler</button> : null}
      </form>
      <div className="import-panel">
        <div>
          <p className="eyebrow">Import articles</p>
          <h2>Ajouter une base articles en CSV</h2>
          <p>
            Le fichier doit contenir une ligne d'entetes et utiliser le point-virgule comme separateur.
          </p>
          {showImportHelp ? (
            <div className="import-help">
              <div className="import-format">
                <span>Format attendu</span>
                <code>reference;nom;description;prix_ht;taux_tva</code>
              </div>
              <div className="import-format">
                <span>Exemple</span>
                <code>ART001;Conseil;Prestation conseil;450;20</code>
              </div>
            </div>
          ) : null}
        </div>
        <div className="import-actions">
          <button className="help-button" onClick={() => setShowImportHelp((value) => !value)} type="button">
            <HelpCircle size={18} />
            Aide en ligne
          </button>
          <label className="file-button">
            <Download size={18} />
            Choisir un CSV
            <input accept=".csv,text/csv" type="file" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void props.onImport(file);
                event.target.value = "";
              }
            }} />
          </label>
        </div>
      </div>
      <div className="table-card">
        <table>
          <thead><tr><th>Reference</th><th>Nom</th><th>Description</th><th>Prix HT</th><th>TVA</th><th>Actions</th></tr></thead>
          <tbody>
            {props.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.reference}</td>
                <td>{row.name}</td>
                <td>{row.description}</td>
                <td>{formatEuro(row.unit_price_ht)}</td>
                <td>{Number(row.vat_rate).toLocaleString("fr-FR")} %</td>
                <td>
                  <div className="row-actions">
                    <button className="link-button" onClick={() => props.onEdit(row)} type="button">Modifier</button>
                    <button className="danger-button" onClick={() => props.onDelete(row.id)} type="button">Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InvoicesPage(props: {
  articles: Article[];
  clients: Party[];
  creditNotes: CreditNote[];
  form: typeof emptyInvoiceDocument;
  lineForm: typeof emptyInvoiceLine;
  onChange: (value: typeof emptyInvoiceDocument) => void;
  onDelete: (id: string) => void;
  onDeleteLine: (line: InvoiceLine) => void;
  onLineChange: (value: typeof emptyInvoiceLine) => void;
  onLineSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPrint: (invoice: InvoiceDocument) => void;
  onPrintCreditNote: (creditNote: CreditNote) => void;
  onCreditNote: (invoice: InvoiceDocument) => void;
  onSelect: (id: string) => void;
  onStatusChange: (invoice: InvoiceDocument, status: DocumentStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  rows: InvoiceDocument[];
  selectedInvoiceId: string | null;
}) {
  const selectedInvoice = props.rows.find((invoice) => invoice.id === props.selectedInvoiceId) ?? null;
  const selectedInvoiceLocked = selectedInvoice ? selectedInvoice.status !== "DRAFT" : false;

  return (
    <>
      <Header title="Factures" subtitle="Creez une facture, ajoutez plusieurs lignes, puis genereez le PDF." />
      <form className="form-grid" onSubmit={props.onSubmit}>
        <select required value={props.form.clientId} onChange={(event) => props.onChange({ ...props.form, clientId: event.target.value })}>
          <option value="">Client</option>
          {props.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <input required type="date" value={props.form.invoiceDate} onChange={(event) => props.onChange({ ...props.form, invoiceDate: event.target.value })} />
        <input type="date" value={props.form.dueDate} onChange={(event) => props.onChange({ ...props.form, dueDate: event.target.value })} />
        <input placeholder="Notes" value={props.form.notes} onChange={(event) => props.onChange({ ...props.form, notes: event.target.value })} />
        <button className="primary-button" type="submit">Créer facture</button>
      </form>
      <div className="table-card">
        <table>
          <thead><tr><th>Numero</th><th>Date</th><th>Client</th><th>Statut</th><th>HT</th><th>TVA</th><th>TTC</th><th>Actions</th></tr></thead>
          <tbody>
            {props.rows.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{new Date(invoice.invoice_date).toLocaleDateString("fr-FR")}</td>
                <td>{invoice.client?.name}</td>
                <td><DocumentStatusBadge status={invoice.status} /></td>
                <td>{formatEuro(invoice.total_ht)}</td>
                <td>{formatEuro(invoice.total_vat)}</td>
                <td>{formatEuro(invoice.total_ttc)}</td>
                <td>
                  <div className="row-actions">
                    <button className="link-button" onClick={() => props.onSelect(invoice.id)} type="button">Lignes</button>
                    <button className="export-button" onClick={() => props.onPrint(invoice)} type="button">Facture</button>
                    {invoice.status === "DRAFT" ? <button className="primary-button" onClick={() => props.onStatusChange(invoice, "ISSUED")} type="button">Valider</button> : null}
                    {invoice.status === "ISSUED" ? <button className="primary-button" onClick={() => props.onStatusChange(invoice, "PAID")} type="button">Payée</button> : null}
                    {(invoice.status === "ISSUED" || invoice.status === "PAID") ? <button className="link-button" onClick={() => props.onCreditNote(invoice)} type="button">Avoir</button> : null}
                    {invoice.status !== "PAID" && invoice.status !== "CANCELED" ? <button className="danger-button" onClick={() => props.onStatusChange(invoice, "CANCELED")} type="button">Annuler</button> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedInvoice ? (
        <>
          <Header title={`Lignes ${selectedInvoice.invoice_number}`} subtitle="Ajoutez les articles de la facture selectionnee." />
          {selectedInvoiceLocked ? <p className="error-message">Facture verrouillee : seules les factures en brouillon peuvent etre modifiees.</p> : null}
          <form className="form-grid" onSubmit={props.onLineSubmit}>
            <select
              value={props.lineForm.articleId}
              onChange={(event) => {
                const article = props.articles.find((item) => item.id === event.target.value);
                props.onLineChange({
                  ...props.lineForm,
                  articleId: event.target.value,
                  description: article?.description || article?.name || props.lineForm.description,
                  unitPriceHt: article ? String(article.unit_price_ht) : props.lineForm.unitPriceHt,
                  vatRate: article ? String(article.vat_rate) : props.lineForm.vatRate
                });
              }}
            >
              <option value="">Article libre</option>
              {props.articles.map((article) => (
                <option key={article.id} value={article.id}>{article.reference ? `${article.reference} - ` : ""}{article.name}</option>
              ))}
            </select>
            <input required placeholder="Description" value={props.lineForm.description} onChange={(event) => props.onLineChange({ ...props.lineForm, description: event.target.value })} />
            <input inputMode="numeric" min="1" pattern="[1-9][0-9]*" required step="1" title="Quantite entiere uniquement : 1, 2, 3..." type="number" value={props.lineForm.quantity} onChange={(event) => props.onLineChange({ ...props.lineForm, quantity: event.target.value })} />
            <input min="0" required placeholder="Prix unitaire HT" step="0.01" type="number" value={props.lineForm.unitPriceHt} onChange={(event) => props.onLineChange({ ...props.lineForm, unitPriceHt: event.target.value })} />
            <select value={props.lineForm.vatRate} onChange={(event) => props.onLineChange({ ...props.lineForm, vatRate: event.target.value })}>
              <option value="0">TVA 0 %</option>
              <option value="5.5">TVA 5,5 %</option>
              <option value="10">TVA 10 %</option>
              <option value="20">TVA 20 %</option>
            </select>
            <select value={props.lineForm.discountType} onChange={(event) => props.onLineChange({ ...props.lineForm, discountType: event.target.value as DiscountType })}>
              <option value="NONE">Sans remise</option>
              <option value="PERCENT">Remise %</option>
              <option value="AMOUNT">Remise EUR</option>
            </select>
            <input disabled={props.lineForm.discountType === "NONE"} placeholder="Remise" step="0.01" type="number" value={props.lineForm.discountValue} onChange={(event) => props.onLineChange({ ...props.lineForm, discountValue: event.target.value })} />
            <button className="primary-button" disabled={selectedInvoiceLocked} type="submit">Ajouter ligne</button>
          </form>
          <div className="table-card">
            <table>
              <thead><tr><th>Description</th><th>Qte</th><th>PU HT</th><th>HT</th><th>TVA</th><th>TTC</th><th>Action</th></tr></thead>
              <tbody>
                {(selectedInvoice.invoice_lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td>{line.description}</td>
                    <td>{Number(line.quantity).toLocaleString("fr-FR")}</td>
                    <td>{formatEuro(line.unit_price_ht)}</td>
                    <td>{formatEuro(line.line_ht)}</td>
                    <td>{formatEuro(line.line_vat)}</td>
                    <td>{formatEuro(line.line_ttc)}</td>
                    <td><button className="danger-button" disabled={selectedInvoiceLocked} onClick={() => props.onDeleteLine(line)} type="button">Supprimer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {props.creditNotes.length > 0 ? (
        <>
          <Header title="Avoirs" subtitle="Avoirs crees sur les factures de la periode." />
          <div className="table-card">
            <table>
              <thead><tr><th>Numero</th><th>Date</th><th>Client</th><th>Facture</th><th>Motif</th><th>TTC</th><th>Action</th></tr></thead>
              <tbody>
                {props.creditNotes.map((creditNote) => (
                  <tr key={creditNote.id}>
                    <td>{creditNote.credit_note_number}</td>
                    <td>{new Date(creditNote.credit_note_date).toLocaleDateString("fr-FR")}</td>
                    <td>{creditNote.client?.name}</td>
                    <td>{creditNote.invoice?.invoice_number}</td>
                    <td>{creditNote.reason}</td>
                    <td>-{formatEuro(summarizeCreditNote(creditNote).total_ttc)}</td>
                    <td><button className="export-button" onClick={() => props.onPrintCreditNote(creditNote)} type="button">Avoir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}

function QuotesPage(props: {
  articles: Article[];
  clients: Party[];
  form: typeof emptyQuoteDocument;
  lineForm: typeof emptyInvoiceLine;
  onChange: (value: typeof emptyQuoteDocument) => void;
  onConvert: (quote: QuoteDocument) => void;
  onDelete: (id: string) => void;
  onDeleteLine: (line: QuoteLine) => void;
  onLineChange: (value: typeof emptyInvoiceLine) => void;
  onLineSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPrint: (quote: QuoteDocument) => void;
  onSelect: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  rows: QuoteDocument[];
  selectedQuoteId: string | null;
}) {
  const selectedQuote = props.rows.find((quote) => quote.id === props.selectedQuoteId) ?? null;

  return (
    <>
      <Header title="Devis" subtitle="Module pret pour plus tard : creation de devis multi-lignes." />
      <form className="form-grid" onSubmit={props.onSubmit}>
        <select required value={props.form.clientId} onChange={(event) => props.onChange({ ...props.form, clientId: event.target.value })}>
          <option value="">Client</option>
          {props.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <input required type="date" value={props.form.quoteDate} onChange={(event) => props.onChange({ ...props.form, quoteDate: event.target.value })} />
        <input type="date" value={props.form.validUntil} onChange={(event) => props.onChange({ ...props.form, validUntil: event.target.value })} />
        <input placeholder="Notes" value={props.form.notes} onChange={(event) => props.onChange({ ...props.form, notes: event.target.value })} />
        <button className="primary-button" type="submit">Créer devis</button>
      </form>
      <div className="table-card">
        <table>
          <thead><tr><th>Numero</th><th>Date</th><th>Client</th><th>HT</th><th>TVA</th><th>TTC</th><th>Actions</th></tr></thead>
          <tbody>
            {props.rows.map((quote) => (
              <tr key={quote.id}>
                <td>{quote.quote_number}</td>
                <td>{new Date(quote.quote_date).toLocaleDateString("fr-FR")}</td>
                <td>{quote.client?.name}</td>
                <td>{formatEuro(quote.total_ht)}</td>
                <td>{formatEuro(quote.total_vat)}</td>
                <td>{formatEuro(quote.total_ttc)}</td>
                <td>
                  <div className="row-actions">
                    <button className="link-button" onClick={() => props.onSelect(quote.id)} type="button">Lignes</button>
                    <button className="export-button" onClick={() => props.onPrint(quote)} type="button">Devis</button>
                    <button className="primary-button" onClick={() => props.onConvert(quote)} type="button">Convertir</button>
                    <button className="danger-button" onClick={() => props.onDelete(quote.id)} type="button">Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedQuote ? (
        <>
          <Header title={`Lignes ${selectedQuote.quote_number}`} subtitle="Ajoutez les lignes du devis selectionne." />
          <form className="form-grid" onSubmit={props.onLineSubmit}>
            <select
              value={props.lineForm.articleId}
              onChange={(event) => {
                const article = props.articles.find((item) => item.id === event.target.value);
                props.onLineChange({
                  ...props.lineForm,
                  articleId: event.target.value,
                  description: article?.description || article?.name || props.lineForm.description,
                  unitPriceHt: article ? String(article.unit_price_ht) : props.lineForm.unitPriceHt,
                  vatRate: article ? String(article.vat_rate) : props.lineForm.vatRate
                });
              }}
            >
              <option value="">Article libre</option>
              {props.articles.map((article) => (
                <option key={article.id} value={article.id}>{article.reference ? `${article.reference} - ` : ""}{article.name}</option>
              ))}
            </select>
            <input required placeholder="Description" value={props.lineForm.description} onChange={(event) => props.onLineChange({ ...props.lineForm, description: event.target.value })} />
            <input inputMode="numeric" min="1" pattern="[1-9][0-9]*" required step="1" title="Quantite entiere uniquement : 1, 2, 3..." type="number" value={props.lineForm.quantity} onChange={(event) => props.onLineChange({ ...props.lineForm, quantity: event.target.value })} />
            <input min="0" required placeholder="Prix unitaire HT" step="0.01" type="number" value={props.lineForm.unitPriceHt} onChange={(event) => props.onLineChange({ ...props.lineForm, unitPriceHt: event.target.value })} />
            <select value={props.lineForm.vatRate} onChange={(event) => props.onLineChange({ ...props.lineForm, vatRate: event.target.value })}>
              <option value="0">TVA 0 %</option>
              <option value="5.5">TVA 5,5 %</option>
              <option value="10">TVA 10 %</option>
              <option value="20">TVA 20 %</option>
            </select>
            <select value={props.lineForm.discountType} onChange={(event) => props.onLineChange({ ...props.lineForm, discountType: event.target.value as DiscountType })}>
              <option value="NONE">Sans remise</option>
              <option value="PERCENT">Remise %</option>
              <option value="AMOUNT">Remise EUR</option>
            </select>
            <input disabled={props.lineForm.discountType === "NONE"} placeholder="Remise" step="0.01" type="number" value={props.lineForm.discountValue} onChange={(event) => props.onLineChange({ ...props.lineForm, discountValue: event.target.value })} />
            <button className="primary-button" type="submit">Ajouter ligne</button>
          </form>
          <div className="table-card">
            <table>
              <thead><tr><th>Description</th><th>Qte</th><th>PU HT</th><th>HT</th><th>TVA</th><th>TTC</th><th>Action</th></tr></thead>
              <tbody>
                {(selectedQuote.quote_lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td>{line.description}</td>
                    <td>{Number(line.quantity).toLocaleString("fr-FR")}</td>
                    <td>{formatEuro(line.unit_price_ht)}</td>
                    <td>{formatEuro(line.line_ht)}</td>
                    <td>{formatEuro(line.line_vat)}</td>
                    <td>{formatEuro(line.line_ttc)}</td>
                    <td><button className="danger-button" onClick={() => props.onDeleteLine(line)} type="button">Supprimer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}

function VatPage({
  creditNotes,
  filename,
  invoices,
  purchases,
  totals
}: {
  creditNotes: CreditNote[];
  filename: string;
  invoices: InvoiceDocument[];
  purchases: Purchase[];
  totals: Record<string, number>;
}) {
  const vatRows = useMemo(() => {
    const accountingInvoices = invoices.filter((invoice) => invoice.status === "ISSUED" || invoice.status === "PAID");
    const invoiceLines = accountingInvoices.flatMap((invoice) => invoice.invoice_lines ?? []);
    const creditLines = creditNotes.flatMap((creditNote) => creditNote.credit_note_lines ?? []);
    const rates = Array.from(new Set([...invoiceLines, ...creditLines, ...purchases].map((item) => Number(item.vat_rate)))).sort((a, b) => b - a);

    return rates.map((rate) => {
      const invoiceLinesAtRate = invoiceLines.filter((item) => Number(item.vat_rate) === rate);
      const creditLinesAtRate = creditLines.filter((item) => Number(item.vat_rate) === rate);
      const purchasesAtRate = purchases.filter((item) => Number(item.vat_rate) === rate);
      const creditHt = creditLinesAtRate.reduce((sum, item) => sum + Number(item.line_ht), 0);
      const creditVat = creditLinesAtRate.reduce((sum, item) => sum + Number(item.line_vat), 0);
      const salesHt = invoiceLinesAtRate.reduce((sum, item) => sum + Number(item.line_ht), 0) - creditHt;
      const collectedVat = invoiceLinesAtRate.reduce((sum, item) => sum + Number(item.line_vat), 0) - creditVat;
      const purchasesHt = purchasesAtRate.reduce((sum, item) => sum + Number(item.amount_ht), 0);
      const deductibleVat = purchasesAtRate.reduce((sum, item) => sum + Number(item.vat_amount), 0);

      return {
        rate,
        salesHt,
        collectedVat,
        purchasesHt,
        deductibleVat,
        vatDue: collectedVat - deductibleVat
      };
    });
  }, [creditNotes, invoices, purchases]);

  function exportRows() {
    downloadCsv(
      filename,
      ["Taux", "Ventes HT", "TVA collectee", "Achats HT", "TVA deductible", "TVA nette"],
      vatRows.map((row) => [
        `${row.rate} %`,
        row.salesHt,
        row.collectedVat,
        row.purchasesHt,
        row.deductibleVat,
        row.vatDue
      ])
    );
  }

  return (
    <>
      <Header
        title="TVA"
        subtitle="TVA collectee, deductible et nette sur la periode selectionnee."
        icon={
          <button className="export-button" onClick={exportRows} type="button">
            <Download size={18} />
            Export CSV
          </button>
        }
      />
      <div className="vat-status">
        <div>
          <p className="eyebrow">TVA nette</p>
          <h2>{formatEuro(totals.vatDue)}</h2>
          <p>Controlez les montants avant declaration.</p>
        </div>
        <span className={totals.vatDue >= 0 ? "badge warning" : "badge"}>
          {totals.vatDue >= 0 ? "A payer" : "Credit de TVA"}
        </span>
      </div>
      <div className="summary-grid">
        <Metric label="TVA collectee" value={formatEuro(totals.collectedVat)} />
        <Metric label="TVA deductible" value={formatEuro(totals.deductibleVat)} />
        <Metric label="Base ventes HT" value={formatEuro(totals.salesHt)} />
        <Metric label="Base achats HT" value={formatEuro(totals.purchasesHt)} />
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Taux</th>
              <th>Ventes HT</th>
              <th>TVA collectee</th>
              <th>Achats HT</th>
              <th>TVA deductible</th>
              <th>TVA nette</th>
            </tr>
          </thead>
          <tbody>
            {vatRows.map((row) => (
              <tr key={row.rate}>
                <td>{row.rate.toLocaleString("fr-FR")} %</td>
                <td>{formatEuro(row.salesHt)}</td>
                <td>{formatEuro(row.collectedVat)}</td>
                <td>{formatEuro(row.purchasesHt)}</td>
                <td>{formatEuro(row.deductibleVat)}</td>
                <td>{formatEuro(row.vatDue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const labels: Record<DocumentStatus, string> = {
    DRAFT: "Brouillon",
    ISSUED: "Validée",
    PAID: "Payée",
    CANCELED: "Annulée"
  };

  return (
    <span className={status === "DRAFT" || status === "CANCELED" ? "badge warning" : "badge"}>
      {labels[status]}
    </span>
  );
}

function PartyPage(props: {
  editingId: string | null;
  form: typeof emptyParty;
  onCancel: () => void;
  onChange: (value: typeof emptyParty) => void;
  onDelete: (id: string) => void;
  onEdit: (row: Party) => void;
  onImport: (file: File) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  rows: Party[];
  title: string;
}) {
  const [showImportHelp, setShowImportHelp] = useState(false);

  function exportRows() {
    downloadCsv(
      `${props.title.toLowerCase()}-kobance.csv`,
      ["Nom", "Email", "Telephone", "Adresse", "SIRET", "Numero TVA"],
      props.rows.map((row) => [row.name, row.email, row.phone, row.address, row.siret, row.vat_number])
    );
  }

  return (
    <>
      <Header
        title={props.title}
        subtitle="Ajout et consultation des fiches."
        icon={
          <button className="export-button" onClick={exportRows} type="button">
            <Download size={18} />
            Export CSV
          </button>
        }
      />
      <form className="form-grid" onSubmit={props.onSubmit}>
        <input pattern="[A-Za-zÀ-ÖØ-öø-ÿ' -]+" placeholder="Nom" required title="Lettres, espaces, tirets et apostrophes uniquement." value={props.form.name} onChange={(e) => props.onChange({ ...props.form, name: e.target.value })} />
        <input placeholder="Email" type="email" value={props.form.email} onChange={(e) => props.onChange({ ...props.form, email: e.target.value })} />
        <input placeholder="Telephone" type="tel" value={props.form.phone} onChange={(e) => props.onChange({ ...props.form, phone: e.target.value })} />
        <input placeholder="Adresse" value={props.form.address} onChange={(e) => props.onChange({ ...props.form, address: e.target.value })} />
        <input inputMode="numeric" maxLength={17} pattern="[0-9 ]{14,17}" placeholder="SIRET" title="SIRET attendu : 14 chiffres, espaces autorises." value={props.form.siret} onChange={(e) => props.onChange({ ...props.form, siret: e.target.value })} />
        <input pattern="[Ff][Rr][A-Za-z0-9]{2}[0-9]{9}" placeholder="Numero TVA" title="Numero TVA francais attendu : FR + 2 caracteres + 9 chiffres, exemple FR12345678901." value={props.form.vat_number} onChange={(e) => props.onChange({ ...props.form, vat_number: e.target.value })} />
        <button className="primary-button" type="submit">{props.editingId ? "Enregistrer" : "Ajouter"}</button>
        {props.editingId ? <button className="link-button" onClick={props.onCancel} type="button">Annuler</button> : null}
      </form>
      <div className="import-panel">
        <div>
          <p className="eyebrow">Import {props.title.toLowerCase()}</p>
          <h2>Ajouter une base {props.title.toLowerCase()} en CSV</h2>
          <p>
            Le fichier doit contenir une ligne d'entetes et utiliser le point-virgule comme separateur.
          </p>
          {showImportHelp ? (
            <div className="import-help">
              <div className="import-format">
                <span>Format attendu</span>
                <code>nom;email;telephone;adresse;siret;numero_tva</code>
              </div>
              <div className="import-format">
                <span>Exemple</span>
                <code>Atelier Martin;contact@atelier.fr;0142103320;12 rue Exemple Paris;81245690300018;FR12812456903</code>
              </div>
            </div>
          ) : null}
        </div>
        <div className="import-actions">
          <button className="help-button" onClick={() => setShowImportHelp((value) => !value)} type="button">
            <HelpCircle size={18} />
            Aide en ligne
          </button>
          <label className="file-button">
            <Download size={18} />
            Choisir un CSV
            <input accept=".csv,text/csv" type="file" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void props.onImport(file);
                event.target.value = "";
              }
            }} />
          </label>
        </div>
      </div>
      <div className="table-card">
        <table>
          <thead><tr><th>Nom</th><th>Email</th><th>Telephone</th><th>SIRET</th><th>Actions</th></tr></thead>
          <tbody>
            {props.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>{row.phone}</td>
                <td>{row.siret}</td>
                <td>
                  <div className="row-actions">
                    <button className="link-button" onClick={() => props.onEdit(row)} type="button">Modifier</button>
                    <button className="danger-button" onClick={() => props.onDelete(row.id)} type="button">Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InvoicePage(props: {
  articles?: Article[];
  editingId: string | null;
  filename: string;
  form: typeof emptyInvoice;
  onCancel: () => void;
  onChange: (value: typeof emptyInvoice) => void;
  onDelete: (id: string) => void;
  onEdit: (row: Sale | Purchase) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  parties: Party[];
  partyLabel: string;
  profile?: Profile | null;
  rows: Array<Sale | Purchase>;
  title: string;
}) {
  const isSalesPage = props.title === "Ventes";

  function exportRows() {
    downloadCsv(
      props.filename,
      ["Date", props.partyLabel, "Description", "HT", "Taux TVA", "Remise", "TVA", "TTC", "Statut"],
      props.rows.map((row) => {
        const party = "client" in row && row.client ? row.client : (row as Purchase).supplier;
        const discount =
          row.discount_type === "PERCENT"
            ? `${row.discount_value ?? 0} %`
            : row.discount_type === "AMOUNT"
              ? formatEuro(row.discount_value ?? 0)
              : "";

        return [
          row.invoice_date,
          party?.name,
          row.description,
          row.amount_ht,
          `${row.vat_rate} %`,
          discount,
          row.vat_amount,
          row.amount_ttc,
          row.status === "PAID" ? "Paye" : "Non paye"
        ];
      })
    );
  }

  return (
    <>
      <Header
        title={props.title}
        subtitle="Saisie avec calcul automatique TVA."
        icon={
          <button className="export-button" onClick={exportRows} type="button">
            <Download size={18} />
            Export CSV
          </button>
        }
      />
      <form className="form-grid" onSubmit={props.onSubmit}>
        <select required value={props.form.partyId} onChange={(e) => props.onChange({ ...props.form, partyId: e.target.value })}>
          <option value="">{props.partyLabel}</option>
          {props.parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
        </select>
        {isSalesPage ? (
          <select
            value={props.form.articleId}
            onChange={(event) => {
              const article = props.articles?.find((item) => item.id === event.target.value);
              props.onChange({
                ...props.form,
                articleId: event.target.value,
                description: article?.description || article?.name || props.form.description,
                amountHt: article ? String(article.unit_price_ht) : props.form.amountHt,
                vatRate: article ? String(article.vat_rate) : props.form.vatRate
              });
            }}
          >
            <option value="">Article libre</option>
            {props.articles?.map((article) => (
              <option key={article.id} value={article.id}>
                {article.reference ? `${article.reference} - ` : ""}{article.name}
              </option>
            ))}
          </select>
        ) : null}
        <input type="date" required value={props.form.date} onChange={(e) => props.onChange({ ...props.form, date: e.target.value })} />
        <input placeholder="Description" required value={props.form.description} onChange={(e) => props.onChange({ ...props.form, description: e.target.value })} />
        <input placeholder="Montant HT" required type="number" step="0.01" value={props.form.amountHt} onChange={(e) => props.onChange({ ...props.form, amountHt: e.target.value })} />
        <select value={props.form.vatRate} onChange={(e) => props.onChange({ ...props.form, vatRate: e.target.value })}>
          <option value="0">TVA 0 %</option>
          <option value="5.5">TVA 5,5 %</option>
          <option value="10">TVA 10 %</option>
          <option value="20">TVA 20 %</option>
        </select>
        {isSalesPage ? (
          <>
            <select value={props.form.discountType} onChange={(e) => props.onChange({ ...props.form, discountType: e.target.value as DiscountType })}>
              <option value="NONE">Sans remise</option>
              <option value="PERCENT">Remise %</option>
              <option value="AMOUNT">Remise EUR</option>
            </select>
            <input
              disabled={props.form.discountType === "NONE"}
              placeholder={props.form.discountType === "PERCENT" ? "Remise %" : "Remise EUR"}
              step="0.01"
              type="number"
              value={props.form.discountValue}
              onChange={(e) => props.onChange({ ...props.form, discountValue: e.target.value })}
            />
          </>
        ) : null}
        <select value={props.form.status} onChange={(e) => props.onChange({ ...props.form, status: e.target.value as Status })}>
          <option value="UNPAID">Non paye</option>
          <option value="PAID">Paye</option>
        </select>
        <button className="primary-button" type="submit">{props.editingId ? "Enregistrer" : "Ajouter"}</button>
        {props.editingId ? <button className="link-button" onClick={props.onCancel} type="button">Annuler</button> : null}
      </form>
      <div className="table-card">
        <table>
          <thead><tr><th>Date</th><th>{props.partyLabel}</th><th>Description</th><th>HT</th><th>Remise</th><th>TVA</th><th>TTC</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {props.rows.map((row) => {
              const party = "client" in row && row.client ? row.client : (row as Purchase).supplier;
              const discount =
                row.discount_type === "PERCENT"
                  ? `${row.discount_value ?? 0} %`
                  : row.discount_type === "AMOUNT"
                    ? formatEuro(row.discount_value ?? 0)
                    : "-";
              return (
                <tr key={row.id}>
                  <td>{new Date(row.invoice_date).toLocaleDateString("fr-FR")}</td>
                  <td>{party?.name ?? "-"}</td>
                  <td>{row.description}</td>
                  <td>{formatEuro(row.amount_ht)}</td>
                  <td>{discount}</td>
                  <td>{formatEuro(row.vat_amount)}</td>
                  <td>{formatEuro(row.amount_ttc)}</td>
                  <td><span className={row.status === "PAID" ? "badge" : "badge warning"}>{row.status === "PAID" ? "Paye" : "Non paye"}</span></td>
                  <td>
                    <div className="row-actions">
                      {isSalesPage ? (
                        <button className="export-button" onClick={() => generateInvoiceDocument(row as Sale, party, props.profile ?? null)} type="button">
                          Facture
                        </button>
                      ) : null}
                      <button className="link-button" onClick={() => props.onEdit(row)} type="button">Modifier</button>
                      <button className="danger-button" onClick={() => props.onDelete(row.id)} type="button">Supprimer</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BankPage(props: {
  editingId: string | null;
  filename: string;
  form: typeof emptyBankTransaction;
  invoices: InvoiceDocument[];
  onCancel: () => void;
  onChange: (value: typeof emptyBankTransaction) => void;
  onDelete: (id: string) => void;
  onEdit: (row: BankTransaction) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleReconciled: (row: BankTransaction) => void;
  purchases: Purchase[];
  rows: BankTransaction[];
  totals: Record<string, number>;
}) {
  const invoiceOptions = props.invoices.filter((invoice) => invoice.status === "ISSUED" || invoice.status === "PAID");

  function exportRows() {
    downloadCsv(
      props.filename,
      ["Date", "Type", "Libelle", "Montant", "Reference", "Notes", "Rapprochement", "Pointe"],
      props.rows.map((row) => [
        row.transaction_date,
        row.transaction_type === "INCOME" ? "Recette" : "Depense",
        row.label,
        row.amount,
        row.reference,
        row.notes,
        describeBankReconciliation(row, props.invoices, props.purchases),
        isBankTransactionReconciled(row) ? "Oui" : "Non"
      ])
    );
  }

  return (
    <>
      <Header
        title="Banque"
        subtitle="Saisie et pointage des mouvements bancaires."
        icon={
          <button className="export-button" onClick={exportRows} type="button">
            <Download size={18} />
            Export CSV
          </button>
        }
      />
      <div className="summary-grid">
        <Metric label="Recettes banque" value={formatEuro(props.totals.bankIncome)} />
        <Metric label="Depenses banque" value={formatEuro(props.totals.bankExpenses)} />
        <Metric label="Solde mouvements" value={formatEuro(props.totals.bankBalance)} />
        <Metric label="A pointer" value={formatEuro(props.totals.bankUnreconciled)} />
      </div>
      <form className="form-grid" onSubmit={props.onSubmit}>
        <input required type="date" value={props.form.transactionDate} onChange={(event) => props.onChange({ ...props.form, transactionDate: event.target.value })} />
        <select value={props.form.transactionType} onChange={(event) => props.onChange({ ...props.form, transactionType: event.target.value as BankTransactionType })}>
          <option value="EXPENSE">Depense</option>
          <option value="INCOME">Recette</option>
        </select>
        <input required placeholder="Libelle" value={props.form.label} onChange={(event) => props.onChange({ ...props.form, label: event.target.value })} />
        <input min="0" required placeholder="Montant" step="0.01" type="number" value={props.form.amount} onChange={(event) => props.onChange({ ...props.form, amount: event.target.value })} />
        <input placeholder="Reference facture, achat, cheque..." value={props.form.reference} onChange={(event) => props.onChange({ ...props.form, reference: event.target.value })} />
        <input placeholder="Notes" value={props.form.notes} onChange={(event) => props.onChange({ ...props.form, notes: event.target.value })} />
        <select value={props.form.reconciliationType} onChange={(event) => props.onChange({ ...props.form, reconciliationType: event.target.value as typeof props.form.reconciliationType, linkedInvoiceId: "", linkedPurchaseId: "" })}>
          <option value="NONE">Sans rapprochement</option>
          <option value="INVOICE">Rapprocher avec une facture</option>
          <option value="PURCHASE">Rapprocher avec un achat</option>
        </select>
        {props.form.reconciliationType === "INVOICE" ? (
          <select required value={props.form.linkedInvoiceId} onChange={(event) => props.onChange({ ...props.form, linkedInvoiceId: event.target.value, reconciled: Boolean(event.target.value) })}>
            <option value="">Choisir une facture</option>
            {invoiceOptions.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoice_number} - {invoice.client?.name ?? "Client"} - {formatEuro(invoice.total_ttc)}
              </option>
            ))}
          </select>
        ) : null}
        {props.form.reconciliationType === "PURCHASE" ? (
          <select required value={props.form.linkedPurchaseId} onChange={(event) => props.onChange({ ...props.form, linkedPurchaseId: event.target.value, reconciled: Boolean(event.target.value) })}>
            <option value="">Choisir un achat</option>
            {props.purchases.map((purchase) => (
              <option key={purchase.id} value={purchase.id}>
                {new Date(purchase.invoice_date).toLocaleDateString("fr-FR")} - {purchase.supplier?.name ?? "Fournisseur"} - {formatEuro(purchase.amount_ttc)}
              </option>
            ))}
          </select>
        ) : null}
        <label className="checkbox-field">
          <input checked={props.form.reconciled} type="checkbox" onChange={(event) => props.onChange({ ...props.form, reconciled: event.target.checked })} />
          Pointage manuel
        </label>
        <button className="primary-button" type="submit">{props.editingId ? "Enregistrer" : "Ajouter"}</button>
        {props.editingId ? <button className="link-button" onClick={props.onCancel} type="button">Annuler</button> : null}
      </form>
      <div className="table-card">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Libelle</th><th>Montant</th><th>Reference</th><th>Rapprochement</th><th>Pointage</th><th>Actions</th></tr></thead>
          <tbody>
            {props.rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.transaction_date).toLocaleDateString("fr-FR")}</td>
                <td><span className={row.transaction_type === "INCOME" ? "badge" : "badge warning"}>{row.transaction_type === "INCOME" ? "Recette" : "Depense"}</span></td>
                <td>{row.label}</td>
                <td>{formatEuro(row.amount)}</td>
                <td>{row.reference ?? "-"}</td>
                <td>{describeBankReconciliation(row, props.invoices, props.purchases)}</td>
                <td>
                  <button className={isBankTransactionReconciled(row) ? "link-button" : "danger-button"} onClick={() => props.onToggleReconciled(row)} type="button">
                    {isBankTransactionReconciled(row) ? "Pointe" : "A pointer"}
                  </button>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="link-button" onClick={() => props.onEdit(row)} type="button">Modifier</button>
                    <button className="danger-button" onClick={() => props.onDelete(row.id)} type="button">Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Monthly({
  filename,
  invoices,
  purchases,
  totals
}: {
  filename: string;
  invoices: InvoiceDocument[];
  purchases: Purchase[];
  totals: Record<string, number>;
}) {
  const accountingInvoices = invoices.filter((invoice) => invoice.status === "ISSUED" || invoice.status === "PAID");

  function exportRows() {
    downloadCsv(
      filename,
      ["Indicateur", "Montant"],
      [
        ["Ventes HT", totals.salesHt],
        ["Ventes TTC", totals.salesTtc],
        ["TVA collectee", totals.collectedVat],
        ["Achats HT", totals.purchasesHt],
        ["Achats TTC", totals.purchasesTtc],
        ["TVA deductible", totals.deductibleVat],
        ["TVA a payer", totals.vatDue],
        ["Benefice", totals.profit],
        ["Nombre de factures comptabilisees", accountingInvoices.length],
        ["Nombre d'achats", purchases.length]
      ]
    );
  }

  return (
    <>
      <Header
        icon={
          <button className="export-button" onClick={exportRows} type="button">
            <Download size={18} />
            Export CSV
          </button>
        }
        title="Recap mensuel"
        subtitle="Synthese basee sur les factures validees/payees et les achats saisis."
      />
      <div className="summary-grid">
        <Metric label="Ventes HT" value={formatEuro(totals.salesHt)} />
        <Metric label="Ventes TTC" value={formatEuro(totals.salesTtc)} />
        <Metric label="TVA collectee" value={formatEuro(totals.collectedVat)} />
        <Metric label="Achats HT" value={formatEuro(totals.purchasesHt)} />
        <Metric label="Achats TTC" value={formatEuro(totals.purchasesTtc)} />
        <Metric label="TVA deductible" value={formatEuro(totals.deductibleVat)} />
        <Metric label="TVA a payer" value={formatEuro(totals.vatDue)} />
        <Metric label="Benefice" value={formatEuro(totals.profit)} />
      </div>
      <p className="muted">Factures comptabilisees : {accountingInvoices.length} | Achats saisis : {purchases.length}</p>
    </>
  );
}

