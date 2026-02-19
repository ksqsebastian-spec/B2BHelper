'use client';

/**
 * Hooks fuer Import-Batch-Operationen.
 * Stellt Abfrage- und Loeschfunktionen fuer Import-Batches bereit.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { ImportBatch } from '@/types';

/** Query-Key-Fabrik fuer konsistente Cache-Verwaltung */
const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: () => [...batchKeys.lists()] as const,
  details: () => [...batchKeys.all, 'detail'] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
};

/**
 * Laedt alle Import-Batches, sortiert nach Importdatum absteigend.
 * Die neuesten Importe erscheinen zuerst.
 */
export function useBatches(): ReturnType<typeof useQuery<ImportBatch[], Error>> {
  return useQuery<ImportBatch[], Error>({
    queryKey: batchKeys.list(),
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
}

/**
 * Laedt einen einzelnen Import-Batch anhand seiner ID.
 */
export function useBatch(id: string): ReturnType<typeof useQuery<ImportBatch, Error>> {
  return useQuery<ImportBatch, Error>({
    queryKey: batchKeys.detail(id),
    queryFn: async (): Promise<ImportBatch> => {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Fehler beim Laden des Batches: ${error.message}`);
      }

      return data as ImportBatch;
    },
    enabled: !!id,
  });
}

/**
 * Mutation zum Loeschen eines Import-Batches.
 * Durch die Datenbank-Kaskade werden alle zugehoerigen Leads
 * und generierten E-Mails ebenfalls geloescht.
 * Invalidiert anschliessend alle relevanten Caches.
 */
export function useDeleteBatch(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (batchId: string): Promise<void> => {
      const { error } = await supabase
        .from('import_batches')
        .delete()
        .eq('id', batchId);

      if (error) {
        throw new Error(`Fehler beim Loeschen des Batches: ${error.message}`);
      }
    },
    onSuccess: (): void => {
      // Alle betroffenen Caches invalidieren
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
}
