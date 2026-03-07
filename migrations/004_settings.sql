-- App settings (key-value store for application configuration)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default: homepage requires authentication
INSERT INTO app_settings (key, value) VALUES ('homepage_public', 'false')
ON CONFLICT (key) DO NOTHING;
