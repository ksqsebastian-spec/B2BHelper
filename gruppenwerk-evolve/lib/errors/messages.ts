/**
 * Zentrale Fehlermeldungen fuer die gesamte Anwendung.
 * Alle Meldungen sind auf Deutsch.
 */

export const ERROR_MESSAGES = {
  // --- Allgemein ---
  UNKNOWN: 'Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  NETWORK: 'Netzwerkfehler: Bitte pruefen Sie Ihre Internetverbindung.',
  UNAUTHORIZED: 'Sie sind nicht angemeldet. Bitte melden Sie sich erneut an.',

  // --- Import ---
  CSV_PARSE_FAILED: 'Die CSV-Datei konnte nicht gelesen werden. Bitte pruefen Sie das Format.',
  CSV_TOO_LARGE: 'Die CSV-Datei ist zu gross. Maximale Groesse: 10 MB.',
  CSV_MISSING_FIELDS: 'Pflichtfelder fehlen: Firmenname und E-Mail-Adresse muessen zugeordnet werden.',
  IMPORT_FAILED: 'Der Import ist fehlgeschlagen. Bitte versuchen Sie es erneut.',

  // --- Generierung ---
  GENERATION_FAILED: 'Die E-Mail-Generierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
  API_KEY_MISSING: 'Kein API-Schluessel konfiguriert. Bitte hinterlegen Sie einen Schluessel in den Einstellungen.',
  API_KEY_INVALID: 'Der API-Schluessel ist ungueltig. Bitte pruefen Sie Ihre Eingabe in den Einstellungen.',
  API_RATE_LIMIT: 'API-Ratenlimit erreicht. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
  GUARDRAILS_MISSING: 'Keine Leitplanken konfiguriert. Bitte erstellen Sie zuerst Leitplanken fuer die E-Mail-Generierung.',

  // --- Review/Export ---
  EMAIL_NOT_FOUND: 'Die angeforderte E-Mail wurde nicht gefunden.',
  EXPORT_FAILED: 'Der Export ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
  NO_EMAILS_SELECTED: 'Keine E-Mails ausgewaehlt. Bitte waehlen Sie mindestens eine E-Mail zum Exportieren aus.',

  // --- Einstellungen ---
  API_KEY_SAVE_FAILED: 'Der API-Schluessel konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
  API_KEY_TEST_FAILED: 'Der API-Schluessel konnte nicht verifiziert werden. Bitte pruefen Sie den Schluessel.',
} as const;

/** Typ fuer alle verfuegbaren Fehlerschluessel */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
