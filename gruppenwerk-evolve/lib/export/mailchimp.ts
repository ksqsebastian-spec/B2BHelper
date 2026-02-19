/**
 * Export-Funktion fuer das Mailchimp CSV-Format.
 * Formatiert generierte E-Mails fuer den Import in Mailchimp.
 */

import type { GeneratedEmail, Lead } from '@/types';

/** Mailchimp-CSV-Spaltenkoepfe */
const MAILCHIMP_HEADERS = [
  'Email Address',
  'First Name',
  'Last Name',
  'Company',
  'Email Subject',
  'Email Body',
  'Tags',
] as const;

/** Eine Zeile im Mailchimp-Export-Format */
export interface MailchimpRow {
  emailAddress: string;
  firstName: string;
  lastName: string;
  company: string;
  emailSubject: string;
  emailBody: string;
  tags: string;
}

/**
 * Splittet einen vollstaendigen Namen in Vor- und Nachname.
 */
function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  if (!fullName || fullName.trim().length === 0) {
    return { firstName: '', lastName: '' };
  }

  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

  return { firstName, lastName };
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
 * Formatiert ein Lead-E-Mail-Paar fuer das Mailchimp-Format.
 */
function formatMailchimpRow(lead: Lead, email: GeneratedEmail): MailchimpRow {
  const { firstName, lastName } = splitName(lead.contact_name);

  // Tags aus Branche und Schluesselwoertern zusammenstellen
  const tags: string[] = [];
  if (lead.industry) {
    tags.push(lead.industry);
  }
  if (lead.keywords) {
    tags.push(...lead.keywords.split(',').map((k) => k.trim()).filter(Boolean));
  }

  return {
    emailAddress: lead.contact_email ?? '',
    firstName,
    lastName,
    company: lead.company_name,
    emailSubject: email.subject,
    emailBody: email.body,
    tags: tags.join(', '),
  };
}

/**
 * Erstellt den CSV-Inhalt im Mailchimp-Format.
 * Gibt einen vollstaendigen CSV-String mit Kopfzeile zurueck.
 */
export function formatForMailchimp(
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
  rows.push(MAILCHIMP_HEADERS.join(','));

  // Datenzeilen
  for (const lead of leads) {
    const email = emailsByLeadId.get(lead.id);
    if (!email) continue;

    const row = formatMailchimpRow(lead, email);
    const csvRow = [
      escapeCsvValue(row.emailAddress),
      escapeCsvValue(row.firstName),
      escapeCsvValue(row.lastName),
      escapeCsvValue(row.company),
      escapeCsvValue(row.emailSubject),
      escapeCsvValue(row.emailBody),
      escapeCsvValue(row.tags),
    ].join(',');

    rows.push(csvRow);
  }

  return rows.join('\n');
}
