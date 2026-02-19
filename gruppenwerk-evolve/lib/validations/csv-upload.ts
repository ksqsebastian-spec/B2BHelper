/**
 * Zod-Validierungsschema fuer den CSV-Upload.
 * Alle Fehlermeldungen sind auf Deutsch.
 */

import { z } from 'zod';
import { MAX_CSV_SIZE_BYTES, MAX_CSV_SIZE_MB, MAX_LEADS_PER_BATCH } from '@/lib/constants';

/** Erlaubte Datei-Endungen fuer den CSV-Upload */
const ALLOWED_EXTENSIONS = ['.csv', '.tsv', '.txt'] as const;

/** Erlaubte MIME-Typen fuer den CSV-Upload */
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/tab-separated-values',
  'text/plain',
  'application/vnd.ms-excel',
] as const;

/** Schema fuer die CSV-Datei-Validierung */
export const csvFileSchema = z.object({
  name: z
    .string()
    .min(1, 'Dateiname darf nicht leer sein.')
    .refine(
      (name) => {
        const lowerName = name.toLowerCase();
        return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
      },
      {
        message: `Nur Dateien mit folgenden Endungen sind erlaubt: ${ALLOWED_EXTENSIONS.join(', ')}`,
      }
    ),
  size: z
    .number()
    .min(1, 'Die Datei ist leer.')
    .max(
      MAX_CSV_SIZE_BYTES,
      `Die Datei ist zu gross. Maximale Groesse: ${MAX_CSV_SIZE_MB} MB.`
    ),
  type: z
    .string()
    .refine(
      (type) =>
        type === '' ||
        ALLOWED_MIME_TYPES.includes(type as (typeof ALLOWED_MIME_TYPES)[number]),
      {
        message: 'Ungueltiger Dateityp. Bitte laden Sie eine CSV-Datei hoch.',
      }
    ),
});

/** Typ einer validierten CSV-Datei */
export type ValidatedCsvFile = z.infer<typeof csvFileSchema>;

/**
 * Validiert eine hochgeladene Datei vor dem Parsen.
 * Gibt Fehlermeldungen als Array zurueck oder null bei Erfolg.
 */
export function validateCsvFile(file: File): string[] | null {
  const result = csvFileSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (result.success) {
    return null;
  }

  return result.error.errors.map((err) => err.message);
}

/**
 * Prueft, ob die Anzahl der geparsten Zeilen das Limit nicht ueberschreitet.
 */
export function validateRowCount(rowCount: number): string | null {
  if (rowCount === 0) {
    return 'Die CSV-Datei enthaelt keine Daten.';
  }

  if (rowCount > MAX_LEADS_PER_BATCH) {
    return `Zu viele Zeilen: ${rowCount}. Maximal ${MAX_LEADS_PER_BATCH} Leads pro Batch sind erlaubt.`;
  }

  return null;
}
