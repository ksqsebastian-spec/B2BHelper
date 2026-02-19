'use client';

/**
 * Hooks fuer generierte E-Mails.
 * Stellt Abfrage-, Aktualisierungs- und Loeschfunktionen fuer E-Mails bereit.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { GeneratedEmail, EmailStatus, Lead } from '@/types';

/** Query-Key-Fabrik fuer konsistente Cache-Verwaltung */
const emailKeys = {
  all: ['emails'] as const,
  lists: () => [...emailKeys.all, 'list'] as const,
  list: (filters: { batchId?: string; status?: EmailStatus }) =>
    [...emailKeys.lists(), filters] as const,
  details: () => [...emailKeys.all, 'detail'] as const,
  detail: (id: string) => [...emailKeys.details(), id] as const,
};

/** E-Mail mit zugehoerigem Lead fuer die Detail-Ansicht */
interface EmailWithLead extends GeneratedEmail {
  lead: Lead;
}

/** Parameter fuer die Status-Aktualisierung */
interface UpdateEmailStatusParams {
  emailId: string;
  status: EmailStatus;
}

/** Parameter fuer die Inhalts-Aktualisierung */
interface UpdateEmailParams {
  emailId: string;
  subject: string;
  body: string;
}

/**
 * Laedt E-Mails mit optionalen Filtern nach Batch-ID und Status.
 * Sortierung nach Erstellungsdatum absteigend.
 */
export function useEmails(
  batchId?: string,
  status?: EmailStatus
): ReturnType<typeof useQuery<GeneratedEmail[], Error>> {
  return useQuery<GeneratedEmail[], Error>({
    queryKey: emailKeys.list({ batchId, status }),
    queryFn: async (): Promise<GeneratedEmail[]> => {
      let query = supabase
        .from('generated_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Fehler beim Laden der E-Mails: ${error.message}`);
      }

      return data as GeneratedEmail[];
    },
  });
}

/**
 * Laedt eine einzelne E-Mail mit dem zugehoerigen Lead.
 * Nuetzlich fuer die Detail- und Bearbeitungsansicht.
 */
export function useEmail(id: string): ReturnType<typeof useQuery<EmailWithLead, Error>> {
  return useQuery<EmailWithLead, Error>({
    queryKey: emailKeys.detail(id),
    queryFn: async (): Promise<EmailWithLead> => {
      // E-Mail mit verknuepftem Lead laden (Supabase-Join)
      const { data, error } = await supabase
        .from('generated_emails')
        .select('*, lead:leads(*)')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Fehler beim Laden der E-Mail: ${error.message}`);
      }

      // Supabase gibt den Join als verschachteltes Objekt zurueck
      const emailData = data as Record<string, unknown>;
      const lead = emailData.lead as Lead;
      const { lead: _lead, ...emailFields } = emailData;

      return {
        ...emailFields,
        lead,
      } as EmailWithLead;
    },
    enabled: !!id,
  });
}

/**
 * Mutation zum Aktualisieren des E-Mail-Status.
 * Setzt zusaetzlich reviewed_at oder exported_at je nach Status.
 */
export function useUpdateEmailStatus(): ReturnType<
  typeof useMutation<GeneratedEmail, Error, UpdateEmailStatusParams>
> {
  const queryClient = useQueryClient();

  return useMutation<GeneratedEmail, Error, UpdateEmailStatusParams>({
    mutationFn: async (params: UpdateEmailStatusParams): Promise<GeneratedEmail> => {
      // Zeitstempel je nach Zielstatus setzen
      const updateData: Record<string, string> = {
        status: params.status,
        updated_at: new Date().toISOString(),
      };

      if (params.status === 'reviewed' || params.status === 'approved' || params.status === 'rejected') {
        updateData.reviewed_at = new Date().toISOString();
      }

      if (params.status === 'exported') {
        updateData.exported_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('generated_emails')
        .update(updateData)
        .eq('id', params.emailId)
        .select()
        .single();

      if (error) {
        throw new Error(`Fehler beim Aktualisieren des E-Mail-Status: ${error.message}`);
      }

      return data as GeneratedEmail;
    },
    onSuccess: (updatedEmail: GeneratedEmail): void => {
      // Einzelne E-Mail im Cache aktualisieren
      queryClient.setQueryData(emailKeys.detail(updatedEmail.id), updatedEmail);
      // Listen invalidieren, da sich der Status geaendert hat
      queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
    },
  });
}

/**
 * Mutation zum Aktualisieren des E-Mail-Betreffs und -Inhalts.
 * Wird im Editor fuer manuelle Anpassungen verwendet.
 */
export function useUpdateEmail(): ReturnType<
  typeof useMutation<GeneratedEmail, Error, UpdateEmailParams>
> {
  const queryClient = useQueryClient();

  return useMutation<GeneratedEmail, Error, UpdateEmailParams>({
    mutationFn: async (params: UpdateEmailParams): Promise<GeneratedEmail> => {
      const { data, error } = await supabase
        .from('generated_emails')
        .update({
          subject: params.subject,
          body: params.body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.emailId)
        .select()
        .single();

      if (error) {
        throw new Error(`Fehler beim Aktualisieren der E-Mail: ${error.message}`);
      }

      return data as GeneratedEmail;
    },
    onSuccess: (updatedEmail: GeneratedEmail): void => {
      // Cache gezielt aktualisieren
      queryClient.setQueryData(emailKeys.detail(updatedEmail.id), updatedEmail);
      queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
    },
  });
}

/**
 * Mutation zum Loeschen einer einzelnen E-Mail.
 * Invalidiert anschliessend alle E-Mail-Listen und den Lead-Cache.
 */
export function useDeleteEmail(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (emailId: string): Promise<void> => {
      const { error } = await supabase
        .from('generated_emails')
        .delete()
        .eq('id', emailId);

      if (error) {
        throw new Error(`Fehler beim Loeschen der E-Mail: ${error.message}`);
      }
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
      // Leads koennten den email_generated-Status benoetigen
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
