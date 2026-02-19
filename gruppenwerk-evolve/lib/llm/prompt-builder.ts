/**
 * Baut den vollstaendigen Prompt fuer die E-Mail-Generierung.
 * Kombiniert Lead-Daten mit Guardrails/Leitplanken.
 */

import type { Lead } from '@/types';

/**
 * Erstellt einen strukturierten Block mit Lead-Informationen.
 * Nur Felder mit Werten werden einbezogen.
 */
function buildLeadInfoBlock(lead: Lead): string {
  const lines: string[] = [];

  lines.push(`Firmenname: ${lead.company_name}`);
  if (lead.contact_email) {
    lines.push(`E-Mail: ${lead.contact_email}`);
  }

  if (lead.contact_name) {
    lines.push(`Kontaktperson: ${lead.contact_name}`);
  }
  if (lead.industry) {
    lines.push(`Branche: ${lead.industry}`);
  }
  if (lead.company_city) {
    lines.push(`Stadt: ${lead.company_city}`);
  }
  if (lead.company_country) {
    lines.push(`Land: ${lead.company_country}`);
  }
  if (lead.employees) {
    lines.push(`Mitarbeiterzahl: ${lead.employees}`);
  }
  if (lead.website) {
    lines.push(`Webseite: ${lead.website}`);
  }
  if (lead.linkedin_url) {
    lines.push(`LinkedIn: ${lead.linkedin_url}`);
  }
  if (lead.description) {
    lines.push(`Beschreibung: ${lead.description}`);
  }
  if (lead.keywords) {
    lines.push(`Schluesselwoerter: ${lead.keywords}`);
  }
  if (lead.annual_revenue) {
    lines.push(`Jahresumsatz: ${lead.annual_revenue}`);
  }
  if (lead.custom_field_1) {
    lines.push(`Zusatzfeld 1: ${lead.custom_field_1}`);
  }
  if (lead.custom_field_2) {
    lines.push(`Zusatzfeld 2: ${lead.custom_field_2}`);
  }
  if (lead.custom_field_3) {
    lines.push(`Zusatzfeld 3: ${lead.custom_field_3}`);
  }

  return lines.join('\n');
}

/**
 * Baut den vollstaendigen Prompt fuer die E-Mail-Generierung.
 *
 * Der Prompt besteht aus drei Teilen:
 * 1. System-Anweisungen (Rolle und Formatierung)
 * 2. Guardrails/Leitplanken (benutzerdefinierte Regeln)
 * 3. Lead-Informationen (Daten zum Kontakt)
 *
 * Das erwartete Antwortformat ist:
 * BETREFF: [Betreffzeile]
 * ---
 * [E-Mail-Text]
 */
export function buildPrompt(lead: Lead, guardrails: string): string {
  const leadInfo = buildLeadInfoBlock(lead);

  return `Du bist ein professioneller B2B-E-Mail-Texter. Deine Aufgabe ist es, eine personalisierte Vertriebs-E-Mail zu erstellen.

## Leitplanken und Regeln

${guardrails}

## Informationen zum Kontakt/Unternehmen

${leadInfo}

## Antwortformat

Antworte AUSSCHLIESSLICH im folgenden Format (keine zusaetzlichen Erklaerungen):

BETREFF: [Deine Betreffzeile hier]
---
[Dein E-Mail-Text hier]

Wichtige Hinweise:
- Die E-Mail muss professionell und persoenlich sein.
- Beziehe dich konkret auf die Informationen zum Kontakt/Unternehmen.
- Halte dich strikt an die Leitplanken und Regeln.
- Schreibe in der Sprache, die in den Leitplanken angegeben ist (Standard: Deutsch).
- Verwende keine Platzhalter wie [Name] oder {Firma} - nutze die tatsaechlichen Daten.`;
}
