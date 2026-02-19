'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileSpreadsheet,
  Columns3,
  Eye,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CsvUpload } from '@/components/leads/csv-upload';
import {
  ColumnMapper,
  type ColumnMappingResult,
  buildAutoMapping,
  isMappingValid,
  extractMappingResult,
} from '@/components/leads/column-mapper';
import {
  ImportPreview,
  type ParsedLead,
} from '@/components/leads/import-preview';
import type { MappingField } from '@/types';

/** Schritte des Import-Workflows */
type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing';

/** Schrittdefinition fuer die Fortschrittsanzeige */
interface StepDefinition {
  key: ImportStep;
  label: string;
  icon: React.ReactNode;
}

// Workflow-Schritte
const STEPS: StepDefinition[] = [
  { key: 'upload', label: 'Datei hochladen', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { key: 'mapping', label: 'Spalten zuordnen', icon: <Columns3 className="h-4 w-4" /> },
  { key: 'preview', label: 'Vorschau & Import', icon: <Eye className="h-4 w-4" /> },
];

// Einfache E-Mail-Validierung
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// CSV-Daten gemaess Mapping in ParsedLeads umwandeln
function buildLeads(
  csvData: Record<string, string>[],
  mapping: ColumnMappingResult
): ParsedLead[] {
  return csvData.map((row) => {
    const lead: Record<string, string | Record<string, string>> = {
      raw_data: { ...row },
    };

    for (const [csvCol, appField] of Object.entries(mapping)) {
      const value = row[csvCol];
      if (value !== undefined && value.trim() !== '') {
        lead[appField] = value.trim();
      }
    }

    if (!lead['company_name']) lead['company_name'] = '';
    if (!lead['contact_email']) lead['contact_email'] = '';

    return lead as unknown as ParsedLead;
  });
}

// CSV-Import Seite mit mehrstufigem Workflow
export default function LeadsImportPage(): React.ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Workflow-Zustand
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [columnMapping, setColumnMapping] = useState<ColumnMappingResult>({});
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Schritt 1: CSV-Datei wurde geladen
  const handleFileLoaded = useCallback(
    (data: Record<string, string>[], loadedFileName: string): void => {
      setCsvData(data);
      setFileName(loadedFileName);

      // Spaltenkoepfe aus der ersten Zeile extrahieren
      const headers =
        data.length > 0
          ? Object.keys(data[0]).filter((h) => h.trim() !== '')
          : [];
      setCsvHeaders(headers);

      // Auto-Mapping versuchen
      const autoMapping = buildAutoMapping(headers);

      if (isMappingValid(autoMapping)) {
        // Pflichtfelder erkannt → Mapping ueberspringen, direkt zur Vorschau
        const mapping = extractMappingResult(autoMapping);
        setColumnMapping(mapping);

        const leads = buildLeads(data, mapping);
        setParsedLeads(leads);

        setCurrentStep('preview');
        toast.success(
          `${data.length} Zeilen geladen – Spalten automatisch erkannt`
        );
      } else {
        // Pflichtfelder fehlen → manuelles Mapping noetig
        setCurrentStep('mapping');
        toast.success(
          `${data.length} Zeilen aus "${loadedFileName}" geladen`
        );
      }
    },
    []
  );

  // Vorschau-Daten fuer den Mapper: erste 5 Zeilen
  const previewData = useMemo(
    (): Record<string, string>[] => csvData.slice(0, 5),
    [csvData]
  );

  // Schritt 2: Mapping abgeschlossen
  const handleMappingComplete = useCallback(
    (mapping: ColumnMappingResult): void => {
      setColumnMapping(mapping);
      setParsedLeads(buildLeads(csvData, mapping));
      setCurrentStep('preview');
    },
    [csvData]
  );

  // Schritt 3: Import bestaetigen und durchfuehren
  const handleConfirmImport = useCallback(async (): Promise<void> => {
    setIsImporting(true);
    setCurrentStep('importing');

    try {
      // Aktuellen Benutzer ermitteln
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht authentifiziert. Bitte melden Sie sich an.');
      }

      // Nur gueltige Leads filtern
      const validLeads = parsedLeads.filter(
        (lead) =>
          lead.company_name &&
          lead.company_name.trim() !== '' &&
          lead.contact_email &&
          lead.contact_email.trim() !== '' &&
          isValidEmail(lead.contact_email.trim())
      );

      if (validLeads.length === 0) {
        throw new Error('Keine gültigen Leads zum Importieren vorhanden.');
      }

      // Batch-Name aus Dateiname generieren
      const batchName = fileName.replace(/\.csv$/i, '');

      // Import-Batch erstellen
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          user_id: user.id,
          name: batchName,
          file_name: fileName,
          total_leads: validLeads.length,
          status: 'active' as const,
        })
        .select()
        .single();

      if (batchError || !batch) {
        throw new Error('Import-Batch konnte nicht erstellt werden.');
      }

      // Leads in Batches einfuegen (max. 500 pro Batch wegen Supabase-Limits)
      const BATCH_SIZE = 500;
      let insertedCount = 0;

      for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
        const chunk = validLeads.slice(i, i + BATCH_SIZE);

        const leadsToInsert = chunk.map((lead) => ({
          batch_id: batch.id,
          user_id: user.id,
          company_name: lead.company_name.trim(),
          contact_email: lead.contact_email.trim(),
          contact_name: lead.contact_name?.trim() || null,
          industry: lead.industry?.trim() || null,
          company_city: lead.company_city?.trim() || null,
          company_country: lead.company_country?.trim() || null,
          employees: lead.employees?.trim() || null,
          website: lead.website?.trim() || null,
          linkedin_url: lead.linkedin_url?.trim() || null,
          description: lead.description?.trim() || null,
          keywords: lead.keywords?.trim() || null,
          annual_revenue: lead.annual_revenue?.trim() || null,
          custom_field_1: lead.custom_field_1?.trim() || null,
          custom_field_2: lead.custom_field_2?.trim() || null,
          custom_field_3: lead.custom_field_3?.trim() || null,
          raw_data: lead.raw_data,
          email_generated: false,
        }));

        const { error: insertError } = await supabase
          .from('leads')
          .insert(leadsToInsert);

        if (insertError) {
          console.error('Fehler beim Einfügen von Leads:', insertError);
          throw new Error(
            `Fehler beim Import: ${insertError.message}`
          );
        }

        insertedCount += chunk.length;
      }

      // Caches invalidieren
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });

      toast.success(
        `${insertedCount} Leads erfolgreich importiert`
      );

      // Zur Leads-Uebersicht weiterleiten
      router.push('/leads');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unbekannter Fehler beim Import';
      toast.error(message);
      setCurrentStep('preview');
    } finally {
      setIsImporting(false);
    }
  }, [parsedLeads, fileName, queryClient, router]);

  // Zurueck zum Mapping-Schritt
  const handleBackToMapping = useCallback((): void => {
    setCurrentStep('mapping');
  }, []);

  // Zurueck zur Lead-Uebersicht
  const handleNavigateBack = useCallback((): void => {
    router.push('/leads');
  }, [router]);

  // Aktueller Schritt-Index fuer die Fortschrittsanzeige
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      {/* Seitenkopf */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleNavigateBack}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Zurück zu Leads"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            CSV importieren
          </h1>
          <p className="text-sm text-muted-foreground">
            Importieren Sie Ihre Lead-Daten aus einer CSV-Datei
          </p>
        </div>
      </div>

      {/* Fortschrittsanzeige */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, index) => {
          const isActive = step.key === currentStep || step.key === 'importing' && currentStep === 'importing';
          const isCompleted = index < currentStepIndex;
          const isImportingStep = currentStep === 'importing' && index === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-center gap-2">
              {/* Verbindungslinie */}
              {index > 0 && (
                <div
                  className={cn(
                    'h-px w-8 sm:w-16',
                    isCompleted || isActive
                      ? 'bg-primary'
                      : 'bg-muted-foreground/20'
                  )}
                />
              )}

              {/* Schritt-Indikator */}
              <div
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive || isImportingStep
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : isImportingStep ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  step.icon
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Workflow-Inhalt */}
      <div className="rounded-xl border bg-card p-6">
        {/* Schritt 1: Datei-Upload */}
        {currentStep === 'upload' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">
                CSV-Datei hochladen
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Laden Sie eine CSV-Datei mit Ihren Lead-Daten hoch. Die erste
                Zeile muss die Spaltennamen enthalten.
              </p>
            </div>
            <CsvUpload onFileLoaded={handleFileLoaded} />
          </div>
        )}

        {/* Schritt 2: Spalten-Zuordnung */}
        {currentStep === 'mapping' && (
          <ColumnMapper
            csvHeaders={csvHeaders}
            previewData={previewData}
            onMappingComplete={handleMappingComplete}
          />
        )}

        {/* Schritt 3: Vorschau */}
        {currentStep === 'preview' && (
          <ImportPreview
            leads={parsedLeads}
            mapping={columnMapping}
            onConfirm={handleConfirmImport}
            onBack={handleBackToMapping}
          />
        )}

        {/* Import laeuft */}
        {currentStep === 'importing' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">
                Import läuft...
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {parsedLeads.length} Leads werden importiert. Bitte warten Sie
                einen Moment.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hinweis zur Datei */}
      {fileName && currentStep !== 'upload' && currentStep !== 'importing' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>
            Datei: {fileName} – {csvData.length} Zeilen, {csvHeaders.length}{' '}
            Spalten
          </span>
        </div>
      )}
    </div>
  );
}
