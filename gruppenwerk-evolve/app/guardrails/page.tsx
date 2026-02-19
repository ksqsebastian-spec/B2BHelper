'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Save, RotateCcw, ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import dynamic from 'next/dynamic';
import type { GuardrailVersion } from '@/types';

// Markdown-Editor dynamisch laden (kein SSR)
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <LoadingSpinner text="Editor wird geladen..." />,
});

// Standard-Template für neue Guardrails
const DEFAULT_TEMPLATE = `# E-Mail-Richtlinien

## Tonalität
- Professionell aber nicht steif
- Per "Sie"
- Kurz und direkt
- Freundlich und einladend

## Struktur
1. Persönlicher Bezug zur Firma/Branche
2. Wertversprechen von Gruppenwerk
3. Konkreter Call-to-Action (Terminvorschlag)

## Regeln
- Maximal 150 Wörter
- Keine Floskeln wie "Ich hoffe, diese E-Mail findet Sie wohlauf"
- Immer einen konkreten Bezug zum Unternehmen herstellen
- Betreffzeile: Kurz, relevant, kein Clickbait

## Über Gruppenwerk
Gruppenwerk ist eine Hamburger Unternehmensgruppe im Bereich Bau, Architektur und Immobilien.

## Verfügbare Variablen
- {{company_name}} - Firmenname
- {{contact_name}} - Ansprechpartner
- {{industry}} - Branche
- {{company_city}} - Stadt
- {{employees}} - Mitarbeiteranzahl
- {{description}} - Firmenbeschreibung
- {{keywords}} - Schlagwörter
`;

// Guardrails-Editor Seite
export default function GuardrailsPage(): React.ReactNode {
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  // Aktive Guardrails laden
  const { data: activeVersion, isLoading: isLoadingActive } = useQuery({
    queryKey: ['guardrails', 'active'],
    queryFn: async (): Promise<GuardrailVersion | null> => {
      const { data, error } = await supabase
        .from('guardrail_versions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Fehler beim Laden der Guardrails:', error);
        throw new Error('Guardrails konnten nicht geladen werden');
      }

      return data;
    },
    staleTime: 30 * 60 * 1000,
  });

  // Alle Versionen laden
  const { data: versions = [] } = useQuery({
    queryKey: ['guardrails', 'versions'],
    queryFn: async (): Promise<GuardrailVersion[]> => {
      const { data, error } = await supabase
        .from('guardrail_versions')
        .select('*')
        .order('version_number', { ascending: false });

      if (error) {
        console.error('Fehler beim Laden der Versionen:', error);
        throw new Error('Versionen konnten nicht geladen werden');
      }

      return data ?? [];
    },
  });

  // Editor mit aktiver Version initialisieren
  useEffect(() => {
    if (activeVersion) {
      setContent(activeVersion.content);
      setHasChanges(false);
    } else if (!isLoadingActive) {
      setContent(DEFAULT_TEMPLATE);
      setHasChanges(true);
    }
  }, [activeVersion, isLoadingActive]);

  // Auto-Save in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('guardrails-draft');
    if (saved && !activeVersion) {
      setContent(saved);
    }
  }, [activeVersion]);

  useEffect(() => {
    if (hasChanges) {
      localStorage.setItem('guardrails-draft', content);
    }
  }, [content, hasChanges]);

  // Speichern-Mutation
  const saveMutation = useMutation({
    mutationFn: async (newContent: string): Promise<GuardrailVersion> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const nextVersion = versions.length > 0
        ? Math.max(...versions.map((v) => v.version_number)) + 1
        : 1;

      // Alle anderen Versionen deaktivieren
      await supabase
        .from('guardrail_versions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Neue Version speichern
      const { data, error } = await supabase
        .from('guardrail_versions')
        .insert({
          user_id: user.id,
          version_number: nextVersion,
          content: newContent,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error('Guardrails konnten nicht gespeichert werden');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardrails'] });
      localStorage.removeItem('guardrails-draft');
      setHasChanges(false);
      toast.success('Guardrails erfolgreich gespeichert');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Version laden
  const handleLoadVersion = useCallback((version: GuardrailVersion): void => {
    setContent(version.content);
    setHasChanges(version.id !== activeVersion?.id);
  }, [activeVersion]);

  const handleContentChange = (value: string | undefined): void => {
    const newValue = value ?? '';
    setContent(newValue);
    setHasChanges(newValue !== (activeVersion?.content ?? ''));
  };

  const handleDiscard = (): void => {
    if (activeVersion) {
      setContent(activeVersion.content);
    } else {
      setContent(DEFAULT_TEMPLATE);
    }
    setHasChanges(false);
    localStorage.removeItem('guardrails-draft');
  };

  if (isLoadingActive) {
    return <LoadingSpinner text="Guardrails werden geladen..." />;
  }

  const currentVersionIndex = activeVersion
    ? versions.findIndex((v) => v.id === activeVersion.id)
    : -1;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guardrails-Editor</h1>
          <p className="text-sm text-muted-foreground">
            {activeVersion
              ? `Version ${activeVersion.version_number} – ${new Date(activeVersion.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : 'Noch keine Version gespeichert'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Versions-Navigation */}
          {versions.length > 1 && (
            <div className="flex items-center gap-1 rounded-md border px-2 py-1">
              <button
                type="button"
                onClick={() => {
                  const nextIdx = Math.min(currentVersionIndex + 1, versions.length - 1);
                  handleLoadVersion(versions[nextIdx]);
                }}
                disabled={currentVersionIndex >= versions.length - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                title="Ältere Version"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                V{versions[currentVersionIndex]?.version_number ?? '?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const prevIdx = Math.max(currentVersionIndex - 1, 0);
                  handleLoadVersion(versions[prevIdx]);
                }}
                disabled={currentVersionIndex <= 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                title="Neuere Version"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Verwerfen
            </button>
          )}

          <button
            type="button"
            onClick={() => saveMutation.mutate(content)}
            disabled={!hasChanges || saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Speichern
          </button>
        </div>
      </div>

      {/* Markdown Editor */}
      <div className="overflow-hidden rounded-lg border" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height={600}
          preview="live"
        />
      </div>

      {/* Hinweis */}
      {hasChanges && (
        <p className="text-sm text-amber-600">
          Ungespeicherte Änderungen vorhanden. Beim Speichern wird eine neue Version erstellt.
        </p>
      )}
    </div>
  );
}
