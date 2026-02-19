/**
 * Zod-Validierungsschemas fuer den Lead-Import.
 * Alle Fehlermeldungen sind auf Deutsch.
 */

import { z } from 'zod';

/** Schema fuer eine einzelne Zeile beim CSV-Import */
export const leadRowSchema = z.object({
  company_name: z
    .string({ required_error: 'Firmenname ist erforderlich.' })
    .min(1, 'Firmenname darf nicht leer sein.')
    .max(255, 'Firmenname darf maximal 255 Zeichen lang sein.'),
  contact_email: z
    .string()
    .max(255, 'E-Mail-Adresse darf maximal 255 Zeichen lang sein.')
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'Bitte geben Sie eine gueltige E-Mail-Adresse ein.'
    )
    .nullish()
    .transform((val) => val || null),
  contact_name: z
    .string()
    .max(255, 'Kontaktname darf maximal 255 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  industry: z
    .string()
    .max(255, 'Branche darf maximal 255 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  company_city: z
    .string()
    .max(255, 'Stadt darf maximal 255 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  company_country: z
    .string()
    .max(255, 'Land darf maximal 255 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  employees: z
    .string()
    .max(100, 'Mitarbeiterzahl darf maximal 100 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  website: z
    .string()
    .max(500, 'Webseite darf maximal 500 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  linkedin_url: z
    .string()
    .max(500, 'LinkedIn-URL darf maximal 500 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  description: z
    .string()
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  keywords: z
    .string()
    .max(500, 'Schluesselwoerter duerfen maximal 500 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  annual_revenue: z
    .string()
    .max(100, 'Jahresumsatz darf maximal 100 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  custom_field_1: z
    .string()
    .max(500, 'Benutzerdefiniertes Feld 1 darf maximal 500 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  custom_field_2: z
    .string()
    .max(500, 'Benutzerdefiniertes Feld 2 darf maximal 500 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
  custom_field_3: z
    .string()
    .max(500, 'Benutzerdefiniertes Feld 3 darf maximal 500 Zeichen lang sein.')
    .nullish()
    .transform((val) => val || null),
});

/** Typ einer validierten Lead-Zeile */
export type ValidatedLeadRow = z.infer<typeof leadRowSchema>;

/** Schema fuer den Batch-Namen beim Import */
export const importBatchNameSchema = z.object({
  name: z
    .string({ required_error: 'Batch-Name ist erforderlich.' })
    .min(1, 'Batch-Name darf nicht leer sein.')
    .max(100, 'Batch-Name darf maximal 100 Zeichen lang sein.')
    .trim(),
});

/** Typ eines validierten Batch-Namens */
export type ValidatedImportBatchName = z.infer<typeof importBatchNameSchema>;

/**
 * Validiert ein Array von Lead-Zeilen und gibt Ergebnisse zurueck.
 * Gibt sowohl gueltige als auch ungueltige Zeilen mit Fehlern zurueck.
 */
export function validateLeadRows(
  rows: Record<string, unknown>[]
): {
  valid: ValidatedLeadRow[];
  errors: Array<{ row: number; messages: string[] }>;
} {
  const valid: ValidatedLeadRow[] = [];
  const errors: Array<{ row: number; messages: string[] }> = [];

  for (let i = 0; i < rows.length; i++) {
    const result = leadRowSchema.safeParse(rows[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      const messages = result.error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      errors.push({ row: i + 1, messages });
    }
  }

  return { valid, errors };
}
