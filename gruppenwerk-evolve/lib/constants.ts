/**
 * Zentrale Konstanten fuer die GruppenwerkEvolve-Anwendung.
 */

import type { ExportFormat, LLMProvider, MappingField } from '@/types';

// --- Anwendungskonstanten ---

export const APP_NAME = 'GruppenwerkEvolve' as const;

/** Maximale CSV-Dateigroesse in Megabyte */
export const MAX_CSV_SIZE_MB = 10;

/** Maximale CSV-Dateigroesse in Bytes */
export const MAX_CSV_SIZE_BYTES = MAX_CSV_SIZE_MB * 1024 * 1024;

/** Maximale Anzahl von Leads pro Batch */
export const MAX_LEADS_PER_BATCH = 500;

/** Standard-Temperatur fuer LLM-Anfragen */
export const DEFAULT_TEMPERATURE = 0.7;

/** Standard-Token-Limit fuer LLM-Anfragen */
export const DEFAULT_MAX_TOKENS = 500;

/** Sitzungsdauer in Tagen */
export const SESSION_DURATION_DAYS = 30;

/** Anzahl der Vorschau-Zeilen beim CSV-Import */
export const CSV_PREVIEW_ROWS = 5;

// --- Mapping-Felder ---

/** Definition eines Mapping-Feldes fuer den CSV-Import */
export interface MappingFieldConfig {
  field: MappingField;
  label: string;
  required: boolean;
}

/** Alle verfuegbaren App-Felder mit deutschen Bezeichnungen */
export const MAPPING_FIELDS: readonly MappingFieldConfig[] = [
  { field: 'company_name', label: 'Firmenname', required: true },
  { field: 'contact_email', label: 'E-Mail-Adresse', required: false },
  { field: 'contact_name', label: 'Kontaktname', required: false },
  { field: 'industry', label: 'Branche', required: false },
  { field: 'company_city', label: 'Stadt', required: false },
  { field: 'company_country', label: 'Land', required: false },
  { field: 'employees', label: 'Mitarbeiterzahl', required: false },
  { field: 'website', label: 'Webseite', required: false },
  { field: 'linkedin_url', label: 'LinkedIn-URL', required: false },
  { field: 'description', label: 'Beschreibung', required: false },
  { field: 'keywords', label: 'Schluesselwoerter', required: false },
  { field: 'annual_revenue', label: 'Jahresumsatz', required: false },
  { field: 'custom_field_1', label: 'Benutzerdefiniert 1', required: false },
  { field: 'custom_field_2', label: 'Benutzerdefiniert 2', required: false },
  { field: 'custom_field_3', label: 'Benutzerdefiniert 3', required: false },
] as const;

/** Pflichtfelder fuer den CSV-Import */
export const REQUIRED_MAPPING_FIELDS: readonly MappingField[] = MAPPING_FIELDS
  .filter((f) => f.required)
  .map((f) => f.field);

// --- Anbieter-Konfiguration ---

/** Konfiguration eines LLM-Anbieters */
export interface ProviderOption {
  value: LLMProvider;
  label: string;
  description: string;
}

/** Verfuegbare LLM-Anbieter */
export const PROVIDER_OPTIONS: readonly ProviderOption[] = [
  {
    value: 'anthropic',
    label: 'Anthropic (Claude)',
    description: 'Claude-Modelle von Anthropic',
  },
  {
    value: 'openai',
    label: 'OpenAI (GPT)',
    description: 'GPT-Modelle von OpenAI',
  },
  {
    value: 'qwen',
    label: 'Qwen',
    description: 'Qwen-Modelle von Alibaba Cloud',
  },
  {
    value: 'custom',
    label: 'Benutzerdefiniert',
    description: 'OpenAI-kompatibler Endpunkt',
  },
] as const;

/** Modell-Konfiguration */
export interface ModelOption {
  value: string;
  label: string;
}

/** Verfuegbare Modelle je Anbieter */
export const MODEL_OPTIONS: Record<LLMProvider, readonly ModelOption[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  qwen: [
    { value: 'qwen-plus', label: 'Qwen Plus' },
    { value: 'qwen-turbo', label: 'Qwen Turbo' },
    { value: 'qwen-max', label: 'Qwen Max' },
  ],
  custom: [
    { value: 'custom', label: 'Benutzerdefiniertes Modell' },
  ],
} as const;

// --- Export-Format-Optionen ---

/** Konfiguration eines Export-Formats */
export interface ExportFormatOption {
  value: ExportFormat;
  label: string;
  description: string;
}

/** Verfuegbare Export-Formate */
export const EXPORT_FORMAT_OPTIONS: readonly ExportFormatOption[] = [
  {
    value: 'instantly',
    label: 'Instantly',
    description: 'CSV-Format fuer Instantly.ai Kampagnen',
  },
  {
    value: 'mailchimp',
    label: 'Mailchimp',
    description: 'CSV-Format fuer Mailchimp-Import',
  },
  {
    value: 'generic',
    label: 'Generisch',
    description: 'Allgemeines CSV-Format',
  },
] as const;
