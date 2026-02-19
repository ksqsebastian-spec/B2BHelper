/**
 * Zod-Validierungsschemas fuer E-Mail-bezogene Operationen.
 * Alle Fehlermeldungen sind auf Deutsch.
 */

import { z } from 'zod';

/** Gueltige E-Mail-Status-Werte */
const emailStatusValues = [
  'generated',
  'reviewed',
  'approved',
  'rejected',
  'exported',
  'error',
] as const;

/** Schema fuer die Bearbeitung einer generierten E-Mail */
export const emailEditSchema = z.object({
  subject: z
    .string({ required_error: 'Betreff ist erforderlich.' })
    .min(1, 'Betreff darf nicht leer sein.')
    .max(500, 'Betreff darf maximal 500 Zeichen lang sein.'),
  body: z
    .string({ required_error: 'E-Mail-Text ist erforderlich.' })
    .min(1, 'E-Mail-Text darf nicht leer sein.')
    .max(10000, 'E-Mail-Text darf maximal 10.000 Zeichen lang sein.'),
});

/** Typ einer validierten E-Mail-Bearbeitung */
export type ValidatedEmailEdit = z.infer<typeof emailEditSchema>;

/** Schema fuer die Aenderung des E-Mail-Status */
export const emailStatusUpdateSchema = z.object({
  status: z.enum(emailStatusValues, {
    errorMap: () => ({ message: 'Ungueltiger E-Mail-Status.' }),
  }),
});

/** Typ eines validierten Status-Updates */
export type ValidatedEmailStatusUpdate = z.infer<typeof emailStatusUpdateSchema>;

/** Schema fuer die Batch-Status-Aenderung mehrerer E-Mails */
export const emailBatchStatusSchema = z.object({
  emailIds: z
    .array(z.string().uuid('Ungueltige E-Mail-ID.'))
    .min(1, 'Mindestens eine E-Mail muss ausgewaehlt werden.'),
  status: z.enum(emailStatusValues, {
    errorMap: () => ({ message: 'Ungueltiger E-Mail-Status.' }),
  }),
});

/** Typ einer validierten Batch-Status-Aenderung */
export type ValidatedEmailBatchStatus = z.infer<typeof emailBatchStatusSchema>;

/** Schema fuer den E-Mail-Export */
export const emailExportSchema = z.object({
  emailIds: z
    .array(z.string().uuid('Ungueltige E-Mail-ID.'))
    .min(1, 'Mindestens eine E-Mail muss zum Exportieren ausgewaehlt werden.'),
  format: z.enum(['instantly', 'mailchimp', 'generic'], {
    errorMap: () => ({ message: 'Ungueltiges Export-Format.' }),
  }),
});

/** Typ eines validierten E-Mail-Exports */
export type ValidatedEmailExport = z.infer<typeof emailExportSchema>;

/** Schema fuer die Generierungsparameter */
export const emailGenerationParamsSchema = z.object({
  batchId: z
    .string({ required_error: 'Batch-ID ist erforderlich.' })
    .uuid('Ungueltige Batch-ID.'),
  provider: z.enum(['anthropic', 'openai', 'qwen', 'custom'], {
    errorMap: () => ({ message: 'Ungueltiger Anbieter.' }),
  }),
  model: z
    .string({ required_error: 'Modell ist erforderlich.' })
    .min(1, 'Modell darf nicht leer sein.'),
  temperature: z
    .number({ required_error: 'Temperatur ist erforderlich.' })
    .min(0, 'Temperatur muss mindestens 0 sein.')
    .max(2, 'Temperatur darf maximal 2 sein.'),
  maxTokens: z
    .number({ required_error: 'Token-Limit ist erforderlich.' })
    .int('Token-Limit muss eine ganze Zahl sein.')
    .min(50, 'Token-Limit muss mindestens 50 sein.')
    .max(4000, 'Token-Limit darf maximal 4000 sein.'),
  leadIds: z
    .array(z.string().uuid('Ungueltige Lead-ID.'))
    .optional(),
});

/** Typ validierter Generierungsparameter */
export type ValidatedEmailGenerationParams = z.infer<typeof emailGenerationParamsSchema>;
