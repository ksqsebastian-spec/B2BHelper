'use client';

/**
 * Review-Seite: Uebersicht aller generierten E-Mails.
 * Bietet Filter-, Such-, Auswahl- und Batch-Aktionen (Freigeben, Exportieren).
 * E-Mails werden mit verknuepften Lead-Daten aus Supabase geladen.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmailTable } from '@/components/review/email-table';
import type { EmailWithLead } from '@/components/review/email-table';
import { ExportDialog } from '@/components/review/export-dialog';
import { useExport } from '@/hooks/use-export';
import type { EmailStatus, ImportBatch, ExportFormat, GeneratedEmail } from '@/types';

/** Anzahl E-Mails pro Seite */
const PAGE_SIZE = 20;

/** Optionen fuer das Status-Filter-Dropdown */
const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Alle Status' },
  { value: 'generated', label: 'Generiert' },
  { value: 'reviewed', label: 'Geprüft' },
  { value: 'approved', label: 'Freigegeben' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'exported', label: 'Exportiert' },
  { value: 'error', label: 'Fehler' },
];

/**
 * Hauptseite fuer die E-Mail-Review-Ansicht.
 * Zeigt eine filtrierbare, durchsuchbare Tabelle mit Paginierung.
 */
export default function ReviewPage(): React.ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { exportEmails, isExporting } = useExport();

  // --- Filterzustand ---
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // --- Auswahlzustand ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Dialog-Zustand ---
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
  const [showApproveDialog, setShowApproveDialog] = useState<boolean>(false);

  // --- Import-Batches laden (fuer Filter-Dropdown) ---
  const { data: batches = [] } = useQuery<ImportBatch[], Error>({
    queryKey: ['batches', 'list'],
    queryFn: async (): Promise<ImportBatch[]> => {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .order('imported_at', { ascending: false });

      if (error) {
        throw new Error(`Fehler beim Laden der Batches: ${error.message}`);
      }

      return data as ImportBatch[];
    },
  });

  // --- E-Mails mit verknuepften Leads laden ---
  const {
    data: allEmails = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EmailWithLead[], Error>({
    queryKey: ['emails', 'review', statusFilter, batchFilter],
    queryFn: async (): Promise<EmailWithLead[]> => {
      // Supabase-Query mit Join auf die Leads-Tabelle
      let query = supabase
        .from('generated_emails')
        .select('*, lead:leads(*)')
        .order('created_at', { ascending: false });

      // Filter nach Status anwenden
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      // Filter nach Batch anwenden
      if (batchFilter) {
        query = query.eq('batch_id', batchFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(`Fehler beim Laden der E-Mails: ${queryError.message}`);
      }

      // Supabase gibt den Join als verschachteltes Objekt zurueck
      return (data ?? []).map((row: Record<string, unknown>) => {
        const { lead, ...emailFields } = row;
        return {
          ...emailFields,
          lead,
        } as EmailWithLead;
      });
    },
  });

  // --- Client-seitige Suche ueber Firmenname und Betreff ---
  const filteredEmails = useMemo((): EmailWithLead[] => {
    if (!searchQuery.trim()) return allEmails;

    const lowerQuery = searchQuery.toLowerCase();
    return allEmails.filter(
      (email) =>
        email.lead.company_name.toLowerCase().includes(lowerQuery) ||
        email.subject.toLowerCase().includes(lowerQuery) ||
        email.lead.contact_email.toLowerCase().includes(lowerQuery)
    );
  }, [allEmails, searchQuery]);

  // --- Paginierung berechnen ---
  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / PAGE_SIZE));
  const paginatedEmails = useMemo((): EmailWithLead[] => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmails.slice(start, start + PAGE_SIZE);
  }, [filteredEmails, currentPage]);

  // --- Seite zuruecksetzen bei Filteraenderung ---
  const handleStatusFilterChange = (value: string): void => {
    setStatusFilter(value);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleBatchFilterChange = (value: string): void => {
    setBatchFilter(value);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // --- Auswahl-Funktionen ---
  const handleToggleSelect = useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((): void => {
    setSelectedIds((prev) => {
      const allPageIds = paginatedEmails.map((e) => e.id);
      const allSelected = allPageIds.every((id) => prev.has(id));

      if (allSelected) {
        // Alle auf der Seite abwaehlen
        const next = new Set(prev);
        for (const id of allPageIds) {
          next.delete(id);
        }
        return next;
      } else {
        // Alle auf der Seite hinzufuegen
        const next = new Set(prev);
        for (const id of allPageIds) {
          next.add(id);
        }
        return next;
      }
    });
  }, [paginatedEmails]);

  // --- Status-Mutation fuer einzelne und Batch-Aktualisierungen ---
  const updateStatusMutation = useMutation<GeneratedEmail[], Error, { ids: string[]; status: EmailStatus }>({
    mutationFn: async ({ ids, status }): Promise<GeneratedEmail[]> => {
      const updateData: Record<string, string> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Zeitstempel je nach Zielstatus setzen
      if (status === 'reviewed' || status === 'approved' || status === 'rejected') {
        updateData.reviewed_at = new Date().toISOString();
      }
      if (status === 'exported') {
        updateData.exported_at = new Date().toISOString();
      }

      const { data, error: updateError } = await supabase
        .from('generated_emails')
        .update(updateData)
        .in('id', ids)
        .select();

      if (updateError) {
        throw new Error(`Status konnte nicht aktualisiert werden: ${updateError.message}`);
      }

      return data as GeneratedEmail[];
    },
    onSuccess: (_data, variables): void => {
      const count = variables.ids.length;
      const statusLabel = variables.status === 'approved' ? 'freigegeben' : 'aktualisiert';
      toast.success(`${count} ${count === 1 ? 'E-Mail' : 'E-Mails'} ${statusLabel}`);
      // Cache invalidieren und Auswahl zuruecksetzen
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setSelectedIds(new Set());
    },
    onError: (err: Error): void => {
      toast.error(err.message);
    },
  });

  /** Einzelne E-Mail freigeben oder Status aendern */
  const handleStatusChange = useCallback(
    (emailId: string, status: EmailStatus): void => {
      updateStatusMutation.mutate({ ids: [emailId], status });
    },
    [updateStatusMutation]
  );

  /** Alle ausgewaehlten E-Mails freigeben */
  const handleBatchApprove = (): void => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('Keine E-Mails ausgewählt');
      return;
    }
    updateStatusMutation.mutate({ ids, status: 'approved' });
  };

  /** Export starten */
  const handleExport = async (format: ExportFormat): Promise<void> => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('Keine E-Mails zum Exportieren ausgewählt');
      return;
    }

    try {
      await exportEmails({ emailIds: ids, format });
      // Status der exportierten E-Mails auf 'exported' setzen
      updateStatusMutation.mutate({ ids, status: 'exported' });
      toast.success(`${ids.length} E-Mails als ${format.toUpperCase()}-CSV exportiert`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export fehlgeschlagen';
      toast.error(message);
    }
  };

  /** Detail-Ansicht oeffnen */
  const handleView = useCallback(
    (emailId: string): void => {
      router.push(`/review/${emailId}`);
    },
    [router]
  );

  // --- Ladezustand ---
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-4">
        <LoadingSpinner text="E-Mails werden geladen..." />
      </div>
    );
  }

  // --- Fehlerzustand ---
  if (isError) {
    return (
      <div className="mx-auto max-w-7xl p-4">
        <ErrorState
          message={error?.message ?? 'E-Mails konnten nicht geladen werden.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      {/* Seitentitel */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">E-Mail Review</h1>
        <p className="text-sm text-muted-foreground">
          {filteredEmails.length} {filteredEmails.length === 1 ? 'E-Mail' : 'E-Mails'} gefunden
        </p>
      </div>

      {/* Filter- und Suchleiste */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Suche */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Firma oder Betreff suchen..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Status-Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label="Nach Status filtern"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Batch-Filter */}
        <select
          value={batchFilter}
          onChange={(e) => handleBatchFilterChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-label="Nach Batch filtern"
        >
          <option value="">Alle Batches</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Batch-Aktionen (nur sichtbar wenn E-Mails ausgewaehlt) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} {selectedIds.size === 1 ? 'E-Mail' : 'E-Mails'} ausgewählt
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Alle freigeben */}
            <button
              type="button"
              onClick={() => setShowApproveDialog(true)}
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Alle freigeben
            </button>

            {/* Exportieren */}
            <button
              type="button"
              onClick={() => setShowExportDialog(true)}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportieren
            </button>
          </div>
        </div>
      )}

      {/* E-Mail-Tabelle oder Leerzustand */}
      {filteredEmails.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-12 w-12" />}
          title="Keine E-Mails gefunden"
          description={
            searchQuery || statusFilter || batchFilter
              ? 'Passe die Filter an oder ändere den Suchbegriff.'
              : 'Generiere zuerst E-Mails, um sie hier zu überprüfen.'
          }
          action={
            !searchQuery && !statusFilter && !batchFilter ? (
              <button
                type="button"
                onClick={() => router.push('/generate')}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                E-Mails generieren
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <EmailTable
            emails={paginatedEmails}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onStatusChange={handleStatusChange}
            onView={handleView}
          />

          {/* Paginierung */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Seite {currentPage} von {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                  aria-label="Vorherige Seite"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                  aria-label="Nächste Seite"
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bestaetigungsdialog: Alle freigeben */}
      <ConfirmDialog
        open={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onConfirm={handleBatchApprove}
        title="E-Mails freigeben"
        description={`Möchtest du ${selectedIds.size} ${selectedIds.size === 1 ? 'E-Mail' : 'E-Mails'} freigeben? Freigegebene E-Mails können anschließend exportiert werden.`}
        confirmLabel="Freigeben"
        cancelLabel="Abbrechen"
      />

      {/* Export-Dialog */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        selectedCount={selectedIds.size}
        onExport={handleExport}
      />
    </div>
  );
}
