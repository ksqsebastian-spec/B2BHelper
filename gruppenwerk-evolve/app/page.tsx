'use client';

import { StatsCards } from '@/components/dashboard/stats-cards';
import { BatchHistory } from '@/components/dashboard/batch-history';
import { QuickActions } from '@/components/dashboard/quick-actions';

// Dashboard-Seite: Startseite der Anwendung mit Statistiken und Schnellzugriff
export default function DashboardPage(): React.ReactNode {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4">
      {/* Seitentitel */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Willkommen bei GruppenwerkEvolve – dein Outbound-E-Mail-Workflow im
          Ueberblick.
        </p>
      </div>

      {/* Statistik-Karten */}
      <StatsCards />

      {/* Schnellaktionen */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Schnellzugriff
        </h2>
        <QuickActions />
      </section>

      {/* Batch-Historie */}
      <section>
        <BatchHistory />
      </section>
    </div>
  );
}
