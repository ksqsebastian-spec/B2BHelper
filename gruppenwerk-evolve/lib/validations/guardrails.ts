/**
 * Zod-Validierungsschema fuer Guardrails/Leitplanken-Inhalte.
 * Alle Fehlermeldungen sind auf Deutsch.
 */

import { z } from 'zod';

/** Minimale Zeichenlaenge fuer Guardrails-Inhalte */
const MIN_GUARDRAILS_LENGTH = 50;

/** Maximale Zeichenlaenge fuer Guardrails-Inhalte */
const MAX_GUARDRAILS_LENGTH = 10000;

/** Schema fuer den Guardrails-Inhalt */
export const guardrailsContentSchema = z.object({
  content: z
    .string({ required_error: 'Leitplanken-Inhalt ist erforderlich.' })
    .min(
      MIN_GUARDRAILS_LENGTH,
      `Leitplanken muessen mindestens ${MIN_GUARDRAILS_LENGTH} Zeichen lang sein.`
    )
    .max(
      MAX_GUARDRAILS_LENGTH,
      `Leitplanken duerfen maximal ${MAX_GUARDRAILS_LENGTH} Zeichen lang sein.`
    ),
});

/** Typ eines validierten Guardrails-Inhalts */
export type ValidatedGuardrailsContent = z.infer<typeof guardrailsContentSchema>;

/** Schema fuer die Aktivierung einer Guardrails-Version */
export const guardrailsActivateSchema = z.object({
  versionId: z
    .string({ required_error: 'Versions-ID ist erforderlich.' })
    .uuid('Ungueltige Versions-ID.'),
});

/** Typ einer validierten Guardrails-Aktivierung */
export type ValidatedGuardrailsActivate = z.infer<typeof guardrailsActivateSchema>;
