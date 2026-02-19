'use client';

/**
 * Export-Dialog fuer den CSV-Export von E-Mails.
 * Ermoeglicht die Auswahl des Export-Formats (Instantly, Mailchimp, Generisch)
 * und loest den Download ueber den /api/export-Endpunkt aus.
 */

import { useState, useEffect, useRef } from 'react';
import { X, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExportFormat } from '@/types';

/** Props fuer die ExportDialog-Komponente */
interface ExportDialogProps {
  /** Ob der Dialog geoeffnet ist */
  open: boolean;
  /** Callback zum Schliessen des Dialogs */
  onClose: () => void;
  /** Anzahl der ausgewaehlten E-Mails */
  selectedCount: number;
  /** Callback zum Ausfuehren des Exports mit gewaehltem Format */
  onExport: (format: ExportFormat) => void;
}

/** Konfiguration der verfuegbaren Export-Formate */
const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  {
    value: 'instantly',
    label: 'Instantly',
    description: 'CSV-Format kompatibel mit Instantly.ai Kampagnen-Import',
  },
  {
    value: 'mailchimp',
    label: 'Mailchimp',
    description: 'CSV-Format kompatibel mit Mailchimp Kontakt-Import',
  },
  {
    value: 'generic',
    label: 'Generisch',
    description: 'Allgemeines CSV-Format mit allen verfügbaren Feldern',
  },
];

/**
 * Dialog-Komponente fuer die Export-Format-Auswahl.
 * Verwendet das native HTML-Dialog-Element fuer modale Darstellung.
 */
export function ExportDialog({
  open,
  onClose,
  selectedCount,
  onExport,
}: ExportDialogProps): React.ReactNode | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('instantly');

  /** Dialog oeffnen/schliessen wenn sich der open-Prop aendert */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  /** Ausgewaehltes Format zuruecksetzen wenn Dialog geoeffnet wird */
  useEffect(() => {
    if (open) {
      setSelectedFormat('instantly');
    }
  }, [open]);

  if (!open) return null;

  /** Export starten und Dialog schliessen */
  const handleExport = (): void => {
    onExport(selectedFormat);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="max-w-md rounded-lg border bg-card p-0 shadow-lg backdrop:bg-black/50"
    >
      <div className="p-6">
        {/* Dialog-Kopfzeile */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">E-Mails exportieren</h2>
              <p className="text-sm text-muted-foreground">
                {selectedCount} {selectedCount === 1 ? 'E-Mail' : 'E-Mails'} ausgewählt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Dialog schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Format-Auswahl */}
        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium text-foreground">Export-Format wählen</p>

          {FORMAT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                selectedFormat === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent/50'
              )}
            >
              <input
                type="radio"
                name="export-format"
                value={option.value}
                checked={selectedFormat === option.value}
                onChange={() => setSelectedFormat(option.value)}
                className="mt-0.5 h-4 w-4 border-input text-primary"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Aktions-Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportieren
          </button>
        </div>
      </div>
    </dialog>
  );
}
