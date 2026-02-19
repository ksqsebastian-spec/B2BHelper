'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Trash2, Shield, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { PROVIDER_OPTIONS } from '@/lib/constants';
import type { ApiConfiguration } from '@/types';

interface ProviderListProps {
  /** Konfigurierte API-Provider */
  providers: ApiConfiguration[];
  /** Ladezustand */
  isLoading: boolean;
}

/**
 * Gibt den deutschen Anzeigenamen fuer einen Provider zurueck.
 */
function providerLabel(providerValue: string): string {
  const option = PROVIDER_OPTIONS.find((p) => p.value === providerValue);
  return option?.label ?? providerValue;
}

/**
 * Maskiert einen verschluesselten API-Schluessel fuer die Anzeige.
 * Zeigt nur die letzten 4 Zeichen.
 */
function maskApiKey(encrypted: string): string {
  // Der verschluesselte Wert ist nicht der Originalschluessel,
  // daher zeigen wir nur einen Platzhalter
  const sichtbar = encrypted.slice(-4);
  return `${'*'.repeat(20)}${sichtbar}`;
}

/**
 * Formatiert ein ISO-Datum als deutsches Datum.
 */
function formatDatum(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Liste konfigurierter API-Provider mit Loeschfunktion
export function ProviderList({
  providers,
  isLoading,
}: ProviderListProps): React.ReactNode {
  const queryClient = useQueryClient();

  // Mutation zum Loeschen eines Providers
  const deleteMutation = useMutation({
    mutationFn: async (configId: string): Promise<void> => {
      const { error } = await supabase
        .from('api_configurations')
        .delete()
        .eq('id', configId);

      if (error) {
        throw new Error('Provider konnte nicht geloescht werden');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'providers'] });
      toast.success('API-Provider erfolgreich geloescht');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation zum Setzen des Standard-Providers
  const setDefaultMutation = useMutation({
    mutationFn: async (configId: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      // Alle anderen auf nicht-Standard setzen
      await supabase
        .from('api_configurations')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Ausgewaehlten als Standard setzen
      const { error } = await supabase
        .from('api_configurations')
        .update({ is_default: true })
        .eq('id', configId);

      if (error) {
        throw new Error('Standard-Provider konnte nicht gesetzt werden');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'providers'] });
      toast.success('Standard-Provider aktualisiert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /** Bestaetigung vor dem Loeschen */
  const handleDelete = (config: ApiConfiguration): void => {
    const bestaetigt = window.confirm(
      `Moechtest du den API-Schluessel fuer "${providerLabel(config.provider)}" wirklich loeschen?`
    );
    if (bestaetigt) {
      deleteMutation.mutate(config.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konfigurierte Provider</CardTitle>
        <CardDescription>
          Deine gespeicherten API-Schluessel fuer die E-Mail-Generierung
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner text="Provider werden geladen..." />
        ) : providers.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-10 w-10" />}
            title="Keine Provider konfiguriert"
            description="Fuege einen API-Schluessel hinzu, um E-Mails generieren zu koennen."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>API-Schluessel</TableHead>
                <TableHead>Hinzugefuegt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    {providerLabel(config.provider)}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {maskApiKey(config.api_key_encrypted)}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDatum(config.created_at)}
                  </TableCell>
                  <TableCell>
                    {config.is_default ? (
                      <Badge variant="default">Standard</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(config.id)}
                        disabled={setDefaultMutation.isPending}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Als Standard
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(config)}
                      disabled={deleteMutation.isPending}
                      title="Loeschen"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
