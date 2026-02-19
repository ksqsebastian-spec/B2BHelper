'use client';

/**
 * Hooks fuer Guardrails-Versionen.
 * Verwaltet die versionierten Leitplanken fuer die E-Mail-Generierung.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { GuardrailVersion } from '@/types';

/** Query-Key-Fabrik fuer konsistente Cache-Verwaltung */
const guardrailKeys = {
  all: ['guardrails'] as const,
  active: () => [...guardrailKeys.all, 'active'] as const,
  versions: () => [...guardrailKeys.all, 'versions'] as const,
};

/** Parameter zum Speichern einer neuen Guardrails-Version */
interface SaveGuardrailsParams {
  content: string;
}

/**
 * Laedt die aktuell aktive Guardrails-Version.
 * Es kann immer nur eine Version gleichzeitig aktiv sein.
 */
export function useActiveGuardrails(): ReturnType<typeof useQuery<GuardrailVersion | null, Error>> {
  return useQuery<GuardrailVersion | null, Error>({
    queryKey: guardrailKeys.active(),
    queryFn: async (): Promise<GuardrailVersion | null> => {
      const { data, error } = await supabase
        .from('guardrail_versions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw new Error(`Fehler beim Laden der aktiven Guardrails: ${error.message}`);
      }

      return (data as GuardrailVersion | null);
    },
  });
}

/**
 * Laedt alle Guardrails-Versionen, sortiert nach Versionsnummer absteigend.
 * Ermoeglicht die Anzeige des Versionsverlaufs.
 */
export function useGuardrailVersions(): ReturnType<typeof useQuery<GuardrailVersion[], Error>> {
  return useQuery<GuardrailVersion[], Error>({
    queryKey: guardrailKeys.versions(),
    queryFn: async (): Promise<GuardrailVersion[]> => {
      const { data, error } = await supabase
        .from('guardrail_versions')
        .select('*')
        .order('version_number', { ascending: false });

      if (error) {
        throw new Error(`Fehler beim Laden der Guardrails-Versionen: ${error.message}`);
      }

      return data as GuardrailVersion[];
    },
  });
}

/**
 * Mutation zum Speichern einer neuen Guardrails-Version.
 * Ermittelt die naechste Versionsnummer, deaktiviert alle bisherigen Versionen
 * und erstellt die neue Version als aktive Version.
 */
export function useSaveGuardrails(): ReturnType<
  typeof useMutation<GuardrailVersion, Error, SaveGuardrailsParams>
> {
  const queryClient = useQueryClient();

  return useMutation<GuardrailVersion, Error, SaveGuardrailsParams>({
    mutationFn: async (params: SaveGuardrailsParams): Promise<GuardrailVersion> => {
      // Hoechste Versionsnummer ermitteln
      const { data: latestVersion, error: versionError } = await supabase
        .from('guardrail_versions')
        .select('version_number')
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionError) {
        throw new Error(`Fehler beim Ermitteln der Versionsnummer: ${versionError.message}`);
      }

      const nextVersionNumber = latestVersion
        ? (latestVersion as { version_number: number }).version_number + 1
        : 1;

      // Alle bestehenden Versionen deaktivieren
      const { error: deactivateError } = await supabase
        .from('guardrail_versions')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deactivateError) {
        throw new Error(`Fehler beim Deaktivieren der Versionen: ${deactivateError.message}`);
      }

      // Neue Version als aktive Version erstellen
      const { data: newVersion, error: insertError } = await supabase
        .from('guardrail_versions')
        .insert({
          version_number: nextVersionNumber,
          content: params.content,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Fehler beim Speichern der Guardrails: ${insertError.message}`);
      }

      return newVersion as GuardrailVersion;
    },
    onSuccess: (): void => {
      // Gesamten Guardrails-Cache invalidieren
      queryClient.invalidateQueries({ queryKey: guardrailKeys.all });
    },
  });
}

/**
 * Mutation zum Aktivieren einer bestimmten Guardrails-Version.
 * Deaktiviert zuerst alle anderen Versionen und setzt dann die gewaehlte als aktiv.
 */
export function useActivateGuardrails(): ReturnType<
  typeof useMutation<GuardrailVersion, Error, string>
> {
  const queryClient = useQueryClient();

  return useMutation<GuardrailVersion, Error, string>({
    mutationFn: async (versionId: string): Promise<GuardrailVersion> => {
      // Alle Versionen deaktivieren
      const { error: deactivateError } = await supabase
        .from('guardrail_versions')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deactivateError) {
        throw new Error(`Fehler beim Deaktivieren der Versionen: ${deactivateError.message}`);
      }

      // Gewaehlte Version aktivieren
      const { data, error } = await supabase
        .from('guardrail_versions')
        .update({ is_active: true })
        .eq('id', versionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Fehler beim Aktivieren der Guardrails-Version: ${error.message}`);
      }

      return data as GuardrailVersion;
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: guardrailKeys.all });
    },
  });
}
