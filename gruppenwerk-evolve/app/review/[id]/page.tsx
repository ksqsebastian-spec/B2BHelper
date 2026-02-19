'use client';

/**
 * Detail- und Bearbeitungsseite fuer eine einzelne generierte E-Mail.
 * Zeigt Empfaenger-Informationen, editierbaren Betreff und Inhalt
 * sowie Aktions-Buttons (Ablehnen, Neu generieren, Kopieren, Freigeben).
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  Mail,
  Building2,
  User,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEmail, useUpdateEmail, useUpdateEmailStatus } from '@/hooks/use-emails';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ErrorState } from '@/components/shared/error-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { EmailStatus } from '@/types';

/** Farben und Labels fuer die Status-Anzeige */
const STATUS_CONFIG: Record<EmailStatus, { label: string; className: string }> = {
  generated: {
    label: 'Generiert',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  reviewed: {
    label: 'Geprüft',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  approved: {
    label: 'Freigegeben',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  rejected: {
    label: 'Abgelehnt',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  exported: {
    label: 'Exportiert',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  },
  error: {
    label: 'Fehler',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

/**
 * E-Mail-Detail-Seite mit Bearbeitungsfunktionen.
 * URL-Parameter: id (E-Mail-ID aus der Datenbank).
 */
export default function EmailDetailPage(): React.ReactNode {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const emailId = params.id;

  // --- E-Mail-Daten laden ---
  const { data: emailData, isLoading, isError, error, refetch } = useEmail(emailId);

  // --- Mutations ---
  const updateEmailMutation = useUpdateEmail();
  const updateStatusMutation = useUpdateEmailStatus();

  // --- Lokaler Bearbeitungszustand ---
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // --- Dialog-Zustand ---
  const [showRejectDialog, setShowRejectDialog] = useState<boolean>(false);

  /** Lokale Felder mit geladenen Daten initialisieren */
  useEffect(() => {
    if (emailData) {
      setEditSubject(emailData.subject);
      setEditBody(emailData.body);
      setHasChanges(false);
    }
  }, [emailData]);

  /** Aenderungen am Betreff verfolgen */
  const handleSubjectChange = (value: string): void => {
    setEditSubject(value);
    setHasChanges(value !== emailData?.subject || editBody !== emailData?.body);
  };

  /** Aenderungen am Inhalt verfolgen */
  const handleBodyChange = (value: string): void => {
    setEditBody(value);
    setHasChanges(editSubject !== emailData?.subject || value !== emailData?.body);
  };

  /** Aenderungen in Supabase speichern */
  const handleSave = (): void => {
    if (!emailData) return;

    updateEmailMutation.mutate(
      {
        emailId: emailData.id,
        subject: editSubject,
        body: editBody,
      },
      {
        onSuccess: () => {
          toast.success('Änderungen gespeichert');
          setHasChanges(false);
        },
        onError: (err: Error) => {
          toast.error(err.message);
        },
      }
    );
  };

  /** E-Mail-Status aendern */
  const handleStatusChange = (status: EmailStatus): void => {
    if (!emailData) return;

    updateStatusMutation.mutate(
      {
        emailId: emailData.id,
        status,
      },
      {
        onSuccess: () => {
          const statusLabel = STATUS_CONFIG[status].label.toLowerCase();
          toast.success(`E-Mail als "${statusLabel}" markiert`);
        },
        onError: (err: Error) => {
          toast.error(err.message);
        },
      }
    );
  };

  /** E-Mail (Betreff + Inhalt) in die Zwischenablage kopieren */
  const handleCopy = async (): Promise<void> => {
    const text = `Betreff: ${editSubject}\n\n${editBody}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('E-Mail in Zwischenablage kopiert');
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  /** mailto:-Link oeffnen */
  const handleMailto = (): void => {
    if (!emailData) return;
    const mailtoUrl = `mailto:${encodeURIComponent(emailData.lead.contact_email)}?subject=${encodeURIComponent(editSubject)}&body=${encodeURIComponent(editBody)}`;
    window.open(mailtoUrl, '_blank');
  };

  // --- Ladezustand ---
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <LoadingSpinner text="E-Mail wird geladen..." />
      </div>
    );
  }

  // --- Fehlerzustand ---
  if (isError || !emailData) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <ErrorState
          message={error?.message ?? 'E-Mail konnte nicht geladen werden.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const { lead } = emailData;
  const statusConfig = STATUS_CONFIG[emailData.status];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Kopfzeile mit Zurueck-Button und Status */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/review')}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </button>

        <span
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
            statusConfig.className
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Empfaenger-Informationen */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Empfänger
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Firmenname */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Firma</p>
              <p className="text-sm font-medium text-foreground">{lead.company_name}</p>
            </div>
          </div>

          {/* E-Mail-Adresse */}
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">E-Mail</p>
              <p className="text-sm font-medium text-foreground">{lead.contact_email}</p>
            </div>
          </div>

          {/* Ansprechpartner (falls vorhanden) */}
          {lead.contact_name && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Ansprechpartner</p>
                <p className="text-sm font-medium text-foreground">{lead.contact_name}</p>
              </div>
            </div>
          )}

          {/* Branche (falls vorhanden) */}
          {lead.industry && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Branche</p>
                <p className="text-sm font-medium text-foreground">{lead.industry}</p>
              </div>
            </div>
          )}
        </div>

        {/* Metadaten */}
        <div className="mt-3 flex flex-wrap gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span>
            Generiert: {format(new Date(emailData.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
          </span>
          <span>Provider: {emailData.provider}</span>
          <span>Modell: {emailData.model}</span>
          {emailData.tokens_used != null && (
            <span>Tokens: {emailData.tokens_used}</span>
          )}
          {emailData.generation_time_ms != null && (
            <span>Dauer: {emailData.generation_time_ms}ms</span>
          )}
        </div>
      </div>

      {/* Bearbeitbarer Betreff */}
      <div className="space-y-2">
        <label htmlFor="email-subject" className="text-sm font-medium text-foreground">
          Betreff
        </label>
        <input
          id="email-subject"
          type="text"
          value={editSubject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="E-Mail Betreff..."
        />
      </div>

      {/* Bearbeitbarer Inhalt */}
      <div className="space-y-2">
        <label htmlFor="email-body" className="text-sm font-medium text-foreground">
          Inhalt
        </label>
        <textarea
          id="email-body"
          value={editBody}
          onChange={(e) => handleBodyChange(e.target.value)}
          rows={16}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="E-Mail Inhalt..."
        />
      </div>

      {/* Aktions-Buttons */}
      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        {/* Speichern (nur aktiv bei Aenderungen) */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || updateEmailMutation.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {updateEmailMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Speichern
        </button>

        {/* Freigeben */}
        <button
          type="button"
          onClick={() => handleStatusChange('approved')}
          disabled={updateStatusMutation.isPending || emailData.status === 'approved'}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="h-4 w-4" />
          Freigeben
        </button>

        {/* Ablehnen */}
        <button
          type="button"
          onClick={() => setShowRejectDialog(true)}
          disabled={updateStatusMutation.isPending || emailData.status === 'rejected'}
          className="inline-flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Ablehnen
        </button>

        {/* Trennstrich */}
        <div className="h-6 w-px bg-border" />

        {/* Kopieren */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <Copy className="h-4 w-4" />
          Kopieren
        </button>

        {/* mailto:-Link */}
        <button
          type="button"
          onClick={handleMailto}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <ExternalLink className="h-4 w-4" />
          Im Mail-Client öffnen
        </button>

        {/* Neu generieren (leitet zur Generierungsseite) */}
        <button
          type="button"
          onClick={() => router.push(`/generate?leadId=${emailData.lead_id}`)}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Neu generieren
        </button>
      </div>

      {/* Bestaetigungsdialog: Ablehnen */}
      <ConfirmDialog
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={() => handleStatusChange('rejected')}
        title="E-Mail ablehnen"
        description="Möchtest du diese E-Mail wirklich ablehnen? Du kannst sie anschließend erneut generieren lassen."
        confirmLabel="Ablehnen"
        cancelLabel="Abbrechen"
        variant="destructive"
      />
    </div>
  );
}
