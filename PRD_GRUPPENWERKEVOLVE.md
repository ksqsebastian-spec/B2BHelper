# PRD – Product Requirements Document

**Projekt:** GruppenwerkEvolve  
**Version:** 1.0  
**Datum:** 19.02.2026  
**Autor:** Axel / Gruppenwerk  
**Status:** Draft

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Ziele & Erfolgskriterien](#3-ziele--erfolgskriterien)
4. [Nutzer & Personas](#4-nutzer--personas)
5. [Funktionale Anforderungen](#5-funktionale-anforderungen)
6. [Nicht-funktionale Anforderungen](#6-nicht-funktionale-anforderungen)
7. [Datenmodell](#7-datenmodell)
8. [Tech Stack](#8-tech-stack)
9. [Architektur](#9-architektur)
10. [UI/UX Spezifikation](#10-uiux-spezifikation)
11. [API-Design](#11-api-design)
12. [Security](#12-security)
13. [Testing](#13-testing)
14. [Deployment](#14-deployment)
15. [Projektstruktur](#15-projektstruktur)
16. [Anhang](#16-anhang)

---

## 1. Executive Summary

### 1.1 Projektziel

GruppenwerkEvolve ist eine interne Web-Applikation für Gruppenwerk, die den gesamten Outbound-E-Mail-Workflow automatisiert: von CSV-Lead-Import über KI-gestützte, guardrail-gesteuerte E-Mail-Generierung bis hin zum Review, manuellen Versand und Export für Tools wie Instantly oder Mailchimp. Die App ersetzt den manuellen Prozess, bei dem Leads einzeln recherchiert und E-Mails von Hand geschrieben werden.

### 1.2 Kernprinzip

> **"Import → Generate → Review → Send/Export — in einem Tool, ohne Medienbruch."**

### 1.3 Scope

**IN SCOPE:**
- CSV-Import mit intelligentem Spalten-Mapping (Apollo, beliebige CSVs)
- KI-gestützte E-Mail-Generierung über flexible API-Anbindung (Claude, OpenAI, Qwen, etc.)
- Editierbare Guardrails-Datei (Markdown) direkt im UI
- Review-Tab mit Auswahl, Bearbeitung und Statusverwaltung generierter E-Mails
- Export als Instantly-CSV, Mailchimp-CSV oder generisches Format
- Manueller Einzelversand via Copy-to-Clipboard oder mailto:-Link
- Single-User mit sicherer Authentifizierung

**OUT OF SCOPE:**
- Automatisierter E-Mail-Versand (SMTP-Integration) – Compliance-Risiko, Phase 2
- Multi-User / Team-Funktionen – aktuell nicht benötigt
- CRM-Integration (HubSpot, Salesforce) – spätere Phase
- Lead-Scoring oder automatische Qualifizierung – manuell über Apollo

**PHASE 2+ (Später):**
- SMTP-Direktversand mit Tracking (Opens, Clicks)
- A/B-Testing von E-Mail-Varianten
- Automatische Follow-up-Sequenzen
- Webhook-Integration mit CRM-Systemen
- Multi-User mit Rollen

### 1.4 Budget

| Posten | Monatlich | Jährlich |
|--------|-----------|----------|
| Vercel Pro (existiert) | €20 | €240 |
| Supabase Pro (existiert) | €25 | €300 |
| LLM-API (~100 Mails/Tag) | ~€5-15 | ~€60-180 |
| **Gesamt** | **~€50-60** | **~€600-720** |

> **Hinweis API-Kosten:** Bei ~100 Mails/Tag mit ~500 Input-Tokens + ~300 Output-Tokens pro Mail:
> - Qwen (free tier): €0
> - Claude Haiku: ~€0.08/Tag (~€2.40/Monat)
> - GPT-4o-mini: ~€0.06/Tag (~€1.80/Monat)
> - Claude Sonnet: ~€0.90/Tag (~€27/Monat)

---

## 2. Problem Statement

### 2.1 Ausgangssituation

Gruppenwerk nutzt Apollo.io für Lead-Recherche und exportiert Accounts/Kontakte als CSV. Aktuell werden Outbound-E-Mails manuell geschrieben – jede Mail erfordert individuelle Recherche der Firma, Formulierung des Anschreibens und manuelle Eingabe in Mail-Client oder Export-Tool. Bei 100 Mails/Tag ist das ~3-4 Stunden rein repetitive Arbeit.

**Aktuell genutzte Lösung:** Apollo CSV-Export → manuelles Schreiben → Copy/Paste in Instantly oder direkter Versand

### 2.2 Problem-Definition

| Problem | Auswirkung | Priorität |
|---------|------------|-----------|
| Manuelles Schreiben jeder E-Mail | 3-4h/Tag Zeitverlust, nicht skalierbar | 🔴 Hoch |
| Inkonsistente E-Mail-Qualität | Schwankende Tonalität, vergessene Informationen | 🔴 Hoch |
| Kein Überprüfungs-Workflow | Fehlerhafte Mails werden versandt | 🟡 Mittel |
| Umständlicher Export für Instantly/Mailchimp | Manuelles Format-Mapping, fehleranfällig | 🟡 Mittel |
| Keine Guardrails für Ton/Inhalt | Markeninkonsistenz bei Outbound-Kommunikation | 🟡 Mittel |

### 2.3 Gewünschte Lösung

Eine Web-App, die den kompletten Workflow von Lead-Import bis Export/Versand abbildet. Leads werden per CSV importiert, ein KI-Modell generiert personalisierte E-Mails basierend auf Lead-Daten und editierbaren Guardrails, und im Review-Tab können Mails geprüft, bearbeitet, freigegeben und exportiert werden.

---

## 3. Ziele & Erfolgskriterien

### 3.1 Primäre Ziele

| Prio | Ziel | Messbar durch |
|------|------|---------------|
| 1 | Zeitersparnis bei E-Mail-Erstellung | Reduktion von 3-4h auf <30min/Tag für 100 Mails |
| 2 | Konsistente E-Mail-Qualität | Guardrails werden bei 100% der generierten Mails angewendet |
| 3 | Nahtloser Export-Workflow | Export in <1 Minute für Instantly/Mailchimp bereit |

### 3.2 Erfolgskriterien (1 Monat nach Launch)

- [ ] 100 Mails/Tag werden über die App generiert und versandt/exportiert
- [ ] Durchschnittliche Review-Zeit pro Mail < 30 Sekunden
- [ ] Guardrails werden aktiv gepflegt und mindestens 1x/Woche angepasst
- [ ] Export-Format wird fehlerfrei von Instantly/Mailchimp akzeptiert

---

## 4. Nutzer & Personas

### 4.1 Primärer Nutzer: Axel

| Attribut | Wert |
|----------|------|
| Rolle | Project Leader Strategy & Architecture, Gruppenwerk |
| Technische Affinität | 8/10 |
| Nutzungshäufigkeit | Täglich |
| Primäres Gerät | Desktop |

**Bedürfnisse:**
- Schnelle Verarbeitung großer Lead-Listen (bis 500 Leads)
- Volle Kontrolle über Tonalität und Inhalt via Guardrails
- Möglichkeit, jede generierte Mail vor Versand zu prüfen und zu bearbeiten
- Flexibler Export für verschiedene Versandtools

**Frustrationen:**
- Zeitintensives manuelles Schreiben einzelner Mails
- Keine zentrale Stelle für E-Mail-Qualitätsstandards
- Medienbrüche zwischen Lead-Recherche, Schreiben und Versand

### 4.2 Authentifizierung

| Aspekt | Entscheidung |
|--------|--------------|
| Auth-Methode | Magic Link (E-Mail) |
| Nutzerkonten | Einzelnutzer (Axel) |
| Session-Dauer | 30 Tage |
| Rollen | Nein (Single User) |

> **Sicherheit:** Obwohl Single-User, muss die App vollständig authentifiziert sein. Kein öffentlicher Zugang. Row Level Security (RLS) auf allen Tabellen.

---

## 5. Funktionale Anforderungen

### 5.1 Modul-Übersicht

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         GruppenwerkEvolve                                │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│  Dashboard   │  Lead-Import │  Generierung │   Review     │  Guardrails │
│              │  & Mapping   │  (KI-Engine) │  & Export    │  Editor     │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

### 5.2 Feature-Priorisierung

| Feature | Priorität | Phase |
|---------|-----------|-------|
| CSV-Import mit Spalten-Mapping | Must-Have | MVP |
| LLM-API-Anbindung (flexibel) | Must-Have | MVP |
| Guardrails-Editor (Markdown im UI) | Must-Have | MVP |
| E-Mail-Generierung (Batch) | Must-Have | MVP |
| Review-Tab mit Status-Workflow | Must-Have | MVP |
| Export (Instantly, Mailchimp, generisch) | Must-Have | MVP |
| Copy-to-Clipboard / mailto:-Link | Must-Have | MVP |
| Dashboard mit Statistiken | Should-Have | MVP |
| Authentifizierung (Magic Link) | Must-Have | MVP |
| API-Key-Verwaltung im UI | Should-Have | MVP |
| Template-Varianten | Could-Have | Phase 2 |
| SMTP-Direktversand | Won't-Have | Phase 2 |
| A/B-Testing | Won't-Have | Backlog |

---

### 5.3 Modul: Lead-Import & Mapping

**Zweck:** CSV-Dateien importieren (primär Apollo-Exports, aber auch beliebige Formate) und Spalten intelligent auf App-Felder mappen.

#### Import-Workflow

```
CSV-Upload → Vorschau (erste 5 Zeilen) → Spalten-Mapping → Validierung → Import
```

#### App-Felder (Ziel-Schema)

| Feld | Pflicht | Beschreibung |
|------|---------|--------------|
| company_name | Ja | Firmenname |
| contact_email | Ja | E-Mail-Adresse für Versand |
| contact_name | Nein | Ansprechpartner |
| industry | Nein | Branche |
| company_city | Nein | Stadt |
| company_country | Nein | Land |
| employees | Nein | Mitarbeiteranzahl |
| website | Nein | Firmenwebsite |
| linkedin_url | Nein | LinkedIn-Profil |
| description | Nein | Firmenbeschreibung (für KI-Kontext) |
| keywords | Nein | Schlagwörter (für KI-Kontext) |
| annual_revenue | Nein | Jahresumsatz |
| custom_field_1 | Nein | Frei belegbar |
| custom_field_2 | Nein | Frei belegbar |
| custom_field_3 | Nein | Frei belegbar |

#### Mapping-UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CSV-Import                                              [Abbrechen]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Datei: apollo-accounts-export.csv (15 Leads erkannt)                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  CSV-Spalte              →    App-Feld             Vorschau     │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  Company Name            →    [company_name    ▾]  Union Inv..  │    │
│  │  Company Name for Emails →    [— Ignorieren — ▾]  Union Inv..  │    │
│  │  Account Stage           →    [— Ignorieren — ▾]  Cold         │    │
│  │  # Employees             →    [employees       ▾]  290          │    │
│  │  Industry                →    [industry        ▾]  real esta..  │    │
│  │  Website                 →    [website         ▾]               │    │
│  │  Company Linkedin Url    →    [linkedin_url    ▾]  http://ww..  │    │
│  │  Company City            →    [company_city    ▾]  Hamburg      │    │
│  │  Company Country         →    [company_country ▾]  Germany      │    │
│  │  Short Description       →    [description     ▾]  Union In..   │    │
│  │  Keywords                →    [keywords        ▾]  offene i..   │    │
│  │  Annual Revenue          →    [annual_revenue  ▾]               │    │
│  │  ...                                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ℹ️ Pflichtfelder: company_name, contact_email                          │
│  ⚠️ "contact_email" ist noch nicht zugeordnet                           │
│                                                                         │
│  [Auto-Mapping zurücksetzen]              [Vorschau]  [✓ Importieren]   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Auto-Mapping-Logik:** Die App erkennt gängige Spaltennamen automatisch:
- "Company Name" / "Firma" / "Unternehmen" → `company_name`
- "Email" / "E-Mail" / "Contact Email" → `contact_email`
- "Industry" / "Branche" → `industry`
- usw.

**Mapping-Speicherung:** Das letzte Mapping wird pro Benutzer gespeichert und beim nächsten Import als Vorschlag angeboten.

#### Import-Batches

Jeder Import erzeugt einen "Batch" – eine logische Gruppierung der importierten Leads. Batches haben einen Namen (automatisch: Dateiname + Datum) und können im Dashboard gefiltert werden.

---

### 5.4 Modul: Guardrails-Editor

**Zweck:** Eine Markdown-Datei im UI editieren, die als System-Prompt/Kontext bei der E-Mail-Generierung mitgegeben wird. Hier werden Ton, Stil, Do's/Don'ts, Firmeninfos und E-Mail-Strukturvorgaben definiert.

#### Funktionen

- Markdown-Editor mit Live-Vorschau (Split-View)
- Versionierung: Jede Speicherung erzeugt eine neue Version
- Rollback auf vorherige Versionen möglich
- Standard-Template beim ersten Start vorausgefüllt
- Variablen-Platzhalter dokumentiert (z.B. `{{company_name}}`, `{{industry}}`)

#### Editor-UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Guardrails-Editor                    Version 3 (19.02.2026, 14:30)      │
├────────────────────────────────┬────────────────────────────────────────┤
│  Editor (Markdown)             │  Vorschau (gerendert)                  │
│                                │                                        │
│  # E-Mail-Richtlinien          │  E-Mail-Richtlinien                    │
│                                │  ═══════════════════                   │
│  ## Tonalität                  │  Tonalität                              │
│  - Professionell aber          │  ───────────                            │
│    nicht steif                 │  • Professionell aber nicht steif       │
│  - Per "Sie"                   │  • Per "Sie"                            │
│  - Kurz und direkt             │  • Kurz und direkt                     │
│                                │                                        │
│  ## Struktur                   │  Struktur                               │
│  1. Persönlicher Bezug         │  ───────                                │
│  2. Wertversprechen            │  1. Persönlicher Bezug                  │
│  3. Konkreter CTA              │  2. Wertversprechen                     │
│                                │  3. Konkreter CTA                      │
│  ## Variablen                  │                                        │
│  - {{company_name}}            │  Variablen                              │
│  - {{industry}}                │  ─────────                              │
│  - {{contact_name}}            │  • {{company_name}}                     │
│                                │  • {{industry}}                         │
├────────────────────────────────┴────────────────────────────────────────┤
│  [↶ Version 2]  [↷ Version 3]     [Änderungen verwerfen]  [Speichern]  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 5.5 Modul: E-Mail-Generierung (KI-Engine)

**Zweck:** Für ausgewählte Leads personalisierte E-Mails generieren, basierend auf Lead-Daten und den aktiven Guardrails.

#### Generierungs-Workflow

```
Leads auswählen → API-Provider wählen → Generierung starten → Fortschritt anzeigen → Ergebnis in Review-Tab
```

#### API-Konfiguration

| Einstellung | Beschreibung |
|-------------|--------------|
| Provider | Dropdown: Claude (Anthropic), OpenAI, Qwen, Custom |
| Modell | Abhängig vom Provider (z.B. claude-haiku-4-5, gpt-4o-mini, qwen-turbo) |
| API-Key | Verschlüsselt gespeichert, im UI verwaltbar |
| Temperatur | Slider 0.0 – 1.0 (Default: 0.7) |
| Max. Tokens | Slider 100 – 2000 (Default: 500) |

#### Prompt-Aufbau (intern)

```
[System-Prompt: Guardrails-Markdown]

---

Generiere eine personalisierte Outbound-E-Mail für folgenden Lead:

Firma: {{company_name}}
Branche: {{industry}}
Ansprechpartner: {{contact_name}}
Stadt: {{company_city}}
Mitarbeiter: {{employees}}
Beschreibung: {{description}}
Keywords: {{keywords}}

Antworte NUR mit der E-Mail im folgenden Format:

BETREFF: [Betreffzeile]
---
[E-Mail-Text]
```

#### Batch-Generierung

- Leads werden sequentiell verarbeitet (Rate Limiting beachten)
- Fortschrittsbalken: "Mail 23/100 generiert..."
- Bei API-Fehler: Lead wird übersprungen und markiert
- Abbrechen jederzeit möglich (bereits generierte bleiben erhalten)
- Max. 500 Leads pro Batch

#### Generierungs-UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ E-Mail-Generierung                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Batch: "apollo-accounts-export – 19.02.2026"                           │
│  Leads ausgewählt: 15 von 15                                            │
│                                                                         │
│  Provider: [Claude (Anthropic) ▾]    Modell: [claude-haiku-4-5 ▾]       │
│  Temperatur: [═══════●══] 0.7       Max Tokens: [═══●══════] 500       │
│                                                                         │
│  Guardrails: "Version 3 – 19.02.2026" ✅                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ████████████████████████░░░░░░░░░░  12/15 generiert (80%)      │    │
│  │  ⏱ ~45 Sekunden verbleibend                                     │    │
│  │  ✅ 11 erfolgreich  ⚠️ 1 übersprungen (API-Fehler)              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  [Abbrechen]                               [Zum Review-Tab →]          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 5.6 Modul: Review & Export

**Zweck:** Generierte E-Mails prüfen, bearbeiten, freigeben und anschließend versenden oder exportieren.

#### Status-Workflow

```
generiert → geprüft → freigegeben → versendet/exportiert
                ↘ abgelehnt (zurück in generiert oder gelöscht)
```

#### Review-Tabelle

```
┌─────────────────────────────────────────────────────────────────────────┐
│ E-Mail-Review                                [Export ▾]  [Alle wählen]  │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 [Suche...]     [Status ▾]  [Batch ▾]                                │
├──┬──────────────┬──────────────┬───────────┬────────────┬──────────────┤
│☐ │ Empfänger    │ Betreff      │ Status    │ Generiert  │ Aktionen     │
├──┼──────────────┼──────────────┼───────────┼────────────┼──────────────┤
│☑ │ Union Invest │ Zusammenarb..│ ✅ Geprüft│ 19.02.26   │ [👁] [✎] [📋]│
│☐ │ gmp Architek │ Architektur..│ 🟡 Offen  │ 19.02.26   │ [👁] [✎] [📋]│
│☑ │ ECE Group    │ Einzelhandel.│ ✅ Geprüft│ 19.02.26   │ [👁] [✎] [📋]│
│☐ │ Engel & Völk │ Immobilien.. │ 🔴 Fehler │ 19.02.26   │ [🔄] [✎]    │
├──┴──────────────┴──────────────┴───────────┴────────────┴──────────────┤
│ 3 ausgewählt                    Zeige 1-15 von 15     [<] 1 [>]        │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Mail-Detail / Bearbeitung

```
┌─────────────────────────────────────────────────────────────────────────┐
│ E-Mail bearbeiten                                       [✕ Schließen]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Empfänger: info@union-investment.de                                    │
│  Firma: Union Investment Real Estate GmbH                               │
│                                                                         │
│  Betreff:                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Zusammenarbeit im Bereich nachhaltiger Immobilienentwicklung    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  E-Mail-Text:                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Sehr geehrte Damen und Herren,                                  │    │
│  │                                                                  │    │
│  │ als Hamburger Unternehmensgruppe im Bereich Bau und             │    │
│  │ Immobilien verfolgen wir die Entwicklung der Union Investment   │    │
│  │ Real Estate mit großem Interesse...                              │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  [Ablehnen]  [Neu generieren]           [📋 Kopieren]  [✅ Freigeben]  │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Export-Formate

**Instantly-CSV:**
| Spalte | Mapping |
|--------|---------|
| email | contact_email |
| first_name | contact_name (Vorname) |
| last_name | contact_name (Nachname) |
| company_name | company_name |
| personalized_subject | subject |
| personalized_body | body (HTML oder Plain) |

**Mailchimp-CSV:**
| Spalte | Mapping |
|--------|---------|
| Email Address | contact_email |
| First Name | contact_name (Vorname) |
| Last Name | contact_name (Nachname) |
| MERGE3 (Company) | company_name |
| MERGE4 (Subject) | subject |
| MERGE5 (Body) | body |

**Generisch-CSV:**
Alle Felder wie in der App, 1:1 Export.

#### Aktionen

- **Copy-to-Clipboard:** Kopiert Betreff + Body formatiert in die Zwischenablage
- **mailto:-Link:** Öffnet Standard-Mailclient mit vorausgefülltem Betreff und Body
- **Batch-Export:** Ausgewählte Mails als CSV im gewählten Format herunterladen
- **Status setzen:** Einzeln oder Batch (alle ausgewählten → "freigegeben")

---

### 5.7 Modul: Dashboard

**Inhalte:**

| Widget | Beschreibung |
|--------|--------------|
| Übersicht | Anzahl Leads, generierte Mails, freigegebene Mails heute/gesamt |
| Batch-Historie | Letzte 10 Import-Batches mit Status |
| Generierungs-Status | Fortschritt laufender Generierung |
| Quick Actions | "CSV importieren", "Mails generieren", "Review öffnen" |
| API-Verbrauch | Geschätzte Token-Nutzung und Kosten (aktueller Monat) |

---

### 5.8 Modul: Einstellungen

**Bereiche:**

| Bereich | Einstellungen |
|---------|---------------|
| API-Provider | Keys hinzufügen/entfernen, Standard-Provider/Modell wählen |
| Export-Defaults | Standard-Format (Instantly/Mailchimp/Generisch) |
| Auto-Mapping | Gespeicherte Spalten-Mappings verwalten |
| Account | E-Mail ändern, Session verwalten |

---

## 6. Nicht-funktionale Anforderungen

### 6.1 Performance

| Metrik | Zielwert |
|--------|----------|
| Seitenladezeit | < 2 Sekunden |
| CSV-Import (500 Zeilen) | < 5 Sekunden |
| E-Mail-Generierung pro Lead | < 5 Sekunden (abhängig von API) |
| Export (500 Mails) | < 3 Sekunden |

### 6.2 Verfügbarkeit

| Metrik | Zielwert |
|--------|----------|
| Uptime | 99% (Vercel + Supabase SLA) |
| Backup-Frequenz | Täglich (Supabase automatisch) |

### 6.3 Skalierbarkeit

| Metrik | Aktuell | Kapazität |
|--------|---------|-----------|
| Leads | ~500 pro Import | 10.000+ |
| Generierte Mails | ~100/Tag | 500/Tag |
| Gespeicherte Mails | ~3.000/Monat | 100.000+ |

### 6.4 Benutzerfreundlichkeit

| Anforderung | Umsetzung |
|-------------|-----------|
| Sprache | Deutsch (UI), Englisch (Code) |
| Zielgruppe Tech-Level | 8/10 |
| Mobile-Support | Responsive, primär Desktop |

### 6.5 Browser-Support

| Browser | Version |
|---------|---------|
| Chrome | Letzte 2 |
| Firefox | Letzte 2 |
| Safari | Letzte 2 |
| Edge | Letzte 2 |

---

## 7. Datenmodell

### 7.1 ER-Diagramm

```
[users] ─── 1:n ───► [import_batches] ─── 1:n ───► [leads]
   │                                                    │
   │                                                    │ 1:n
   │                                                    ▼
   │                                             [generated_emails]
   │
   ├── 1:n ───► [guardrail_versions]
   │
   ├── 1:n ───► [api_configurations]
   │
   └── 1:n ───► [column_mappings]
```

### 7.2 Tabellen

#### users (Supabase Auth – erweitert)

```sql
-- Supabase Auth handles core user table
-- Erweiterte Profil-Tabelle
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    default_provider VARCHAR(50) DEFAULT 'anthropic',
    default_model VARCHAR(100) DEFAULT 'claude-haiku-4-5',
    default_export_format VARCHAR(20) DEFAULT 'generic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### import_batches

```sql
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    total_leads INTEGER DEFAULT 0,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE import_batches ADD CONSTRAINT chk_batch_status 
    CHECK (status IN ('active', 'archived'));

CREATE INDEX idx_batches_user ON import_batches(user_id);
CREATE INDEX idx_batches_imported ON import_batches(imported_at DESC);
```

#### leads

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Pflichtfelder
    company_name VARCHAR(500) NOT NULL,
    contact_email VARCHAR(500) NOT NULL,
    
    -- Optionale Felder
    contact_name VARCHAR(255),
    industry VARCHAR(255),
    company_city VARCHAR(255),
    company_country VARCHAR(255),
    employees INTEGER,
    website VARCHAR(500),
    linkedin_url VARCHAR(500),
    description TEXT,
    keywords TEXT,
    annual_revenue VARCHAR(100),
    
    -- Flexible Zusatzfelder
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 TEXT,
    
    -- Rohdaten aus CSV (komplettes Objekt für Referenz)
    raw_data JSONB,
    
    -- Status
    email_generated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_batch ON leads(batch_id);
CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_leads_email_status ON leads(email_generated);
```

#### generated_emails

```sql
CREATE TABLE generated_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    
    -- E-Mail-Inhalt
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    
    -- Generierungs-Metadaten
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    guardrail_version_id UUID REFERENCES guardrail_versions(id),
    temperature DECIMAL(3,2) DEFAULT 0.70,
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    
    -- Workflow-Status
    status VARCHAR(20) DEFAULT 'generated',
    reviewed_at TIMESTAMP WITH TIME ZONE,
    exported_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE generated_emails ADD CONSTRAINT chk_email_status 
    CHECK (status IN ('generated', 'reviewed', 'approved', 'rejected', 'exported', 'error'));

CREATE INDEX idx_emails_lead ON generated_emails(lead_id);
CREATE INDEX idx_emails_batch ON generated_emails(batch_id);
CREATE INDEX idx_emails_status ON generated_emails(status);
CREATE INDEX idx_emails_user ON generated_emails(user_id);
```

#### guardrail_versions

```sql
CREATE TABLE guardrail_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_guardrails_active ON guardrail_versions(user_id) 
    WHERE is_active = TRUE;
CREATE INDEX idx_guardrails_user_version ON guardrail_versions(user_id, version_number DESC);
```

#### api_configurations

```sql
CREATE TABLE api_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE api_configurations ADD CONSTRAINT chk_provider 
    CHECK (provider IN ('anthropic', 'openai', 'qwen', 'custom'));

CREATE INDEX idx_api_config_user ON api_configurations(user_id);
```

#### column_mappings

```sql
CREATE TABLE column_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Standard',
    mapping JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mappings_user ON column_mappings(user_id);
```

---

## 8. Tech Stack

### 8.1 Übersicht

| Kategorie | Technologie | Begründung |
|-----------|-------------|------------|
| Framework | Next.js 15 (App Router) | SSR, API Routes, Vercel-nativ |
| Sprache | TypeScript (strict) | Type-Safety, siehe CLAUDE.md |
| Datenbank | PostgreSQL (Supabase) | Bereits vorhanden, RLS |
| Backend | Supabase + Next.js API Routes | Auth, DB, Storage integriert |
| Auth | Supabase Auth (Magic Link) | Einfach, sicher, kein Passwort |
| UI Library | shadcn/ui | Konsistent, zugänglich, anpassbar |
| Styling | Tailwind CSS | CLAUDE.md Konvention |
| State | TanStack Query v5 | Server-State, Caching, Optimistic Updates |
| Forms | React Hook Form + Zod | Validierung, Performance |
| Markdown-Editor | @uiw/react-md-editor | Leichtgewichtig, Split-View |
| CSV-Parsing | Papa Parse | Robust, unterstützt komplexe CSVs |
| Encryption | crypto (Node.js built-in) | API-Key-Verschlüsselung |
| Testing | Playwright | E2E, CLAUDE.md Konvention |
| Hosting | Vercel Pro | Bereits vorhanden |

### 8.2 Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "@tanstack/react-query": "^5.50.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "papaparse": "^5.4.0",
    "@uiw/react-md-editor": "^4.0.0",
    "sonner": "^1.5.0",
    "lucide-react": "^0.400.0",
    "date-fns": "^3.6.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@playwright/test": "^1.45.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## 9. Architektur

### 9.1 System-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────────┐  │
│  │  Dashboard  │ │  Import    │ │  Review    │ │  Guardrails-Editor   │  │
│  │  Page       │ │  + Mapping │ │  + Export  │ │  + Einstellungen     │  │
│  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └──────────┬───────────┘  │
│         │              │              │                   │              │
│  ┌──────┴──────────────┴──────────────┴───────────────────┴───────────┐  │
│  │  TanStack Query (Cache) │ React Hook Form │ Hooks │ Zod Validation │  │
│  └──────────────────────────────┬────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │    Next.js API Routes        │
                    │  /api/generate   (LLM Proxy) │
                    │  /api/export     (CSV Build)  │
                    │  /api/settings   (API Keys)   │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
     ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
     │  Supabase      │  │  Supabase      │  │  LLM APIs      │
     │  PostgreSQL    │  │  Auth          │  │  (Claude,      │
     │  (RLS aktiv)   │  │  (Magic Link)  │  │   OpenAI,      │
     └────────────────┘  └────────────────┘  │   Qwen, etc.)  │
                                              └────────────────┘
```

### 9.2 Datenfluss

**Import-Flow:**
```
CSV-Upload → Papa Parse (Client) → Mapping-UI → Validierung (Zod) → 
  API Route → Supabase Insert (Batch + Leads) → Cache Invalidation → UI Update
```

**Generierungs-Flow:**
```
Lead-Auswahl → API Route /api/generate → 
  Guardrails laden → Lead-Daten + Prompt bauen → 
  LLM API Call (Provider-abhängig) → 
  Response parsen (Betreff + Body) → 
  Supabase Insert (generated_emails) → 
  SSE/Polling zum Client → Fortschritts-Update
```

**Export-Flow:**
```
Mails auswählen → Format wählen → API Route /api/export → 
  Leads + Mails laden → CSV nach Format-Template bauen → 
  Download-Response → Status auf "exported"
```

### 9.3 API-Provider-Abstraktion

```typescript
// /lib/llm/provider.ts
interface LLMProvider {
  generate(prompt: string, options: GenerateOptions): Promise<LLMResponse>;
}

// /lib/llm/anthropic.ts → implements LLMProvider
// /lib/llm/openai.ts    → implements LLMProvider
// /lib/llm/qwen.ts      → implements LLMProvider
// /lib/llm/custom.ts    → implements LLMProvider (benutzerdefinierte URL)
```

---

## 10. UI/UX Spezifikation

### 10.1 Design-Prinzipien

| Prinzip | Umsetzung |
|---------|-----------|
| Effizienz | Minimal-Clicks für Hauptworkflows, Keyboard-Shortcuts |
| Transparenz | Fortschritt und Status immer sichtbar |
| Kontrolle | Jede Mail kann vor Versand geprüft/bearbeitet werden |
| Deutsche UI | Alle Texte, Labels, Fehlermeldungen auf Deutsch |

### 10.2 Farbschema

| Farbe | Hex | Verwendung |
|-------|-----|------------|
| Primary | #2563EB | Buttons, Links, Aktive Tabs |
| Success | #16A34A | Freigegeben, Erfolg-Toasts |
| Warning | #D97706 | Offen/Ungeprüft, Warnungen |
| Error | #DC2626 | Fehler, Abgelehnt |
| Background | #F8FAFC | Seitenhintergrund |
| Surface | #FFFFFF | Karten, Panels |
| Muted | #64748B | Sekundärtext, Icons |

### 10.3 Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER: Logo + App-Name          Navigation-Tabs          [⚙️] [Logout]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         MAIN CONTENT AREA                               │
│                     (Tab-abhängiger Inhalt)                              │
│                                                                         │
│                                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Navigation-Tabs:** Dashboard | Leads | Generierung | Review | Guardrails | Einstellungen

### 10.4 Komponenten

**Buttons:** Primary (Hauptaktionen), Secondary (Nebenaktionen), Danger (Löschen), Ghost (Icons)

**Formulare:** Labels oberhalb, Pflichtfelder mit *, Fehler unter Feld in Rot, deutsche Fehlermeldungen

**Feedback (Toasts via Sonner):** Erfolg (Grün, 3s), Fehler (Rot, 5s + Retry-Button), Warnung (Gelb, 4s), Info (Blau, 3s)

---

## 11. API-Design

### 11.1 Stil

- [x] Direct DB (Supabase Client) – für CRUD-Operationen
- [x] REST (Next.js API Routes) – für LLM-Proxy, Export, Key-Management

### 11.2 Endpunkte

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | /api/generate | E-Mails generieren (SSE für Fortschritt) |
| POST | /api/generate/single | Einzelne Mail neu generieren |
| POST | /api/export | CSV-Export im gewählten Format |
| GET | /api/settings/providers | Konfigurierte API-Provider abrufen |
| POST | /api/settings/providers | API-Key hinzufügen/aktualisieren |
| DELETE | /api/settings/providers/:id | API-Key entfernen |
| POST | /api/settings/providers/test | API-Verbindung testen |

> **Alles andere** (Leads CRUD, Batches, Guardrails, E-Mail-Status) läuft direkt über den Supabase-Client mit RLS.

### 11.3 SSE für Generierungs-Fortschritt

```typescript
// /api/generate → Server-Sent Events
// Event-Typen:
{ type: 'progress', data: { current: 12, total: 100, lead_name: 'Union Investment' } }
{ type: 'success', data: { lead_id: '...', email_id: '...' } }
{ type: 'error', data: { lead_id: '...', error: 'API rate limit' } }
{ type: 'complete', data: { total: 100, successful: 97, failed: 3 } }
```

---

## 12. Security

### 12.1 Authentifizierung

| Aspekt | Lösung |
|--------|--------|
| Methode | Supabase Magic Link (E-Mail) |
| Session | 30 Tage (JWT, httpOnly Cookie) |
| Token-Speicherung | httpOnly Secure Cookie (Supabase SSR) |
| Erlaubte E-Mails | Whitelist auf eine E-Mail beschränkt |

### 12.2 Autorisierung (Row Level Security)

```sql
-- Alle Tabellen: Nur eigene Daten sichtbar
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrail_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Beispiel-Policy (für alle Tabellen gleich)
CREATE POLICY "Nutzer sieht nur eigene Daten" ON leads
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Nutzer sieht nur eigene Daten" ON generated_emails
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Analog für alle weiteren Tabellen
```

### 12.3 API-Key-Sicherheit

| Aspekt | Maßnahme |
|--------|----------|
| Speicherung | AES-256-GCM verschlüsselt in DB |
| Encryption Key | Server-Umgebungsvariable (ENCRYPTION_KEY) |
| Anzeige im UI | Nur letzte 4 Zeichen sichtbar (sk-...xY4z) |
| Übertragung | Nur über HTTPS, nie in URL-Parametern |
| Nutzung | Nur server-seitig in API Routes |

### 12.4 Input-Validierung

| Bereich | Maßnahme |
|---------|----------|
| CSV-Upload | Max 10 MB, nur .csv Dateien, Papa Parse mit Error Handling |
| Formulare | Zod-Schemas, server-seitige Re-Validierung |
| Markdown-Editor | Sanitization bei Render (kein dangerouslySetInnerHTML) |
| API-Prompts | Lead-Daten werden escaped, keine Injection in Prompts |

### 12.5 Datenschutz

| Bereich | Maßnahme |
|---------|----------|
| Transport | HTTPS (Vercel erzwingt) |
| Datenbank | Verschlüsselung at rest (Supabase Standard) |
| API-Keys | AES-256-GCM verschlüsselt |
| Lead-Daten | Nur für authentifizierten User zugänglich (RLS) |

---

## 13. Testing

### 13.1 Strategie

| Test-Art | Anzahl | Tool |
|----------|--------|------|
| E2E | ~8 | Playwright |
| Integration | ~5 | Vitest |
| Unit | ~10 | Vitest |

### 13.2 E2E-Szenarien

| # | Szenario |
|---|----------|
| 1 | Login via Magic Link funktioniert |
| 2 | CSV-Import mit Mapping-Workflow |
| 3 | Guardrails bearbeiten und speichern |
| 4 | E-Mail-Generierung starten und Fortschritt sehen |
| 5 | E-Mail im Review-Tab prüfen und freigeben |
| 6 | E-Mail bearbeiten und Status ändern |
| 7 | Export als Instantly-CSV |
| 8 | Copy-to-Clipboard einer E-Mail |

### 13.3 CI/CD

- [x] Tests bei Push
- [x] Tests bei Pull Request
- [x] Deployment-Block bei Fehlern

---

## 14. Deployment

### 14.1 Umgebungen

| Umgebung | URL | Zweck |
|----------|-----|-------|
| Production | evolve.gruppenwerk.de | Live |
| Preview | *.vercel.app | PR-Reviews |
| Local | localhost:3000 | Entwicklung |

### 14.2 Umgebungsvariablen

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Verschlüsselung für API-Keys
ENCRYPTION_KEY=32-byte-hex-string

# Optionale Defaults (können auch per UI gesetzt werden)
# DEFAULT_LLM_PROVIDER=anthropic
# DEFAULT_LLM_MODEL=claude-haiku-4-5

# Erlaubte E-Mail für Login
ALLOWED_EMAIL=axel@gruppenwerk.de
```

### 14.3 Prozess

```
Push → Vercel Build → TypeScript Check → Tests → Deploy (Preview/Production)
```

### 14.4 Backup

| Typ | Frequenz | Aufbewahrung |
|-----|----------|--------------|
| DB (Supabase) | Täglich | 7 Tage (Pro Plan) |
| Guardrails (Versioniert) | Bei jeder Änderung | Unbegrenzt |

---

## 15. Projektstruktur

```
/gruppenwerk-evolve
├── /app
│   ├── layout.tsx                    # Root Layout mit Auth-Check
│   ├── page.tsx                      # Dashboard (Startseite)
│   ├── /login
│   │   └── page.tsx                  # Login-Seite (Magic Link)
│   ├── /auth
│   │   └── /callback
│   │       └── route.ts             # Auth Callback Handler
│   ├── /leads
│   │   ├── page.tsx                  # Lead-Übersicht
│   │   └── /import
│   │       └── page.tsx             # Import + Mapping
│   ├── /generate
│   │   └── page.tsx                  # Generierungs-Seite
│   ├── /review
│   │   ├── page.tsx                  # Review-Tabelle
│   │   └── /[id]
│   │       └── page.tsx             # Mail-Detail/Bearbeitung
│   ├── /guardrails
│   │   └── page.tsx                  # Markdown-Editor
│   ├── /settings
│   │   └── page.tsx                  # Einstellungen
│   └── /api
│       ├── /generate
│       │   ├── route.ts             # Batch-Generierung (SSE)
│       │   └── /single
│       │       └── route.ts         # Einzelne Mail regenerieren
│       ├── /export
│       │   └── route.ts             # CSV-Export
│       └── /settings
│           └── /providers
│               ├── route.ts         # GET/POST API-Keys
│               ├── /[id]
│               │   └── route.ts     # DELETE API-Key
│               └── /test
│                   └── route.ts     # API-Verbindung testen
├── /components
│   ├── /ui                           # shadcn/ui Basis-Komponenten
│   ├── /dashboard
│   │   ├── stats-cards.tsx
│   │   ├── batch-history.tsx
│   │   └── quick-actions.tsx
│   ├── /leads
│   │   ├── lead-table.tsx
│   │   ├── csv-upload.tsx
│   │   ├── column-mapper.tsx
│   │   └── import-preview.tsx
│   ├── /generate
│   │   ├── generation-config.tsx
│   │   ├── lead-selector.tsx
│   │   └── progress-tracker.tsx
│   ├── /review
│   │   ├── email-table.tsx
│   │   ├── email-detail.tsx
│   │   ├── email-editor.tsx
│   │   └── export-dialog.tsx
│   ├── /guardrails
│   │   ├── markdown-editor.tsx
│   │   └── version-selector.tsx
│   ├── /settings
│   │   ├── api-key-form.tsx
│   │   └── provider-list.tsx
│   ├── /layout
│   │   ├── header.tsx
│   │   ├── navigation.tsx
│   │   └── auth-guard.tsx
│   └── /shared
│       ├── loading-spinner.tsx
│       ├── empty-state.tsx
│       ├── error-state.tsx
│       ├── confirm-dialog.tsx
│       └── data-table.tsx
├── /lib
│   ├── /supabase
│   │   ├── client.ts                # Browser-Client
│   │   ├── server.ts                # Server-Client
│   │   └── middleware.ts            # Auth-Middleware
│   ├── /llm
│   │   ├── provider.ts             # Interface + Factory
│   │   ├── anthropic.ts            # Claude-Anbindung
│   │   ├── openai.ts               # OpenAI-Anbindung
│   │   ├── qwen.ts                 # Qwen-Anbindung
│   │   ├── custom.ts               # Custom-URL
│   │   └── prompt-builder.ts       # Prompt-Zusammenbau
│   ├── /export
│   │   ├── instantly.ts            # Instantly-CSV-Format
│   │   ├── mailchimp.ts            # Mailchimp-CSV-Format
│   │   └── generic.ts              # Generisches CSV
│   ├── /validations
│   │   ├── lead.ts                 # Lead-Schema
│   │   ├── email.ts                # E-Mail-Schema
│   │   ├── guardrails.ts           # Guardrails-Schema
│   │   ├── settings.ts             # Settings-Schema
│   │   └── csv-upload.ts           # Upload-Schema
│   ├── /errors
│   │   └── messages.ts             # Deutsche Fehlermeldungen
│   ├── /crypto
│   │   └── encryption.ts           # AES-256 für API-Keys
│   ├── utils.ts
│   └── constants.ts
├── /hooks
│   ├── use-leads.ts                 # Lead-Queries
│   ├── use-batches.ts               # Batch-Queries
│   ├── use-emails.ts                # E-Mail-Queries + Mutations
│   ├── use-guardrails.ts            # Guardrails-Queries
│   ├── use-generation.ts            # SSE-Hook für Generierung
│   ├── use-export.ts                # Export-Logic
│   └── use-auto-save.ts            # Auto-Save für Formulare
├── /types
│   └── index.ts                     # Alle TypeScript-Typen
├── /__tests__
│   ├── /e2e
│   │   ├── login.spec.ts
│   │   ├── import.spec.ts
│   │   ├── generate.spec.ts
│   │   ├── review.spec.ts
│   │   └── export.spec.ts
│   └── /unit
│       ├── prompt-builder.test.ts
│       ├── csv-parser.test.ts
│       └── encryption.test.ts
├── /supabase
│   └── /migrations
│       └── 001_initial_schema.sql   # Initiales DB-Schema
├── middleware.ts                     # Next.js Middleware (Auth-Check)
├── .env.example
├── CLAUDE.md                        # Verbindliche Code-Regeln
└── README.md
```

---

## 16. Anhang

### 16.1 Glossar

| Begriff | Bedeutung |
|---------|-----------|
| Lead | Ein potentieller Kontakt/Firma aus dem CSV-Import |
| Batch | Logische Gruppierung eines CSV-Imports |
| Guardrails | Markdown-Dokument mit Richtlinien für die KI-Generierung |
| Provider | LLM-API-Anbieter (Anthropic, OpenAI, Qwen, etc.) |
| Instantly | E-Mail-Outreach-Tool für Kaltakquise |
| Mailchimp | E-Mail-Marketing-Plattform |
| SSE | Server-Sent Events (für Echtzeit-Fortschritt) |
| RLS | Row Level Security (Supabase Zugriffsschutz) |

### 16.2 Referenzen

| Ressource | URL |
|-----------|-----|
| Next.js 15 Docs | https://nextjs.org/docs |
| Supabase Docs | https://supabase.com/docs |
| shadcn/ui | https://ui.shadcn.com |
| TanStack Query | https://tanstack.com/query |
| Papa Parse | https://www.papaparse.com |
| Anthropic API | https://docs.anthropic.com |
| Instantly CSV-Format | https://help.instantly.ai |

### 16.3 Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 19.02.2026 | Initial PRD |

### 16.4 Offene Fragen

| # | Frage | Status |
|---|-------|--------|
| 1 | Soll der Guardrails-Editor auch Prompt-Templates unterstützen (mehrere Guardrails für verschiedene Use Cases)? | ⬜ Offen |
| 2 | Soll es eine "Vorschau"-Funktion geben, die eine Test-Mail generiert bevor der Batch startet? | ⬜ Offen |
| 3 | Custom-Provider: Reicht eine URL + API-Key oder brauchen wir Header-Konfiguration? | ⬜ Offen |
| 4 | Sollen abgelehnte Mails automatisch mit neuen Guardrails regeneriert werden können? | ⬜ Offen |
| 5 | Domain für Production: evolve.gruppenwerk.de oder andere Subdomain? | ⬜ Offen |

---

## ✅ PRD Completion Checklist

- [x] Executive Summary vollständig
- [x] Problem klar definiert
- [x] Alle Must-Have Features beschrieben
- [x] Datenmodell vollständig
- [x] Tech Stack festgelegt
- [x] Security-Konzept vorhanden
- [x] Alle Platzhalter ersetzt
- [ ] Review durchgeführt
- [ ] Status auf "Approved"

---

**Ende des PRD**
