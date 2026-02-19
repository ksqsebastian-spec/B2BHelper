'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Select, SelectOption } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { MappingField } from '@/types';

/** Definition eines App-Feldes fuer das Mapping */
interface AppFieldDefinition {
  key: MappingField;
  label: string;
  required: boolean;
}

/** Fertiges Mapping: CSV-Spalte → App-Feld */
export type ColumnMappingResult = Record<string, MappingField>;

/** Props fuer die Spalten-Zuordnungs-Komponente */
interface ColumnMapperProps {
  csvHeaders: string[];
  previewData: Record<string, string>[];
  onMappingComplete: (mapping: ColumnMappingResult) => void;
  /** Wenn true, wird bei erfolgreichem Auto-Mapping sofort bestaetigt */
  autoConfirm?: boolean;
}

// Verfuegbare App-Felder mit Beschriftung und Pflichtfeld-Markierung
const MAPPING_FIELDS: AppFieldDefinition[] = [
  { key: 'company_name', label: 'Firmenname', required: true },
  { key: 'contact_email', label: 'E-Mail', required: true },
  { key: 'contact_name', label: 'Ansprechpartner', required: false },
  { key: 'industry', label: 'Branche', required: false },
  { key: 'company_city', label: 'Stadt', required: false },
  { key: 'company_country', label: 'Land', required: false },
  { key: 'employees', label: 'Mitarbeiter', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'linkedin_url', label: 'LinkedIn URL', required: false },
  { key: 'description', label: 'Beschreibung', required: false },
  { key: 'keywords', label: 'Schlagwörter', required: false },
  { key: 'annual_revenue', label: 'Jahresumsatz', required: false },
  { key: 'custom_field_1', label: 'Zusatzfeld 1', required: false },
  { key: 'custom_field_2', label: 'Zusatzfeld 2', required: false },
  { key: 'custom_field_3', label: 'Zusatzfeld 3', required: false },
];

// Pflichtfelder extrahieren
const REQUIRED_FIELDS: MappingField[] = MAPPING_FIELDS
  .filter((f) => f.required)
  .map((f) => f.key);

/**
 * Fuzzy Auto-Mapping: Erkennt CSV-Spalten anhand von Schluesselwoertern.
 * Prueft ob der normalisierte Spaltenname bestimmte Begriffe enthaelt.
 * Reihenfolge: spezifischere Regeln zuerst.
 */
function autoMapColumn(csvHeader: string): MappingField | '' {
  const h = csvHeader.toLowerCase().trim().replace(/[_\-\.]+/g, ' ');

  // Firmenname – VOR E-Mail pruefen, weil "Company Name for Emails" sonst
  // faelschlicherweise als E-Mail erkannt wird
  if (
    h.includes('company name') || h.includes('firmenname') || h.includes('firma') ||
    h.includes('organization') || h.includes('organisation') || h.includes('unternehmen') ||
    h === 'company' || h === 'companyname'
  ) {
    return 'company_name';
  }

  // E-Mail – nur wenn der Spaltenname wirklich eine E-Mail-Spalte meint
  // (nicht "Company Name for Emails" o.ae., das wurde oben schon gefangen)
  if (h.includes('email') || h.includes('e-mail') || h.includes('e mail') || h === 'mail') {
    return 'contact_email';
  }

  // LinkedIn URL
  if (h.includes('linkedin')) {
    return 'linkedin_url';
  }

  // Website / URL (nach linkedin, um Konflikte zu vermeiden)
  if (h.includes('website') || h.includes('webseite') || h.includes('homepage')) {
    return 'website';
  }
  if ((h === 'url' || h === 'web') && !h.includes('linkedin')) {
    return 'website';
  }

  // Ansprechpartner / Kontaktname
  if (
    h.includes('contact name') || h.includes('ansprechpartner') || h.includes('kontaktperson') ||
    h.includes('full name') || h.includes('fullname') || h.includes('vor- und nachname') ||
    h.includes('person name') || h.includes('first name') || h.includes('last name') ||
    h === 'name' || h === 'kontakt' || h === 'contact'
  ) {
    return 'contact_name';
  }

  // Mitarbeiter
  if (
    h.includes('employee') || h.includes('mitarbeiter') || h.includes('company size') ||
    h.includes('firmengroesse') || h.includes('firmengröße') || h.includes('headcount') ||
    h.includes('# employee') || h.includes('number of employee') || h.includes('staff')
  ) {
    return 'employees';
  }

  // Stadt
  if (
    h.includes('city') || h.includes('stadt') || h === 'ort' || h === 'standort' ||
    h === 'location'
  ) {
    return 'company_city';
  }

  // Land
  if (
    h.includes('country') || h.includes('land') || h === 'staat' || h.includes('nation')
  ) {
    return 'company_country';
  }

  // Branche
  if (
    h.includes('industry') || h.includes('branche') || h.includes('sector') ||
    h.includes('sektor') || h.includes('geschaeftsfeld') || h.includes('geschäftsfeld')
  ) {
    return 'industry';
  }

  // Beschreibung
  if (h.includes('description') || h.includes('beschreibung')) {
    return 'description';
  }

  // Schluesselwoerter
  if (
    h.includes('keyword') || h.includes('schlagw') || h.includes('schluesselw') ||
    h === 'tags'
  ) {
    return 'keywords';
  }

  // Jahresumsatz
  if (
    h.includes('revenue') || h.includes('umsatz') || h.includes('annual')
  ) {
    return 'annual_revenue';
  }

  return '';
}

/**
 * Erstellt das initiale Auto-Mapping fuer alle CSV-Spalten.
 * Jedes App-Feld wird nur einmal vergeben (kein Duplikat).
 */
export function buildAutoMapping(
  csvHeaders: string[]
): Record<string, MappingField | ''> {
  const initial: Record<string, MappingField | ''> = {};
  const usedFields = new Set<MappingField>();

  // Erste Runde: Auto-Zuordnung
  for (const header of csvHeaders) {
    const autoMapped = autoMapColumn(header);
    if (autoMapped && !usedFields.has(autoMapped)) {
      initial[header] = autoMapped;
      usedFields.add(autoMapped);
    }
  }

  // Nicht zugeordnete Spalten leer lassen
  for (const header of csvHeaders) {
    if (!(header in initial)) {
      initial[header] = '';
    }
  }

  return initial;
}

/** Prueft ob alle Pflichtfelder im Mapping vorhanden sind */
export function isMappingValid(
  mapping: Record<string, MappingField | ''>
): boolean {
  const used = new Set(Object.values(mapping).filter((v) => v !== ''));
  return REQUIRED_FIELDS.every((f) => used.has(f));
}

/** Extrahiert nur die zugeordneten Felder als ColumnMappingResult */
export function extractMappingResult(
  mapping: Record<string, MappingField | ''>
): ColumnMappingResult {
  const result: ColumnMappingResult = {};
  for (const [csvCol, appField] of Object.entries(mapping)) {
    if (appField) {
      result[csvCol] = appField;
    }
  }
  return result;
}

// Spalten-Zuordnungs-Komponente: CSV-Spalten → App-Felder
export function ColumnMapper({
  csvHeaders,
  previewData,
  onMappingComplete,
  autoConfirm = false,
}: ColumnMapperProps): React.ReactNode {
  const [mapping, setMapping] = useState<Record<string, MappingField | ''>>(
    () => buildAutoMapping(csvHeaders)
  );
  const [autoConfirmed, setAutoConfirmed] = useState(false);

  // Pruefen welche App-Felder bereits vergeben sind
  const usedAppFields = useMemo((): Set<MappingField> => {
    const used = new Set<MappingField>();
    for (const value of Object.values(mapping)) {
      if (value) used.add(value);
    }
    return used;
  }, [mapping]);

  // Validierung: Alle Pflichtfelder zugeordnet?
  const missingRequired = useMemo((): MappingField[] => {
    return REQUIRED_FIELDS.filter((field) => !usedAppFields.has(field));
  }, [usedAppFields]);

  const isValid = missingRequired.length === 0;

  // Anzahl zugeordneter Spalten
  const mappedCount = useMemo(
    (): number => Object.values(mapping).filter((v) => v !== '').length,
    [mapping]
  );

  // Auto-Confirm: sofort weiter wenn Pflichtfelder erkannt
  useEffect(() => {
    if (autoConfirm && isValid && !autoConfirmed) {
      setAutoConfirmed(true);
      onMappingComplete(extractMappingResult(mapping));
    }
  }, [autoConfirm, isValid, autoConfirmed, mapping, onMappingComplete]);

  // Einzelnes Mapping aendern
  const handleMappingChange = useCallback(
    (csvHeader: string, appField: MappingField | ''): void => {
      setMapping((prev) => ({ ...prev, [csvHeader]: appField }));
    },
    []
  );

  // Mapping bestaetigen
  const handleConfirm = useCallback((): void => {
    if (!isValid) return;
    onMappingComplete(extractMappingResult(mapping));
  }, [isValid, mapping, onMappingComplete]);

  // Vorschau-Wert fuer eine CSV-Spalte
  const getPreviewValue = (csvHeader: string): string => {
    for (const row of previewData) {
      const value = row[csvHeader];
      if (value && value.trim() !== '') {
        return value.length > 60 ? `${value.slice(0, 57)}...` : value;
      }
    }
    return '—';
  };

  // Nur zugeordnete Spalten + nicht zugeordnete mit Vorschau anzeigen
  const mappedHeaders = csvHeaders.filter((h) => mapping[h]);
  const unmappedHeaders = csvHeaders.filter((h) => !mapping[h]);

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          Spalten zuordnen
        </h3>
        <p className="text-sm text-muted-foreground">
          {mappedCount} von {csvHeaders.length} Spalten automatisch erkannt.
          Passen Sie die Zuordnung bei Bedarf an.
        </p>
      </div>

      {/* Pflichtfelder-Warnung */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Pflichtfelder fehlen:
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
              {missingRequired.map((field) => {
                const def = MAPPING_FIELDS.find((f) => f.key === field);
                return <li key={field}>{def?.label ?? field}</li>;
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Erkannte Zuordnungen (kompakt) */}
      {mappedHeaders.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Erkannte Felder</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {mappedHeaders.map((header) => {
              const fieldDef = MAPPING_FIELDS.find((f) => f.key === mapping[header]);
              return (
                <div
                  key={header}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {fieldDef?.label}
                      {fieldDef?.required ? ' *' : ''}
                    </Badge>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs text-muted-foreground font-mono">
                      {header}
                    </span>
                  </div>
                  <Select
                    value={mapping[header] ?? ''}
                    onChange={(e) =>
                      handleMappingChange(
                        header,
                        (e.target.value as MappingField | '') || ''
                      )
                    }
                    className="ml-2 w-40 shrink-0 text-xs"
                  >
                    <SelectOption value="">– Entfernen –</SelectOption>
                    {MAPPING_FIELDS.map((field) => {
                      const isUsed =
                        usedAppFields.has(field.key) && mapping[header] !== field.key;
                      return (
                        <SelectOption
                          key={field.key}
                          value={field.key}
                          disabled={isUsed}
                        >
                          {field.label}
                          {field.required ? ' *' : ''}
                          {isUsed ? ' (vergeben)' : ''}
                        </SelectOption>
                      );
                    })}
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nicht zugeordnete Spalten (eingeklappt / kompakt) */}
      {unmappedHeaders.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            {unmappedHeaders.length} nicht zugeordnete Spalten anzeigen
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {unmappedHeaders.map((header) => (
              <div
                key={header}
                className="flex items-center justify-between rounded-md border border-dashed bg-background px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="block truncate text-xs font-mono text-muted-foreground">
                    {header}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground/60">
                    {getPreviewValue(header)}
                  </span>
                </div>
                <Select
                  value=""
                  onChange={(e) =>
                    handleMappingChange(
                      header,
                      (e.target.value as MappingField | '') || ''
                    )
                  }
                  className="ml-2 w-40 shrink-0 text-xs"
                >
                  <SelectOption value="">– Zuordnen –</SelectOption>
                  {MAPPING_FIELDS.map((field) => {
                    const isUsed = usedAppFields.has(field.key);
                    return (
                      <SelectOption
                        key={field.key}
                        value={field.key}
                        disabled={isUsed}
                      >
                        {field.label}
                        {field.required ? ' *' : ''}
                        {isUsed ? ' (vergeben)' : ''}
                      </SelectOption>
                    );
                  })}
                </Select>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Bestaetigen-Button */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          {isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Alle Pflichtfelder zugeordnet
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Bitte ordnen Sie alle Pflichtfelder zu
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isValid}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Weiter zur Vorschau
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
