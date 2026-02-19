'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { FileSpreadsheet } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import type { ImportBatch } from '@/types';

/** Maximale Anzahl der angezeigten Batches */
const MAX_BATCHES = 10;

/**
 * Laedt die letzten Import-Batches aus Supabase.
 * Begrenzt auf MAX_BATCHES Eintraege, absteigend nach Import-Datum.
 */
async function fetchRecentBatches(): Promise<ImportBatch[]> {
  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .order('imported_at', { ascending: false })
    .limit(MAX_BATCHES);

  if (error) {
    throw new Error('Batches konnten nicht geladen werden');
  }

  return data ?? [];
}

/**
 * Formatiert ein ISO-Datum als deutsches Datum mit Uhrzeit.
 */
function formatDatum(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Gibt die passende Badge-Variante fuer den Batch-Status zurueck.
 */
function statusBadgeVariant(
  status: ImportBatch['status']
): 'default' | 'secondary' {
  switch (status) {
    case 'active':
      return 'default';
    case 'archived':
      return 'secondary';
    default:
      return 'secondary';
  }
}

/**
 * Uebersetzt den Batch-Status ins Deutsche.
 */
function statusLabel(status: ImportBatch['status']): string {
  switch (status) {
    case 'active':
      return 'Aktiv';
    case 'archived':
      return 'Archiviert';
    default:
      return status;
  }
}

// Batch-Historie: Tabelle der letzten CSV-Importe
export function BatchHistory(): React.ReactNode {
  const {
    data: batches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dashboard', 'batches'],
    queryFn: fetchRecentBatches,
    staleTime: 60 * 1000, // 1 Minute Cache
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch-Historie</CardTitle>
        <CardDescription>
          Die letzten {MAX_BATCHES} CSV-Importe
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner text="Batches werden geladen..." />
        ) : isError ? (
          <p className="py-4 text-center text-sm text-destructive">
            Fehler beim Laden der Batches.
          </p>
        ) : batches.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="h-10 w-10" />}
            title="Noch keine Importe"
            description="Importiere eine CSV-Datei, um Leads hinzuzufuegen."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDatum(batch.imported_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {batch.total_leads.toLocaleString('de-DE')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(batch.status)}>
                      {statusLabel(batch.status)}
                    </Badge>
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
