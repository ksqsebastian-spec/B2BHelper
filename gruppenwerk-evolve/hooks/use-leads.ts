'use client';

/**
 * Hooks fuer Lead-Operationen.
 * Stellt CRUD-Funktionen fuer Leads und den CSV-Import bereit.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Lead, ImportBatch } from '@/types';

/** Query-Key-Fabrik fuer konsistente Cache-Verwaltung */
const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (batchId?: string) => [...leadKeys.lists(), { batchId }] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

/** Parameter fuer den Batch-Import von Leads */
interface ImportLeadsParams {
  batch: Omit<ImportBatch, 'id' | 'created_at' | 'user_id'>;
  leads: Array<Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'batch_id' | 'email_generated'>>;
}

/** Rueckgabe des Imports mit den erstellten IDs */
interface ImportLeadsResult {
  batch: ImportBatch;
  leads: Lead[];
}

/**
 * Laedt alle Leads, optional gefiltert nach Batch-ID.
 * Sortierung nach Erstellungsdatum absteigend.
 */
export function useLeads(batchId?: string): ReturnType<typeof useQuery<Lead[], Error>> {
  return useQuery<Lead[], Error>({
    queryKey: leadKeys.list(batchId),
    queryFn: async (): Promise<Lead[]> => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Fehler beim Laden der Leads: ${error.message}`);
      }

      return data as Lead[];
    },
  });
}

/**
 * Laedt einen einzelnen Lead anhand seiner ID.
 */
export function useLead(id: string): ReturnType<typeof useQuery<Lead, Error>> {
  return useQuery<Lead, Error>({
    queryKey: leadKeys.detail(id),
    queryFn: async (): Promise<Lead> => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Fehler beim Laden des Leads: ${error.message}`);
      }

      return data as Lead;
    },
    enabled: !!id,
  });
}

/**
 * Mutation zum Importieren eines Batches mit zugehoerigen Leads.
 * Erstellt zuerst den Import-Batch und fuegt dann alle Leads ein.
 * Invalidiert anschliessend die Lead- und Batch-Caches.
 */
export function useImportLeads(): ReturnType<typeof useMutation<ImportLeadsResult, Error, ImportLeadsParams>> {
  const queryClient = useQueryClient();

  return useMutation<ImportLeadsResult, Error, ImportLeadsParams>({
    mutationFn: async (params: ImportLeadsParams): Promise<ImportLeadsResult> => {
      // Zuerst den Import-Batch erstellen
      const { data: batchData, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          name: params.batch.name,
          file_name: params.batch.file_name,
          total_leads: params.batch.total_leads,
          imported_at: params.batch.imported_at,
          status: params.batch.status,
        })
        .select()
        .single();

      if (batchError) {
        throw new Error(`Fehler beim Erstellen des Batches: ${batchError.message}`);
      }

      const createdBatch = batchData as ImportBatch;

      // Leads mit der Batch-ID vorbereiten
      const leadsToInsert = params.leads.map((lead) => ({
        ...lead,
        batch_id: createdBatch.id,
        email_generated: false,
      }));

      // Leads in Chargen einfuegen (Supabase-Limit beachten)
      const CHUNK_SIZE = 500;
      const insertedLeads: Lead[] = [];

      for (let i = 0; i < leadsToInsert.length; i += CHUNK_SIZE) {
        const chunk = leadsToInsert.slice(i, i + CHUNK_SIZE);
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .insert(chunk)
          .select();

        if (leadsError) {
          throw new Error(
            `Fehler beim Einfuegen der Leads (Chunk ${Math.floor(i / CHUNK_SIZE) + 1}): ${leadsError.message}`
          );
        }

        insertedLeads.push(...(leadsData as Lead[]));
      }

      return { batch: createdBatch, leads: insertedLeads };
    },
    onSuccess: (): void => {
      // Cache fuer Leads und Batches invalidieren
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

/**
 * Mutation zum Loeschen eines einzelnen Leads.
 * Invalidiert anschliessend alle Lead-Listen.
 */
export function useDeleteLead(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (leadId: string): Promise<void> => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) {
        throw new Error(`Fehler beim Loeschen des Leads: ${error.message}`);
      }
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}
