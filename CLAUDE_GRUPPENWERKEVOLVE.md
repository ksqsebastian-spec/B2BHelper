# CLAUDE.md – Verbindliche Regeln für Claude Code

**Projekt:** GruppenwerkEvolve  
**Version:** 1.0  
**Status:** VERBINDLICH – Keine Ausnahmen erlaubt

---

## ⚠️ KRITISCHE ANWEISUNGEN

Diese Regeln sind **ABSOLUT VERBINDLICH**. Bei jeder Code-Änderung, jedem neuen Feature und jeder Fehlerbehebung MÜSSEN diese Regeln befolgt werden. Es gibt **KEINE AUSNAHMEN**.

**Bei Unsicherheit:** Frage nach, bevor du Code schreibst. Falsch implementierter Code muss komplett neu geschrieben werden.

---

## 1. SPRACHE & LOKALISIERUNG

### 1.1 Deutsche Sprache – AUSNAHMSLOS

```
✅ RICHTIG:
- "Speichern"
- "E-Mail erfolgreich generiert"
- "Bitte lade eine gültige CSV-Datei hoch"
- "Löschen"
- "Abbrechen"
- "Importieren"
- "Generieren"
- "Freigeben"
- "Exportieren"
- "Keine Ergebnisse gefunden"
- "Wird geladen..."

❌ FALSCH:
- "Save"
- "Email generated successfully"
- "Please upload a valid CSV file"
- "Delete"
- "Cancel"
- "Loading..."
```

### 1.2 Alle UI-Texte auf Deutsch

| Bereich | Regel |
|---------|-------|
| Buttons | Deutsche Beschriftung |
| Labels | Deutsche Beschriftung |
| Placeholder | Deutsche Texte |
| Fehlermeldungen | Deutsche, verständliche Texte |
| Toasts | Deutsche Benachrichtigungen |
| Tooltips | Deutsche Erklärungen |
| Tabellen-Header | Deutsche Spaltenüberschriften |
| Leere Zustände | Deutsche Texte |
| Bestätigungsdialoge | Deutsche Fragen und Buttons |

### 1.3 Code-Kommentare

- Kommentare im Code: **DEUTSCH**
- Variablennamen: **ENGLISCH** (technischer Standard)
- Funktionsnamen: **ENGLISCH** (technischer Standard)
- TypeScript-Typen: **ENGLISCH** (technischer Standard)

```typescript
// ✅ RICHTIG
// Generiert E-Mails für ausgewählte Leads
async function generateEmails(leadIds: string[]): Promise<GeneratedEmail[]> {
  // Lädt die aktiven Guardrails
  const guardrails = await fetchActiveGuardrails();
  
  return results;
}

// ❌ FALSCH
// Generates emails for selected leads
async function generateEmails(leadIds: string[]): Promise<GeneratedEmail[]> {
  // Load active guardrails
  ...
}
```

---

## 2. CODE-ARCHITEKTUR

### 2.1 Datei-Organisation – STRIKT

```
REGEL: Eine Komponente = Eine Datei
REGEL: Keine Komponente über 300 Zeilen
REGEL: Bei >300 Zeilen → In kleinere Komponenten aufteilen
```

**Dateinamen:**
```
✅ RICHTIG:
lead-table.tsx
email-detail.tsx
column-mapper.tsx
csv-upload.tsx

❌ FALSCH:
LeadTable.tsx        (Kein PascalCase für Dateien)
leadtable.tsx        (Nicht zusammengeschrieben)
lead_table.tsx       (Keine Underscores)
```

### 2.2 Ordnerstruktur – UNVERÄNDERLICH

Die Ordnerstruktur aus dem PRD ist **VERBINDLICH**. Neue Dateien MÜSSEN in den korrekten Ordner:

```
/app                    → Nur Seiten (page.tsx, layout.tsx) und API Routes
/components/ui          → Nur shadcn Komponenten
/components/[feature]   → Feature-spezifische Komponenten
/components/shared      → Übergreifende Komponenten
/components/layout      → Layout-Komponenten
/lib                    → Hilfsfunktionen, Validierung, Supabase, LLM, Export
/hooks                  → Custom React Hooks
/types                  → TypeScript Typen
```

**VERBOTEN:**
- Neue Top-Level-Ordner erstellen
- Dateien außerhalb der Struktur ablegen
- `/utils`, `/helpers`, `/services` Ordner (→ gehört in `/lib`)

### 2.3 Import-Reihenfolge – IMMER EINHALTEN

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Externe Libraries
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// 3. UI Komponenten
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 4. Feature Komponenten
import { LeadTable } from '@/components/leads/lead-table';

// 5. Hooks
import { useLeads } from '@/hooks/use-leads';

// 6. Lib/Utils
import { supabase } from '@/lib/supabase/client';
import { leadSchema } from '@/lib/validations/lead';

// 7. Types
import type { Lead, GeneratedEmail } from '@/types';

// 8. Styles (falls nötig)
import './styles.css';
```

---

## 3. TYPESCRIPT – STRIKT

### 3.1 Keine `any` Types – NIEMALS

```typescript
// ✅ RICHTIG
function processLeads(data: Lead[]): ProcessedLead[] { ... }

// ❌ VERBOTEN
function processLeads(data: any): any { ... }
```

### 3.2 Explizite Return Types – IMMER

```typescript
// ✅ RICHTIG
function parseCSVRow(row: Record<string, string>): Lead {
  return { ... };
}

async function generateEmail(lead: Lead): Promise<GeneratedEmail | null> {
  ...
}

// ❌ FALSCH
function parseCSVRow(row: Record<string, string>) {  // Fehlender Return Type
  return { ... };
}
```

### 3.3 Typen-Definition – ZENTRAL

```typescript
// ✅ RICHTIG: Typen in /types/index.ts definieren
// /types/index.ts
export interface Lead {
  id: string;
  batch_id: string;
  company_name: string;
  contact_email: string;
  contact_name?: string;
  industry?: string;
  // ...
}

export interface GeneratedEmail {
  id: string;
  lead_id: string;
  subject: string;
  body: string;
  status: EmailStatus;
  // ...
}

export type EmailStatus = 'generated' | 'reviewed' | 'approved' | 'rejected' | 'exported' | 'error';
export type LLMProvider = 'anthropic' | 'openai' | 'qwen' | 'custom';

// In Komponente importieren
import type { Lead, GeneratedEmail } from '@/types';

// ❌ FALSCH: Typen lokal in Komponente definieren
```

### 3.4 Null-Safety – IMMER PRÜFEN

```typescript
// ✅ RICHTIG
const email = data?.email;
if (!email) {
  return <EmptyState message="E-Mail nicht gefunden" />;
}

// ❌ FALSCH
const email = data.email;  // Kann crashen wenn data undefined
return <div>{email.subject}</div>;
```

---

## 4. REACT PATTERNS

### 4.1 Funktionale Komponenten – AUSSCHLIESSLICH

```typescript
// ✅ RICHTIG
export function EmailDetail({ email }: EmailDetailProps): JSX.Element {
  return <div>...</div>;
}

// ❌ VERBOTEN
export class EmailDetail extends React.Component { ... }
```

### 4.2 Props Interface – IMMER DEFINIEREN

```typescript
// ✅ RICHTIG
interface EmailDetailProps {
  email: GeneratedEmail;
  lead: Lead;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isLoading?: boolean;
}

export function EmailDetail({ 
  email, 
  lead,
  onApprove, 
  onReject,
  isLoading = false 
}: EmailDetailProps): JSX.Element {
  ...
}
```

### 4.3 Event Handler Naming – KONVENTION

```typescript
// ✅ RICHTIG
const handleImport = () => { ... };
const handleGenerate = () => { ... };
const handleApprove = () => { ... };
const handleExport = () => { ... };

// Props
onImport?: () => void;
onGenerate?: () => void;
onApprove?: (id: string) => void;
```

### 4.4 Conditional Rendering – KLARE STRUKTUR

```typescript
// ✅ RICHTIG
if (isLoading) {
  return <LoadingSpinner text="E-Mails werden geladen..." />;
}

if (error) {
  return <ErrorState message={error.message} />;
}

if (!data || data.length === 0) {
  return <EmptyState message="Noch keine E-Mails generiert" />;
}

return <EmailTable data={data} />;
```

---

## 5. FORMULARE

### 5.1 React Hook Form + Zod – IMMER

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema, type SettingsFormData } from '@/lib/validations/settings';

export function SettingsForm(): JSX.Element {
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      temperature: 0.7,
    },
  });

  const onSubmit = async (data: SettingsFormData): Promise<void> => {
    // Verarbeitung
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form Fields */}
      </form>
    </Form>
  );
}
```

### 5.2 Fehlermeldungen – IMMER DEUTSCH UND HILFREICH

```typescript
// ✅ RICHTIG
'Firmenname ist erforderlich'
'Bitte gib eine gültige E-Mail-Adresse ein'
'CSV-Datei ist zu groß (maximal 10 MB)'
'Nur CSV-Dateien sind erlaubt'
'API-Key ist erforderlich'
'Mindestens ein Lead muss ausgewählt sein'

// ❌ FALSCH
'Required'
'Invalid email'
'File too large'
```

### 5.3 Auto-Save – PFLICHT FÜR GUARDRAILS-EDITOR

```typescript
import { useAutoSave } from '@/hooks/use-auto-save';

export function GuardrailsEditor(): JSX.Element {
  const [content, setContent] = useState('');
  
  useAutoSave({
    key: 'guardrails-editor',
    data: content,
    onRestore: (saved) => setContent(saved),
  });
  
  return ( ... );
}
```

---

## 6. DATENBANK & SUPABASE

### 6.1 Supabase Client – KORREKTE VERWENDUNG

```typescript
// Client-Komponenten (use client)
import { supabase } from '@/lib/supabase/client';

// Server-Komponenten / API Routes
import { createServerClient } from '@/lib/supabase/server';
```

### 6.2 Queries – IMMER MIT ERROR HANDLING

```typescript
// ✅ RICHTIG
async function fetchLeads(batchId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('batch_id', batchId)
    .order('company_name');
  
  if (error) {
    console.error('Fehler beim Laden der Leads:', error);
    throw new Error('Leads konnten nicht geladen werden');
  }
  
  return data ?? [];
}

// ❌ FALSCH
async function fetchLeads(batchId: string) {
  const { data } = await supabase.from('leads').select('*');
  return data;  // Error wird ignoriert!
}
```

### 6.3 TanStack Query – IMMER FÜR DATA FETCHING

```typescript
// /hooks/use-leads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useLeads(batchId?: string) {
  return useQuery({
    queryKey: ['leads', batchId],
    queryFn: () => fetchLeads(batchId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: importLeads,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}
```

---

## 7. ERROR HANDLING

### 7.1 Fehler-Hierarchie – IMMER EINHALTEN

```
1. Validierungsfehler → Inline bei Formularfeld
2. API-Fehler → Toast-Benachrichtigung
3. Kritische Fehler → Error-Boundary mit Fallback-UI
```

### 7.2 Error Messages – ZENTRAL DEFINIERT

```typescript
// /lib/errors/messages.ts
export const ERROR_MESSAGES = {
  // Allgemein
  UNKNOWN: 'Ein unbekannter Fehler ist aufgetreten. Bitte versuche es erneut.',
  NETWORK: 'Keine Internetverbindung. Bitte prüfe dein Netzwerk.',
  UNAUTHORIZED: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
  
  // Import
  CSV_PARSE_FAILED: 'CSV-Datei konnte nicht gelesen werden. Bitte prüfe das Format.',
  CSV_TOO_LARGE: 'Die Datei ist zu groß. Maximal 10 MB und 500 Zeilen erlaubt.',
  CSV_MISSING_FIELDS: 'Pflichtfelder fehlen: Firmenname und E-Mail müssen zugeordnet sein.',
  IMPORT_FAILED: 'Import fehlgeschlagen. Bitte versuche es erneut.',
  
  // Generierung
  GENERATION_FAILED: 'E-Mail konnte nicht generiert werden.',
  API_KEY_MISSING: 'Kein API-Key konfiguriert. Bitte unter Einstellungen hinterlegen.',
  API_KEY_INVALID: 'API-Key ist ungültig. Bitte unter Einstellungen prüfen.',
  API_RATE_LIMIT: 'API Rate-Limit erreicht. Bitte warte einen Moment.',
  GUARDRAILS_MISSING: 'Keine Guardrails konfiguriert. Bitte zuerst Richtlinien anlegen.',
  
  // Review & Export
  EMAIL_NOT_FOUND: 'E-Mail nicht gefunden.',
  EXPORT_FAILED: 'Export fehlgeschlagen. Bitte versuche es erneut.',
  NO_EMAILS_SELECTED: 'Keine E-Mails ausgewählt.',
  
  // Einstellungen
  API_KEY_SAVE_FAILED: 'API-Key konnte nicht gespeichert werden.',
  API_KEY_TEST_FAILED: 'Verbindungstest fehlgeschlagen.',
} as const;
```

### 7.3 Toast-Benachrichtigungen

```typescript
import { toast } from 'sonner';

// Erfolg
toast.success('15 Leads erfolgreich importiert');
toast.success('E-Mail erfolgreich generiert');
toast.success('Export als CSV heruntergeladen');

// Fehler mit Retry
toast.error('Generierung fehlgeschlagen', {
  action: {
    label: 'Erneut versuchen',
    onClick: () => handleRetry(),
  },
});
```

---

## 8. UI KOMPONENTEN

### 8.1 shadcn/ui – IMMER VERWENDEN

```
REGEL: Für Standard-UI-Elemente IMMER shadcn/ui verwenden
REGEL: Keine eigenen Button, Input, Select, etc. bauen
REGEL: shadcn Komponenten NUR in /components/ui/
```

### 8.2 Styling – NUR TAILWIND

```typescript
// ✅ RICHTIG
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <Button className="w-full">Importieren</Button>
</div>

// ❌ VERBOTEN
<div style={{ display: 'flex' }}>     // Keine Inline-Styles
<div className={styles.container}>     // Keine CSS-Modules
```

### 8.3 Loading States – IMMER ANZEIGEN

```typescript
// ✅ RICHTIG
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Wird generiert...
    </>
  ) : (
    'Generieren'
  )}
</Button>
```

### 8.4 Leere Zustände – NIEMALS LEER LASSEN

```typescript
// ✅ RICHTIG
if (emails.length === 0) {
  return (
    <EmptyState
      icon={<Mail className="h-12 w-12 text-muted-foreground" />}
      title="Noch keine E-Mails generiert"
      description="Importiere Leads und generiere personalisierte E-Mails."
      action={
        <Button asChild>
          <Link href="/leads/import">
            <Upload className="mr-2 h-4 w-4" />
            Leads importieren
          </Link>
        </Button>
      }
    />
  );
}
```

---

## 9. SICHERHEIT

### 9.1 Umgebungsvariablen – NIEMALS IM CODE

```typescript
// ✅ RICHTIG
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ❌ VERBOTEN
const supabaseUrl = 'https://xyz.supabase.co';
const apiKey = 'sk-ant-...';
```

### 9.2 Server-Only Secrets – STRIKT TRENNEN

```
NEXT_PUBLIC_*   → Kann im Browser sichtbar sein
Ohne NEXT_PUBLIC_ → NUR auf Server verfügbar

REGEL: Service Role Key NIEMALS mit NEXT_PUBLIC_ prefix
REGEL: ENCRYPTION_KEY NIEMALS mit NEXT_PUBLIC_ prefix
REGEL: LLM API-Keys NUR server-seitig verwenden (über /api/ Routes)
```

### 9.3 API-Key-Verschlüsselung – PFLICHT

```typescript
// API-Keys werden VOR dem Speichern verschlüsselt
// /lib/crypto/encryption.ts
// AES-256-GCM mit ENCRYPTION_KEY aus Umgebungsvariable
// Keys werden NIE im Klartext in der Datenbank gespeichert
```

### 9.4 CSV-Upload – STRENGE PRÜFUNG

```typescript
export const csvUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'Die Datei ist zu groß. Maximal 10 MB erlaubt.'
    )
    .refine(
      (file) => file.name.endsWith('.csv'),
      'Nur CSV-Dateien sind erlaubt.'
    )
    .refine(
      (file) => !file.name.includes('..'),
      'Ungültiger Dateiname.'
    ),
});
```

---

## 10. PERFORMANCE

### 10.1 Lazy Loading – FÜR GROSSE KOMPONENTEN

```typescript
import dynamic from 'next/dynamic';

const MarkdownEditor = dynamic(
  () => import('@/components/guardrails/markdown-editor'),
  { 
    loading: () => <LoadingSpinner text="Editor wird geladen..." />,
    ssr: false
  }
);
```

### 10.2 Query Stale Time – SINNVOLL SETZEN

```typescript
// Daten die sich selten ändern
useQuery({
  queryKey: ['guardrails'],
  queryFn: fetchActiveGuardrails,
  staleTime: 30 * 60 * 1000,  // 30 Minuten
});

// Daten die sich oft ändern
useQuery({
  queryKey: ['emails', batchId],
  queryFn: () => fetchEmails(batchId),
  staleTime: 1 * 60 * 1000,  // 1 Minute
});
```

---

## 11. TESTING

### 11.1 E2E Tests – PLAYWRIGHT

```typescript
// ✅ RICHTIG: Deutsche Test-Beschreibungen
import { test, expect } from '@playwright/test';

test.describe('Lead-Import', () => {
  test('sollte eine CSV-Datei importieren können', async ({ page }) => {
    await page.goto('/leads/import');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-leads.csv');
    
    await expect(page.locator('text=15 Leads erkannt')).toBeVisible();
    
    await page.click('button:has-text("Importieren")');
    
    await expect(page.locator('text=erfolgreich importiert')).toBeVisible();
  });
});
```

---

## 12. GIT & COMMITS

### 12.1 Commit Messages – DEUTSCHE KONVENTION

```
feat: CSV-Import mit Spalten-Mapping hinzugefügt
fix: Fehler beim Generieren von E-Mails behoben
refactor: LLM-Provider-Abstraktion vereinfacht
docs: README aktualisiert
style: Formatierung korrigiert
test: E2E-Test für Export hinzugefügt
chore: Abhängigkeiten aktualisiert
```

---

## 13. VERBOTENE PRAKTIKEN

| Verboten | Warum |
|----------|-------|
| `any` Type | Keine Type-Safety |
| Inline Styles | Nicht wartbar |
| CSS Modules | Tailwind ist Standard |
| Class Components | Veraltet |
| `var` Keyword | `const` oder `let` nutzen |
| `==` Vergleich | `===` nutzen |
| `console.log` in Production | Nur `console.error` für echte Fehler |
| Hardcoded Strings in UI | Konstanten verwenden |
| Englische UI-Texte | Nur Deutsch |
| Fetch ohne Error Handling | Immer try/catch oder .catch() |
| Leere catch-Blöcke | Fehler mindestens loggen |
| Magic Numbers | Konstanten mit Namen |
| Komponenten >300 Zeilen | Aufteilen |
| Direkte DOM-Manipulation | React State nutzen |
| API-Keys im Client-Code | Nur server-seitig über API Routes |

---

## 14. CODE REVIEW CHECKLIST

Vor jedem Commit prüfen:

- [ ] Alle UI-Texte auf Deutsch
- [ ] Keine `any` Types
- [ ] Alle Funktionen haben Return Types
- [ ] Error Handling vorhanden
- [ ] Loading States implementiert
- [ ] Empty States implementiert
- [ ] Validierung mit Zod
- [ ] Deutsche Fehlermeldungen
- [ ] Keine console.log (außer Fehler)
- [ ] Komponente <300 Zeilen
- [ ] Imports sortiert
- [ ] TypeScript Errors = 0
- [ ] API-Keys nur server-seitig

---

**DIESE REGELN SIND NICHT VERHANDELBAR.**

Bei Fragen oder Unklarheiten: **FRAGE NACH** statt zu raten.
