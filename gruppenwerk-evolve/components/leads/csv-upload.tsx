'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';

// Maximale Dateigroesse: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Erlaubte Dateiendungen
const ALLOWED_EXTENSIONS = ['.csv'];

/** Props fuer die CSV-Upload-Komponente */
interface CsvUploadProps {
  onFileLoaded: (data: Record<string, string>[], fileName: string) => void;
}

/** Ergebnis der Datei-Validierung */
interface ValidationResult {
  valid: boolean;
  error?: string;
}

// CSV-Datei-Upload mit Drag & Drop Unterstuetzung
export function CsvUpload({ onFileLoaded }: CsvUploadProps): React.ReactNode {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datei validieren (Groesse und Endung)
  const validateFile = (file: File): ValidationResult => {
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Ungültiges Dateiformat "${extension}". Nur CSV-Dateien sind erlaubt.`,
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `Datei ist zu groß (${sizeMB} MB). Maximal 10 MB erlaubt.`,
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: 'Die Datei ist leer.',
      };
    }

    return { valid: true };
  };

  // CSV-Datei parsen und Daten weitergeben
  const processFile = useCallback(
    (file: File): void => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error ?? 'Unbekannter Fehler');
        return;
      }

      setError(null);
      setIsParsing(true);
      setSelectedFile(file.name);

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string): string => header.trim(),
        complete: (results) => {
          setIsParsing(false);

          // Pruefen ob Daten vorhanden sind
          if (!results.data || results.data.length === 0) {
            setError('Die CSV-Datei enthält keine Daten.');
            setSelectedFile(null);
            return;
          }

          // Pruefen ob Spalten erkannt wurden
          if (
            !results.meta.fields ||
            results.meta.fields.length === 0
          ) {
            setError(
              'Keine Spalten erkannt. Stellen Sie sicher, dass die erste Zeile die Spaltennamen enthält.'
            );
            setSelectedFile(null);
            return;
          }

          // Parse-Fehler als Warnung melden, aber weiterarbeiten
          if (results.errors.length > 0) {
            console.warn(
              'CSV-Parse-Warnungen:',
              results.errors.slice(0, 5)
            );
          }

          onFileLoaded(results.data, file.name);
        },
        error: (parseError: Error) => {
          setIsParsing(false);
          setError(`Fehler beim Lesen der Datei: ${parseError.message}`);
          setSelectedFile(null);
        },
      });
    },
    [onFileLoaded]
  );

  // Drag-Events verarbeiten
  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  // Datei per Drop empfangen
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  // Datei per Dateiauswahl-Dialog empfangen
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = event.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
      // Input zuruecksetzen, damit dieselbe Datei erneut gewählt werden kann
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  // Upload-Bereich anklicken oeffnet den Dialog
  const handleClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  // Fehler zuruecksetzen
  const handleClearError = useCallback((): void => {
    setError(null);
    setSelectedFile(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Drag-and-Drop-Bereich */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          isParsing && 'pointer-events-none opacity-60'
        )}
      >
        {isParsing ? (
          <>
            <FileSpreadsheet className="h-12 w-12 animate-pulse text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Datei wird verarbeitet...
              </p>
              <p className="text-xs text-muted-foreground">{selectedFile}</p>
            </div>
          </>
        ) : (
          <>
            <Upload
              className={cn(
                'h-12 w-12',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                CSV-Datei hierher ziehen oder klicken zum Auswählen
              </p>
              <p className="text-xs text-muted-foreground">
                Nur .csv-Dateien, maximal 10 MB
              </p>
            </div>
          </>
        )}

        {/* Verstecktes File-Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="CSV-Datei auswählen"
        />
      </div>

      {/* Fehlermeldung */}
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleClearError}
            className="shrink-0 text-destructive/70 hover:text-destructive"
            aria-label="Fehler schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
