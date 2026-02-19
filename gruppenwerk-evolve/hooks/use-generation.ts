'use client';

/**
 * Hook fuer die E-Mail-Generierung via Server-Sent Events (SSE).
 * Verbindet sich mit dem /api/generate-Endpunkt und verfolgt den Fortschritt
 * der Batch-Generierung in Echtzeit.
 */

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { GenerationProgress, LLMProvider } from '@/types';

/** Konfiguration fuer den LLM-Anbieter */
interface ProviderConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

/** Parameter zum Starten der Generierung */
interface StartGenerationParams {
  leadIds: string[];
  config: ProviderConfig;
}

/** Rueckgabewert des useGeneration-Hooks */
interface UseGenerationReturn {
  /** Startet die E-Mail-Generierung fuer die angegebenen Leads */
  startGeneration: (params: StartGenerationParams) => void;
  /** Aktueller Fortschritt der Generierung */
  progress: GenerationProgress | null;
  /** Gibt an, ob gerade eine Generierung laeuft */
  isGenerating: boolean;
  /** Bricht die laufende Generierung ab */
  cancel: () => void;
}

/**
 * Hook fuer die E-Mail-Generierung via SSE.
 * Stellt eine Verbindung zum /api/generate-Endpunkt her und
 * empfaengt Fortschritts-Events in Echtzeit.
 */
export function useGeneration(): UseGenerationReturn {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  /** Bricht die laufende Generierung ab und raeumt Ressourcen auf */
  const cancel = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsGenerating(false);
    setProgress(null);
  }, []);

  /** Startet die Generierung und oeffnet eine SSE-Verbindung */
  const startGeneration = useCallback(
    (params: StartGenerationParams): void => {
      // Vorherige Verbindung beenden, falls vorhanden
      cancel();

      setIsGenerating(true);
      setProgress({ type: 'progress', current: 0, total: params.leadIds.length });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // SSE-Verbindung ueber POST-Anfrage aufbauen (EventSource unterstuetzt kein POST)
      // Daher verwenden wir fetch mit ReadableStream
      const requestBody = JSON.stringify({
        leadIds: params.leadIds,
        provider: params.config.provider,
        model: params.config.model,
        temperature: params.config.temperature,
        maxTokens: params.config.maxTokens,
        apiKey: params.config.apiKey,
      });

      fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        signal: abortController.signal,
      })
        .then(async (response: Response): Promise<void> => {
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server-Fehler: ${response.status} - ${errorText}`);
          }

          const reader = response.body?.getReader();

          if (!reader) {
            throw new Error('Kein ReadableStream vom Server erhalten');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          // SSE-Stream zeilenweise verarbeiten
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // SSE-Nachrichten sind durch doppelte Zeilenumbrueche getrennt
            const messages = buffer.split('\n\n');
            // Letztes (moeglicherweise unvollstaendiges) Fragment behalten
            buffer = messages.pop() ?? '';

            for (const message of messages) {
              // Nur Zeilen mit "data:" Praefix verarbeiten
              const dataLine = message
                .split('\n')
                .find((line: string) => line.startsWith('data:'));

              if (!dataLine) {
                continue;
              }

              const jsonStr = dataLine.slice('data:'.length).trim();

              if (!jsonStr) {
                continue;
              }

              try {
                const event = JSON.parse(jsonStr) as GenerationProgress;
                setProgress(event);

                // Bei Abschluss oder Fehler die Verbindung beenden
                if (event.type === 'complete' || event.type === 'error') {
                  setIsGenerating(false);
                  // Caches invalidieren, damit neue E-Mails sichtbar werden
                  queryClient.invalidateQueries({ queryKey: ['emails'] });
                  queryClient.invalidateQueries({ queryKey: ['leads'] });
                  queryClient.invalidateQueries({ queryKey: ['batches'] });
                }
              } catch {
                // Ungueltiges JSON ignorieren (z.B. Heartbeat-Nachrichten)
              }
            }
          }

          // Stream beendet ohne explizites complete-Event
          setIsGenerating(false);
          queryClient.invalidateQueries({ queryKey: ['emails'] });
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        })
        .catch((error: Error): void => {
          // AbortError ignorieren (bewusster Abbruch durch den Benutzer)
          if (error.name === 'AbortError') {
            return;
          }

          setProgress({
            type: 'error',
            error: error.message || 'Unbekannter Fehler bei der Generierung',
          });
          setIsGenerating(false);
        });
    },
    [cancel, queryClient]
  );

  return {
    startGeneration,
    progress,
    isGenerating,
    cancel,
  };
}
