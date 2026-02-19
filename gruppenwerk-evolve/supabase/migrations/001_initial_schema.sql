-- GruppenwerkEvolve – Initiales Datenbankschema
-- Version: 1.0
-- Datum: 2026-02-19

-- ============================================
-- Tabelle: user_profiles
-- Erweiterte Profildaten für Supabase Auth Benutzer
-- ============================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    default_provider VARCHAR(50) DEFAULT 'anthropic',
    default_model VARCHAR(100) DEFAULT 'claude-haiku-4-5',
    default_export_format VARCHAR(20) DEFAULT 'generic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht nur eigenes Profil" ON user_profiles
    FOR ALL TO authenticated
    USING (id = auth.uid());

-- ============================================
-- Tabelle: import_batches
-- Logische Gruppierung importierter CSV-Dateien
-- ============================================
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

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht nur eigene Batches" ON import_batches
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE INDEX idx_batches_user ON import_batches(user_id);
CREATE INDEX idx_batches_imported ON import_batches(imported_at DESC);

-- ============================================
-- Tabelle: leads
-- Importierte Lead-/Kontaktdaten
-- ============================================
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

    -- Rohdaten aus CSV
    raw_data JSONB,

    -- Status
    email_generated BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht nur eigene Leads" ON leads
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE INDEX idx_leads_batch ON leads(batch_id);
CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_leads_email_status ON leads(email_generated);

-- ============================================
-- Tabelle: guardrail_versions
-- Versionierte Guardrails-Markdown-Dokumente
-- ============================================
CREATE TABLE guardrail_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE guardrail_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht nur eigene Guardrails" ON guardrail_versions
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE UNIQUE INDEX idx_guardrails_active ON guardrail_versions(user_id)
    WHERE is_active = TRUE;
CREATE INDEX idx_guardrails_user_version ON guardrail_versions(user_id, version_number DESC);

-- ============================================
-- Tabelle: generated_emails
-- KI-generierte E-Mails mit Workflow-Status
-- ============================================
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

ALTER TABLE generated_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht nur eigene E-Mails" ON generated_emails
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE INDEX idx_emails_lead ON generated_emails(lead_id);
CREATE INDEX idx_emails_batch ON generated_emails(batch_id);
CREATE INDEX idx_emails_status ON generated_emails(status);
CREATE INDEX idx_emails_user ON generated_emails(user_id);

-- ============================================
-- Tabelle: api_configurations
-- Verschlüsselte API-Keys pro Provider
-- ============================================
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

ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht nur eigene API-Konfigurationen" ON api_configurations
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE INDEX idx_api_config_user ON api_configurations(user_id);

-- ============================================
-- Tabelle: column_mappings
-- Gespeicherte CSV-Spalten-Zuordnungen
-- ============================================
CREATE TABLE column_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Standard',
    mapping JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht nur eigene Mappings" ON column_mappings
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE INDEX idx_mappings_user ON column_mappings(user_id);

-- ============================================
-- Trigger: updated_at automatisch aktualisieren
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_emails_updated_at
    BEFORE UPDATE ON generated_emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_configurations_updated_at
    BEFORE UPDATE ON api_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_column_mappings_updated_at
    BEFORE UPDATE ON column_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User-Profil wird vom App-Code erstellt (kein Trigger noetig)
