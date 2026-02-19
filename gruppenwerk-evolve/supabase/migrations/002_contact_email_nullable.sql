-- contact_email war bisher NOT NULL, aber Apollo-Accounts-Exporte
-- enthalten keine E-Mail-Adressen. Daher wird das Feld optional.
ALTER TABLE leads ALTER COLUMN contact_email DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN contact_email SET DEFAULT NULL;
