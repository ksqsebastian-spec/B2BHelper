'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select, SelectOption } from '@/components/ui/select';
import { PROVIDER_OPTIONS } from '@/lib/constants';
import type { LLMProvider } from '@/types';

/** Ergebnis des Verbindungstests */
interface TestResult {
  success: boolean;
  message: string;
}

// Formular zum Hinzufuegen eines neuen API-Schluessels
export function ApiKeyForm(): React.ReactNode {
  const [provider, setProvider] = useState<LLMProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const queryClient = useQueryClient();

  // Mutation zum Speichern des API-Schluessels
  const saveMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      // Pruefen ob bereits ein Eintrag fuer diesen Provider existiert
      const { data: existing } = await supabase
        .from('api_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .maybeSingle();

      if (existing) {
        // Bestehenden Eintrag aktualisieren
        const { error } = await supabase
          .from('api_configurations')
          .update({
            api_key_encrypted: apiKey,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          throw new Error('API-Schluessel konnte nicht aktualisiert werden');
        }
      } else {
        // Neuen Eintrag erstellen
        // Pruefen ob es der erste Provider ist (dann als Standard setzen)
        const { count } = await supabase
          .from('api_configurations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const istErster = (count ?? 0) === 0;

        const { error } = await supabase.from('api_configurations').insert({
          user_id: user.id,
          provider,
          api_key_encrypted: apiKey,
          is_default: istErster,
        });

        if (error) {
          throw new Error('API-Schluessel konnte nicht gespeichert werden');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'providers'] });
      setApiKey('');
      setTestResult(null);
      toast.success('API-Schluessel erfolgreich gespeichert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /** Verbindungstest zum API-Provider durchfuehren */
  const handleTest = async (): Promise<void> => {
    if (!apiKey.trim()) {
      toast.error('Bitte gib einen API-Schluessel ein.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/settings/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = (await response.json()) as TestResult;

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: 'Verbindung erfolgreich hergestellt',
        });
        toast.success('Verbindungstest erfolgreich');
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Verbindung fehlgeschlagen',
        });
        toast.error('Verbindungstest fehlgeschlagen');
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Netzwerkfehler beim Verbindungstest',
      });
      toast.error('Netzwerkfehler beim Verbindungstest');
    } finally {
      setIsTesting(false);
    }
  };

  /** Formular absenden */
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!apiKey.trim()) {
      toast.error('Bitte gib einen API-Schluessel ein.');
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neuen API-Schluessel hinzufuegen</CardTitle>
        <CardDescription>
          Konfiguriere einen LLM-Anbieter fuer die E-Mail-Generierung
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider-Auswahl */}
          <div className="space-y-2">
            <Label htmlFor="provider-select">Provider</Label>
            <Select
              id="provider-select"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as LLMProvider);
                setTestResult(null);
              }}
            >
              {PROVIDER_OPTIONS.map((option) => (
                <SelectOption key={option.value} value={option.value}>
                  {option.label}
                </SelectOption>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {PROVIDER_OPTIONS.find((p) => p.value === provider)?.description}
            </p>
          </div>

          {/* API-Schluessel Eingabe */}
          <div className="space-y-2">
            <Label htmlFor="api-key-input">API-Schluessel</Label>
            <Input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="sk-..."
              autoComplete="off"
            />
          </div>

          {/* Testergebnis anzeigen */}
          {testResult && (
            <div
              className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
                testResult.success
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <span className="shrink-0">!</span>
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !apiKey.trim()}
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Teste...
                </>
              ) : (
                'Verbindung testen'
              )}
            </Button>

            <Button
              type="submit"
              disabled={saveMutation.isPending || !apiKey.trim()}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Speichern
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
