'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/types';

/** Sortierrichtung fuer Tabellenspalten */
type SortDirection = 'asc' | 'desc';

/** Sortierbare Felder der Lead-Tabelle */
type SortField =
  | 'company_name'
  | 'contact_email'
  | 'contact_name'
  | 'industry'
  | 'company_city'
  | 'email_generated'
  | 'created_at';

/** Sortier-Zustand */
interface SortState {
  field: SortField;
  direction: SortDirection;
}

/** Props fuer die Lead-Tabelle */
interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  onDelete?: (leadIds: string[]) => void;
}

/** Spalten-Definition fuer die Tabelle */
interface ColumnDefinition {
  key: SortField;
  label: string;
  sortable: boolean;
}

// Spaltendefinitionen fuer die Lead-Tabelle
const COLUMNS: ColumnDefinition[] = [
  { key: 'company_name', label: 'Firmenname', sortable: true },
  { key: 'contact_email', label: 'E-Mail', sortable: true },
  { key: 'contact_name', label: 'Ansprechpartner', sortable: true },
  { key: 'industry', label: 'Branche', sortable: true },
  { key: 'company_city', label: 'Stadt', sortable: true },
  { key: 'email_generated', label: 'E-Mail generiert', sortable: true },
  { key: 'created_at', label: 'Erstellt', sortable: true },
];

// Wiederverwendbare Lead-Tabelle mit Sortierung und Auswahl
export function LeadTable({
  leads,
  isLoading,
  onDelete,
}: LeadTableProps): React.ReactNode {
  const [sort, setSort] = useState<SortState>({
    field: 'created_at',
    direction: 'desc',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sortierung umschalten
  const handleSort = useCallback(
    (field: SortField): void => {
      setSort((prev) => ({
        field,
        direction:
          prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    },
    []
  );

  // Sortierte Leads berechnen
  const sortedLeads = useMemo((): Lead[] => {
    const sorted = [...leads].sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];

      // Null-Werte ans Ende sortieren
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Boolean-Vergleich fuer email_generated
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return aVal === bVal ? 0 : aVal ? -1 : 1;
      }

      // String-Vergleich
      const comparison = String(aVal).localeCompare(String(bVal), 'de');
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [leads, sort]);

  // Einzelnen Lead auswaehlen/abwaehlen
  const handleSelectOne = useCallback(
    (id: string, checked: boolean): void => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    []
  );

  // Alle Leads auswaehlen/abwaehlen
  const handleSelectAll = useCallback(
    (checked: boolean): void => {
      if (checked) {
        setSelectedIds(new Set(sortedLeads.map((lead) => lead.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [sortedLeads]
  );

  // Ausgewaehlte Leads loeschen
  const handleDeleteSelected = useCallback((): void => {
    if (onDelete && selectedIds.size > 0) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [onDelete, selectedIds]);

  // Sortier-Icon rendern
  const renderSortIcon = (field: SortField): React.ReactNode => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  // Pruefen ob alle sichtbaren Leads ausgewaehlt sind
  const allSelected =
    sortedLeads.length > 0 &&
    sortedLeads.every((lead) => selectedIds.has(lead.id));

  // Ladezustand
  if (isLoading) {
    return <LoadingSpinner text="Leads werden geladen..." />;
  }

  // Leerer Zustand
  if (leads.length === 0) {
    return (
      <EmptyState
        title="Keine Leads vorhanden"
        description="Importieren Sie eine CSV-Datei, um Leads hinzuzufügen."
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Aktionsleiste bei Auswahl */}
      {selectedIds.size > 0 && onDelete && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} von {leads.length} ausgewählt
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Löschen
          </button>
        </div>
      )}

      {/* Tabelle */}
      <Table>
        <TableHeader>
          <TableRow>
            {/* Checkbox-Spalte */}
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Alle auswählen"
              />
            </TableHead>

            {/* Datenspalten */}
            {COLUMNS.map((col) => (
              <TableHead key={col.key}>
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {col.label}
                    {renderSortIcon(col.key)}
                  </button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedLeads.map((lead) => (
            <TableRow
              key={lead.id}
              data-state={selectedIds.has(lead.id) ? 'selected' : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(lead.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(lead.id, checked)
                  }
                  aria-label={`${lead.company_name} auswählen`}
                />
              </TableCell>
              <TableCell className="font-medium">
                {lead.company_name}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {lead.contact_email ?? '—'}
              </TableCell>
              <TableCell>{lead.contact_name ?? '—'}</TableCell>
              <TableCell>{lead.industry ?? '—'}</TableCell>
              <TableCell>{lead.company_city ?? '—'}</TableCell>
              <TableCell>
                {lead.email_generated ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Ja
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Nein
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(lead.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
