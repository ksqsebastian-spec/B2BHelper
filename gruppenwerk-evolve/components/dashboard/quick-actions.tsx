'use client';

import { useRouter } from 'next/navigation';
import { Upload, Zap, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Konfiguration einer Schnellaktion */
interface QuickAction {
  titel: string;
  beschreibung: string;
  icon: React.ReactNode;
  href: string;
  farbe: string;
}

/** Verfuegbare Schnellaktionen fuer das Dashboard */
const AKTIONEN: QuickAction[] = [
  {
    titel: 'CSV importieren',
    beschreibung: 'Neue Leads aus einer CSV-Datei importieren',
    icon: <Upload className="h-6 w-6" />,
    href: '/leads',
    farbe: 'text-blue-600 bg-blue-50',
  },
  {
    titel: 'E-Mails generieren',
    beschreibung: 'E-Mails fuer importierte Leads erzeugen',
    icon: <Zap className="h-6 w-6" />,
    href: '/generate',
    farbe: 'text-violet-600 bg-violet-50',
  },
  {
    titel: 'Review oeffnen',
    beschreibung: 'Generierte E-Mails pruefen und freigeben',
    icon: <ClipboardCheck className="h-6 w-6" />,
    href: '/review',
    farbe: 'text-green-600 bg-green-50',
  },
];

// Schnellaktionen: Karten fuer die wichtigsten Workflows
export function QuickActions(): React.ReactNode {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {AKTIONEN.map((aktion) => (
        <Card
          key={aktion.titel}
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => router.push(aktion.href)}
          role="button"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push(aktion.href);
            }
          }}
        >
          <CardHeader className="pb-2">
            <div
              className={cn(
                'mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg',
                aktion.farbe
              )}
            >
              {aktion.icon}
            </div>
            <CardTitle className="text-base">{aktion.titel}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {aktion.beschreibung}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
