'use client';

import { useMemo } from 'react';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ColumnMappingResult } from '@/components/leads/column-mapper';

// Maximale Vorschauzeilen in der Tabelle
const MAX_PREVIEW_ROWS = 10;

/** Ein vorbereiteter Lead-Eintrag vor dem Import */
export interface ParsedLead {
  company_name: string;
  contact_email?: string;
  contact_name?: string;
  industry?: string;
  company_city?: string;
  company_country?: string;
  employees?: string;
  website?: string;
  linkedin_url?: string;
  description?: string;
  keywords?: string;
  annual_revenue?: string;
  custom_field_1?: string;
  custom_field_2?: string;
  custom_field_3?: string;
  raw_data: Record<string, string>;
}

/** Ergebnis der Validierung eines Leads */
interface ValidationInfo {
  validCount: number;
  invalidCount: number;
  issues: string[];
}

/** Props fuer die Import-Vorschau-Komponente */
interface ImportPreviewProps {
  leads: ParsedLead[];
  mapping: ColumnMappingResult;
  onConfirm: () => void;
  onBack: () => void;
}

/** Spaltendefinition fuer die Vorschau-Tabelle */
interface PreviewColumn {
  key: keyof ParsedLead;
  label: string;
}

// Spalten die in der Vorschau angezeigt werden
const PREVIEW_COLUMNS: PreviewColumn[] = [
  { key: 'company_name', label: 'Firmenname' },
  { key: 'contact_email', label: 'E-Mail' },
  { key: 'contact_name', label: 'Ansprechpartner' },
  { key: 'industry', label: 'Branche' },
  { key: 'company_city', label: 'Stadt' },
];

// Einfache E-Mail-Validierung
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Leads validieren und Zusammenfassung erstellen
function validateLeads(leads: ParsedLead[]): ValidationInfo {
  let validCount = 0;
  let invalidCount = 0;
  const issueSet = new Set<string>();

  for (const lead of leads) {
    let isValid = true;

    // Firmenname ist Pflicht
    if (!lead.company_name || lead.company_name.trim() === '') {
      isValid = false;
      issueSet.add('Einige Zeilen haben keinen Firmennamen');
    }

    // E-Mail: optional, aber wenn vorhanden muss sie gueltig sein
    if (lead.contact_email && lead.contact_email.trim() !== '') {
      if (!isValidEmail(lead.contact_email.trim())) {
        isValid = false;
        issueSet.add('Einige E-Mail-Adressen sind ungültig');
      }
    } else {
      // Nur als Hinweis, nicht als Fehler
      issueSet.add('Einige Zeilen haben keine E-Mail-Adresse – Leads werden trotzdem importiert');
    }

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  return {
    validCount,
    invalidCount,
    issues: Array.from(issueSet),
  };
}

// Import-Vorschau: zeigt die gemappten Daten vor dem endgueltigen Import
export function ImportPreview({
  leads,
  mapping,
  onConfirm,
  onBack,
}: ImportPreviewProps): React.ReactNode {
  // Validierung durchfuehren
  const validation = useMemo((): ValidationInfo => validateLeads(leads), [leads]);

  // Vorschau-Zeilen begrenzen
  const previewLeads = leads.slice(0, MAX_PREVIEW_ROWS);

  // Zuordnungs-Info fuer die Zusammenfassung
  const mappingEntries = Object.entries(mapping);

  return (
    <div className="space-y-6">
      {/* Zusammenfassung */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Gesamt */}
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Gesamt Leads</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {leads.length}
          </p>
        </div>

        {/* Gueltig */}
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
          <p className="text-sm text-green-700">Gültig</p>
          <p className="mt-1 text-2xl font-bold text-green-800">
            {validation.validCount}
          </p>
        </div>

        {/* Ungueltig */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm text-amber-700">Ungültig (werden übersprungen)</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">
            {validation.invalidCount}
          </p>
        </div>
      </div>

      {/* Validierungswarnungen */}
      {validation.issues.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Hinweise zur Datenqualität:
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
              {validation.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Zuordnungs-Uebersicht */}
      <div className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium text-foreground">
          Zugeordnete Felder ({mappingEntries.length}):
        </p>
        <div className="flex flex-wrap gap-2">
          {mappingEntries.map(([csvCol, appField]) => (
            <Badge key={csvCol} variant="secondary" className="text-xs">
              {csvCol} → {appField}
            </Badge>
          ))}
        </div>
      </div>

      {/* Vorschau-Tabelle */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Vorschau (erste {Math.min(leads.length, MAX_PREVIEW_ROWS)} Zeilen):
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              {PREVIEW_COLUMNS.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewLeads.map((lead, index) => {
              const hasCompanyName =
                lead.company_name && lead.company_name.trim() !== '';
              const hasValidEmail =
                !lead.contact_email ||
                lead.contact_email.trim() === '' ||
                isValidEmail(lead.contact_email.trim());
              const rowValid = hasCompanyName && hasValidEmail;

              return (
                <TableRow key={index}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  {PREVIEW_COLUMNS.map((col) => (
                    <TableCell key={col.key} className="max-w-[200px] truncate">
                      {(lead[col.key] as string | undefined) ?? '—'}
                    </TableCell>
                  ))}
                  <TableCell>
                    {rowValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {leads.length > MAX_PREVIEW_ROWS && (
          <p className="mt-2 text-xs text-muted-foreground">
            ... und {leads.length - MAX_PREVIEW_ROWS} weitere Zeilen
          </p>
        )}
      </div>

      {/* Aktionsbuttons */}
      <div className="flex items-center justify-between border-t pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Zuordnung
        </button>

        <div className="flex items-center gap-3">
          {validation.validCount === 0 ? (
            <span className="text-sm text-destructive">
              Keine gültigen Leads zum Importieren
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {validation.validCount} Leads werden importiert
            </span>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={validation.validCount === 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Jetzt importieren
          </button>
        </div>
      </div>
    </div>
  );
}
