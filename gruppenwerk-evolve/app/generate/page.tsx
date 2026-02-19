'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Play,
  Square,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import type { Lead, ImportBatch, GuardrailVersion, GenerationProgress } from '@/types';

// E-Mail-Generierung Seite
export default function GeneratePage(): React.ReactNode {
  const router = useRouter();
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('claude-haiku-4-5');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Batches laden
  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ['batches'],
    queryFn: async (): Promise<ImportBatch[]> => {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .order('imported_at', { ascending: false });
      if (error) throw new Error('Batches konnten nicht geladen werden');
      return data ?? [];
    },
  });

  // Leads des ausgewählten Batches laden
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['leads', selectedBatchId],
    queryFn: async (): Promise<Lead[]> => {
      if (!selectedBatchId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('batch_id', selectedBatchId)
        .order('company_name');
      if (error) throw new Error('Leads konnten nicht geladen werden');
      return data ?? [];
    },
    enabled: !!selectedBatchId,
  });

  // Aktive Guardrails laden
  const { data: guardrails } = useQuery({
    queryKey: ['guardrails', 'active'],
    queryFn: async (): Promise<GuardrailVersion | null> => {
      const { data, error } = await supabase
        .from('guardrail_versions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw new Error('Guardrails konnten nicht geladen werden');
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });

  // Ersten Batch automatisch auswählen
  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  // Alle Leads auswählen wenn Batch gewechselt wird
  useEffect(() => {
    if (leads.length > 0) {
      setSelectedLeadIds(leads.filter((l) => !l.email_generated).map((l) => l.id));
    }
  }, [leads]);

  // Modelle pro Provider
  const modelOptions: Record<string, { value: string; label: string }[]> = {
    anthropic: [
      { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
      { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    ],
    openai: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4o', label: 'GPT-4o' },
    ],
    qwen: [
      { value: 'qwen-turbo', label: 'Qwen Turbo' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
    ],
    custom: [
      { value: 'custom', label: 'Benutzerdefiniert' },
    ],
  };

  const handleToggleLead = (leadId: string): void => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = (): void => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  // Generierung starten
  const handleGenerate = useCallback(async (): Promise<void> => {
    if (selectedLeadIds.length === 0) {
      toast.error('Bitte wähle mindestens einen Lead aus.');
      return;
    }

    if (!guardrails) {
      toast.error('Keine Guardrails konfiguriert. Bitte zuerst Richtlinien anlegen.');
      return;
    }

    setIsGenerating(true);
    setSuccessCount(0);
    setErrorCount(0);
    setProgress({ type: 'progress', current: 0, total: selectedLeadIds.length });

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          provider,
          model,
          temperature,
          maxTokens,
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        throw new Error('Generierung konnte nicht gestartet werden');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('Keine Antwort vom Server');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as GenerationProgress;
              setProgress(event);

              if (event.type === 'success') {
                setSuccessCount((prev) => prev + 1);
              } else if (event.type === 'error') {
                setErrorCount((prev) => prev + 1);
              } else if (event.type === 'complete') {
                toast.success(
                  `Generierung abgeschlossen: ${event.successful} erfolgreich, ${event.failed} fehlgeschlagen`
                );
              }
            } catch {
              // Ungültiges JSON ignorieren
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast.info('Generierung abgebrochen');
      } else {
        toast.error('Generierung fehlgeschlagen');
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [selectedLeadIds, guardrails, provider, model, temperature, maxTokens]);

  const handleCancel = (): void => {
    abortRef.current?.abort();
  };

  if (isLoadingBatches) {
    return <LoadingSpinner text="Batches werden geladen..." />;
  }

  if (batches.length === 0) {
    return (
      <div className="mx-auto max-w-7xl p-4">
        <EmptyState
          icon={<Zap className="h-12 w-12" />}
          title="Keine Leads vorhanden"
          description="Importiere zuerst Leads, um E-Mails zu generieren."
          action={
            <button
              type="button"
              onClick={() => router.push('/leads/import')}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Leads importieren
            </button>
          }
        />
      </div>
    );
  }

  const progressPercent = progress?.total
    ? Math.round(((progress.current ?? 0) / progress.total) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      <h1 className="text-2xl font-bold text-foreground">E-Mail-Generierung</h1>

      {/* Konfiguration */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Linke Spalte: Batch & Lead-Auswahl */}
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className="font-semibold text-foreground">Leads auswählen</h2>

          {/* Batch-Auswahl */}
          <div className="space-y-1">
            <label htmlFor="batch" className="text-sm font-medium text-foreground">
              Batch
            </label>
            <select
              id="batch"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.total_leads} Leads)
                </option>
              ))}
            </select>
          </div>

          {/* Lead-Liste */}
          {isLoadingLeads ? (
            <LoadingSpinner text="Leads werden geladen..." />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedLeadIds.length} von {leads.length} ausgewählt
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isGenerating}
                  className="text-sm text-primary hover:underline"
                >
                  {selectedLeadIds.length === leads.length
                    ? 'Alle abwählen'
                    : 'Alle auswählen'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-md border">
                {leads.map((lead) => (
                  <label
                    key={lead.id}
                    className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={() => handleToggleLead(lead.id)}
                      disabled={isGenerating}
                      className="h-4 w-4 rounded border-input"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.company_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.contact_email ?? lead.industry ?? '—'}
                      </p>
                    </div>
                    {lead.email_generated && (
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rechte Spalte: Provider-Konfiguration */}
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className="font-semibold text-foreground">Konfiguration</h2>

          {/* Provider */}
          <div className="space-y-1">
            <label htmlFor="provider" className="text-sm font-medium text-foreground">
              Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                const models = modelOptions[e.target.value];
                if (models?.[0]) setModel(models[0].value);
              }}
              disabled={isGenerating}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="anthropic">Claude (Anthropic)</option>
              <option value="openai">OpenAI</option>
              <option value="qwen">Qwen</option>
              <option value="custom">Benutzerdefiniert</option>
            </select>
          </div>

          {/* Modell */}
          <div className="space-y-1">
            <label htmlFor="model" className="text-sm font-medium text-foreground">
              Modell
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(modelOptions[provider] ?? []).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Temperatur */}
          <div className="space-y-1">
            <label htmlFor="temperature" className="text-sm font-medium text-foreground">
              Temperatur: {temperature.toFixed(1)}
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              disabled={isGenerating}
              className="w-full"
            />
          </div>

          {/* Max Tokens */}
          <div className="space-y-1">
            <label htmlFor="maxTokens" className="text-sm font-medium text-foreground">
              Max. Tokens: {maxTokens}
            </label>
            <input
              id="maxTokens"
              type="range"
              min="100"
              max="2000"
              step="50"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              disabled={isGenerating}
              className="w-full"
            />
          </div>

          {/* Guardrails-Status */}
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2">
              {guardrails ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    Guardrails: Version {guardrails.version_number}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-600">
                    Keine Guardrails konfiguriert
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fortschrittsanzeige */}
      {isGenerating && progress && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {progress.current ?? 0}/{progress.total ?? 0} generiert ({progressPercent}%)
            </span>
            {progress.leadName && (
              <span className="text-sm text-muted-foreground">
                Aktuell: {progress.leadName}
              </span>
            )}
          </div>

          {/* Fortschrittsbalken */}
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              {successCount} erfolgreich
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {errorCount} übersprungen
              </span>
            )}
          </div>
        </div>
      )}

      {/* Aktionen */}
      <div className="flex items-center justify-between">
        {isGenerating ? (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Square className="h-4 w-4" />
            Abbrechen
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={selectedLeadIds.length === 0 || !guardrails}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {selectedLeadIds.length} E-Mails generieren
          </button>
        )}

        {!isGenerating && successCount > 0 && (
          <button
            type="button"
            onClick={() => router.push('/review')}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Zum Review-Tab
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
