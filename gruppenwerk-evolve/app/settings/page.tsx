'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select, SelectOption } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ProviderList } from '@/components/settings/provider-list';
import { ApiKeyForm } from '@/components/settings/api-key-form';
import { EXPORT_FORMAT_OPTIONS } from '@/lib/constants';
import type { ApiConfiguration, ExportFormat, UserProfile } from '@/types';

// Einstellungen-Seite: API-Provider, Export-Defaults, Account
export default function SettingsPage(): React.ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('generic');
  // Benutzerprofil laden
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: async (): Promise<UserProfile | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Fehler beim Laden des Profils:', error);
        throw new Error('Profil konnte nicht geladen werden');
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten Cache
  });

  // Export-Format aus dem Profil initialisieren
  useEffect(() => {
    if (profile?.default_export_format) {
      setExportFormat(profile.default_export_format);
    }
  }, [profile]);

  // Konfigurierte API-Provider laden
  const { data: providers = [], isLoading: isLoadingProviders } = useQuery({
    queryKey: ['settings', 'providers'],
    queryFn: async (): Promise<ApiConfiguration[]> => {
      const { data, error } = await supabase
        .from('api_configurations')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error('Provider konnten nicht geladen werden');
      }

      return data ?? [];
    },
  });

  // Mutation zum Speichern des Export-Formats
  const saveExportMutation = useMutation({
    mutationFn: async (format: ExportFormat): Promise<void> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      // Pruefen ob Profil existiert
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            default_export_format: format,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw new Error('Export-Format konnte nicht gespeichert werden');
      } else {
        // Neues Profil anlegen
        const { error } = await supabase.from('user_profiles').insert({
          id: user.id,
          default_export_format: format,
          default_provider: 'anthropic',
          default_model: 'claude-sonnet-4-20250514',
        });

        if (error) throw new Error('Profil konnte nicht erstellt werden');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
      toast.success('Export-Format gespeichert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /** Export-Format aendern und speichern */
  const handleExportFormatChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const neuesFormat = e.target.value as ExportFormat;
    setExportFormat(neuesFormat);
  };

  /** Export-Format explizit speichern */
  const handleSaveExportFormat = (): void => {
    saveExportMutation.mutate(exportFormat);
  };

  /** Benutzer abmelden */
  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      {/* Seitentitel */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          API-Schluessel, Export-Optionen und Account-Verwaltung
        </p>
      </div>

      {/* Bereich 1: API-Provider */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">API-Provider</h2>

        {/* Liste konfigurierter Provider */}
        <ProviderList providers={providers} isLoading={isLoadingProviders} />

        {/* Formular zum Hinzufuegen */}
        <ApiKeyForm />
      </section>

      {/* Bereich 2: Export-Standardeinstellungen */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Export-Einstellungen
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Standard-Export-Format</CardTitle>
            <CardDescription>
              Wird beim Exportieren von E-Mails als Voreinstellung verwendet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProfile ? (
              <LoadingSpinner text="Einstellungen werden geladen..." />
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="export-format">Format</Label>
                  <Select
                    id="export-format"
                    value={exportFormat}
                    onChange={handleExportFormatChange}
                  >
                    {EXPORT_FORMAT_OPTIONS.map((option) => (
                      <SelectOption key={option.value} value={option.value}>
                        {option.label} – {option.description}
                      </SelectOption>
                    ))}
                  </Select>
                </div>
                <Button
                  onClick={handleSaveExportFormat}
                  disabled={
                    saveExportMutation.isPending ||
                    exportFormat === profile?.default_export_format
                  }
                >
                  {saveExportMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Speichern
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Bereich 3: Account */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Account</h2>
        <Card>
          <CardHeader>
            <CardTitle>Dein Konto</CardTitle>
            <CardDescription>
              Anmeldedaten und Sitzungsverwaltung
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
