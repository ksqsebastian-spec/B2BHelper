/**
 * Generische CSV-Export-Funktion.
 * Erstellt ein allgemeines CSV-Format mit allen verfuegbaren Feldern.
 */

import type { GeneratedEmail, Lead } from '@/types';

/** Generische CSV-Spaltenkoepfe */
const GENERIC_HEADERS = [
  'email',
  'contact_name',
  'company_name',
  'industry',
  'city',
  'country',
  'employees',
  'website',
  'linkedin_url',
  'email_subject',
  'email_body',
  'email_status',
  'generated_at',
] as const;

/** Eine Zeile im generischen Export-Format */
export interface GenericRow {
  email: string;
  contactName: string;
  companyName: string;
  industry: string;
  city: string;
  country: string;
  employees: string;
  website: string;
  linkedinUrl: string;
  emailSubject: string;
  emailBody: string;
  emailStatus: string;
  generatedAt: string;
}

/**
 * Escaped einen Wert fuer die CSV-Ausgabe.
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formatiert ein Lead-E-Mail-Paar fuer das generische Format.
 */
function formatGenericRow(lead: Lead, email: GeneratedEmail): GenericRow {
  return {
    email: lead.contact_email,
    contactName: lead.contact_name ?? '',
    companyName: lead.company_name,
    industry: lead.industry ?? '',
    city: lead.company_city ?? '',
    country: lead.company_country ?? '',
    employees: lead.employees ?? '',
    website: lead.website ?? '',
    linkedinUrl: lead.linkedin_url ?? '',
    emailSubject: email.subject,
    emailBody: email.body,
    emailStatus: email.status,
    generatedAt: email.created_at,
  };
}

/**
 * Erstellt den CSV-Inhalt im generischen Format.
 * Gibt einen vollstaendigen CSV-String mit Kopfzeile zurueck.
 */
export function formatForGeneric(
  leads: Lead[],
  emails: GeneratedEmail[]
): string {
  // E-Mails nach Lead-ID indizieren fuer schnellen Zugriff
  const emailsByLeadId = new Map<string, GeneratedEmail>();
  for (const email of emails) {
    emailsByLeadId.set(email.lead_id, email);
  }

  const rows: string[] = [];

  // Kopfzeile
  rows.push(GENERIC_HEADERS.join(','));

  // Datenzeilen
  for (const lead of leads) {
    const email = emailsByLeadId.get(lead.id);
    if (!email) continue;

    const row = formatGenericRow(lead, email);
    const csvRow = [
      escapeCsvValue(row.email),
      escapeCsvValue(row.contactName),
      escapeCsvValue(row.companyName),
      escapeCsvValue(row.industry),
      escapeCsvValue(row.city),
      escapeCsvValue(row.country),
      escapeCsvValue(row.employees),
      escapeCsvValue(row.website),
      escapeCsvValue(row.linkedinUrl),
      escapeCsvValue(row.emailSubject),
      escapeCsvValue(row.emailBody),
      escapeCsvValue(row.emailStatus),
      escapeCsvValue(row.generatedAt),
    ].join(',');

    rows.push(csvRow);
  }

  return rows.join('\n');
}
