'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Upload,
  Search,
  Users,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LeadTable } from '@/components/leads/lead-table';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import type { Lead, ImportBatch } from '@/types';

// Leads-Uebersichtsseite: zeigt alle Leads gruppierbar nach Batch
export default function LeadsPage(): React.ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filter-Zustand
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  // Import-Batches laden (fuer Dropdown-Filter)
  const {
    data: batches = [],
    isLoading: isBatchesLoading,
  } = useQuery({
    queryKey: ['import-batches'],
    queryFn: async (): Promise<ImportBatch[]> => {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fehler beim Laden der Batches:', error);
        throw new Error('Import-Batches konnten nicht geladen werden');
      }

      return data ?? [];
    },
  });

  // Leads laden (optional gefiltert nach Batch)
  const {
    data: leads = [],
    isLoading: isLeadsLoading,
    isError: isLeadsError,
    error: leadsError,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ['leads', selectedBatchId],
    queryFn: async (): Promise<Lead[]> => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Nach Batch filtern, falls ausgewaehlt
      if (selectedBatchId) {
        query = query.eq('batch_id', selectedBatchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Fehler beim Laden der Leads:', error);
        throw new Error('Leads konnten nicht geladen werden');
      }

      return data ?? [];
    },
  });

  // Leads loeschen Mutation
  const deleteMutation = useMutation({
    mutationFn: async (leadIds: string[]): Promise<void> => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (error) {
        throw new Error('Leads konnten nicht gelöscht werden');
      }
    },
    onSuccess: (_data, leadIds) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      toast.success(
        `${leadIds.length} Lead${leadIds.length > 1 ? 's' : ''} erfolgreich gelöscht`
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Loeschen-Handler
  const handleDelete = useCallback(
    (leadIds: string[]): void => {
      deleteMutation.mutate(leadIds);
    },
    [deleteMutation]
  );

  // Leads nach Suchbegriff filtern (clientseitig)
  const filteredLeads = useMemo((): Lead[] => {
    if (!searchQuery.trim()) return leads;

    const query = searchQuery.toLowerCase().trim();
    return leads.filter((lead) =>
      lead.company_name.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  // Batch-Filter aendern
  const handleBatchChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setSelectedBatchId(event.target.value);
    },
    []
  );

  // Suchfeld aendern
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setSearchQuery(event.target.value);
    },
    []
  );

  // Zur Import-Seite navigieren
  const handleNavigateToImport = useCallback((): void => {
    router.push('/leads/import');
  }, [router]);

  // Fehlerzustand
  if (isLeadsError) {
    return (
      <div className="mx-auto max-w-7xl p-4">
        <ErrorState
          message={
            leadsError instanceof Error
              ? leadsError.message
              : 'Leads konnten nicht geladen werden'
          }
          onRetry={() => refetchLeads()}
        />
      </div>
    );
  }

  // Gesamtzahl der Leads (ungefiltert) fuer Anzeige
  const totalLeadsCount = leads.length;
  const isLoading = isLeadsLoading || isBatchesLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      {/* Seitenkopf */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Wird geladen...'
              : `${totalLeadsCount} Lead${totalLeadsCount !== 1 ? 's' : ''} insgesamt`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleNavigateToImport}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          CSV importieren
        </button>
      </div>

      {/* Filter-Leiste */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Suchfeld */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Nach Firmenname suchen..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        {/* Batch-Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select
            value={selectedBatchId}
            onChange={handleBatchChange}
            className="w-[220px]"
          >
            <SelectOption value="">Alle Batches</SelectOption>
            {batches.map((batch) => (
              <SelectOption key={batch.id} value={batch.id}>
                {batch.name} ({batch.total_leads})
              </SelectOption>
            ))}
          </Select>
        </div>
      </div>

      {/* Inhalt */}
      {!isLoading && totalLeadsCount === 0 ? (
        // Komplett leerer Zustand (keine Leads vorhanden)
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Noch keine Leads vorhanden"
          description="Importieren Sie eine CSV-Datei mit Ihren Lead-Daten, um zu beginnen."
          action={
            <button
              type="button"
              onClick={handleNavigateToImport}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" />
              CSV importieren
            </button>
          }
        />
      ) : (
        // Lead-Tabelle (mit Suche gefiltert)
        <LeadTable
          leads={filteredLeads}
          isLoading={isLoading}
          onDelete={handleDelete}
        />
      )}

      {/* Hinweis bei gefilterter leerer Ergebnismenge */}
      {!isLoading &&
        totalLeadsCount > 0 &&
        filteredLeads.length === 0 &&
        searchQuery.trim() !== '' && (
          <EmptyState
            icon={<Search className="h-12 w-12" />}
            title="Keine Ergebnisse"
            description={`Keine Leads gefunden für "${searchQuery}". Versuchen Sie einen anderen Suchbegriff.`}
          />
        )}
    </div>
  );
}
