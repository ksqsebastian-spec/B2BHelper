'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectOption } from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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

/** Auto-Mapping-Regeln: Kleingeschriebene CSV-Spaltenamen → App-Feld */
const AUTO_MAPPING_RULES: Record<string, MappingField> = {
  // Firmenname
  'company name': 'company_name',
  'company_name': 'company_name',
  'companyname': 'company_name',
  'firma': 'company_name',
  'firmenname': 'company_name',
  'unternehmen': 'company_name',
  'unternehmensname': 'company_name',
  'organization': 'company_name',
  'organisation': 'company_name',
  'company': 'company_name',

  // E-Mail
  'email': 'contact_email',
  'e-mail': 'contact_email',
  'e_mail': 'contact_email',
  'contact email': 'contact_email',
  'contact_email': 'contact_email',
  'kontakt-email': 'contact_email',
  'kontaktemail': 'contact_email',
  'mail': 'contact_email',
  'email address': 'contact_email',
  'emailaddress': 'contact_email',
  'e-mail-adresse': 'contact_email',

  // Ansprechpartner
  'name': 'contact_name',
  'contact name': 'contact_name',
  'contact_name': 'contact_name',
  'contactname': 'contact_name',
  'ansprechpartner': 'contact_name',
  'kontaktperson': 'contact_name',
  'kontakt': 'contact_name',
  'full name': 'contact_name',
  'fullname': 'contact_name',
  'vor- und nachname': 'contact_name',

  // Branche
  'industry': 'industry',
  'branche': 'industry',
  'sector': 'industry',
  'sektor': 'industry',
  'geschaeftsfeld': 'industry',

  // Stadt
  'city': 'company_city',
  'company_city': 'company_city',
  'stadt': 'company_city',
  'ort': 'company_city',
  'standort': 'company_city',
  'location': 'company_city',

  // Land
  'country': 'company_country',
  'company_country': 'company_country',
  'land': 'company_country',
  'staat': 'company_country',

  // Mitarbeiter
  'employees': 'employees',
  'mitarbeiter': 'employees',
  'mitarbeiteranzahl': 'employees',
  'employee count': 'employees',
  'company size': 'employees',
  'firmengroesse': 'employees',

  // Website
  'website': 'website',
  'webseite': 'website',
  'homepage': 'website',
  'url': 'website',
  'web': 'website',

  // LinkedIn
  'linkedin': 'linkedin_url',
  'linkedin_url': 'linkedin_url',
  'linkedin url': 'linkedin_url',
  'linkedin-url': 'linkedin_url',
  'linkedin profil': 'linkedin_url',

  // Beschreibung
  'description': 'description',
  'beschreibung': 'description',
  'company description': 'description',
  'firmenbeschreibung': 'description',

  // Schluesselwoerter
  'keywords': 'keywords',
  'schluesselwoerter': 'keywords',
  'schlagwoerter': 'keywords',
  'schlagwörter': 'keywords',
  'tags': 'keywords',

  // Jahresumsatz
  'revenue': 'annual_revenue',
  'annual revenue': 'annual_revenue',
  'annual_revenue': 'annual_revenue',
  'umsatz': 'annual_revenue',
  'jahresumsatz': 'annual_revenue',
};

// Automatisches Mapping fuer eine CSV-Spalte ermitteln
function autoMapColumn(csvHeader: string): MappingField | '' {
  const normalized = csvHeader.toLowerCase().trim();
  return AUTO_MAPPING_RULES[normalized] ?? '';
}

// Spalten-Zuordnungs-Komponente: CSV-Spalten → App-Felder
export function ColumnMapper({
  csvHeaders,
  previewData,
  onMappingComplete,
}: ColumnMapperProps): React.ReactNode {
  // Initiales Mapping mit Auto-Erkennung
  const [mapping, setMapping] = useState<Record<string, MappingField | ''>>(
    () => {
      const initial: Record<string, MappingField | ''> = {};
      const usedFields = new Set<MappingField>();

      // Erste Runde: exakte Auto-Zuordnung
      for (const header of csvHeaders) {
        const autoMapped = autoMapColumn(header);
        if (autoMapped && !usedFields.has(autoMapped)) {
          initial[header] = autoMapped;
          usedFields.add(autoMapped);
        }
      }

      // Zweite Runde: nicht zugeordnete Spalten leer lassen
      for (const header of csvHeaders) {
        if (!(header in initial)) {
          initial[header] = '';
        }
      }

      return initial;
    }
  );

  // Pruefen welche App-Felder bereits vergeben sind
  const usedAppFields = useMemo((): Set<MappingField> => {
    const used = new Set<MappingField>();
    for (const value of Object.values(mapping)) {
      if (value) {
        used.add(value);
      }
    }
    return used;
  }, [mapping]);

  // Validierung: Alle Pflichtfelder zugeordnet?
  const missingRequired = useMemo((): MappingField[] => {
    return REQUIRED_FIELDS.filter((field) => !usedAppFields.has(field));
  }, [usedAppFields]);

  // Pruefen ob das Mapping gueltig ist
  const isValid = missingRequired.length === 0;

  // Anzahl zugeordneter Spalten
  const mappedCount = useMemo(
    (): number => Object.values(mapping).filter((v) => v !== '').length,
    [mapping]
  );

  // Einzelnes Mapping aendern
  const handleMappingChange = useCallback(
    (csvHeader: string, appField: MappingField | ''): void => {
      setMapping((prev) => ({
        ...prev,
        [csvHeader]: appField,
      }));
    },
    []
  );

  // Mapping bestaetigen und weitergeben
  const handleConfirm = useCallback((): void => {
    if (!isValid) return;

    // Nur zugeordnete Spalten weitergeben
    const result: ColumnMappingResult = {};
    for (const [csvCol, appField] of Object.entries(mapping)) {
      if (appField) {
        result[csvCol] = appField;
      }
    }

    onMappingComplete(result);
  }, [isValid, mapping, onMappingComplete]);

  // Vorschau-Wert fuer eine CSV-Spalte anzeigen (erste nicht-leere Zeile)
  const getPreviewValue = (csvHeader: string): string => {
    for (const row of previewData) {
      const value = row[csvHeader];
      if (value && value.trim() !== '') {
        return value.length > 60 ? `${value.slice(0, 57)}...` : value;
      }
    }
    return '—';
  };

  return (
    <div className="space-y-6">
      {/* Status-Anzeige */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            Spalten zuordnen
          </h3>
          <p className="text-sm text-muted-foreground">
            Ordnen Sie die CSV-Spalten den entsprechenden App-Feldern zu.{' '}
            {mappedCount} von {csvHeaders.length} Spalten zugeordnet.
          </p>
        </div>
      </div>

      {/* Validierungsfehler */}
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

      {/* Mapping-Tabelle */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">CSV-Spalte</TableHead>
            <TableHead className="w-10" />
            <TableHead className="w-[220px]">App-Feld</TableHead>
            <TableHead>Vorschau-Wert</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {csvHeaders.map((header) => {
            const currentMapping = mapping[header] ?? '';
            const fieldDef = currentMapping
              ? MAPPING_FIELDS.find((f) => f.key === currentMapping)
              : null;

            return (
              <TableRow key={header}>
                {/* CSV-Spaltenname */}
                <TableCell className="font-mono text-sm">
                  {header}
                </TableCell>

                {/* Pfeil */}
                <TableCell>
                  <ArrowRight
                    className={cn(
                      'h-4 w-4',
                      currentMapping
                        ? 'text-primary'
                        : 'text-muted-foreground/30'
                    )}
                  />
                </TableCell>

                {/* App-Feld Dropdown */}
                <TableCell>
                  <Select
                    value={currentMapping}
                    onChange={(e) =>
                      handleMappingChange(
                        header,
                        (e.target.value as MappingField | '') || ''
                      )
                    }
                    className={cn(
                      'w-full',
                      !currentMapping && 'text-muted-foreground'
                    )}
                  >
                    <SelectOption value="">– Nicht zuordnen –</SelectOption>
                    {MAPPING_FIELDS.map((field) => {
                      // Bereits vergeben (aber nicht fuer diese Spalte)
                      const isUsed =
                        usedAppFields.has(field.key) &&
                        currentMapping !== field.key;

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
                </TableCell>

                {/* Vorschau-Wert */}
                <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                  {getPreviewValue(header)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

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
          Zuordnung bestätigen
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
