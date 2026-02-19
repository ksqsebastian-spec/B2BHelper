/**
 * Zod-Validierungsschemas fuer Einstellungs-Formulare.
 * Alle Fehlermeldungen sind auf Deutsch.
 */

import { z } from 'zod';

/** Gueltige LLM-Anbieter */
const llmProviderValues = ['anthropic', 'openai', 'qwen', 'custom'] as const;

/** Gueltige Export-Formate */
const exportFormatValues = ['instantly', 'mailchimp', 'generic'] as const;

/** Schema fuer das API-Schluessel-Formular */
export const apiKeyFormSchema = z.object({
  provider: z.enum(llmProviderValues, {
    errorMap: () => ({ message: 'Bitte waehlen Sie einen Anbieter aus.' }),
  }),
  apiKey: z
    .string({ required_error: 'API-Schluessel ist erforderlich.' })
    .min(1, 'API-Schluessel darf nicht leer sein.')
    .max(500, 'API-Schluessel darf maximal 500 Zeichen lang sein.'),
  isDefault: z.boolean().optional().default(false),
  /** Benutzerdefinierter Endpunkt (nur fuer den 'custom'-Anbieter) */
  customEndpoint: z
    .string()
    .url('Bitte geben Sie eine gueltige URL ein.')
    .max(500, 'Endpunkt-URL darf maximal 500 Zeichen lang sein.')
    .optional()
    .or(z.literal('')),
  /** Benutzerdefinierter Modellname (nur fuer den 'custom'-Anbieter) */
  customModel: z
    .string()
    .max(100, 'Modellname darf maximal 100 Zeichen lang sein.')
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    // Benutzerdefinierter Endpunkt ist erforderlich, wenn der Anbieter 'custom' ist
    if (data.provider === 'custom') {
      return !!data.customEndpoint && data.customEndpoint.length > 0;
    }
    return true;
  },
  {
    message: 'Endpunkt-URL ist erforderlich fuer benutzerdefinierte Anbieter.',
    path: ['customEndpoint'],
  }
);

/** Typ eines validierten API-Schluessel-Formulars */
export type ValidatedApiKeyForm = z.infer<typeof apiKeyFormSchema>;

/** Schema fuer die Anbieter-Einstellungen */
export const providerSettingsSchema = z.object({
  defaultProvider: z.enum(llmProviderValues, {
    errorMap: () => ({ message: 'Bitte waehlen Sie einen Standard-Anbieter aus.' }),
  }),
  defaultModel: z
    .string({ required_error: 'Standard-Modell ist erforderlich.' })
    .min(1, 'Standard-Modell darf nicht leer sein.')
    .max(100, 'Modellname darf maximal 100 Zeichen lang sein.'),
  defaultTemperature: z
    .number({ required_error: 'Standard-Temperatur ist erforderlich.' })
    .min(0, 'Temperatur muss mindestens 0 sein.')
    .max(2, 'Temperatur darf maximal 2 sein.'),
  defaultMaxTokens: z
    .number({ required_error: 'Standard-Token-Limit ist erforderlich.' })
    .int('Token-Limit muss eine ganze Zahl sein.')
    .min(50, 'Token-Limit muss mindestens 50 sein.')
    .max(4000, 'Token-Limit darf maximal 4000 sein.'),
});

/** Typ validierter Anbieter-Einstellungen */
export type ValidatedProviderSettings = z.infer<typeof providerSettingsSchema>;

/** Schema fuer das Benutzerprofil */
export const userProfileSchema = z.object({
  displayName: z
    .string()
    .max(100, 'Anzeigename darf maximal 100 Zeichen lang sein.')
    .optional()
    .or(z.literal('')),
  defaultProvider: z.enum(llmProviderValues, {
    errorMap: () => ({ message: 'Bitte waehlen Sie einen Standard-Anbieter aus.' }),
  }),
  defaultModel: z
    .string({ required_error: 'Standard-Modell ist erforderlich.' })
    .min(1, 'Standard-Modell darf nicht leer sein.'),
  defaultExportFormat: z.enum(exportFormatValues, {
    errorMap: () => ({ message: 'Bitte waehlen Sie ein Standard-Export-Format aus.' }),
  }),
});

/** Typ eines validierten Benutzerprofils */
export type ValidatedUserProfile = z.infer<typeof userProfileSchema>;

/** Schema fuer das Spalten-Mapping */
export const columnMappingSchema = z.object({
  name: z
    .string({ required_error: 'Mapping-Name ist erforderlich.' })
    .min(1, 'Mapping-Name darf nicht leer sein.')
    .max(100, 'Mapping-Name darf maximal 100 Zeichen lang sein.')
    .trim(),
  mapping: z.record(z.string(), z.string()).refine(
    (mapping) => {
      const values = Object.values(mapping).filter((v) => v.length > 0);
      return values.includes('company_name');
    },
    {
      message: 'Firmenname muss zugeordnet werden.',
    }
  ),
  isDefault: z.boolean().optional().default(false),
});

/** Typ eines validierten Spalten-Mappings */
export type ValidatedColumnMapping = z.infer<typeof columnMappingSchema>;
