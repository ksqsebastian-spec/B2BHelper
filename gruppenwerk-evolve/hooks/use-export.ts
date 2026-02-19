'use client';

/**
 * Hook fuer den CSV-Export von E-Mails.
 * Ruft den /api/export-Endpunkt auf und loest den Datei-Download im Browser aus.
 */

import { useState, useCallback } from 'react';
import type { ExportFormat } from '@/types';

/** Parameter fuer den E-Mail-Export */
interface ExportEmailsParams {
  emailIds: string[];
  format: ExportFormat;
}

/** Rueckgabewert des useExport-Hooks */
interface UseExportReturn {
  /** Exportiert die ausgewaehlten E-Mails als CSV-Datei */
  exportEmails: (params: ExportEmailsParams) => Promise<void>;
  /** Gibt an, ob gerade ein Export laeuft */
  isExporting: boolean;
}

/**
 * Hook fuer den CSV-Export.
 * Sendet die ausgewaehlten E-Mail-IDs an den Server,
 * empfaengt die CSV-Datei und loest den Download im Browser aus.
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const exportEmails = useCallback(async (params: ExportEmailsParams): Promise<void> => {
    if (params.emailIds.length === 0) {
      throw new Error('Keine E-Mails zum Exportieren ausgewaehlt');
    }

    setIsExporting(true);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailIds: params.emailIds,
          format: params.format,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export fehlgeschlagen: ${response.status} - ${errorText}`);
      }

      // Dateiname aus dem Content-Disposition-Header extrahieren
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `export-${params.format}-${new Date().toISOString().slice(0, 10)}.csv`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=(?:(["'])(?:.*?)\1|([^;\n]*))/);
        if (fileNameMatch) {
          fileName = fileNameMatch[2] ?? fileNameMatch[1] ?? fileName;
        }
      }

      // CSV-Daten als Blob empfangen
      const blob = await response.blob();

      // Download im Browser ausloesen
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;

      // Link zum DOM hinzufuegen, klicken und wieder entfernen
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Objekt-URL freigeben
      URL.revokeObjectURL(downloadUrl);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportEmails,
    isExporting,
  };
}
