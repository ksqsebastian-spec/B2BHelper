'use client';

/**
 * Wiederverwendbare E-Mail-Tabelle fuer die Review-Ansicht.
 * Zeigt E-Mails mit Checkbox-Auswahl, Status-Badges und Aktions-Buttons.
 */

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Eye, Pencil, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { GeneratedEmail, EmailStatus, Lead } from '@/types';

/** E-Mail mit verknuepftem Lead fuer die Tabellenansicht */
export interface EmailWithLead extends GeneratedEmail {
  lead: Lead;
}

/** Props fuer die EmailTable-Komponente */
interface EmailTableProps {
  /** Liste der E-Mails mit zugehoerigen Lead-Daten */
  emails: EmailWithLead[];
  /** Aktuell ausgewaehlte E-Mail-IDs */
  selectedIds: Set<string>;
  /** Einzelne E-Mail an-/abwaehlen */
  onToggleSelect: (id: string) => void;
  /** Alle sichtbaren E-Mails an-/abwaehlen */
  onSelectAll: () => void;
  /** Status einer E-Mail aendern */
  onStatusChange: (emailId: string, status: EmailStatus) => void;
  /** Detail-Ansicht einer E-Mail oeffnen */
  onView: (emailId: string) => void;
}

/** Farben und Labels fuer die Status-Badges */
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
 * Rendert ein Status-Badge fuer den jeweiligen E-Mail-Status.
 */
function StatusBadge({ status }: { status: EmailStatus }): React.ReactNode {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

/**
 * Kopiert Betreff und Inhalt einer E-Mail in die Zwischenablage.
 */
async function copyEmailToClipboard(subject: string, body: string): Promise<void> {
  const text = `Betreff: ${subject}\n\n${body}`;
  await navigator.clipboard.writeText(text);
  toast.success('E-Mail in Zwischenablage kopiert');
}

/**
 * Wiederverwendbare E-Mail-Tabelle mit Checkbox-Auswahl,
 * Status-Badges und Aktions-Buttons pro Zeile.
 */
export function EmailTable({
  emails,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onStatusChange,
  onView,
}: EmailTableProps): React.ReactNode {
  /** Pruefen ob alle sichtbaren E-Mails ausgewaehlt sind */
  const allSelected = emails.length > 0 && emails.every((e) => selectedIds.has(e.id));
  /** Pruefen ob einige (aber nicht alle) ausgewaehlt sind */
  const someSelected = emails.some((e) => selectedIds.has(e.id)) && !allSelected;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        {/* Tabellenkopf */}
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected;
                  }
                }}
                onChange={onSelectAll}
                className="h-4 w-4 rounded border-input"
                aria-label="Alle E-Mails auswählen"
              />
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">
              Empfänger
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">
              Betreff
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">
              Generiert
            </th>
            <th className="w-32 px-3 py-3 text-right font-medium text-muted-foreground">
              Aktionen
            </th>
          </tr>
        </thead>

        {/* Tabelleninhalt */}
        <tbody className="divide-y">
          {emails.map((email) => (
            <tr
              key={email.id}
              className={cn(
                'cursor-pointer transition-colors hover:bg-muted/30',
                selectedIds.has(email.id) && 'bg-primary/5'
              )}
              onClick={() => onView(email.id)}
            >
              {/* Checkbox */}
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(email.id)}
                  onChange={() => onToggleSelect(email.id)}
                  className="h-4 w-4 rounded border-input"
                  aria-label={`E-Mail an ${email.lead.company_name} auswählen`}
                />
              </td>

              {/* Empfaenger (Firmenname + E-Mail) */}
              <td className="px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {email.lead.company_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {email.lead.contact_email ?? '—'}
                  </p>
                </div>
              </td>

              {/* Betreff */}
              <td className="max-w-xs px-3 py-3">
                <p className="truncate text-foreground">{email.subject}</p>
              </td>

              {/* Status-Badge */}
              <td className="px-3 py-3">
                <StatusBadge status={email.status} />
              </td>

              {/* Datum */}
              <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                {format(new Date(email.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
              </td>

              {/* Aktionen */}
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  {/* Anzeigen */}
                  <button
                    type="button"
                    onClick={() => onView(email.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Anzeigen"
                    aria-label="E-Mail anzeigen"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {/* Bearbeiten (leitet auch zur Detailseite) */}
                  <button
                    type="button"
                    onClick={() => onView(email.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Bearbeiten"
                    aria-label="E-Mail bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  {/* Kopieren */}
                  <button
                    type="button"
                    onClick={() => copyEmailToClipboard(email.subject, email.body)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Kopieren"
                    aria-label="E-Mail kopieren"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  {/* Schnell-Freigabe (nur fuer nicht-freigegebene und nicht-exportierte E-Mails) */}
                  {email.status !== 'approved' && email.status !== 'exported' && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(email.id, 'approved')}
                      className="rounded-md p-1.5 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20"
                      title="Freigeben"
                      aria-label="E-Mail freigeben"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
