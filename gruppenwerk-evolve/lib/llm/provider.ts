/**
 * LLM-Anbieter-Interface und Factory-Funktion.
 * Definiert die gemeinsame Schnittstelle fuer alle LLM-Anbieter.
 */

import type { GenerateOptions, LLMProvider, LLMResponse } from '@/types';

/** Gemeinsame Schnittstelle fuer alle LLM-Anbieter */
export interface LLMProviderInterface {
  /** Name des Anbieters */
  readonly name: string;

  /**
   * Generiert eine E-Mail basierend auf dem Prompt.
   * Gibt Betreff und Text der E-Mail zurueck.
   */
  generate(prompt: string, options: GenerateOptions): Promise<LLMResponse>;

  /**
   * Testet die Verbindung zum Anbieter mit dem angegebenen API-Schluessel.
   * Gibt true zurueck, wenn der Schluessel gueltig ist.
   */
  testConnection(apiKey: string): Promise<boolean>;
}

/**
 * Factory-Funktion: Gibt die passende Anbieter-Implementierung zurueck.
 * Verwendet dynamische Imports fuer Code-Splitting.
 */
export async function getProvider(provider: LLMProvider): Promise<LLMProviderInterface> {
  switch (provider) {
    case 'anthropic': {
      const { AnthropicProvider } = await import('./anthropic');
      return new AnthropicProvider();
    }
    case 'openai': {
      const { OpenAIProvider } = await import('./openai');
      return new OpenAIProvider();
    }
    case 'qwen': {
      const { QwenProvider } = await import('./qwen');
      return new QwenProvider();
    }
    case 'custom': {
      const { CustomProvider } = await import('./custom');
      return new CustomProvider();
    }
    default: {
      // Erschoepfende Pruefung: Stellt sicher, dass alle Anbieter behandelt werden
      const _exhaustive: never = provider;
      throw new Error(`Unbekannter Anbieter: ${_exhaustive}`);
    }
  }
}
