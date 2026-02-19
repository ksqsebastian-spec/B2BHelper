/**
 * Zentrale TypeScript-Typen fuer die GruppenwerkEvolve-Anwendung.
 * Alle Interfaces und Typen basieren auf dem Datenbank-Schema.
 */

// --- Basis-Typen ---

/** Status einer generierten E-Mail im Workflow */
export type EmailStatus =
  | 'generated'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'exported'
  | 'error';

/** Unterstuetzte LLM-Anbieter */
export type LLMProvider = 'anthropic' | 'openai' | 'qwen' | 'custom';

/** Unterstuetzte Export-Formate */
export type ExportFormat = 'instantly' | 'mailchimp' | 'generic';

/** Verfuegbare Felder fuer das Spalten-Mapping beim CSV-Import */
export type MappingField =
  | 'company_name'
  | 'contact_email'
  | 'contact_name'
  | 'industry'
  | 'company_city'
  | 'company_country'
  | 'employees'
  | 'website'
  | 'linkedin_url'
  | 'description'
  | 'keywords'
  | 'annual_revenue'
  | 'custom_field_1'
  | 'custom_field_2'
  | 'custom_field_3';

// --- Datenbank-Entitaeten ---

/** Ein Lead/Kontakt aus dem CSV-Import */
export interface Lead {
  id: string;
  batch_id: string;
  user_id: string;
  company_name: string;
  contact_email?: string | null;
  contact_name?: string | null;
  industry?: string | null;
  company_city?: string | null;
  company_country?: string | null;
  employees?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  description?: string | null;
  keywords?: string | null;
  annual_revenue?: string | null;
  custom_field_1?: string | null;
  custom_field_2?: string | null;
  custom_field_3?: string | null;
  raw_data?: Record<string, string> | null;
  email_generated: boolean;
  created_at: string;
  updated_at: string;
}

/** Ein Import-Batch repraesentiert einen einzelnen CSV-Import */
export interface ImportBatch {
  id: string;
  user_id: string;
  name: string;
  file_name: string;
  total_leads: number;
  imported_at: string;
  status: 'active' | 'archived';
  created_at: string;
}

/** Eine generierte E-Mail fuer einen Lead */
export interface GeneratedEmail {
  id: string;
  lead_id: string;
  user_id: string;
  batch_id: string;
  subject: string;
  body: string;
  provider: LLMProvider;
  model: string;
  guardrail_version_id?: string | null;
  temperature: number;
  tokens_used?: number | null;
  generation_time_ms?: number | null;
  status: EmailStatus;
  reviewed_at?: string | null;
  exported_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Eine Version der Guardrails/Leitplanken fuer die E-Mail-Generierung */
export interface GuardrailVersion {
  id: string;
  user_id: string;
  version_number: number;
  content: string;
  is_active: boolean;
  created_at: string;
}

/** API-Konfiguration fuer einen LLM-Anbieter */
export interface ApiConfiguration {
  id: string;
  user_id: string;
  provider: LLMProvider;
  api_key_encrypted: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Gespeichertes Spalten-Mapping fuer CSV-Importe */
export interface ColumnMapping {
  id: string;
  user_id: string;
  name: string;
  mapping: Record<string, string>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Benutzerprofil mit Standardeinstellungen */
export interface UserProfile {
  id: string;
  display_name?: string | null;
  default_provider: LLMProvider;
  default_model: string;
  default_export_format: ExportFormat;
  created_at: string;
  updated_at: string;
}

// --- Funktionale Typen ---

/** Optionen fuer die E-Mail-Generierung */
export interface GenerateOptions {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

/** Antwort eines LLM-Anbieters */
export interface LLMResponse {
  subject: string;
  body: string;
  tokensUsed?: number;
}

/** Fortschritts-Nachricht waehrend der Batch-Generierung */
export interface GenerationProgress {
  type: 'progress' | 'success' | 'error' | 'complete';
  current?: number;
  total?: number;
  leadName?: string;
  leadId?: string;
  emailId?: string;
  error?: string;
  successful?: number;
  failed?: number;
}

// --- Hilfstypen fuer UI-Komponenten ---

/** Lead mit zugehoeriger E-Mail fuer die Review-Ansicht */
export interface LeadWithEmail extends Lead {
  generated_email?: GeneratedEmail | null;
}

/** Import-Batch mit aggregierter E-Mail-Statistik */
export interface ImportBatchWithStats extends ImportBatch {
  generated_count: number;
  approved_count: number;
  exported_count: number;
}

/** Spalten-Mapping Eintrag fuer die Zuordnungs-UI */
export interface MappingEntry {
  csvColumn: string;
  appField: MappingField | '';
}
