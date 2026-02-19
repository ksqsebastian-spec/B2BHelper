'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Users, Mail, CheckCircle, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Struktur einer einzelnen Statistik-Karte */
interface StatCard {
  titel: string;
  icon: React.ReactNode;
  wert: number;
  isLoading: boolean;
  farbe: string;
}

/** Dashboard-Statistiken aus der Datenbank */
interface DashboardStats {
  leadsGesamt: number;
  emailsGeneriert: number;
  emailsFreigegeben: number;
  emailsExportiert: number;
}

/**
 * Laedt die Dashboard-Statistiken aus Supabase.
 * Zaehlt Leads, generierte, freigegebene und exportierte E-Mails.
 */
async function fetchDashboardStats(): Promise<DashboardStats> {
  // Alle Abfragen parallel ausfuehren
  const [leadsResult, genResult, approvedResult, exportedResult] =
    await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase
        .from('generated_emails')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('generated_emails')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('generated_emails')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'exported'),
    ]);

  return {
    leadsGesamt: leadsResult.count ?? 0,
    emailsGeneriert: genResult.count ?? 0,
    emailsFreigegeben: approvedResult.count ?? 0,
    emailsExportiert: exportedResult.count ?? 0,
  };
}

// Statistik-Karten fuer das Dashboard mit Echtzeit-Daten
export function StatsCards(): React.ReactNode {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 30 * 1000, // 30 Sekunden Cache
  });

  // Karten-Konfiguration mit deutschen Bezeichnungen
  const karten: StatCard[] = [
    {
      titel: 'Leads gesamt',
      icon: <Users className="h-5 w-5" />,
      wert: stats?.leadsGesamt ?? 0,
      isLoading,
      farbe: 'text-blue-600',
    },
    {
      titel: 'E-Mails generiert',
      icon: <Mail className="h-5 w-5" />,
      wert: stats?.emailsGeneriert ?? 0,
      isLoading,
      farbe: 'text-violet-600',
    },
    {
      titel: 'E-Mails freigegeben',
      icon: <CheckCircle className="h-5 w-5" />,
      wert: stats?.emailsFreigegeben ?? 0,
      isLoading,
      farbe: 'text-green-600',
    },
    {
      titel: 'E-Mails exportiert',
      icon: <Upload className="h-5 w-5" />,
      wert: stats?.emailsExportiert ?? 0,
      isLoading,
      farbe: 'text-amber-600',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {karten.map((karte) => (
        <Card key={karte.titel}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {karte.titel}
            </CardTitle>
            <div className={cn(karte.farbe)}>{karte.icon}</div>
          </CardHeader>
          <CardContent>
            {karte.isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {karte.wert.toLocaleString('de-DE')}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
