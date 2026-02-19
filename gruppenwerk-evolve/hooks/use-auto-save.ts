'use client';

/**
 * Auto-Save Hook fuer den Guardrails-Editor.
 * Speichert Daten automatisch im localStorage und stellt sie beim Laden wieder her.
 * Schuetzt vor Datenverlust bei versehentlichem Seitenwechsel oder Browser-Absturz.
 */

import { useEffect, useRef, useCallback } from 'react';

/** Konfiguration fuer den Auto-Save-Hook */
interface UseAutoSaveOptions<T> {
  /** Eindeutiger Schluessel fuer den localStorage-Eintrag */
  key: string;
  /** Die zu speichernden Daten */
  data: T;
  /** Callback zum Wiederherstellen gespeicherter Daten beim Laden */
  onRestore: (data: T) => void;
  /** Verzoegerung in Millisekunden vor dem Speichern (Standard: 1000ms) */
  debounceMs?: number;
}

/** Gespeichertes Auto-Save-Objekt im localStorage */
interface AutoSaveEntry<T> {
  /** Die gespeicherten Daten */
  data: T;
  /** Zeitstempel der letzten Speicherung (ISO-String) */
  savedAt: string;
}

/**
 * Auto-Save Hook fuer den Guardrails-Editor.
 *
 * Funktionsweise:
 * 1. Beim Mounten wird geprueft, ob gespeicherte Daten im localStorage vorhanden sind.
 *    Falls ja, wird der onRestore-Callback aufgerufen.
 * 2. Bei jeder Aenderung der Daten werden diese mit Debouncing im localStorage gespeichert.
 * 3. Nach erfolgreichem Speichern in der Datenbank kann clearSavedData() aufgerufen werden.
 */
export function useAutoSave<T>({
  key,
  data,
  onRestore,
  debounceMs = 1000,
}: UseAutoSaveOptions<T>): { clearSavedData: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const onRestoreRef = useRef(onRestore);

  // onRestore-Referenz aktuell halten, ohne Effekt-Abhaengigkeit
  useEffect((): void => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  // Beim Mounten gespeicherte Daten wiederherstellen
  useEffect((): void => {
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    try {
      const storageKey = `autosave:${key}`;
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        return;
      }

      const entry = JSON.parse(stored) as AutoSaveEntry<T>;

      if (entry.data !== undefined && entry.data !== null) {
        onRestoreRef.current(entry.data);
      }
    } catch {
      // Fehler beim Lesen aus dem localStorage ignorieren (z.B. ungueltige Daten)
    }
  }, [key]);

  // Daten mit Debouncing im localStorage speichern
  useEffect((): (() => void) => {
    // Beim ersten Render nicht sofort speichern (Initialisierung abwarten)
    if (!isInitializedRef.current) {
      return (): void => {};
    }

    // Vorherigen Timer abbrechen
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout((): void => {
      try {
        const storageKey = `autosave:${key}`;
        const entry: AutoSaveEntry<T> = {
          data,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(entry));
      } catch {
        // Fehler beim Schreiben in den localStorage ignorieren (z.B. Speicher voll)
      }
    }, debounceMs);

    // Cleanup: Timer beim Unmounten oder bei Aenderungen abbrechen
    return (): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [key, data, debounceMs]);

  /** Entfernt die gespeicherten Daten aus dem localStorage */
  const clearSavedData = useCallback((): void => {
    try {
      const storageKey = `autosave:${key}`;
      localStorage.removeItem(storageKey);
    } catch {
      // Fehler beim Loeschen aus dem localStorage ignorieren
    }
  }, [key]);

  return { clearSavedData };
}
