/**
 * Export-Funktion fuer das Instantly.ai CSV-Format.
 * Formatiert generierte E-Mails fuer den Import in Instantly-Kampagnen.
 */

import type { GeneratedEmail, Lead } from '@/types';

/** Instantly-CSV-Spaltenkoepfe */
const INSTANTLY_HEADERS = [
  'email',
  'first_name',
  'last_name',
  'company_name',
  'personalization',
  'email_subject',
  'email_body',
] as const;

/** Eine Zeile im Instantly-Export-Format */
export interface InstantlyRow {
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  personalization: string;
  email_subject: string;
  email_body: string;
}

/**
 * Splittet einen vollstaendigen Namen in Vor- und Nachname.
 * Wenn kein Name vorhanden, werden leere Strings zurueckgegeben.
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
 * Werte mit Kommas, Anfuehrungszeichen oder Zeilenumbruechen werden in Anfuehrungszeichen eingeschlossen.
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formatiert ein Lead-E-Mail-Paar fuer das Instantly-Format.
 */
function formatInstantlyRow(lead: Lead, email: GeneratedEmail): InstantlyRow {
  const { firstName, lastName } = splitName(lead.contact_name);

  return {
    email: lead.contact_email ?? '',
    first_name: firstName,
    last_name: lastName,
    company_name: lead.company_name,
    personalization: lead.description ?? '',
    email_subject: email.subject,
    email_body: email.body,
  };
}

/**
 * Erstellt den CSV-Inhalt im Instantly-Format.
 * Gibt einen vollstaendigen CSV-String mit Kopfzeile zurueck.
 */
export function formatForInstantly(
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
  rows.push(INSTANTLY_HEADERS.join(','));

  // Datenzeilen
  for (const lead of leads) {
    const email = emailsByLeadId.get(lead.id);
    if (!email) continue;

    const row = formatInstantlyRow(lead, email);
    const csvRow = [
      escapeCsvValue(row.email),
      escapeCsvValue(row.first_name),
      escapeCsvValue(row.last_name),
      escapeCsvValue(row.company_name),
      escapeCsvValue(row.personalization),
      escapeCsvValue(row.email_subject),
      escapeCsvValue(row.email_body),
    ].join(',');

    rows.push(csvRow);
  }

  return rows.join('\n');
}
